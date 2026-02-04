import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { IamService } from "../../iam/iam.service";
import { InfraContextService } from "../shared/infra-context.service";
import { ProvisionUserDto, StaffOnboardDto } from "./staff.dto";

function lowerEmail(email?: string | null) {
  const x = (email || "").trim().toLowerCase();
  return x.length ? x : null;
}

function parseIsoOrNow(x?: string | null) {
  if (!x) return new Date();
  const d = new Date(x);
  if (Number.isNaN(d.getTime())) throw new BadRequestException("Invalid ISO date");
  return d;
}

@Injectable()
export class StaffService {
  constructor(
    private readonly ctx: InfraContextService,
    private readonly iam: IamService,
  ) {}

  // ---------------------------------------------------------------------------
  // Staff onboarding (creates Staff + Assignments)
  // ---------------------------------------------------------------------------

  async onboard(principal: Principal, dto: StaffOnboardDto) {
    if (!Array.isArray(dto.assignments) || dto.assignments.length === 0) {
      throw new BadRequestException("At least one branch assignment is required");
    }

    // BRANCH-scope users cannot create multi-branch staff.
    if (principal.roleScope === "BRANCH") {
      const bad = dto.assignments.find((a) => a.branchId !== principal.branchId);
      if (bad) throw new ForbiddenException("Branch admins can only onboard staff for their own branch");
    }

    // Normalize primary assignment
    const assignments = dto.assignments.map((a) => ({ ...a }));
    const primaryCount = assignments.filter((a) => a.isPrimary).length;
    if (primaryCount > 1) {
      // Keep first primary, drop the rest
      let seen = false;
      for (const a of assignments) {
        if (a.isPrimary && !seen) seen = true;
        else if (a.isPrimary && seen) a.isPrimary = false;
      }
    }
    if (assignments.every((a) => !a.isPrimary)) assignments[0].isPrimary = true;

    // Basic branch/facility/department/specialty validation for each assignment.
    for (const a of assignments) {
      if (!a.branchId) throw new BadRequestException("assignment.branchId is required");

      // Ensure branch exists
      const br = await this.ctx.prisma.branch.findUnique({ where: { id: a.branchId }, select: { id: true } });
      if (!br) throw new BadRequestException(`Invalid branchId: ${a.branchId}`);

      if (a.facilityId) {
        const bf = await this.ctx.prisma.branchFacility.findFirst({
          where: { branchId: a.branchId, facilityId: a.facilityId, isEnabled: true },
          select: { id: true },
        });
        if (!bf) {
          throw new BadRequestException(
            `Facility is not enabled for this branch (facilityId=${a.facilityId}, branchId=${a.branchId})`,
          );
        }
      }

      if (a.departmentId) {
        const dep = await this.ctx.prisma.department.findUnique({
          where: { id: a.departmentId },
          select: { id: true, branchId: true, facilityId: true },
        });
        if (!dep) throw new BadRequestException(`Invalid departmentId: ${a.departmentId}`);
        if (dep.branchId !== a.branchId) throw new BadRequestException("departmentId does not belong to branchId");
        if (a.facilityId && dep.facilityId !== a.facilityId) {
          throw new BadRequestException("departmentId does not belong to facilityId");
        }
      }

      if (a.specialtyId) {
        const sp = await this.ctx.prisma.specialty.findUnique({
          where: { id: a.specialtyId },
          select: { id: true, branchId: true },
        });
        if (!sp) throw new BadRequestException(`Invalid specialtyId: ${a.specialtyId}`);
        if (sp.branchId !== a.branchId) throw new BadRequestException("specialtyId does not belong to branchId");
      }

      // Basic date sanity
      const from = parseIsoOrNow(a.effectiveFrom);
      const to = a.effectiveTo ? parseIsoOrNow(a.effectiveTo) : null;
      if (to && to.getTime() < from.getTime()) throw new BadRequestException("effectiveTo must be >= effectiveFrom");
    }

    const email = lowerEmail(dto.email);
    const staffNo = (dto.staffNo || "").trim() || null;
    const hprId = (dto.hprId || "").trim() || null;

    // Best-effort dedupe: staffNo OR email OR hprId
    const existing = await this.ctx.prisma.staff.findFirst({
      where: {
        OR: [
          ...(staffNo ? [{ staffNo }] : []),
          ...(email ? [{ email }] : []),
          ...(hprId ? [{ hprId }] : []),
        ],
      },
      include: { assignments: true },
    });

    try {
      const saved = await this.ctx.prisma.$transaction(async (tx) => {
        const staff = existing
          ? await tx.staff.update({
              where: { id: existing.id },
              data: {
                staffNo: staffNo ?? undefined,
                fullName: dto.fullName.trim(),
                displayName: dto.displayName?.trim() || undefined,
                category: (dto.category as any) ?? undefined,
                engagementType: (dto.engagementType as any) ?? undefined,
                status: (dto.status as any) ?? undefined,
                phone: (dto.phone || "").trim() || undefined,
                email: email ?? undefined,
                homeBranchId: dto.homeBranchId ?? undefined,
                hprId: hprId ?? undefined,
                designationPrimary: dto.designationPrimary ?? undefined,
                notes: dto.notes ?? undefined,
              },
            })
          : await tx.staff.create({
              data: {
                staffNo,
                fullName: dto.fullName.trim(),
                displayName: dto.displayName?.trim() || null,
                category: (dto.category as any) ?? "MEDICAL",
                engagementType: (dto.engagementType as any) ?? "EMPLOYEE",
                status: (dto.status as any) ?? "ACTIVE",
                phone: (dto.phone || "").trim() || null,
                email,
                homeBranchId: dto.homeBranchId ?? null,
                hprId,
                designationPrimary: dto.designationPrimary ?? null,
                notes: dto.notes ?? null,
              },
            });

        // Create new assignments (do not delete existing ones; history matters)
        for (const a of assignments) {
          await tx.staffAssignment.create({
            data: {
              staffId: staff.id,
              branchId: a.branchId,
              facilityId: a.facilityId ?? null,
              departmentId: a.departmentId ?? null,
              specialtyId: a.specialtyId ?? null,
              designation: a.designation ?? null,
              branchEmpCode: a.branchEmpCode ?? null,
              assignmentType: (a.assignmentType as any) ?? "PERMANENT",
              status: (a.status as any) ?? "ACTIVE",
              isPrimary: !!a.isPrimary,
              effectiveFrom: parseIsoOrNow(a.effectiveFrom),
              effectiveTo: a.effectiveTo ? parseIsoOrNow(a.effectiveTo) : null,
              createdByUserId: principal.userId,
            },
          });
        }

        const out = await tx.staff.findUnique({
          where: { id: staff.id },
          include: { assignments: { orderBy: [{ isPrimary: "desc" }, { effectiveFrom: "desc" }] } },
        });

        return out!;
      });

      await this.ctx.audit.log({
        branchId: null,
        actorUserId: principal.userId,
        action: existing ? "STAFF_UPDATE" : "STAFF_CREATE",
        entity: "Staff",
        entityId: saved.id,
        meta: {
          staffNo: saved.staffNo,
          email: saved.email,
          assignmentCount: saved.assignments?.length ?? 0,
        },
      });

      return saved;
    } catch (e: any) {
      if (String(e?.code) === "P2002") {
        throw new ConflictException("Duplicate staffNo/email/hprId (unique constraint)");
      }
      throw e;
    }
  }

