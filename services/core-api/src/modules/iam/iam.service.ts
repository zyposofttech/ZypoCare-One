import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import { AuditService } from "../audit/audit.service";
import type { Principal } from "../auth/access-policy.service";
import { resolveBranchId } from "../../common/branch-scope.util";
import { PERM, ROLE } from "./iam.constants";
import {
  CreatePermissionDto,
  CreateRoleDto,
  CreateUserDto,
  UpdatePermissionDto,
  UpdateRoleDto,
  UpdateUserDto,
} from "./iam.dto";
import { generateTempPassword, hashPassword } from "./password.util";
import { RbacSyncService } from "./rbac/rbac-sync.service";

function lowerEmail(e: string) {
  return (e || "").trim().toLowerCase();
}

@Injectable()
export class IamService {
  constructor(
    @Inject("PRISMA") private prisma: PrismaClient,
    private audit: AuditService,
    private rbacSync: RbacSyncService,
  ) {}

  private normalizePermissionCode(input: string): string {
    const raw = String(input ?? "").trim();
    // Keep dot-form codes case-sensitive. For underscore codes, normalize to uppercase.
    if (!raw) throw new BadRequestException("Invalid permission code");
    return raw.includes(".") ? raw : raw.toUpperCase();
  }

  private isSuperAdmin(principal: Principal) {
    return principal.roleCode === ROLE.SUPER_ADMIN;
  }

  private canManagePermissionCatalog(principal: Principal) {
    return this.isSuperAdmin(principal) || (principal.permissions ?? []).includes(PERM.IAM_PERMISSION_MANAGE);
  }

