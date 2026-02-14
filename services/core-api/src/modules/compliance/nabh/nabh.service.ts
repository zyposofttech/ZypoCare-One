import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { ComplianceContextService } from "../compliance-context.service";
import type {
  CreateNabhTemplateDto,
  CreateNabhTemplateItemDto,
  UpdateNabhItemDto,
  CreateAuditCycleDto,
  UpdateAuditCycleDto,
  CreateFindingDto,
  UpdateFindingDto,
  CreateCapaDto,
  UpdateCapaDto,
} from "./dto/nabh.dto";

@Injectable()
export class NabhService {
  constructor(private readonly ctx: ComplianceContextService) {}

  // ────────────────────────────── Templates ──────────────────────────────

  async listTemplates(
    principal: Principal,
    query: {
      orgId?: string;
      active?: boolean;
      cursor?: string;
      take?: number;
    },
  ) {
    const take = Math.min(Math.max(query.take ?? 50, 1), 200);
    const where: any = {};

    if (query.orgId) where.orgId = query.orgId;
    if (query.active !== undefined) where.isActive = query.active;

    const findArgs: any = {
      where,
      orderBy: [{ createdAt: "desc" }],
      take: take + 1,
      include: { _count: { select: { items: true } } },
    };
    if (query.cursor) {
      findArgs.cursor = { id: query.cursor };
      findArgs.skip = 1;
    }

    const rows = await this.ctx.prisma.nabhTemplate.findMany(findArgs);
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore && items.length ? items[items.length - 1].id : null;

    return { items, nextCursor, take };
  }