  // ---------------------------------------------------------------------------
  // Provision user for staff (preview + create)
  // ---------------------------------------------------------------------------

  private async buildProvisionPlan(staffId: string, primaryBranchId?: string | null) {
    const now = new Date();
    const staff = await this.ctx.prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        assignments: {
          where: {
            status: "ACTIVE",
            AND: [
              { effectiveFrom: { lte: now } },
              { OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] },
            ],
          },
          orderBy: [{ isPrimary: "desc" }, { effectiveFrom: "desc" }],
        },
        user: { select: { id: true, email: true, isActive: true } },
      },
    });
    if (!staff) throw new NotFoundException("Staff not found");

    if (!staff.assignments?.length) {
      throw new BadRequestException("Staff has no ACTIVE branch assignments");
    }

    // Choose primary assignment
    let primary = staff.assignments.find((a) => a.isPrimary) ?? staff.assignments[0];
    if (primaryBranchId) {
      const hit = staff.assignments.find((a) => a.branchId === primaryBranchId);
      if (hit) primary = hit;
    }

    // One binding per branch (anchor to the most-relevant assignment in that branch)
    const byBranch = new Map<string, any>();
    for (const a of staff.assignments) {
      const cur = byBranch.get(a.branchId);
      if (!cur) {
        byBranch.set(a.branchId, a);
        continue;
      }
      // prefer primary assignment, otherwise newer effectiveFrom
      const curScore = (cur.isPrimary ? 10 : 0) + (cur.effectiveFrom ? 1 : 0);
      const aScore = (a.isPrimary ? 10 : 0) + (a.effectiveFrom ? 1 : 0);
      if (a.branchId === primary.branchId && a.isPrimary) {
        byBranch.set(a.branchId, a);
      } else if (aScore >= curScore && (a.effectiveFrom?.getTime?.() ?? 0) >= (cur.effectiveFrom?.getTime?.() ?? 0)) {
        byBranch.set(a.branchId, a);
      }
    }

    const bindings = Array.from(byBranch.values()).map((a) => ({
      branchId: a.branchId,
      staffAssignmentId: a.id,
      isPrimary: a.id === primary.id,
      effectiveFrom: a.effectiveFrom,
      effectiveTo: a.effectiveTo,
    }));

    return { staff, primary, bindings };
  }

  async provisionUserPreview(principal: Principal, staffId: string, dto: ProvisionUserDto) {
    if (!dto?.email) throw new BadRequestException("Email is required");
    const email = lowerEmail(dto.email);
    if (!email) throw new BadRequestException("Invalid email");

    const plan = await this.buildProvisionPlan(staffId, dto.primaryBranchId ?? null);

    // BRANCH users can only provision for their own branch (single-branch plan)
    if (principal.roleScope === "BRANCH") {
      const bad = plan.bindings.find((b) => b.branchId !== principal.branchId);
      if (bad) throw new ForbiddenException("Branch admins can provision users only for their own branch");
    }

    const existingUser = await this.ctx.prisma.user.findFirst({
      where: {
        OR: [{ email }, { staffId }],
      },
      select: { id: true, email: true, staffId: true, isActive: true },
    });

    // Check role exists (ACTIVE)
    const roleCode = (dto.roleCode || "").trim().toUpperCase();
    const roleV = await this.ctx.prisma.roleTemplateVersion.findFirst({
      where: { status: "ACTIVE", roleTemplate: { code: roleCode } },
      include: { roleTemplate: true },
    });

    return {
      ok: !existingUser,
      existingUser,
      staff: {
        id: plan.staff.id,
        fullName: plan.staff.fullName,
        email: plan.staff.email,
        phone: plan.staff.phone,
        status: plan.staff.status,
      },
      role: roleV
        ? { roleCode, scope: roleV.roleTemplate.scope, roleVersionId: roleV.id }
        : { roleCode, error: "Role not found or not ACTIVE" },
      primaryBranchId: plan.primary.branchId,
      bindings: plan.bindings,
      notes: existingUser
        ? ["A login already exists for this email or staffId."]
        : roleV
          ? []
          : ["RoleCode is not available yet. Seed RoleTemplates first."],
    };
  }

  async provisionUser(principal: Principal, staffId: string, dto: ProvisionUserDto) {
    const email = lowerEmail(dto.email);
    if (!email) throw new BadRequestException("Email is required");

    const roleCode = (dto.roleCode || "").trim().toUpperCase();
    if (!roleCode) throw new BadRequestException("roleCode is required");

    const plan = await this.buildProvisionPlan(staffId, dto.primaryBranchId ?? null);

    if (principal.roleScope === "BRANCH") {
      const bad = plan.bindings.find((b) => b.branchId !== principal.branchId);
      if (bad) throw new ForbiddenException("Branch admins can provision users only for their own branch");
    }

    if (plan.staff.user) {
      throw new ConflictException("This staff already has a linked user account");
    }

    // Create user (primary branch becomes the account's branchId for back-compat)
    const created = await this.iam.createUser(principal, {
      email,
      name: (dto.name || plan.staff.fullName).trim(),
      roleCode,
      branchId: plan.primary.branchId,
      staffId,
    } as any);

    // Create bindings per branch assignment (Option 2)
    try {
      await this.ctx.prisma.userRoleBinding.createMany({
        data: plan.bindings.map((b) => ({
          userId: created.userId,
          roleVersionId: created.roleVersionId,
          scope: "BRANCH" as any,
          branchId: b.branchId,
          staffAssignmentId: b.staffAssignmentId,
          isPrimary: !!b.isPrimary,
          effectiveFrom: b.effectiveFrom,
          effectiveTo: b.effectiveTo,
        })),
        skipDuplicates: true,
      });

      // ensure exactly one primary binding
      const primaries = plan.bindings.filter((b) => b.isPrimary);
      if (primaries.length === 0 && plan.bindings.length) {
        await this.ctx.prisma.userRoleBinding.updateMany({
          where: { userId: created.userId },
          data: { isPrimary: false },
        });
        await this.ctx.prisma.userRoleBinding.updateMany({
          where: { userId: created.userId, branchId: plan.primary.branchId },
          data: { isPrimary: true },
        });
      }

      return {
        ...created,
        primaryBranchId: plan.primary.branchId,
        roleBindingsCreated: plan.bindings.length,
      };
    } catch (e) {
      // Best-effort cleanup: delete user if bindings fail
      await this.ctx.prisma.user.delete({ where: { id: created.userId } }).catch(() => null);
      throw e;
    }
  }
}
