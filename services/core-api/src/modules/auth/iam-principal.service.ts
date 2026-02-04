import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import { PERM, ROLE } from "../iam/iam.constants";
import type { Principal } from "./access-policy.service";
import { RedisService } from "./redis.service";

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

@Injectable()
export class IamPrincipalService {
  private readonly principalCache = new Map<string, CacheEntry<Principal>>();
  private allPermsCache: CacheEntry<string[]> | null = null;

  private readonly ttlMs = Number(process.env.PRINCIPAL_CACHE_TTL_MS ?? 5 * 60 * 1000);
  private readonly maxEntries = Number(process.env.PRINCIPAL_CACHE_MAX ?? 4000);
  private readonly allPermsTtlMs = Number(process.env.ALL_PERMS_CACHE_TTL_MS ?? 5 * 60 * 1000);

  constructor(
    @Inject("PRISMA") private prisma: PrismaClient,
    private readonly redis: RedisService,
  ) {}

  private now() {
    return Date.now();
  }

  private cacheKey(userId: string, authzVersion: number) {
    return `principal:${userId}:${authzVersion}`;
  }

  private async getRedisPrincipal(key: string): Promise<Principal | null> {
    if (!this.redis.isEnabled()) return null;
    return this.redis.getJson<Principal>(key);
  }

  private async setRedisPrincipal(key: string, principal: Principal) {
    if (!this.redis.isEnabled()) return;
    await this.redis.setJson(key, principal, this.ttlMs);
  }

