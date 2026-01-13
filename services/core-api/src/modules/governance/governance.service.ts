import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import type { Principal } from "../auth/access-policy.service";
import { AuditService } from "../audit/audit.service";
import { UpdatePolicyDraftDto, CreatePolicyDefinitionDto } from "./governance.dto";
import { PolicyEngineService } from "../policy-engine/policy-engine.service";

type UiStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "ACTIVE"
  | "REJECTED"
  | "RETIRED";

function uiStatusFromDb(dbStatus: string, effectiveAt: Date, now: Date): UiStatus {
  switch (dbStatus) {
    case "DRAFT":
      return "DRAFT";
    case "SUBMITTED":
      return "PENDING_APPROVAL";
    case "REJECTED":
      return "REJECTED";
    case "RETIRED":
      return "RETIRED";
    case "APPROVED":
      return effectiveAt <= now ? "ACTIVE" : "APPROVED";
    default:
      return "RETIRED";
  }
}

function requireBranchId(p: Principal): string {
  if (!p.branchId) throw new BadRequestException("Missing branch context");
  return p.branchId;
}

@Injectable()
export class GovernanceService {
  constructor(
    @Inject("PRISMA") private readonly prisma: PrismaClient,
    private readonly audit: AuditService,
    private readonly policies: PolicyEngineService,
  ) { }

  private isSuper(p: Principal) {
    return p.roleCode === "SUPER_ADMIN" || p.roleScope === "GLOBAL";
  }

  private requireSuperAdmin(p: Principal) {
    if (!this.isSuper(p)) throw new ForbiddenException("Super Admin privileges required");
  }

  private async ensurePolicy(code: string) {
    const c = (code || "").trim().toUpperCase();
    if (!c) throw new BadRequestException("Policy code is required");
    const policy = await this.prisma.policyDefinition.findUnique({ where: { code: c } });
    if (!policy) throw new NotFoundException("Unknown policy code");
    return policy;
  }

  private async versionBranchIds(policyVersionId: string): Promise<string[]> {
    const rows = await this.prisma.policyVersionBranch.findMany({
      where: { policyVersionId },
      select: { branchId: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => r.branchId);
  }

  private async mapVersion(v: any): Promise<any> {
    const now = new Date();
    const branchIds = v.scope === "GLOBAL" && !v.applyToAllBranches ? await this.versionBranchIds(v.id) : [];
    return {
      id: v.id,
      version: v.version,
      status: uiStatusFromDb(v.status, v.effectiveAt, now),
      effectiveAt: v.effectiveAt.toISOString(),
      notes: v.notes ?? null,
      payload: v.payload,
      applyToAllBranches: v.applyToAllBranches ?? true,
      branchIds,
      scope: v.scope,
      branchId: v.branchId ?? null,
      submittedAt: v.submittedAt ? v.submittedAt.toISOString() : null,
      approvedAt: v.approvedAt ? v.approvedAt.toISOString() : null,
      rejectedAt: v.rejectedAt ? v.rejectedAt.toISOString() : null,
      rejectionReason: v.rejectionReason ?? null,
      createdAt: v.createdAt.toISOString(),
      createdByName: v.createdByUser?.name ?? null,
      approvedByName: v.approvedByUser?.name ?? null,
    };
  }

  async listBranches(principal: Principal) {
    if (this.isSuper(principal)) {
      return this.prisma.branch.findMany({
        select: { id: true, code: true, name: true, city: true },
        orderBy: { name: "asc" },
      });
    }
    const branchId = requireBranchId(principal);
    const b = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { id: true, code: true, name: true, city: true },
    });
    return b ? [b] : [];
  }
  private async resolveBranchIdForView(principal: Principal, requestedBranchId?: string | null): Promise<string | null> {
    const reqId = (requestedBranchId ?? "").trim() || null;

    // Super Admin: can view any branch's effective policy, or omit to view global-only.
    if (this.isSuper(principal)) {
      if (!reqId) return null;
      const exists = await this.prisma.branch.findUnique({ where: { id: reqId }, select: { id: true } });
      if (!exists) throw new BadRequestException("Unknown branchId");
      return reqId;
    }

    // Everyone else: strictly own branch only.
    const own = requireBranchId(principal);
    if (reqId && reqId !== own) throw new ForbiddenException("Cross-branch access is not allowed");
    return own;
  }