  async createTemplate(principal: Principal, dto: CreateNabhTemplateDto) {
    const template = await this.ctx.prisma.$transaction(async (tx) => {
      const created = await tx.nabhTemplate.create({
        data: {
          orgId: dto.orgId,
          name: dto.name,
          isActive: true,
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: dto.orgId || "SYSTEM",
          entityType: "NABH_TEMPLATE",
          entityId: created.id,
          action: "CREATE",
          actorStaffId: principal.staffId,
          after: created,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: principal.branchId,
          actorUserId: principal.userId,
          action: "NABH_TEMPLATE_CREATE",
          entity: "NabhTemplate",
          entityId: created.id,
          meta: dto,
        },
        tx,
      );

      return created;
    });

    return template;
  }

  async addTemplateItem(principal: Principal, dto: CreateNabhTemplateItemDto) {
    const template = await this.ctx.prisma.nabhTemplate.findUnique({
      where: { id: dto.templateId },
    });
    if (!template) throw new NotFoundException("Template not found");

    const item = await this.ctx.prisma.$transaction(async (tx) => {
      const created = await tx.nabhTemplateItem.create({
        data: {
          templateId: dto.templateId,
          chapter: dto.chapter,
          standardCode: dto.standardCode,
          meCode: dto.meCode,
          title: dto.title,
          description: dto.description ?? null,
          evidenceRequired: dto.evidenceRequired ?? false,
          riskLevel: dto.riskLevel ?? "MINOR",
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: template.orgId || "SYSTEM",
          entityType: "NABH_TEMPLATE_ITEM",
          entityId: created.id,
          action: "CREATE",
          actorStaffId: principal.staffId,
          after: created,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: principal.branchId,
          actorUserId: principal.userId,
          action: "NABH_TEMPLATE_ITEM_CREATE",
          entity: "NabhTemplateItem",
          entityId: created.id,
          meta: { templateId: dto.templateId, meCode: dto.meCode },
        },
        tx,
      );

      return created;
    });

    return item;
  }

  // ────────────────────────────── Clone Template → Workspace ──────────────────────────────

  async cloneTemplateToWorkspace(
    principal: Principal,
    templateId: string,
    workspaceId: string,
  ) {
    const template = await this.ctx.prisma.nabhTemplate.findUnique({
      where: { id: templateId },
      include: { items: true },
    });
    if (!template) throw new NotFoundException("Template not found");
    if (!template.isActive) throw new BadRequestException("Template is inactive");

    const workspace = await this.ctx.prisma.complianceWorkspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException("Workspace not found");

    // Check if workspace already has NABH items
    const existingCount = await this.ctx.prisma.nabhWorkspaceItem.count({
      where: { workspaceId },
    });
    if (existingCount > 0) {
      throw new BadRequestException(
        "Workspace already contains NABH items. Clear existing items before cloning.",
      );
    }

    const result = await this.ctx.prisma.$transaction(async (tx) => {
      if (template.items.length > 0) {
        await tx.nabhWorkspaceItem.createMany({
          data: template.items.map((item) => ({
            workspaceId,
            chapter: item.chapter,
            standardCode: item.standardCode,
            meCode: item.meCode,
            title: item.title,
            description: item.description,
            status: "NOT_STARTED",
            riskLevel: item.riskLevel,
            evidenceRequired: item.evidenceRequired,
          })),
        });
      }

      await this.ctx.logCompliance(
        {
          workspaceId,
          entityType: "NABH_ITEM",
          entityId: workspaceId,
          action: "CLONE_FROM_TEMPLATE",
          actorStaffId: principal.staffId,
          after: { templateId, itemCount: template.items.length },
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: workspace.branchId,
          actorUserId: principal.userId,
          action: "NABH_TEMPLATE_CLONE",
          entity: "NabhWorkspaceItem",
          entityId: workspaceId,
          meta: { templateId, workspaceId, itemCount: template.items.length },
        },
        tx,
      );

      return { clonedItems: template.items.length };
    });

    return result;
  }

  // ────────────────────────────── Initialize (Seed + Clone) ──────────────────────────────

  /**
   * One-shot initializer: seeds the NABH 6th Edition master template (idempotent),
   * then clones it into the given workspace. Returns the count of items cloned.
   */
  async initializeChecklist(
    principal: Principal,
    workspaceId: string,
    seedSvc: { seed(orgId: string): Promise<any> },
  ) {
    const workspace = await this.ctx.prisma.complianceWorkspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) throw new NotFoundException("Workspace not found");

    // Already has items? return current count
    const existing = await this.ctx.prisma.nabhWorkspaceItem.count({ where: { workspaceId } });
    if (existing > 0) {
      return { alreadyInitialized: true, itemCount: existing };
    }

    // 1. Seed the template (idempotent — returns existing if already seeded)
    const template = await seedSvc.seed(workspace.orgId);

    // 2. Clone template → workspace
    const result = await this.cloneTemplateToWorkspace(principal, template.id, workspaceId);

    return { alreadyInitialized: false, itemCount: result.clonedItems, templateId: template.id };
  }

  // ────────────────────────────── Workspace Items ──────────────────────────────

  async listItems(
    principal: Principal,
    query: {
      workspaceId?: string;
      branchId?: string;
      chapter?: string;
      status?: string;
      ownerStaffId?: string;
      cursor?: string;
      take?: number;
    },
  ) {
    const take = Math.min(Math.max(query.take ?? 50, 1), 200);
    const where: any = {};

    // Resolve workspaceId from branchId if not provided directly
    if (query.workspaceId) {
      where.workspaceId = query.workspaceId;
    } else if (query.branchId) {
      const ws = await this.ctx.prisma.complianceWorkspace.findFirst({
        where: { branchId: query.branchId },
        select: { id: true },
      });
      if (ws) where.workspaceId = ws.id;
      else return { items: [], nextCursor: null, take };
    }

    if (query.chapter) where.chapter = query.chapter;
    if (query.status) where.status = query.status;
    if (query.ownerStaffId) where.ownerStaffId = query.ownerStaffId;

    const findArgs: any = {
      where,
      orderBy: [{ chapter: "asc" }, { standardCode: "asc" }, { meCode: "asc" }],
      take: take + 1,
      include: { owner: { select: { id: true, name: true } } },
    };
    if (query.cursor) {
      findArgs.cursor = { id: query.cursor };
      findArgs.skip = 1;
    }

    const rows = await this.ctx.prisma.nabhWorkspaceItem.findMany(findArgs);
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore && items.length ? items[items.length - 1].id : null;

    return { items, nextCursor, take };
  }

  async getItem(principal: Principal, itemId: string) {
    const item = await this.ctx.prisma.nabhWorkspaceItem.findUnique({
      where: { id: itemId },
      include: {
        owner: { select: { id: true, name: true } },
        verifiedBy: { select: { id: true, name: true } },
        workspace: { select: { id: true, name: true, branchId: true } },
      },
    });
    if (!item) throw new NotFoundException("NABH item not found");
    return item;
  }

  async updateItem(principal: Principal, itemId: string, dto: UpdateNabhItemDto) {
    const existing = await this.ctx.prisma.nabhWorkspaceItem.findUnique({
      where: { id: itemId },
    });
    if (!existing) throw new NotFoundException("NABH item not found");

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const result = await tx.nabhWorkspaceItem.update({
        where: { id: itemId },
        data: {
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.ownerStaffId !== undefined && { ownerStaffId: dto.ownerStaffId }),
          ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.riskLevel !== undefined && { riskLevel: dto.riskLevel }),
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: existing.workspaceId,
          entityType: "NABH_ITEM",
          entityId: itemId,
          action: "UPDATE",
          actorStaffId: principal.staffId,
          before: existing,
          after: result,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: principal.branchId,
          actorUserId: principal.userId,
          action: "NABH_ITEM_UPDATE",
          entity: "NabhWorkspaceItem",
          entityId: itemId,
          meta: dto,
        },
        tx,
      );

      return result;
    });

    return updated;
  }

  async verifyItem(principal: Principal, itemId: string) {
    const existing = await this.ctx.prisma.nabhWorkspaceItem.findUnique({
      where: { id: itemId },
    });
    if (!existing) throw new NotFoundException("NABH item not found");

    if (existing.status === "VERIFIED") {
      throw new BadRequestException("Item is already verified");
    }

    // Maker-checker for critical item verification
    if (existing.riskLevel === 'CRITICAL') {
      return this.ctx.requireApproval({
        workspaceId: existing.workspaceId,
        changeType: 'NABH_CRITICAL_VERIFY',
        entityType: 'NABH_ITEM',
        entityId: itemId,
        payloadDraft: { standardCode: existing.standardCode, title: existing.title, action: 'VERIFY' },
        actorId: principal.staffId!,
      });
    }

    // If evidence is required, check that at least one evidence link exists
    if (existing.evidenceRequired) {
      const linkedEvidence = await this.ctx.prisma.evidenceLink.findFirst({
        where: { targetType: "NABH_ITEM", targetId: itemId },
      });
      if (!linkedEvidence) {
        throw new BadRequestException(
          "Cannot verify: evidence is required but no evidence artifact is linked to this item",
        );
      }
    }

    const verified = await this.ctx.prisma.$transaction(async (tx) => {
      const result = await tx.nabhWorkspaceItem.update({
        where: { id: itemId },
        data: {
          status: "VERIFIED",
          verifiedAt: new Date(),
          verifiedByStaffId: principal.staffId ?? null,
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: existing.workspaceId,
          entityType: "NABH_ITEM",
          entityId: itemId,
          action: "VERIFY",
          actorStaffId: principal.staffId,
          before: existing,
          after: result,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: principal.branchId,
          actorUserId: principal.userId,
          action: "NABH_ITEM_VERIFY",
          entity: "NabhWorkspaceItem",
          entityId: itemId,
          meta: { verifiedAt: result.verifiedAt },
        },
        tx,
      );

      return result;
    });

    return verified;
  }

  // ────────────────────────────── Chapter Summary ──────────────────────────────

  async getChapterSummary(principal: Principal, workspaceId: string) {
    const items = await this.ctx.prisma.nabhWorkspaceItem.findMany({
      where: { workspaceId },
      select: { chapter: true, status: true, riskLevel: true },
    });

    const chapterMap = new Map<
      string,
      { total: number; NOT_STARTED: number; IN_PROGRESS: number; IMPLEMENTED: number; VERIFIED: number; NON_COMPLIANT: number }
    >();

    for (const item of items) {
      if (!chapterMap.has(item.chapter)) {
        chapterMap.set(item.chapter, {
          total: 0,
          NOT_STARTED: 0,
          IN_PROGRESS: 0,
          IMPLEMENTED: 0,
          VERIFIED: 0,
          NON_COMPLIANT: 0,
        });
      }
      const entry = chapterMap.get(item.chapter)!;
      entry.total++;
      entry[item.status as keyof typeof entry]++;
    }

    const chapters = Array.from(chapterMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([chapter, counts]) => ({ chapter, ...counts }));

    return { workspaceId, chapters, totalItems: items.length };
  }

  // ────────────────────────────── Audit Cycles ──────────────────────────────

  async listAuditCycles(
    principal: Principal,
    query: {
      workspaceId?: string;
      status?: string;
      cursor?: string;
      take?: number;
    },
  ) {
    const take = Math.min(Math.max(query.take ?? 50, 1), 200);
    const where: any = {};

    if (query.workspaceId) where.workspaceId = query.workspaceId;
    if (query.status) where.status = query.status;

    const findArgs: any = {
      where,
      orderBy: [{ startDate: "desc" }],
      take: take + 1,
      include: { _count: { select: { findings: true } } },
    };
    if (query.cursor) {
      findArgs.cursor = { id: query.cursor };
      findArgs.skip = 1;
    }

    const rows = await this.ctx.prisma.auditCycle.findMany(findArgs);
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore && items.length ? items[items.length - 1].id : null;

    return { items, nextCursor, take };
  }

  async getAuditCycle(principal: Principal, auditId: string) {
    return this.ctx.prisma.auditCycle.findUniqueOrThrow({
      where: { id: auditId },
      include: {
        findings: {
          include: { capa: true },
        },
      },
    });
  }

  async createAuditCycle(principal: Principal, dto: CreateAuditCycleDto) {
    const workspace = await this.ctx.prisma.complianceWorkspace.findUnique({
      where: { id: dto.workspaceId },
    });
    if (!workspace) throw new NotFoundException("Workspace not found");

    const cycle = await this.ctx.prisma.$transaction(async (tx) => {
      const created = await tx.auditCycle.create({
        data: {
          workspaceId: dto.workspaceId,
          name: dto.name,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          status: "PLANNED",
          auditorStaffIds: dto.auditorStaffIds ?? [],
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: dto.workspaceId,
          entityType: "AUDIT_CYCLE",
          entityId: created.id,
          action: "CREATE",
          actorStaffId: principal.staffId,
          after: created,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: workspace.branchId,
          actorUserId: principal.userId,
          action: "NABH_AUDIT_CYCLE_CREATE",
          entity: "AuditCycle",
          entityId: created.id,
          meta: dto,
        },
        tx,
      );

      return created;
    });

    return cycle;
  }

  async updateAuditCycle(principal: Principal, id: string, dto: UpdateAuditCycleDto) {
    const existing = await this.ctx.prisma.auditCycle.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException("Audit cycle not found");

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const result = await tx.auditCycle.update({
        where: { id },
        data: {
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: existing.workspaceId,
          entityType: "AUDIT_CYCLE",
          entityId: id,
          action: "UPDATE",
          actorStaffId: principal.staffId,
          before: existing,
          after: result,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: principal.branchId,
          actorUserId: principal.userId,
          action: "NABH_AUDIT_CYCLE_UPDATE",
          entity: "AuditCycle",
          entityId: id,
          meta: dto,
        },
        tx,
      );

      return result;
    });

    return updated;
  }

  // ────────────────────────────── Findings ──────────────────────────────

  async getFinding(principal: Principal, findingId: string) {
    return this.ctx.prisma.auditFinding.findUniqueOrThrow({
      where: { id: findingId },
      include: {
        capa: true,
        audit: { select: { id: true, name: true, workspaceId: true } },
      },
    });
  }

  async createFinding(principal: Principal, dto: CreateFindingDto) {
    const audit = await this.ctx.prisma.auditCycle.findUnique({
      where: { id: dto.auditId },
    });
    if (!audit) throw new NotFoundException("Audit cycle not found");

    // Validate optional item link
    if (dto.itemId) {
      const item = await this.ctx.prisma.nabhWorkspaceItem.findUnique({
        where: { id: dto.itemId },
      });
      if (!item) throw new NotFoundException("NABH workspace item not found");
    }

    const finding = await this.ctx.prisma.$transaction(async (tx) => {
      const created = await tx.auditFinding.create({
        data: {
          auditId: dto.auditId,
          itemId: dto.itemId ?? null,
          severity: dto.severity,
          description: dto.description,
          recommendedAction: dto.recommendedAction ?? null,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: audit.workspaceId,
          entityType: "FINDING",
          entityId: created.id,
          action: "CREATE",
          actorStaffId: principal.staffId,
          after: created,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: principal.branchId,
          actorUserId: principal.userId,
          action: "NABH_FINDING_CREATE",
          entity: "AuditFinding",
          entityId: created.id,
          meta: { auditId: dto.auditId, severity: dto.severity },
        },
        tx,
      );

      return created;
    });

    return finding;
  }

  async updateFinding(principal: Principal, id: string, dto: UpdateFindingDto) {
    const existing = await this.ctx.prisma.auditFinding.findUnique({
      where: { id },
      include: { audit: { select: { workspaceId: true } } },
    });
    if (!existing) throw new NotFoundException("Finding not found");

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const result = await tx.auditFinding.update({
        where: { id },
        data: {
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.recommendedAction !== undefined && { recommendedAction: dto.recommendedAction }),
          ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: existing.audit.workspaceId,
          entityType: "FINDING",
          entityId: id,
          action: "UPDATE",
          actorStaffId: principal.staffId,
          before: existing,
          after: result,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: principal.branchId,
          actorUserId: principal.userId,
          action: "NABH_FINDING_UPDATE",
          entity: "AuditFinding",
          entityId: id,
          meta: dto,
        },
        tx,
      );

      return result;
    });

    return updated;
  }

  // ────────────────────────────── CAPA ──────────────────────────────

  async getCapa(principal: Principal, capaId: string) {
    return this.ctx.prisma.capaAction.findUniqueOrThrow({
      where: { id: capaId },
      include: {
        finding: {
          select: { id: true, description: true, severity: true, auditId: true },
        },
        owner: { select: { id: true, name: true } },
      },
    });
  }

  async createCapa(principal: Principal, dto: CreateCapaDto) {
    const finding = await this.ctx.prisma.auditFinding.findUnique({
      where: { id: dto.findingId },
      include: { audit: { select: { workspaceId: true } }, capa: true },
    });
    if (!finding) throw new NotFoundException("Finding not found");

    if (finding.capa) {
      throw new BadRequestException("Finding already has a CAPA action assigned");
    }

    const capa = await this.ctx.prisma.$transaction(async (tx) => {
      const created = await tx.capaAction.create({
        data: {
          findingId: dto.findingId,
          ownerStaffId: dto.ownerStaffId,
          dueDate: new Date(dto.dueDate),
          actionPlan: dto.actionPlan,
          status: "OPEN",
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: finding.audit.workspaceId,
          entityType: "CAPA",
          entityId: created.id,
          action: "CREATE",
          actorStaffId: principal.staffId,
          after: created,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: principal.branchId,
          actorUserId: principal.userId,
          action: "NABH_CAPA_CREATE",
          entity: "CapaAction",
          entityId: created.id,
          meta: { findingId: dto.findingId },
        },
        tx,
      );

      return created;
    });

    return capa;
  }

  async updateCapa(principal: Principal, id: string, dto: UpdateCapaDto) {
    const existing = await this.ctx.prisma.capaAction.findUnique({
      where: { id },
      include: { finding: { include: { audit: { select: { workspaceId: true } } } } },
    });
    if (!existing) throw new NotFoundException("CAPA action not found");

    const isClosure = dto.status === "CLOSED" && existing.status !== "CLOSED";

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const result = await tx.capaAction.update({
        where: { id },
        data: {
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.closureNotes !== undefined && { closureNotes: dto.closureNotes }),
          ...(dto.actionPlan !== undefined && { actionPlan: dto.actionPlan }),
          ...(isClosure && { closedAt: new Date() }),
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: existing.finding.audit.workspaceId,
          entityType: "CAPA",
          entityId: id,
          action: isClosure ? "CLOSE" : "UPDATE",
          actorStaffId: principal.staffId,
          before: existing,
          after: result,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: principal.branchId,
          actorUserId: principal.userId,
          action: isClosure ? "NABH_CAPA_CLOSE" : "NABH_CAPA_UPDATE",
          entity: "CapaAction",
          entityId: id,
          meta: dto,
        },
        tx,
      );

      return result;
    });

    return updated;
  }
}