  private getCached(key: string): Principal | null {
    const entry = this.principalCache.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.principalCache.delete(key);
      return null;
    }
    return entry.value;
  }

  private setCached(key: string, principal: Principal) {
    this.principalCache.set(key, { value: principal, expiresAt: this.now() + this.ttlMs });

    // Basic size cap: drop oldest keys if we exceed the max.
    if (this.principalCache.size > this.maxEntries) {
      const overflow = this.principalCache.size - this.maxEntries;
      let n = Math.max(overflow, Math.ceil(this.maxEntries * 0.1));
      for (const k of this.principalCache.keys()) {
        this.principalCache.delete(k);
        n--;
        if (n <= 0) break;
      }
    }
  }

  private async getAllPermissionCodes(): Promise<string[]> {
    const now = this.now();
    if (this.allPermsCache && this.allPermsCache.expiresAt > now) return this.allPermsCache.value;

    // L2 cache (Redis) for horizontal scaling
    if (this.redis.isEnabled()) {
      const cached = await this.redis.getJson<string[]>("auth:all-perms");
      if (cached && Array.isArray(cached)) {
        this.allPermsCache = { value: cached, expiresAt: now + this.allPermsTtlMs };
        return cached;
      }
    }

    const all = await this.prisma.permission.findMany({ select: { code: true } });
    const codes = all.map((p) => p.code);
    this.allPermsCache = { value: codes, expiresAt: now + this.allPermsTtlMs };

    if (this.redis.isEnabled()) {
      // Store separately with its own TTL
      await this.redis.setJson("auth:all-perms", codes, this.allPermsTtlMs);
    }

    return codes;
  }

  private async buildPrincipalFromUser(fullUser: any, authzVersion: number): Promise<Principal> {
    // Normalize roleCode to stable uppercase string
    let roleCode = (fullUser.roleVersion?.roleTemplate?.code ?? (fullUser.role as any) ?? null) as string | null;
    roleCode = roleCode ? roleCode.trim().toUpperCase() : null;

    let roleScope = (fullUser.roleVersion?.roleTemplate?.scope as any) ?? null;
    let roleVersionId = fullUser.roleVersionId ?? null;

    // IMPORTANT: do NOT change permission code case.
    let perms: string[] =
      (fullUser.roleVersion?.permissions || [])
        .filter((rp: any) => rp.allowed !== false)
        .map((rp: any) => rp.permission.code) ?? [];

    // Fallback: if user has role but no roleVersionId, resolve latest ACTIVE role version
    if (!roleVersionId && roleCode) {
      const tpl = await this.prisma.roleTemplate.findUnique({ where: { code: roleCode } });
      if (tpl) {
        const rv = await this.prisma.roleTemplateVersion.findFirst({
          where: { roleTemplateId: tpl.id, status: "ACTIVE" },
          orderBy: { version: "desc" },
          include: {
            roleTemplate: true,
            permissions: { include: { permission: true } },
          },
        });

        if (rv) {
          roleVersionId = rv.id;
          roleScope = (rv.roleTemplate?.scope as any) ?? roleScope;
          perms = (rv.permissions || [])
            .filter((rp: any) => rp.allowed !== false)
            .map((rp: any) => rp.permission.code);
        }
      }
    }

    // Infer scope if still missing
    if (!roleScope) {
      const corporateRole = (ROLE as any).CORPORATE_ADMIN ?? "CORPORATE_ADMIN";
      if (roleCode === ROLE.SUPER_ADMIN || roleCode === corporateRole) roleScope = "GLOBAL";
      else if (fullUser.branchId) roleScope = "BRANCH";
    }

    /**
     * ✅ SUPER_ADMIN bootstrap safety (request path):
     * - Always include ALL code-defined permission codes (PERM)
     * - Also union all DB permission rows (for extensions)
     *
     * This guarantees SUPER_ADMIN never gets stuck in a chicken-egg state
     * where RBAC pages/menu/actions are hidden because the permissions table
     * isn't seeded/synced yet.
     */
    if (roleCode === ROLE.SUPER_ADMIN) {
      const allDb = await this.getAllPermissionCodes();
      const allCodeDefined = Object.values(PERM);
      perms = Array.from(new Set([...(perms || []), ...allDb, ...allCodeDefined]));
      roleScope = roleScope ?? "GLOBAL";
    }

    const uniquePerms = Array.from(new Set(perms || []));

    // Multi-branch branchIds derived from active UserRoleBinding rows (if present)
    const now = new Date();
    const rawBindings = (u as any).roleBindings ?? [];
    const activeBindings = Array.isArray(rawBindings)
      ? rawBindings.filter((b: any) =>
          !!b.branchId &&
          (!b.effectiveFrom || new Date(b.effectiveFrom).getTime() <= now.getTime()) &&
          (!b.effectiveTo || new Date(b.effectiveTo).getTime() >= now.getTime()),
        )
      : [];
    const branchIds = Array.from(new Set(activeBindings.map((b: any) => b.branchId)));
    const primaryBinding = activeBindings.find((b: any) => b.isPrimary) ?? activeBindings[0] ?? null;
    const effectiveBranchId = primaryBinding?.branchId ?? (u.branchId ?? null);

    return {
      userId: fullUser.id,
      email: fullUser.email,
      name: fullUser.name,
      branchId: effectiveBranchId,
      branchIds: branchIds.length ? branchIds : undefined,
      roleCode,
      roleScope,
      roleVersionId,
      authzVersion,
      permissions: uniquePerms,
    };
  }

  /**
   * Primary entrypoint for requests (fast path): loads by userId, enforces authzVersion token invalidation,
   * then returns cached principal keyed by (userId, authzVersion).
   */
  async loadPrincipalByUserId(userIdRaw: string, tokenAuthzVersion?: any): Promise<Principal | null> {
    const userId = (userIdRaw || "").trim();
    if (!userId) return null;

    // Cheap auth state query (no heavy joins)
    const u0 = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        branchId: true,
        role: true,
        roleVersionId: true,
        isActive: true,
        authzVersion: true as any,
      },
    });

    if (!u0) return null;
    if (u0.isActive === false) return null;

    const authzVersion = Number((u0 as any).authzVersion ?? 1);

    // Token invalidation on auth changes.
    // Default: enforced. Can be disabled temporarily by setting AUTHZ_TOKEN_ENFORCE=false.
    const enforce = process.env.AUTHZ_TOKEN_ENFORCE !== "false";
    if (enforce) {
      const t = tokenAuthzVersion === undefined ? 0 : Number(tokenAuthzVersion);
      const tokenVer = Number.isFinite(t) ? t : 0;
      if (tokenVer < authzVersion) {
        throw new UnauthorizedException("Session expired (authorization changed)");
      }
    }

    const key = this.cacheKey(u0.id, authzVersion);
    const cached = this.getCached(key);
    if (cached) return cached;

    // L2 redis cache
    const fromRedis = await this.getRedisPrincipal(key);
    if (fromRedis) {
      this.setCached(key, fromRedis);
      return fromRedis;
    }

    const full = await this.prisma.user.findUnique({
      where: { id: u0.id },
      include: {
        roleVersion: {
          include: {
            roleTemplate: true,
            permissions: { include: { permission: true } },
          },
        },
        roleBindings: {
          where: {
            scope: "BRANCH",
          },
          select: { branchId: true, isPrimary: true, effectiveFrom: true, effectiveTo: true },
        },
      },
    });

    if (!full) return null;
    if ((full as any).isActive === false) return null;

    const principal = await this.buildPrincipalFromUser(full, authzVersion);
    this.setCached(key, principal);
    await this.setRedisPrincipal(key, principal);
    return principal;
  }

  /**
   * Builds the effective Principal (roleCode + roleScope + permissions) for an authenticated user.
   *
   * Source of truth:
   *  - roleVersionId -> roleTemplateVersion permissions
   *  - fallback: resolve latest ACTIVE roleTemplateVersion by roleTemplate.code
   *  - safety: SUPER_ADMIN always gets all code-defined perms (PERM) + all DB perms
   *
   * Returns null for non-existent or disabled users.
   */
  async loadPrincipalByEmail(emailRaw: string): Promise<Principal | null> {
    const email = (emailRaw || "").trim().toLowerCase();
    if (!email) return null;

    const u = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roleVersion: {
          include: {
            roleTemplate: true,
            permissions: { include: { permission: true } },
          },
        },
        roleBindings: {
          where: {
            scope: "BRANCH",
          },
          select: { branchId: true, isPrimary: true, effectiveFrom: true, effectiveTo: true },
        },
      },
    });

    if (!u) return null;
    if (u.isActive === false) return null;

    let roleCode = (u.roleVersion?.roleTemplate?.code ?? (u.role as any) ?? null) as string | null;
    roleCode = roleCode ? roleCode.trim().toUpperCase() : null;

    let roleScope = (u.roleVersion?.roleTemplate?.scope as any) ?? null;
    let roleVersionId = u.roleVersionId ?? null;

    let perms: string[] =
      (u.roleVersion?.permissions || [])
        .filter((rp: any) => rp.allowed !== false)
        .map((rp: any) => rp.permission.code) ?? [];

    // Fallback: if user has role but no roleVersionId, resolve latest ACTIVE role version
    if (!roleVersionId && roleCode) {
      const tpl = await this.prisma.roleTemplate.findUnique({ where: { code: roleCode } });
      if (tpl) {
        const rv = await this.prisma.roleTemplateVersion.findFirst({
          where: { roleTemplateId: tpl.id, status: "ACTIVE" },
          orderBy: { version: "desc" },
          include: {
            roleTemplate: true,
            permissions: { include: { permission: true } },
          },
        });

        if (rv) {
          roleVersionId = rv.id;
          roleScope = (rv.roleTemplate?.scope as any) ?? roleScope;
          perms = (rv.permissions || [])
            .filter((rp: any) => rp.allowed !== false)
            .map((rp: any) => rp.permission.code);
        }
      }
    }

    // Infer scope if still missing
    if (!roleScope) {
      const corporateRole = (ROLE as any).CORPORATE_ADMIN ?? "CORPORATE_ADMIN";
      if (roleCode === ROLE.SUPER_ADMIN || roleCode === corporateRole) roleScope = "GLOBAL";
      else if (u.branchId) roleScope = "BRANCH";
    }

    /**
     * ✅ SUPER_ADMIN bootstrap safety:
     * - Always include ALL code-defined permission codes (PERM)
     * - Also union all DB permission rows (if you have custom extensions)
     *
     * This guarantees the Access UI never gets stuck in a chicken-egg state
     * where "sync" buttons are hidden because the permissions table isn't seeded yet.
     */
    if (roleCode === ROLE.SUPER_ADMIN) {
      const allDb = await this.prisma.permission.findMany({ select: { code: true } });
      const allCodeDefined = Object.values(PERM);

      perms = Array.from(new Set([...(perms || []), ...allDb.map((p) => p.code), ...allCodeDefined]));
      roleScope = roleScope ?? "GLOBAL";
    }

    const uniquePerms = Array.from(new Set(perms || []));

    // Multi-branch branchIds derived from active UserRoleBinding rows (if present)
    const now = new Date();
    const rawBindings = (u as any).roleBindings ?? [];
    const activeBindings = Array.isArray(rawBindings)
      ? rawBindings.filter((b: any) =>
          !!b.branchId &&
          (!b.effectiveFrom || new Date(b.effectiveFrom).getTime() <= now.getTime()) &&
          (!b.effectiveTo || new Date(b.effectiveTo).getTime() >= now.getTime()),
        )
      : [];
    const branchIds = Array.from(new Set(activeBindings.map((b: any) => b.branchId)));
    const primaryBinding = activeBindings.find((b: any) => b.isPrimary) ?? activeBindings[0] ?? null;
    const effectiveBranchId = primaryBinding?.branchId ?? (u.branchId ?? null);

    return {
      userId: u.id,
      email: u.email,
      name: u.name,
      branchId: effectiveBranchId,
      branchIds: branchIds.length ? branchIds : undefined,
      roleCode,
      roleScope,
      roleVersionId,
      permissions: uniquePerms,
      authzVersion: (u as any).authzVersion ?? 1,
    };
  }
}
