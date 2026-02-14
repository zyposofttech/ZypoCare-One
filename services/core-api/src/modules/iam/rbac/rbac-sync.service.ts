import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import { ROLE } from "../iam.constants";
import { PERMISSIONS, normalizePermCode } from "./permission-catalog";

@Injectable()
export class RbacSyncService implements OnModuleInit {
  private readonly logger = new Logger(RbacSyncService.name);

  constructor(@Inject("PRISMA") private prisma: PrismaClient) {}

  async onModuleInit() {
    // Default ON (enterprise-safe: idempotent upsert)
    if (process.env.RBAC_SYNC_ON_BOOT === "false") return;
    await this.syncPermissions();
  }

  async syncPermissions(): Promise<{ created: number; updated: number; total: number }> {
    const items = PERMISSIONS.map((x) => ({
      code: normalizePermCode(x.code),
      name: x.name,
      category: x.category,
      description: x.description ?? null,
    }));

    let created = 0;
    let updated = 0;

    const forceMetadata = process.env.RBAC_SYNC_FORCE_METADATA === "true";

    for (const perm of items) {
      let existing = await this.prisma.permission.findUnique({
        where: { code: perm.code },
        select: { id: true, name: true, category: true, description: true },
      });

      if (!existing) {
        try {
          await this.prisma.permission.create({
            data: {
              code: perm.code,
              name: perm.name,
              category: perm.category,
              description: perm.description,
            },
          });
          created++;
          continue;
        } catch (err: any) {
          // Another sync worker may have inserted the same code concurrently.
          if (err?.code !== "P2002") throw err;
          existing = await this.prisma.permission.findUnique({
            where: { code: perm.code },
            select: { id: true, name: true, category: true, description: true },
          });
          if (!existing) throw err;
        }
      }

      // Default behavior: do not override existing metadata unless:
      // - existing is blank/null, OR
      // - RBAC_SYNC_FORCE_METADATA=true
      const nextName = forceMetadata || !existing.name ? perm.name : existing.name;
      const nextCategory = forceMetadata || !existing.category ? perm.category : existing.category;
      const nextDescription =
        forceMetadata || existing.description == null ? perm.description : existing.description;

      const needsUpdate =
        existing.name !== nextName ||
        existing.category !== nextCategory ||
        (existing.description ?? null) !== (nextDescription ?? null);

      if (needsUpdate) {
        await this.prisma.permission.update({
          where: { code: perm.code },
          data: {
            name: nextName,
            category: nextCategory,
            description: nextDescription,
          },
        });
        updated++;
      }
    }

    // ── Auto-assign new permissions to SUPER_ADMIN ────────────────────────
    // SUPER_ADMIN must always have every permission. When new perms are added
    // in code, this block ensures they get assigned on every sync — even in
    // production where iam.seed.ts may not run (AUTH_DEV_SEED=false).
    await this.ensureSuperAdminHasAll();

    const result = { created, updated, total: items.length };

    this.logger.log(
      `RBAC Permission Catalog sync complete: created=${result.created}, updated=${result.updated}, total=${result.total}`,
    );

    return result;
  }

  /**
   * Ensure SUPER_ADMIN role template has every permission in the catalog
   * assigned to its active (v1) version. This is idempotent — existing
   * assignments are upserted (no duplicates, no deletions).
   */
  private async ensureSuperAdminHasAll(): Promise<void> {
    try {
      const tpl = await this.prisma.roleTemplate.findUnique({
        where: { code: ROLE.SUPER_ADMIN },
      });
      if (!tpl) return; // role template not seeded yet

      const v1 = await (this.prisma as any).roleTemplateVersion.findFirst({
        where: { roleTemplateId: tpl.id, version: 1 },
      });
      if (!v1) return;

      const allPerms = await this.prisma.permission.findMany({
        select: { id: true },
      });

      const existingAssignments = await (this.prisma as any).roleTemplatePermission.findMany({
        where: { roleVersionId: v1.id },
        select: { permissionId: true },
      });
      const existingIds = new Set(
        existingAssignments.map((a: any) => a.permissionId),
      );

      let added = 0;
      for (const p of allPerms) {
        if (existingIds.has(p.id)) continue;
        await (this.prisma as any).roleTemplatePermission.create({
          data: { roleVersionId: v1.id, permissionId: p.id },
        });
        added++;
      }

      if (added > 0) {
        this.logger.log(
          `SUPER_ADMIN auto-granted ${added} new permission(s)`,
        );
      }
    } catch (err) {
      // Non-fatal: log and continue. The seed will fix it on next dev restart.
      this.logger.warn(`SUPER_ADMIN auto-grant failed (non-fatal): ${err}`);
    }
  }
}