  /**
   * Effective policy payload for a specific branch (GLOBAL baseline merged with BRANCH_OVERRIDE).
   * - Super Admin may pass any branchId (or omit for global-only).
   * - Branch-scoped users always resolve to their own branch.
   */
  async getEffectivePolicy(principal: Principal, codeRaw: string, requestedBranchId?: string | null) {
    const code = (codeRaw || "").trim().toUpperCase();
    if (!code) throw new BadRequestException("Policy code is required");

    // Validate the policy exists
    const def = await this.prisma.policyDefinition.findUnique({
      where: { code },
      select: { id: true, code: true, name: true, type: true, description: true },
    });
    if (!def) throw new NotFoundException("Unknown policy code");

    const branchId = await this.resolveBranchIdForView(principal, requestedBranchId);
    const eff = await this.policies.getEffectivePolicy(code, branchId);

    return {
      code: def.code,
      name: def.name,
      type: def.type,
      description: def.description ?? null,
      branchId,
      effective: eff
        ? {
          scope: eff.scope,
          versionId: eff.versionId,
          version: eff.version,
          effectiveAt: eff.effectiveAt.toISOString(),
          payload: eff.payload,
        }
        : null,
    };
  }

  /**
   * Effective policy snapshot for a branch (all policy codes), used by UI and diagnostics.
   */
  async listEffectivePolicies(principal: Principal, requestedBranchId?: string | null) {
    const branchId = await this.resolveBranchIdForView(principal, requestedBranchId);
    const defs = await this.prisma.policyDefinition.findMany({
      orderBy: { name: "asc" },
      select: { code: true, name: true, type: true, description: true },
    });

    const out: any[] = [];
    for (const d of defs) {
      const eff = await this.policies.getEffectivePolicy(d.code, branchId);
      out.push({
        code: d.code,
        name: d.name,
        type: d.type,
        description: d.description ?? null,
        branchId,
        effective: eff
          ? {
            scope: eff.scope,
            versionId: eff.versionId,
            version: eff.version,
            effectiveAt: eff.effectiveAt.toISOString(),
          }
          : null,
        payload: eff?.payload ?? null,
      });
    }
    return out;
  }

  async listPolicies(principal: Principal) {
    this.requireSuperAdmin(principal);
    const defs = await this.prisma.policyDefinition.findMany({
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true, type: true },
    });