  private assertPerm(principal: Principal, permission: string) {
    if (this.isSuperAdmin(principal)) return;
    if (!(principal.permissions ?? []).includes(permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`);
    }
  }

  private normalizePermissionCodes(codes: string[] | null | undefined): string[] {
    const arr = Array.isArray(codes) ? codes : [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const raw of arr) {
      const code = this.normalizePermissionCode(String(raw ?? ""));
      if (!seen.has(code)) {
        seen.add(code);
        out.push(code);
      }
    }
    return out;
  }

  /**
   * Enterprise guardrail: prevents privilege escalation by ensuring the actor cannot
   * create/update/assign a role containing permissions they themselves do not possess.
   */
  private assertCanGrantPermissions(principal: Principal, permissionCodes: string[]) {
    if (this.isSuperAdmin(principal)) return;
    const actorPerms = new Set(principal.permissions ?? []);
    const missing: string[] = [];
    for (const code of permissionCodes) {
      if (!actorPerms.has(code)) missing.push(code);
      if (missing.length >= 10) break;
    }
    if (missing.length) {
      throw new ForbiddenException(
        `Cannot grant permissions you do not have. Missing: ${missing.join(", ")}`,
      );
    }
  }

  private assertNoSelfAuthzChange(principal: Principal, targetUserId: string, dto: UpdateUserDto) {
    if (principal.userId !== targetUserId) return;
    // Prevent self privilege escalation / accidental lockout via admin APIs.
    if (dto.roleCode !== undefined || dto.branchId !== undefined || dto.isActive !== undefined) {
      throw new ForbiddenException("You cannot change your own role, branch, or active status");
    }
  }

  private ensureBranchScope(principal: Principal, branchId: string | null | undefined) {
    if (principal.roleScope === "BRANCH") {
      if (!principal.branchId) throw new ForbiddenException("Branch-scoped user missing branchId");
      if (!branchId) throw new BadRequestException("branchId is required for branch-scoped operations");
      if (branchId !== principal.branchId) throw new ForbiddenException("Cross-branch access is not allowed");
    }
  }

  private assertRoleTemplateScopeManageable(principal: Principal, templateScope: "GLOBAL" | "BRANCH") {
    // No behavior change for GLOBAL principals. Only prevent BRANCH principals from touching GLOBAL templates.
    if (principal.roleScope === "BRANCH" && templateScope === "GLOBAL") {
      throw new ForbiddenException("Branch-scoped principals cannot manage GLOBAL role templates");
    }
  }

  private normalizeRoleScope(input: any): "GLOBAL" | "BRANCH" {
    const scope = String(input ?? "").trim().toUpperCase();
    if (scope !== "GLOBAL" && scope !== "BRANCH") throw new BadRequestException("Invalid role scope");
    return scope as "GLOBAL" | "BRANCH";
  }


  async listRoles(principal: Principal) {
    // Read roles/templates that are ACTIVE; branch users will only see BRANCH roles.
    const where =
  principal.roleScope === "BRANCH"
    ? ({ roleTemplate: { scope: "BRANCH" }, status: "ACTIVE" } as const)
    : ({ status: "ACTIVE" } as const);


    const versions = await this.prisma.roleTemplateVersion.findMany({
      where,
      include: {
        roleTemplate: true,
        permissions: { include: { permission: true } },
      },
      orderBy: [{ roleTemplate: { code: "asc" } }, { version: "desc" }],
    });

    return versions.map((v: any) => ({
      roleCode: v.roleTemplate.code,
      roleName: v.roleTemplate.name,
      scope: v.roleTemplate.scope,
      version: v.version,
       permissions: v.permissions.map((p: any) => p.permission.code),
    }));
  }

   async listUsers(principal: Principal, q?: string, branchId?: string, includeStaff = false) {
    this.assertPerm(principal, PERM.IAM_USER_READ);

    const where: any = {};

    if (!includeStaff) {
      where.source = { not: "STAFF" as any };
    }

    if (principal.roleScope === "BRANCH") {
      where.branchId = principal.branchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    if (q) {
      where.OR = [
        { email: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
        isActive: true,
        source: true,
        staffId: true,
        createdAt: true,
      } as any,
    });
  }


  async createUser(principal: Principal, dto: CreateUserDto) {
    const email = lowerEmail(dto.email);
    if (!email) throw new BadRequestException("Email required");

    // Find ACTIVE role version by template code
    const roleCode = (dto.roleCode || "").trim().toUpperCase();
    const roleV = await this.prisma.roleTemplateVersion.findFirst({
      where: { status: "ACTIVE", roleTemplate: { code: roleCode } },
      include: { roleTemplate: true, permissions: { include: { permission: true } } },
    });
    if (!roleV) throw new BadRequestException(`Active role not found: ${roleCode}`);

    // Privilege escalation guard: non-super admins can only assign roles whose permissions are a subset of their own.
    const rolePermCodes = (roleV as any).permissions?.map((p: any) => p.permission?.code).filter(Boolean) ?? [];
    this.assertCanGrantPermissions(principal, rolePermCodes);

    // Branch isolation: branch-scoped principals may only create users in their own branch
    const branchId = dto.branchId ?? principal.branchId ?? null;
    if (roleV.roleTemplate.scope === "BRANCH") {
      if (!branchId) throw new BadRequestException("branchId is required for BRANCH role users");
    }
    this.ensureBranchScope(principal, branchId);

    // Additional safety: BRANCH principals cannot assign GLOBAL roles (e.g., SUPER_ADMIN)
    if (principal.roleScope === "BRANCH" && roleV.roleTemplate.scope === "GLOBAL") {
      throw new ForbiddenException("Branch admins cannot assign global roles");
    }

    // Temp password + must-change-password
    const tempPassword = generateTempPassword();
    const passwordHash = hashPassword(tempPassword);

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          name: dto.name,
          role: roleCode, // keep in sync
          branchId,
          staffId: dto.staffId ?? null,
          roleVersionId: roleV.id,
          passwordHash,
          mustChangePassword: true,
        },
      });

      await this.audit.log({
        branchId: branchId ?? principal.branchId ?? null,
        actorUserId: principal.userId,
        action: "IAM_USER_CREATED",
        entity: "User",
        entityId: user.id,
        meta: {
          after: {
            id: user.id,
            email,
            name: user.name,
            roleCode,
            roleVersionId: roleV.id,
            branchId,
            staffId: user.staffId ?? null,
            isActive: user.isActive,
          },
          rolePermCount: rolePermCodes.length,
        },
      });

      const returnTemp =
        process.env.IAM_RETURN_TEMP_PASSWORD === "true" || process.env.NODE_ENV !== "production";

      return {
        userId: user.id,
        email: user.email,
        tempPassword: returnTemp ? tempPassword : undefined,
      };
    } catch (e: any) {
      // Prisma unique constraint
      if (String(e?.code) === "P2002") throw new ConflictException("Email already exists");
      throw e;
    }
  }

  async updateUser(principal: Principal, id: string, dto: UpdateUserDto) {
    this.assertNoSelfAuthzChange(principal, id, dto);

    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: { roleVersion: { include: { roleTemplate: true } } },
    });
    if (!existing) throw new NotFoundException("User not found");

    // Branch isolation
    if (principal.roleScope === "BRANCH") {
      if ((existing.branchId ?? null) !== (principal.branchId ?? null)) {
        throw new ForbiddenException("Cross-branch access is not allowed");
      }
    }

    let newRoleVersionId: string | undefined;
    let newRoleCode: string | undefined;
    let newRolePermCodes: string[] | null = null;
    let newRoleScope: "GLOBAL" | "BRANCH" | null = null;

    if (dto.roleCode) {
      const roleCode = dto.roleCode.trim().toUpperCase();
      const roleV = await this.prisma.roleTemplateVersion.findFirst({
        where: { status: "ACTIVE", roleTemplate: { code: roleCode } },
        include: { roleTemplate: true, permissions: { include: { permission: true } } },
      });
      if (!roleV) throw new BadRequestException(`Active role not found: ${roleCode}`);

      if (principal.roleScope === "BRANCH" && roleV.roleTemplate.scope === "GLOBAL") {
        throw new ForbiddenException("Branch admins cannot assign global roles");
      }

      newRoleVersionId = roleV.id;
      newRoleCode = roleCode;
      newRoleScope = roleV.roleTemplate.scope as any;

      newRolePermCodes = (roleV as any).permissions?.map((p: any) => p.permission?.code).filter(Boolean) ?? [];
      this.assertCanGrantPermissions(principal, newRolePermCodes  ?? []);
    }

    const branchId = dto.branchId === undefined ? existing.branchId : dto.branchId;

    // Enforce: BRANCH-scoped roles must always have a branchId
    const effectiveRoleScope =
      (dto.roleCode ? newRoleScope : ((existing as any).roleVersion?.roleTemplate?.scope as any)) as
        | "GLOBAL"
        | "BRANCH"
        | null;
    if (effectiveRoleScope === "BRANCH" && !branchId) {
      throw new BadRequestException("branchId is required for BRANCH role users");
    }

    // if moving branches, enforce branch scope rules
    this.ensureBranchScope(principal, branchId ?? null);

    // RBAC cache/session invalidation:
    // bump authzVersion only when authorization-relevant fields change.
    const nextRoleVersionId = newRoleVersionId ?? existing.roleVersionId ?? null;
    const nextBranchId = dto.branchId === undefined ? (existing.branchId ?? null) : (dto.branchId ?? null);
    const nextIsActive = dto.isActive === undefined ? existing.isActive : dto.isActive;
    const shouldBumpAuthzVersion =
      (nextRoleVersionId ?? null) !== (existing.roleVersionId ?? null) ||
      nextBranchId !== (existing.branchId ?? null) ||
      nextIsActive !== existing.isActive;

    const data: any = {
      name: dto.name ?? undefined,
      isActive: dto.isActive ?? undefined,
      staffId: dto.staffId === undefined ? undefined : dto.staffId,
      branchId: dto.branchId === undefined ? undefined : dto.branchId,
      roleVersionId: newRoleVersionId ?? undefined,
      role: newRoleCode ?? undefined,
    };

    if (shouldBumpAuthzVersion) {
      data.authzVersion = { increment: 1 };
    }

    const updated = await this.prisma.user.update({ where: { id }, data });

    const beforeRoleCode = (existing as any).roleVersion?.roleTemplate?.code ?? (existing as any).role ?? null;
    const afterRoleCode = newRoleCode ?? beforeRoleCode;

    const before = {
      id: existing.id,
      email: existing.email,
      name: existing.name,
      roleCode: beforeRoleCode,
      roleVersionId: existing.roleVersionId ?? null,
      branchId: existing.branchId ?? null,
      staffId: existing.staffId ?? null,
      isActive: existing.isActive,
      authzVersion: existing.authzVersion,
    };
    const after = {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      roleCode: afterRoleCode,
      roleVersionId: updated.roleVersionId ?? null,
      branchId: updated.branchId ?? null,
      staffId: updated.staffId ?? null,
      isActive: updated.isActive,
      authzVersion: updated.authzVersion,
    };

    await this.audit.log({
      branchId: (updated.branchId ?? principal.branchId ?? null) as any,
      actorUserId: principal.userId,
      action: "IAM_USER_UPDATED",
      entity: "User",
      entityId: updated.id,
      meta: {
        before,
        after,
        changes: dto,
        authzVersionBumped: shouldBumpAuthzVersion,
        reason: dto.reason ?? undefined,
      },
    });

    if (dto.roleCode) {
      await this.audit.log({
        branchId: (updated.branchId ?? principal.branchId ?? null) as any,
        actorUserId: principal.userId,
        action: "IAM_USER_ROLE_ASSIGNED",
        entity: "User",
        entityId: updated.id,
        meta: { roleCode: dto.roleCode },
      });
    }

    return { ok: true };
  }

  async resetPassword(principal: Principal, id: string) {
    if (principal.userId === id) {
      throw new ForbiddenException("Use the change-password flow to update your own password");
    }

    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("User not found");

    if (principal.roleScope === "BRANCH") {
      if ((existing.branchId ?? null) !== (principal.branchId ?? null)) {
        throw new ForbiddenException("Cross-branch access is not allowed");
      }
    }

    const tempPassword = generateTempPassword();
    const passwordHash = hashPassword(tempPassword);

    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
        // Security-sensitive change: bump authzVersion so cached principals/sessions can be invalidated.
        authzVersion: { increment: 1 },
      },
    });

    await this.audit.log({
      branchId: (existing.branchId ?? principal.branchId ?? null) as any,
      actorUserId: principal.userId,
      action: "IAM_USER_PASSWORD_RESET",
      entity: "User",
      entityId: id,
      meta: {
        email: existing.email,
        before: { mustChangePassword: existing.mustChangePassword, authzVersion: existing.authzVersion },
        after: { mustChangePassword: true, authzVersionBumped: true },
      },
    });
    
    const returnTemp =
      process.env.IAM_RETURN_TEMP_PASSWORD === "true" || process.env.NODE_ENV !== "production";

    return { ok: true, tempPassword: returnTemp ? tempPassword : undefined };
  }
  async listPermissions(principal: Principal) {
    // Permissions are code-defined and synced to DB. For robustness,
    // allow privileged users to auto-sync before listing.
    if (this.canManagePermissionCatalog(principal) && process.env.RBAC_AUTO_SYNC_ON_LIST !== "false") {
      await this.rbacSync.syncPermissions();
    }

    return this.prisma.permission.findMany({
      orderBy: { code: "asc" },
    });
  }

  async syncPermissionCatalog(principal: Principal) {
    if (!this.canManagePermissionCatalog(principal)) {
      throw new ForbiddenException("Missing permission: IAM_PERMISSION_MANAGE");
    }

    const result = await this.rbacSync.syncPermissions();

    await this.audit.log({
      actorUserId: principal.userId,
      action: "IAM_PERMISSION_CATALOG_SYNC",
      entity: "Permission",
      entityId: null,
      meta: { result },
      branchId: principal.branchId ?? null,
    });

    return result;
  }

  async updatePermissionMetadata(principal: Principal, codeRaw: string, dto: UpdatePermissionDto) {
    const code = this.normalizePermissionCode(codeRaw);

    const existing = await this.prisma.permission.findUnique({ where: { code } });
    if (!existing) throw new NotFoundException(`Permission not found: ${code}`);

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.description !== undefined) data.description = dto.description;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException("No metadata fields to update");
    }

    const updated = await this.prisma.permission.update({ where: { code }, data });

    await this.audit.log({
      actorUserId: principal.userId,
      action: "IAM_PERMISSION_METADATA_UPDATED",
      entity: "Permission",
      entityId: updated.id,
      meta: {
        code: updated.code,
        updatedFields: Object.keys(data),
        before: {
          name: existing.name,
          category: existing.category,
          description: existing.description ?? null,
        },
        after: {
          name: updated.name,
          category: updated.category,
          description: updated.description ?? null,
        },
        reason: dto.reason ?? undefined,
      },
      branchId: principal.branchId ?? null,
    });

    return updated;
  }
  async getUser(principal: Principal, id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        branch: true,
        roleVersion: { include: { roleTemplate: true } },
      },
    });

    if (!user) throw new NotFoundException("User not found");

    // Enforce branch isolation
    if (principal.roleScope === "BRANCH") {
      if ((user.branchId ?? null) !== (principal.branchId ?? null)) {
        throw new ForbiddenException("Cross-branch access is not allowed");
      }
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      roleCode: user.roleVersion?.roleTemplate?.code ?? user.role,
      branchId: user.branchId ?? null,
      branchName: user.branch?.name ?? null,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
    async listBranches(principal: Principal) {
    const isSuperAdmin =
      principal.roleCode === ROLE.SUPER_ADMIN || principal.roleScope === "GLOBAL";

    const where =
      !isSuperAdmin && principal.branchId
        ? { id: principal.branchId }
        : !isSuperAdmin && !principal.branchId
          ? { id: "__none__" } // branch-scoped but missing branchId -> return empty
          : {};

    const rows = await this.prisma.branch.findMany({
      where,
      orderBy: [{ name: "asc" }],
      select: { id: true, code: true, name: true, city: true },
    });

    return rows.map((b) => ({
      id: b.id,
      code: String(b.code),
      name: b.name,
      city: b.city ?? undefined,
    }));
  }

  async getBranch(principal: Principal, id: string) {
    // Enforce branch isolation for branch-scoped users
    this.ensureBranchScope(principal, id);

    const b = await this.prisma.branch.findUnique({
      where: { id },
      select: { id: true, code: true, name: true, city: true, createdAt: true, updatedAt: true },
    });
    if (!b) throw new NotFoundException("Branch not found");

    return {
      id: b.id,
      code: String(b.code),
      name: b.name,
      city: b.city ?? undefined,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    };
  }

  async listAudit(
    principal: Principal,
    params: { entity?: string; entityId?: string; actorUserId?: string; action?: string; branchId?: string; take?: number }
  ) {
    const where: any = {};
    
    // Branch isolation for audit logs
    if (principal.roleScope === "BRANCH") {
      // Preserve legacy behavior: missing branchId -> empty result, not an exception.
      if (!principal.branchId) {
        where.branchId = "__none__";
      } else {
        // Optional filter for BRANCH scope: must match principal.branchId
        if (params.branchId) {
          resolveBranchId(principal, params.branchId);
        }
        where.branchId = principal.branchId;
      }
    } else {
      // GLOBAL scope: optional branchId filter
      const resolved = resolveBranchId(principal, params.branchId ?? null);
      if (resolved) where.branchId = resolved;
    }

    if (params.entity) where.entity = params.entity;
    if (params.entityId) where.entityId = params.entityId;
    if (params.actorUserId) where.actorUserId = params.actorUserId;
    if (params.action) where.action = params.action;

    // Assuming your audit table is named 'auditLog' or similar in Prisma
    return this.prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: params.take || 50,
    });
  }
  async createRole(principal: Principal, dto: CreateRoleDto) {
    const code = dto.roleCode.trim().toUpperCase();

    const scope = this.normalizeRoleScope(dto.scope);
    this.assertRoleTemplateScopeManageable(principal, scope);

    // 2. Check existence
    const existing = await this.prisma.roleTemplate.findUnique({
      where: { code },
    });
    if (existing) throw new ConflictException(`Role code ${code} already exists`);

    // 3. Resolve Permission IDs from Codes
    const requestedCodes = this.normalizePermissionCodes(dto.permissions);
    this.assertCanGrantPermissions(principal, requestedCodes);

    let perms = await this.prisma.permission.findMany({
      where: { code: { in: requestedCodes } },
    });

    if (perms.length !== requestedCodes.length) {
      // If new permissions were added in code but DB is not synced yet, auto-sync for privileged users.
      if (this.canManagePermissionCatalog(principal)) {
        await this.rbacSync.syncPermissions();
        perms = await this.prisma.permission.findMany({ where: { code: { in: requestedCodes } } });
      }
    }

    if (perms.length !== requestedCodes.length) {
      const found = new Set(perms.map((p) => p.code));
      const missing = requestedCodes.filter((c) => !found.has(c)).slice(0, 20);
      throw new BadRequestException(
        `One or more invalid permission codes. Missing: ${missing.join(", ")}${missing.length >= 20 ? " ..." : ""}`,
      );
    }

    // 4. Transaction: Create Template + Version 1 + Links
    return this.prisma.$transaction(async (tx) => {
      const template = await tx.roleTemplate.create({
        data: {
          code,
          name: dto.roleName,
          scope,
        },
      });

      const version = await tx.roleTemplateVersion.create({
        data: {
          roleTemplateId: template.id,
          version: 1,
          status: "ACTIVE",
          permissions: {
            create: perms.map((p) => ({ permissionId: p.id })),
          },
        },
      });

      await this.audit.log(
        {
        actorUserId: principal.userId,
        action: "IAM_ROLE_CREATED",
        entity: "RoleTemplate",
        entityId: template.id,
        meta: {
          code,
          version: 1,
          scope,
          permissions: requestedCodes,
          reason: (dto as any).reason ?? undefined,
        },
        branchId: principal.branchId ?? null,
        },
        tx,
      );

      return { roleCode: template.code };
    });
  }

  // ✅ ADD THIS METHOD
  async updateRole(principal: Principal, code: string, dto: UpdateRoleDto) {
    const roleCode = code.trim().toUpperCase();

    const current = await this.prisma.roleTemplateVersion.findFirst({
      where: { roleTemplate: { code: roleCode }, status: "ACTIVE" },
      include: {
        roleTemplate: true,
        permissions: { include: { permission: true } },
      },
    });

    if (!current) throw new NotFoundException("Role not found or no active version");

    // ------------------------------
    // System role protection
    // ------------------------------
    // Prevent accidental edits of built-in roles (SUPER_ADMIN / CORPORATE_ADMIN / BRANCH_ADMIN / IT_ADMIN).
    // You can explicitly allow edits in a non-prod environment by setting:
    //   IAM_ALLOW_SYSTEM_ROLE_EDIT=true
    const systemCodes = new Set<string>([
      ROLE.SUPER_ADMIN,
      (ROLE as any).CORPORATE_ADMIN ?? "CORPORATE_ADMIN",
      (ROLE as any).BRANCH_ADMIN ?? "BRANCH_ADMIN",
      (ROLE as any).IT_ADMIN ?? "IT_ADMIN",
    ]);

    const isSystemRole = Boolean((current as any).roleTemplate?.isSystem) || systemCodes.has(roleCode);
    if (isSystemRole) {
      if (principal.roleCode !== ROLE.SUPER_ADMIN) {
        throw new ForbiddenException("System roles can only be modified by SUPER_ADMIN");
      }
      const allow = process.env.IAM_ALLOW_SYSTEM_ROLE_EDIT === "true";
      if (!allow) {
        throw new ForbiddenException(
          "System role editing is disabled. Set IAM_ALLOW_SYSTEM_ROLE_EDIT=true to enable explicitly.",
        );
      }
    }

    // BRANCH principals must not manage GLOBAL templates (no behavior change for GLOBAL principals)
    this.assertRoleTemplateScopeManageable(principal, current.roleTemplate.scope as any);

    // Prepare permission IDs:
    // - if permissions provided: validate codes and use them
    // - else: carry forward current active permission set (prevents accidental wipe)
    const beforePermCodes =
      (current as any).permissions?.map((p: any) => p.permission?.code).filter(Boolean) ?? [];

    let permIds: string[] = [];
    let afterPermCodes: string[] = beforePermCodes;
    if (dto.permissions) {
      const requestedCodes = this.normalizePermissionCodes(dto.permissions);
      this.assertCanGrantPermissions(principal, requestedCodes);

      let perms = await this.prisma.permission.findMany({
        where: { code: { in: requestedCodes } },
      });
      if (perms.length !== requestedCodes.length) {
        if (this.canManagePermissionCatalog(principal)) {
          await this.rbacSync.syncPermissions();
          perms = await this.prisma.permission.findMany({ where: { code: { in: requestedCodes } } });
        }
      }
      if (perms.length !== requestedCodes.length) {
        const found = new Set(perms.map((p) => p.code));
        const missing = requestedCodes.filter((c) => !found.has(c)).slice(0, 20);
        throw new BadRequestException(
          `One or more invalid permission codes. Missing: ${missing.join(", ")}${missing.length >= 20 ? " ..." : ""}`,
        );
      }
      permIds = perms.map((p) => p.id);
      afterPermCodes = requestedCodes;
    } else {
      permIds =
        (current as any).permissions?.map((p: any) => p.permissionId ?? p.permission?.id).filter(Boolean) ?? [];
    }

    await this.prisma.$transaction(async (tx) => {
      // Retire current version
      await tx.roleTemplateVersion.update({
        where: { id: current.id },
        data: { status: "RETIRED" },
      });

      // Create new version
      const newVersion = await tx.roleTemplateVersion.create({
        data: {
          roleTemplateId: current.roleTemplateId,
          version: current.version + 1,
          status: "ACTIVE",
          permissions: {
            create: permIds.map((id) => ({ permissionId: id })),
          },
        },
      });

      // Re-point all users currently assigned to the retired version to the new ACTIVE version.
      // This ensures permission updates take effect immediately without manual user reassignment.
      const usersReassigned = await tx.user.updateMany({
        where: { roleVersionId: current.id },
        data: {
          roleVersionId: newVersion.id,
          role: roleCode,
          // Bump authzVersion so cached principals / sessions can be invalidated.
          authzVersion: { increment: 1 },
        },
      });

      // Update template name if requested
      if (dto.roleName && dto.roleName !== current.roleTemplate.name) {
        await tx.roleTemplate.update({
          where: { id: current.roleTemplateId },
          data: { name: dto.roleName },
        });
      }

      await this.audit.log(
        {
        actorUserId: principal.userId,
        action: "IAM_ROLE_UPDATED",
        entity: "RoleTemplate",
        entityId: current.roleTemplateId,
        meta: {
          code: roleCode,
          oldVersion: current.version,
          newVersion: newVersion.version,
          before: {
            roleName: current.roleTemplate.name,
            permissions: beforePermCodes,
          },
          after: {
            roleName: dto.roleName ?? current.roleTemplate.name,
            permissions: afterPermCodes,
          },
          usersReassigned: usersReassigned.count,
          reason: (dto as any).reason ?? undefined,
        },
        branchId: principal.branchId ?? null,
        },
        tx,
      );
    });

    return { ok: true };
  }
  async createPermission(principal: Principal, dto: CreatePermissionDto) {
    // Enterprise guardrail: in production, permissions are managed via code-defined
    // catalog sync + metadata updates, not ad-hoc creation.
    const allowCreate =
      process.env.IAM_ALLOW_PERMISSION_CREATE === "true" || process.env.NODE_ENV !== "production";
    if (!allowCreate) {
      throw new ForbiddenException(
        "Permission creation is disabled in production. Use /iam/permissions/sync and metadata updates.",
      );
    }

    const code = this.normalizePermissionCode(dto.code);
    
    // Check for duplicates
    const existing = await this.prisma.permission.findUnique({ where: { code } });
    if (existing) throw new ConflictException(`Permission ${code} already exists`);

    // Create
    const perm = await this.prisma.permission.create({
      data: {
        code,
        name: dto.name,
        category: dto.category,
        description: dto.description,
      },
    });

    // Audit
    await this.audit.log({
      actorUserId: principal.userId,
      action: "IAM_PERMISSION_CREATED",
      entity: "Permission",
      entityId: perm.id,
      meta: { code: perm.code, category: perm.category, reason: (dto as any).reason ?? undefined },
      branchId: principal.branchId ?? null,
    });

    return perm;
  }
}
