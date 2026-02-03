import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import { PERM, ROLE } from "./iam.constants";
import { hashPassword } from "./password.util";
import { PERMISSIONS, normalizePermCode } from "./rbac/permission-catalog";

@Injectable()
export class IamSeedService implements OnModuleInit {
  constructor(@Inject("PRISMA") private prisma: PrismaClient) { }

  async onModuleInit() {
    if (process.env.AUTH_DEV_SEED !== "true") return;

    const seedBranches = [
      { code: "BLR-HQ", name: "ZypoCare Hospital – Central Campus", city: "Bengaluru", gstNumber: "29ABCDE1234F1Z5" },
      { code: "BLR-EC", name: "ZypoCare Hospital – Electronic City Campus", city: "Bengaluru", gstNumber: "29ABCDE1234F2Z4" },
    ];

    for (const b of seedBranches) {
      await this.prisma.branch.upsert({
        where: { code: b.code },
        update: { name: b.name, city: b.city, gstNumber: b.gstNumber },
        create: b,
      });
    }

    // ✅ Permission catalog is the SINGLE source-of-truth (no drift)
    const permissions = PERMISSIONS.map((p) => ({
      code: normalizePermCode(p.code),
      name: p.name,
      category: p.category,
      description: p.description ?? null,
    }));

    // Convenience: group permission codes by prefix (keeps role definitions readable)
    const INFRA_ALL = Object.values(PERM).filter((c) => c.startsWith("INFRA_"));
    const OT_ALL = Object.values(PERM).filter((c) => c.startsWith("ot."));

    for (const p of permissions) {
      await this.prisma.permission.upsert({
        where: { code: p.code },
        update: { name: p.name, category: p.category, description: p.description },
        create: { ...p },
      });
    }

    const roleTemplates = [
      {
        code: ROLE.SUPER_ADMIN,
        name: "Super Admin",
        scope: "GLOBAL" as const,
        desc: "Global system administrator",
        isSystem: true,
      },
      {
        code: ROLE.CORPORATE_ADMIN,
        name: "Corporate Admin",
        scope: "GLOBAL" as const,
        desc: "Enterprise owner (multi-branch ops; no RBAC/governance design by default)",
        isSystem: true,
      },
      {
        code: ROLE.BRANCH_ADMIN,
        name: "Branch Admin",
        scope: "BRANCH" as const,
        desc: "Branch configuration and user onboarding",
        isSystem: true,
      },
      {
        code: ROLE.IT_ADMIN,
        name: "IT Admin",
        scope: "BRANCH" as const,
        desc: "Branch IT operations (user resets/activation)",
        isSystem: true,
      },
    ];

    for (const r of roleTemplates) {
      const tpl = await this.prisma.roleTemplate.upsert({
        where: { code: r.code },
        update: { name: r.name, scope: r.scope, description: r.desc, isSystem: r.isSystem ?? false },
        create: { code: r.code, name: r.name, scope: r.scope, description: r.desc, isSystem: r.isSystem ?? false },
      });

      const existingV1 = await this.prisma.roleTemplateVersion.findFirst({
        where: { roleTemplateId: tpl.id, version: 1 },
      });

      const v1 =
        existingV1 ??
        (await this.prisma.roleTemplateVersion.create({
          data: { roleTemplateId: tpl.id, version: 1, status: "ACTIVE", notes: "Initial seed v1" },
        }));

      // ✅ SUPER_ADMIN gets EVERYTHING we seeded
      const permCodes =
        r.code === ROLE.SUPER_ADMIN
          ? permissions.map((x) => x.code)
          : r.code === ROLE.CORPORATE_ADMIN
            ? [
              // Enterprise ops (multi-branch) + Infrastructure Setup Studio
              PERM.BRANCH_READ,
              // PERM.BRANCH_CREATE,
              // PERM.BRANCH_UPDATE,
              // PERM.BRANCH_DELETE,

              PERM.IAM_USER_READ,
              // PERM.IAM_USER_CREATE,
              // PERM.IAM_USER_UPDATE,
              // PERM.IAM_USER_RESET_PASSWORD,

              // Read-only role/permission visibility (dropdowns etc.)
              PERM.IAM_ROLE_READ,
              PERM.IAM_PERMISSION_READ,

              // Audit read (optional but useful)
              PERM.IAM_AUDIT_READ,

              // Facility setup (catalog + mappings)
              PERM.FACILITY_CATALOG_READ,
              PERM.FACILITY_CATALOG_CREATE,
              PERM.BRANCH_FACILITY_READ,
              PERM.BRANCH_FACILITY_UPDATE,

              PERM.DEPARTMENT_READ,
              PERM.DEPARTMENT_CREATE,
              PERM.DEPARTMENT_UPDATE,
              PERM.DEPARTMENT_ASSIGN_DOCTORS,

              PERM.DEPARTMENT_SPECIALTY_READ,
              PERM.DEPARTMENT_SPECIALTY_UPDATE,

              PERM.SPECIALTY_READ,
              PERM.SPECIALTY_CREATE,
              PERM.SPECIALTY_UPDATE,

              PERM.STAFF_READ,

              // Infrastructure + OT configuration
              ...INFRA_ALL,
              ...OT_ALL,

              // NOTE: Explicitly NOT granted (by design):
              // - PERM.IAM_ROLE_CREATE / PERM.IAM_ROLE_UPDATE / PERM.IAM_PERMISSION_CREATE
              // - PERM.GOV_POLICY_* (unless you explicitly want Corporate to manage governance packs)
            ]
            : r.code === ROLE.BRANCH_ADMIN
            ? [
              PERM.BRANCH_READ,
              PERM.IAM_USER_READ, PERM.IAM_USER_CREATE, PERM.IAM_USER_UPDATE,
              PERM.IAM_ROLE_READ, PERM.IAM_PERMISSION_READ, PERM.IAM_AUDIT_READ,

              PERM.FACILITY_CATALOG_READ,
              PERM.BRANCH_FACILITY_READ, PERM.BRANCH_FACILITY_UPDATE,
              PERM.DEPARTMENT_READ, PERM.DEPARTMENT_CREATE, PERM.DEPARTMENT_UPDATE, PERM.DEPARTMENT_ASSIGN_DOCTORS,
              PERM.DEPARTMENT_SPECIALTY_READ, PERM.DEPARTMENT_SPECIALTY_UPDATE,
              PERM.SPECIALTY_READ, PERM.SPECIALTY_CREATE, PERM.SPECIALTY_UPDATE,
              PERM.STAFF_READ,

              // Diagnostics configuration (branch-level)
              PERM.INFRA_DIAGNOSTICS_READ,
              PERM.INFRA_DIAGNOSTICS_CREATE,
              PERM.INFRA_DIAGNOSTICS_UPDATE,
              PERM.INFRA_DIAGNOSTICS_DELETE,

              // infra setup at branch level
              PERM.INFRA_LOCATION_READ, PERM.INFRA_LOCATION_CREATE, PERM.INFRA_LOCATION_UPDATE, PERM.INFRA_LOCATION_REVISE, PERM.INFRA_LOCATION_RETIRE,
              PERM.INFRA_UNITTYPE_READ, PERM.INFRA_UNITTYPE_UPDATE,
              PERM.INFRA_UNIT_READ, PERM.INFRA_UNIT_CREATE, PERM.INFRA_UNIT_UPDATE,
              PERM.INFRA_ROOM_READ, PERM.INFRA_ROOM_CREATE, PERM.INFRA_ROOM_UPDATE,
              PERM.INFRA_RESOURCE_READ, PERM.INFRA_RESOURCE_CREATE, PERM.INFRA_RESOURCE_UPDATE, PERM.INFRA_RESOURCE_STATE_UPDATE,
              PERM.INFRA_GOLIVE_READ, PERM.INFRA_GOLIVE_RUN,
            ]
            : [
              PERM.BRANCH_READ,
              PERM.IAM_USER_READ, PERM.IAM_USER_UPDATE, PERM.IAM_USER_RESET_PASSWORD,
              PERM.IAM_ROLE_READ, PERM.IAM_PERMISSION_READ, PERM.IAM_AUDIT_READ,

              PERM.FACILITY_CATALOG_READ,
              PERM.BRANCH_FACILITY_READ,
              PERM.DEPARTMENT_READ,
              PERM.DEPARTMENT_SPECIALTY_READ,
              PERM.SPECIALTY_READ,
              PERM.STAFF_READ,

              // limited infra ops
              PERM.INFRA_LOCATION_READ,
              PERM.INFRA_EQUIPMENT_READ,
              PERM.INFRA_FIXIT_READ,
            ];

      const perms = await this.prisma.permission.findMany({ where: { code: { in: permCodes } } });


      // Keep CORPORATE_ADMIN permissions aligned to the intended minimal set (seed acts as source-of-truth).
      // This prevents accidental privilege creep (e.g., GOV_POLICY_* or RBAC design permissions) in dev environments.
      if (r.code === ROLE.CORPORATE_ADMIN) {
        const allowedIds = perms.map((x) => x.id);
        await this.prisma.roleTemplatePermission.deleteMany({
          where: { roleVersionId: v1.id, permissionId: { notIn: allowedIds } },
        });
      }

      for (const p of perms) {
        await this.prisma.roleTemplatePermission.upsert({
          where: { roleVersionId_permissionId: { roleVersionId: v1.id, permissionId: p.id } },
          update: {},
          create: { roleVersionId: v1.id, permissionId: p.id },
        });
      }
    }

    // ✅ Ensure CORPORATE_ADMIN users have roleVersionId set (prevents empty permissions)
    const corpTpl = await this.prisma.roleTemplate.findUnique({ where: { code: ROLE.CORPORATE_ADMIN } });
    const corpV1 = corpTpl
      ? await this.prisma.roleTemplateVersion.findFirst({ where: { roleTemplateId: corpTpl.id, version: 1 } })
      : null;

    if (corpV1) {
      await this.prisma.user.updateMany({
        where: { role: ROLE.CORPORATE_ADMIN, OR: [{ roleVersionId: null }, { roleVersionId: undefined as any }] },
        data: { roleVersionId: corpV1.id },
      });
    }

    // ✅ Ensure SUPER_ADMIN users have roleVersionId set (prevents empty permissions)
    const superTpl = await this.prisma.roleTemplate.findUnique({ where: { code: ROLE.SUPER_ADMIN } });
    const superV1 = superTpl
      ? await this.prisma.roleTemplateVersion.findFirst({ where: { roleTemplateId: superTpl.id, version: 1 } })
      : null;

    if (superV1) {
      await this.prisma.user.updateMany({
        where: { role: ROLE.SUPER_ADMIN, OR: [{ roleVersionId: null }, { roleVersionId: undefined as any }] },
        data: { roleVersionId: superV1.id },
      });

      // dev seed identity (optional)
      const email = "superadmin@zypocare.com";
      const temp = "ChangeMe@123";
      const hash = hashPassword(temp);

      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (!existing) {
        await this.prisma.user.create({
          data: {
            email,
            name: "ZypoCare Super Admin",
            role: ROLE.SUPER_ADMIN,
            roleVersionId: superV1.id,
            passwordHash: hash,
            mustChangePassword: false,
            isActive: true,
          },
        });
      } else {
        await this.prisma.user.update({
          where: { email },
          data: {
            role: ROLE.SUPER_ADMIN,
            roleVersionId: superV1.id,
            passwordHash: existing.passwordHash ?? hash,
            mustChangePassword: false,
            isActive: true,
          },
        });
      }
    }
  }
}