    const now = new Date();
    const out: any[] = [];
    for (const d of defs) {
      const active = await this.prisma.policyVersion.findFirst({
        where: {
          policyId: d.id,
          scope: "GLOBAL",
          status: "APPROVED",
          effectiveAt: { lte: now },
        },
        orderBy: { version: "desc" },
        select: { version: true, effectiveAt: true, updatedAt: true },
      });

      const pendingCount = await this.prisma.policyVersion.count({
        where: { policyId: d.id, status: "SUBMITTED" },
      });

      const last = await this.prisma.policyVersion.findFirst({
        where: { policyId: d.id },
        orderBy: { updatedAt: "desc" },
        select: { updatedAt: true },
      });

      out.push({
        id: d.id,
        code: d.code,
        name: d.name,
        type: d.type,
        activeVersion: active?.version ?? null,
        activeEffectiveAt: active?.effectiveAt ? active.effectiveAt.toISOString() : null,
        pendingCount,
        updatedAt: last?.updatedAt ? last.updatedAt.toISOString() : null,
      });
    }
    return out;
  }

  async createPolicyDefinition(principal: Principal, dto: CreatePolicyDefinitionDto) {
    this.requireSuperAdmin(principal);

    const code = (dto.code || "").trim().toUpperCase();
    const name = (dto.name || "").trim();
    const type = (dto.type || "").trim().toUpperCase();
    const description = dto.description ? String(dto.description).trim() : null;

    if (!/^[A-Z0-9_]{3,64}$/.test(code)) {
      throw new BadRequestException("Policy code must be 3-64 chars: A-Z, 0-9, underscore");
    }
    if (!name) throw new BadRequestException("Policy name is required");
    if (!type) throw new BadRequestException("Policy type is required");

    try {
      const created = await this.prisma.policyDefinition.create({
        data: { code, name, type, description },
        select: { id: true, code: true, name: true, type: true, description: true, createdAt: true },
      });

      await this.audit.log({
        branchId: null,
        actorUserId: principal.userId,
        action: "GOV_POLICY_DEF_CREATED",
        entity: "POLICY_DEFINITION",
        entityId: created.code,
        meta: { code: created.code, type: created.type },
      });

      return created;
    } catch (e: any) {
      // Prisma unique constraint
      if (String(e?.code) === "P2002") {
        throw new BadRequestException("A policy with this code already exists");
      }
      throw e;
    }
  }

  async getPolicyDetailGlobal(principal: Principal, code: string) {
    if (!this.isSuper(principal)) throw new ForbiddenException("Global policy details require Super Admin");

    const policy = await this.ensurePolicy(code);
    const now = new Date();

    const active = await this.prisma.policyVersion.findFirst({
      where: { policyId: policy.id, scope: "GLOBAL", status: "APPROVED", effectiveAt: { lte: now } },
      orderBy: { version: "desc" },
      include: { createdByUser: { select: { name: true } }, approvedByUser: { select: { name: true } } },
    });

    const draft = await this.prisma.policyVersion.findFirst({
      where: { policyId: policy.id, scope: "GLOBAL", status: "DRAFT" },
      orderBy: { version: "desc" },
      include: { createdByUser: { select: { name: true } } },
    });

    const history = await this.prisma.policyVersion.findMany({
      where: { policyId: policy.id, scope: "GLOBAL" },
      orderBy: { version: "desc" },
      take: 50,
      include: {
        createdByUser: { select: { name: true } },
        approvedByUser: { select: { name: true } },
      },
    });

    return {
      id: policy.id,
      code: policy.code,
      name: policy.name,
      description: policy.description ?? null,
      type: policy.type,
      active: active ? await this.mapVersion(active) : null,
      draft: draft ? await this.mapVersion(draft) : null,
      history: await Promise.all(history.map((v) => this.mapVersion(v))),
    };
  }

  async getPolicyDetailGlobalById(principal: Principal, policyDefinitionId: string) {
    if (!this.isSuper(principal)) throw new ForbiddenException("Global policy details require Super Admin");

    const def = await this.prisma.policyDefinition.findUnique({
      where: { id: policyDefinitionId },
      select: { code: true },
    });
    if (!def) throw new NotFoundException("Policy not found");
    return this.getPolicyDetailGlobal(principal, def.code);
  }

  async createGlobalDraft(principal: Principal, code: string) {
    if (!this.isSuper(principal)) throw new ForbiddenException("Only Super Admin can create global policy drafts");

    const policy = await this.ensurePolicy(code);

    const existing = await this.prisma.policyVersion.findFirst({
      where: { policyId: policy.id, scope: "GLOBAL", status: "DRAFT" },
      orderBy: { version: "desc" },
    });
    if (existing) return { id: existing.id };

    const max = await this.prisma.policyVersion.findFirst({
      where: { policyId: policy.id, scope: "GLOBAL" },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (max?.version ?? 0) + 1;

    const baseActive = await this.prisma.policyVersion.findFirst({
      where: { policyId: policy.id, scope: "GLOBAL", status: "APPROVED" },
      orderBy: { version: "desc" },
      select: { payload: true },
    });

    const created = await this.prisma.policyVersion.create({
      data: {
        policyId: policy.id,
        scope: "GLOBAL",
        version: nextVersion,
        status: "DRAFT",
        effectiveAt: new Date(),
        notes: null,
        payload: baseActive?.payload ?? {},
        applyToAllBranches: true,
        createdByUserId: principal.userId,
      },
    });

    await this.audit.log({
      branchId: null,
      actorUserId: principal.userId,
      action: "GOV_POLICY_DRAFT_CREATED",
      entity: "POLICY_VERSION",
      entityId: created.id,
      meta: { policyCode: code, scope: "GLOBAL", version: nextVersion },
    });

    return { id: created.id };
  }

  async createBranchOverrideDraft(principal: Principal, code: string) {
    const branchId = requireBranchId(principal);

    const policy = await this.ensurePolicy(code);

    const existing = await this.prisma.policyVersion.findFirst({
      where: {
        policyId: policy.id,
        scope: "BRANCH_OVERRIDE",
        branchId,
        status: "DRAFT",
      },
      orderBy: { version: "desc" },
    });
    if (existing) return { id: existing.id };

    const max = await this.prisma.policyVersion.findFirst({
      where: { policyId: policy.id, scope: "BRANCH_OVERRIDE", branchId },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    const nextVersion = (max?.version ?? 0) + 1;

    // Baseline payload: the current effective GLOBAL policy for this branch
    const now = new Date();
    const base = await this.prisma.policyVersion.findFirst({
      where: {
        policyId: policy.id,
        scope: "GLOBAL",
        status: "APPROVED",
        effectiveAt: { lte: now },
        OR: [{ applyToAllBranches: true }, { branches: { some: { branchId } } }],
      },
      orderBy: { version: "desc" },
      select: { payload: true },
    });

    const created = await this.prisma.policyVersion.create({
      data: {
        policyId: policy.id,
        scope: "BRANCH_OVERRIDE",
        branchId,
        version: nextVersion,
        status: "DRAFT",
        effectiveAt: new Date(),
        notes: null,
        payload: base?.payload ?? {},
        applyToAllBranches: false,
        createdByUserId: principal.userId,
      },
    });

    await this.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "GOV_POLICY_OVERRIDE_DRAFT_CREATED",
      entity: "POLICY_VERSION",
      entityId: created.id,
      meta: { policyCode: code, scope: "BRANCH_OVERRIDE", version: nextVersion },
    });

    return { id: created.id };
  }

  async updateDraft(principal: Principal, versionId: string, dto: UpdatePolicyDraftDto) {
    const v = await this.prisma.policyVersion.findUnique({
      where: { id: versionId },
      include: { policy: true },
    });
    if (!v) throw new NotFoundException("Policy version not found");
    if (v.status !== "DRAFT") throw new BadRequestException("Only DRAFT versions are editable");

    if (v.scope === "GLOBAL") {
      if (!this.isSuper(principal)) throw new ForbiddenException("Only Super Admin can edit global policy drafts");
    } else {
      const branchId = requireBranchId(principal);
      if (v.branchId !== branchId) throw new ForbiddenException("Cannot edit another branch's override");
      if (v.createdByUserId && v.createdByUserId !== principal.userId) {
        throw new ForbiddenException("Only the creator can edit this draft");
      }
    }

    const effectiveAt = dto.effectiveAt ? new Date(dto.effectiveAt) : undefined;
    if (dto.effectiveAt && Number.isNaN(effectiveAt?.getTime())) {
      throw new BadRequestException("Invalid effectiveAt");
    }

    const applyToAllBranches =
      v.scope === "GLOBAL" && typeof dto.applyToAllBranches === "boolean" ? dto.applyToAllBranches : undefined;

    // If GLOBAL and applyToAllBranches == false, branchIds are stored in PolicyVersionBranch
    if (v.scope === "GLOBAL" && applyToAllBranches === false && dto.branchIds && dto.branchIds.length === 0) {
      // allow empty during edits, but warn on approval
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.policyVersion.update({
        where: { id: v.id },
        data: {
          payload: dto.payload ?? undefined,
          notes: dto.notes === undefined ? undefined : dto.notes,
          effectiveAt: effectiveAt ?? undefined,
          applyToAllBranches: applyToAllBranches ?? undefined,
        },
      });

      if (v.scope === "GLOBAL") {
        const newApplyAll = applyToAllBranches ?? v.applyToAllBranches;
        if (newApplyAll) {
          await tx.policyVersionBranch.deleteMany({ where: { policyVersionId: v.id } });
        } else if (dto.branchIds) {
          await tx.policyVersionBranch.deleteMany({ where: { policyVersionId: v.id } });
          const unique = Array.from(new Set(dto.branchIds)).filter(Boolean);
          if (unique.length) {
            await tx.policyVersionBranch.createMany({
              data: unique.map((branchId) => ({ policyVersionId: v.id, branchId })),
              skipDuplicates: true,
            });
          }
        }
      }
    });

    await this.audit.log({
      branchId: v.branchId ?? null,
      actorUserId: principal.userId,
      action: "GOV_POLICY_DRAFT_UPDATED",
      entity: "POLICY_VERSION",
      entityId: v.id,
      meta: { policyCode: v.policy.code, scope: v.scope, version: v.version },
    });

    return { ok: true };
  }

  async submitDraft(principal: Principal, versionId: string) {
    const v = await this.prisma.policyVersion.findUnique({
      where: { id: versionId },
      include: { policy: true },
    });
    if (!v) throw new NotFoundException("Policy version not found");
    if (v.status !== "DRAFT") throw new BadRequestException("Only DRAFT versions can be submitted");
    if (v.createdByUserId && v.createdByUserId !== principal.userId) {
      throw new ForbiddenException("Only the draft creator can submit");
    }

    if (v.scope === "BRANCH_OVERRIDE") {
      const branchId = requireBranchId(principal);
      if (v.branchId !== branchId) throw new ForbiddenException("Cannot submit another branch's override");
    } else if (!this.isSuper(principal)) {
      throw new ForbiddenException("Only Super Admin can submit global policy changes");
    }

    await this.prisma.policyVersion.update({
      where: { id: v.id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        submittedByUserId: principal.userId,
      },
    });
    try {
      await this.audit.log({
        branchId: v.branchId ?? null,
        actorUserId: principal.userId,
        action: "GOV_POLICY_SUBMITTED",
        entity: "POLICY_VERSION",
        entityId: v.id,
        meta: { policyCode: v.policy.code, scope: v.scope, version: v.version },
      });
    } catch (err) {
      console.log(err)
    } finally {
      this.policies.invalidate(v.policy.code);
    }
    return { ok: true };
  }

  async listApprovals(principal: Principal) {
    if (!this.isSuper(principal)) throw new ForbiddenException("Approvals require Super Admin");

    const rows = await this.prisma.policyVersion.findMany({
      where: { status: "SUBMITTED" },
      orderBy: { submittedAt: "desc" },
      include: {
        policy: true,
        createdByUser: { select: { name: true } },
        branch: { select: { id: true, name: true, code: true, city: true } },
      },
      take: 100,
    });

    const out: any[] = [];
    for (const r of rows) {
      const branchIds =
        r.scope === "GLOBAL" && !r.applyToAllBranches ? await this.versionBranchIds(r.id) : r.branchId ? [r.branchId] : [];

      out.push({
        id: r.id,
        policyId: r.policy.id,
        policyCode: r.policy.code,
        policyName: r.policy.name,
        version: r.version,
        status: "PENDING_APPROVAL",
        scope: r.scope,
        submittedAt: r.submittedAt ? r.submittedAt.toISOString() : r.createdAt.toISOString(),
        effectiveAt: r.effectiveAt.toISOString(),
        createdByName: r.createdByUser?.name ?? null,
        notes: r.notes ?? null,
        payload: r.payload,
        applyToAllBranches: r.scope === "GLOBAL" ? r.applyToAllBranches : false,
        branchIds,
        branchName: r.branch?.name ?? null,
      });
    }
    return out;
  }

  async approve(principal: Principal, versionId: string, note: string | null) {
    if (!this.isSuper(principal)) throw new ForbiddenException("Approve requires Super Admin");

    const v = await this.prisma.policyVersion.findUnique({
      where: { id: versionId },
      include: { policy: true },
    });
    if (!v) throw new NotFoundException("Policy version not found");
    if (v.status !== "SUBMITTED") throw new BadRequestException("Only submitted versions can be approved");
    if (v.createdByUserId && v.createdByUserId === principal.userId) {
      throw new ForbiddenException("Maker-checker separation: approver must differ from maker");
    }

    if (v.scope === "GLOBAL") {
      // Validate branch targeting (if not all)
      if (!v.applyToAllBranches) {
        const ids = await this.versionBranchIds(v.id);
        if (!ids.length) throw new BadRequestException("Select at least one branch or enable applyToAllBranches");
      }
    } else {
      if (!v.branchId) throw new BadRequestException("Branch override missing branchId");
    }

    await this.prisma.policyVersion.update({
      where: { id: v.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedByUserId: principal.userId,
        approvalNote: note ?? null,
      },
    });
    try {
      await this.audit.log({
        branchId: v.branchId ?? null,
        actorUserId: principal.userId,
        action: "GOV_POLICY_APPROVED",
        entity: "POLICY_VERSION",
        entityId: v.id,
        meta: { policyCode: v.policy.code, scope: v.scope, version: v.version },
      });
    } catch (err) {
      console.log(err)
    } finally {
      this.policies.invalidate(v.policy.code);
    }
    return { ok: true };

  }

  async reject(principal: Principal, versionId: string, reason: string) {
    if (!this.isSuper(principal)) throw new ForbiddenException("Reject requires Super Admin");

    const v = await this.prisma.policyVersion.findUnique({
      where: { id: versionId },
      include: { policy: true },
    });
    if (!v) throw new NotFoundException("Policy version not found");
    if (v.status !== "SUBMITTED") throw new BadRequestException("Only submitted versions can be rejected");
    if (v.createdByUserId && v.createdByUserId === principal.userId) {
      throw new ForbiddenException("Maker-checker separation: checker must differ from maker");
    }

    await this.prisma.policyVersion.update({
      where: { id: v.id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectedByUserId: principal.userId,
        rejectionReason: reason,
      },
    });
    try {
      await this.audit.log({
        branchId: v.branchId ?? null,
        actorUserId: principal.userId,
        action: "GOV_POLICY_REJECTED",
        entity: "POLICY_VERSION",
        entityId: v.id,
        meta: { policyCode: v.policy.code, scope: v.scope, version: v.version, reason },
      });
    } catch (err) {
      console.log(err)
    } finally {
      this.policies.invalidate(v.policy.code);
    }
    return { ok: true };
  }

  async listBranchPolicies(principal: Principal) {
    const branchId = requireBranchId(principal);
    const defs = await this.prisma.policyDefinition.findMany({ orderBy: { name: "asc" } });
    const now = new Date();

    const out: any[] = [];
    for (const d of defs) {
      const globalActive = await this.prisma.policyVersion.findFirst({
        where: {
          policyId: d.id,
          scope: "GLOBAL",
          status: "APPROVED",
          effectiveAt: { lte: now },
          OR: [{ applyToAllBranches: true }, { branches: { some: { branchId } } }],
        },
        orderBy: { version: "desc" },
        select: { version: true, effectiveAt: true },
      });

      const overrideActive = await this.prisma.policyVersion.findFirst({
        where: {
          policyId: d.id,
          scope: "BRANCH_OVERRIDE",
          branchId,
          status: "APPROVED",
          effectiveAt: { lte: now },
        },
        orderBy: { version: "desc" },
        select: { version: true, effectiveAt: true },
      });

      const overrideDraft = await this.prisma.policyVersion.findFirst({
        where: { policyId: d.id, scope: "BRANCH_OVERRIDE", branchId, status: "DRAFT" },
        orderBy: { version: "desc" },
        select: { version: true },
      });

      const overridePending = await this.prisma.policyVersion.findFirst({
        where: { policyId: d.id, scope: "BRANCH_OVERRIDE", branchId, status: "SUBMITTED" },
        orderBy: { version: "desc" },
        select: { version: true },
      });

      const effectiveScope = overrideActive ? "BRANCH_OVERRIDE" : "GLOBAL";
      const effectiveVersion = overrideActive?.version ?? globalActive?.version ?? null;
      const effectiveEffectiveAt = overrideActive?.effectiveAt ?? globalActive?.effectiveAt ?? null;

      let overrideState: "NONE" | "DRAFT" | "PENDING_APPROVAL" | "ACTIVE" = "NONE";
      if (overrideActive) overrideState = "ACTIVE";
      else if (overridePending) overrideState = "PENDING_APPROVAL";
      else if (overrideDraft) overrideState = "DRAFT";

      out.push({
        code: d.code,
        name: d.name,
        type: d.type,
        effectiveScope,
        effectiveVersion,
        effectiveAt: effectiveEffectiveAt ? effectiveEffectiveAt.toISOString() : null,
        overrideState,
        overrideVersion: overrideActive?.version ?? overridePending?.version ?? overrideDraft?.version ?? null,
      });
    }

    return out;
  }

  async getBranchPolicyDetail(principal: Principal, code: string) {
    const branchId = requireBranchId(principal);
    const policy = await this.ensurePolicy(code);
    const now = new Date();

    const globalActive = await this.prisma.policyVersion.findFirst({
      where: {
        policyId: policy.id,
        scope: "GLOBAL",
        status: "APPROVED",
        effectiveAt: { lte: now },
        OR: [{ applyToAllBranches: true }, { branches: { some: { branchId } } }],
      },
      orderBy: { version: "desc" },
      include: { createdByUser: { select: { name: true } }, approvedByUser: { select: { name: true } } },
    });

    const overrideActive = await this.prisma.policyVersion.findFirst({
      where: { policyId: policy.id, scope: "BRANCH_OVERRIDE", branchId, status: "APPROVED", effectiveAt: { lte: now } },
      orderBy: { version: "desc" },
      include: { createdByUser: { select: { name: true } }, approvedByUser: { select: { name: true } } },
    });

    const overrideDraft = await this.prisma.policyVersion.findFirst({
      where: { policyId: policy.id, scope: "BRANCH_OVERRIDE", branchId, status: "DRAFT" },
      orderBy: { version: "desc" },
      include: { createdByUser: { select: { name: true } } },
    });

    const overrideHistory = await this.prisma.policyVersion.findMany({
      where: { policyId: policy.id, scope: "BRANCH_OVERRIDE", branchId },
      orderBy: { version: "desc" },
      take: 50,
      include: { createdByUser: { select: { name: true } }, approvedByUser: { select: { name: true } } },
    });

    const effective = overrideActive ?? globalActive;

    return {
      code: policy.code,
      name: policy.name,
      description: policy.description ?? null,
      type: policy.type,
      effective: effective ? await this.mapVersion(effective) : null,
      globalActive: globalActive ? await this.mapVersion(globalActive) : null,
      overrideActive: overrideActive ? await this.mapVersion(overrideActive) : null,
      overrideDraft: overrideDraft ? await this.mapVersion(overrideDraft) : null,
      overrideHistory: await Promise.all(overrideHistory.map((x) => this.mapVersion(x))),
    };
  }

  async listPolicyAudit(principal: Principal) {
    if (!this.isSuper(principal)) throw new ForbiddenException("Audit requires Super Admin");

    const rows = await this.prisma.auditEvent.findMany({
      where: { entity: "POLICY_VERSION" },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        actorUser: { select: { name: true, email: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      action: r.action,
      entityId: r.entityId ?? null,
      branchName: r.branch?.name ?? null,
      actorName: r.actorUser?.name ?? null,
      actorEmail: r.actorUser?.email ?? null,
      meta: r.meta ?? null,
    }));
  }
  async getSummary(principal: Principal) {
  this.requireSuperAdmin(principal);

  const totalPolicies = await this.prisma.policyDefinition.count();

  const pendingApprovals = await this.prisma.policyVersion.count({
    where: { status: "SUBMITTED" },
  });

  // “recent events” = last 7 days policy audit events
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentEvents = await this.prisma.auditEvent.count({
    where: {
      entity: "POLICY_VERSION",
      createdAt: { gte: since },
    },
  });

  return { totalPolicies, pendingApprovals, recentEvents };
}

}
