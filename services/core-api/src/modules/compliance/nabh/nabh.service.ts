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

  private normalizeFindingSeverity(input: string) {
    if (input === "OBSERVATION") return "MINOR";
    if (input === "CRITICAL" || input === "MAJOR" || input === "MINOR") return input;
    return "MINOR";
  }

  private async getMarkerSet(entityType: any, entityIds: string[], action: string) {
    if (!entityIds.length) return new Set<string>();
    const rows = await this.ctx.prisma.complianceAuditLog.findMany({
      where: { entityType, entityId: { in: entityIds }, action },
      select: { entityId: true },
    });
    return new Set(rows.map((r) => r.entityId));
  }

  private async getCreateMetaMap(entityType: any, entityIds: string[]) {
    if (!entityIds.length) return new Map<string, any>();
    const rows = await this.ctx.prisma.complianceAuditLog.findMany({
      where: { entityType, entityId: { in: entityIds }, action: "CREATE" },
      select: { entityId: true, after: true },
      orderBy: { createdAt: "desc" },
    });
    const map = new Map<string, any>();
    for (const r of rows) {
      if (!map.has(r.entityId)) map.set(r.entityId, r.after);
    }
    return map;
  }

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
    const actorStaffId = await this.ctx.requireActorStaffId(principal);
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
          actorStaffId,
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

    const actorStaffId = await this.ctx.requireActorStaffId(principal);
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
          actorStaffId,
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

    await this.ctx.assertWorkspaceAccess(principal, workspaceId);
    const actorStaffId = await this.ctx.requireActorStaffId(principal);

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
          actorStaffId,
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
    await this.ctx.assertWorkspaceAccess(principal, workspaceId);
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
      await this.ctx.assertWorkspaceAccess(principal, query.workspaceId);
      where.workspaceId = query.workspaceId;
    } else if (query.branchId) {
      const workspaceId = await this.ctx.resolveBranchWorkspaceId(principal, query.branchId);
      where.workspaceId = workspaceId;
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

    // Add UI-friendly aliases without breaking existing consumers
    const shaped = items.map((i: any) => ({
      ...i,
      standardNumber: `${i.standardCode}-${i.meCode}`,
    }));

    return { items: shaped, nextCursor, take };
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
    await this.ctx.assertWorkspaceAccess(principal, item.workspaceId);
    return item;
  }

  async updateItem(principal: Principal, itemId: string, dto: UpdateNabhItemDto) {
    const existing = await this.ctx.prisma.nabhWorkspaceItem.findUnique({
      where: { id: itemId },
      include: { workspace: { select: { branchId: true } } },
    });
    if (!existing) throw new NotFoundException("NABH item not found");

    await this.ctx.assertWorkspaceAccess(principal, existing.workspaceId);
    const actorStaffId = await this.ctx.requireActorStaffId(principal);

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
          actorStaffId,
          before: existing,
          after: result,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: existing.workspace.branchId,
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

    await this.ctx.assertWorkspaceAccess(principal, existing.workspaceId);
    const actorStaffId = await this.ctx.requireActorStaffId(principal);

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
        actorStaffId,
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
          verifiedByStaffId: actorStaffId,
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: existing.workspaceId,
          entityType: "NABH_ITEM",
          entityId: itemId,
          action: "VERIFY",
          actorStaffId,
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
    await this.ctx.assertWorkspaceAccess(principal, workspaceId);
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
      branchId?: string;
      status?: string;
      cursor?: string;
      take?: number;
    },
  ) {
    const take = Math.min(Math.max(query.take ?? 50, 1), 200);
    const where: any = {};

    const workspaceId = query.workspaceId
      ? query.workspaceId
      : query.branchId
        ? await this.ctx.resolveBranchWorkspaceId(principal, query.branchId)
        : undefined;
    if (!workspaceId) throw new BadRequestException("workspaceId or branchId is required");
    await this.ctx.assertWorkspaceAccess(principal, workspaceId);
    where.workspaceId = workspaceId;

    // UI has COMPLETED/CLOSED; DB only has CLOSED
    const statusFilter = query.status;
    if (statusFilter && ["PLANNED", "IN_PROGRESS"].includes(statusFilter)) {
      where.status = statusFilter;
    }
    if (statusFilter && ["COMPLETED", "CLOSED"].includes(statusFilter)) {
      where.status = "CLOSED";
    }

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

    const ids = items.map((i: any) => i.id);
    const metaMap = await this.getCreateMetaMap("AUDIT_CYCLE", ids);

    // latest UI status per audit cycle
    const statusLogs = await this.ctx.prisma.complianceAuditLog.findMany({
      where: { entityType: "AUDIT_CYCLE", entityId: { in: ids }, action: "STATUS_CHANGE" },
      select: { entityId: true, after: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    const statusMap = new Map<string, string>();
    for (const l of statusLogs) {
      if (statusMap.has(l.entityId)) continue;
      const uiStatus = (l.after as any)?.ui?.status ?? (l.after as any)?.status;
      if (uiStatus) statusMap.set(l.entityId, uiStatus);
    }

    const leadIds = Array.from(
      new Set(
        items
          .map((i: any) => (i.auditorStaffIds?.length ? i.auditorStaffIds[0] : null))
          .filter(Boolean),
      ),
    ) as string[];
    const leads = leadIds.length
      ? await this.ctx.prisma.staff.findMany({ where: { id: { in: leadIds } }, select: { id: true, name: true } })
      : [];
    const leadMap = new Map(leads.map((s) => [s.id, s.name]));

    const shaped = items
      .map((row: any) => {
        const meta = metaMap.get(row.id) as any;
        const type = meta?.ui?.type ?? "INTERNAL";
        const leadAuditorStaffId = meta?.ui?.leadAuditorStaffId ?? (row.auditorStaffIds?.[0] ?? null);
        const leadAuditorName = leadAuditorStaffId ? leadMap.get(leadAuditorStaffId) ?? null : null;
        const uiStatus = statusMap.get(row.id) ?? (row.status === "CLOSED" ? "COMPLETED" : row.status);
        return {
          id: row.id,
          name: row.name,
          type,
          status: uiStatus,
          plannedStartDate: row.startDate,
          plannedEndDate: row.endDate,
          leadAuditorName,
          findingsCount: row._count?.findings ?? 0,
          createdAt: row.createdAt,
        };
      })
      .filter((r: any) => {
        if (!statusFilter) return true;
        return r.status === statusFilter;
      });

    return { items: shaped, nextCursor, take };
  }

  async getAuditCycle(principal: Principal, auditId: string) {
    const cycle = await this.ctx.prisma.auditCycle.findUnique({
      where: { id: auditId },
      include: {
        findings: true,
      },
    });
    if (!cycle) throw new NotFoundException("Audit cycle not found");

    await this.ctx.assertWorkspaceAccess(principal, cycle.workspaceId);

    const statusLog = await this.ctx.prisma.complianceAuditLog.findFirst({
      where: { entityType: "AUDIT_CYCLE", entityId: auditId, action: "STATUS_CHANGE" },
      select: { after: true },
      orderBy: { createdAt: "desc" },
    });

    const meta = await this.ctx.prisma.complianceAuditLog.findFirst({
      where: { entityType: "AUDIT_CYCLE", entityId: auditId, action: "CREATE" },
      select: { after: true },
      orderBy: { createdAt: "desc" },
    });

    const ui = (meta?.after as any)?.ui ?? {};
    const type = ui.type ?? "INTERNAL";
    const scope = ui.scope ?? null;
    const notes = ui.notes ?? null;
    const leadAuditorStaffId = ui.leadAuditorStaffId ?? (cycle.auditorStaffIds?.[0] ?? null);
    const leadAuditorName = leadAuditorStaffId
      ? (
          await this.ctx.prisma.staff.findUnique({
            where: { id: leadAuditorStaffId },
            select: { name: true },
          })
        )?.name ?? null
      : null;

    const uiStatus =
      ((statusLog?.after as any)?.ui?.status as string | undefined) ??
      ((cycle.status === "CLOSED" ? "COMPLETED" : cycle.status) as any);

    // Map item metadata for findings
    const itemIds = Array.from(new Set(cycle.findings.map((f: any) => f.itemId).filter(Boolean))) as string[];
    const items = itemIds.length
      ? await this.ctx.prisma.nabhWorkspaceItem.findMany({
          where: { id: { in: itemIds } },
          select: { id: true, standardCode: true, meCode: true, title: true },
        })
      : [];
    const itemMap = new Map(items.map((i) => [i.id, i]));

    const findings = cycle.findings.map((f: any) => {
      const it = f.itemId ? itemMap.get(f.itemId) : null;
      return {
        id: f.id,
        nabhItemId: f.itemId ?? null,
        nabhItemStandardNumber: it ? `${it.standardCode}-${it.meCode}` : null,
        severity: f.severity,
        description: f.description,
        recommendation: f.recommendedAction ?? null,
        auditorName: leadAuditorName,
        createdAt: f.createdAt,
      };
    });

    return {
      id: cycle.id,
      name: cycle.name,
      type,
      status: uiStatus,
      plannedStartDate: cycle.startDate,
      plannedEndDate: cycle.endDate,
      leadAuditorName,
      leadAuditorStaffId,
      scope,
      notes,
      findings,
      createdAt: cycle.createdAt,
      updatedAt: cycle.updatedAt,
    };
  }

  async createAuditCycle(principal: Principal, dto: CreateAuditCycleDto) {
    const workspaceId = dto.workspaceId
      ? dto.workspaceId
      : dto.branchId
        ? await this.ctx.resolveBranchWorkspaceId(principal, dto.branchId)
        : undefined;
    if (!workspaceId) throw new BadRequestException("workspaceId or branchId is required");

    const workspace = await this.ctx.prisma.complianceWorkspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException("Workspace not found");
    await this.ctx.assertWorkspaceAccess(principal, workspaceId);
    const actorStaffId = await this.ctx.requireActorStaffId(principal);

    const startRaw = dto.plannedStartDate ?? dto.startDate;
    if (!startRaw) throw new BadRequestException("plannedStartDate/startDate is required");
    const endRaw = dto.plannedEndDate ?? dto.endDate ?? startRaw;

    const leadAuditorStaffId = dto.leadAuditorStaffId ?? null;
    const auditorStaffIds = leadAuditorStaffId ? [leadAuditorStaffId] : dto.auditorStaffIds ?? [];

    const cycle = await this.ctx.prisma.$transaction(async (tx) => {
      const created = await tx.auditCycle.create({
        data: {
          workspaceId,
          name: dto.name,
          startDate: new Date(startRaw),
          endDate: new Date(endRaw as any),
          status: "PLANNED",
          auditorStaffIds,
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId,
          entityType: "AUDIT_CYCLE",
          entityId: created.id,
          action: "CREATE",
          actorStaffId,
          after: {
            ...created,
            ui: {
              type: dto.type ?? "INTERNAL",
              scope: dto.scope ?? null,
              notes: dto.notes ?? null,
              leadAuditorStaffId,
            },
          },
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

    await this.ctx.assertWorkspaceAccess(principal, existing.workspaceId);
    const actorStaffId = await this.ctx.requireActorStaffId(principal);

    const ws = await this.ctx.prisma.complianceWorkspace.findUnique({
      where: { id: existing.workspaceId },
      select: { branchId: true },
    });

    const prevStatusLog = await this.ctx.prisma.complianceAuditLog.findFirst({
      where: { entityType: "AUDIT_CYCLE", entityId: id, action: "STATUS_CHANGE" },
      select: { after: true },
      orderBy: { createdAt: "desc" },
    });
    const uiPrevStatus =
      ((prevStatusLog?.after as any)?.ui?.status as string | undefined) ??
      (existing.status === "CLOSED" ? "COMPLETED" : (existing.status as any));

    // Normalize UI status → DB status
    let dbStatus: any | undefined;
    if (dto.status) {
      dbStatus = ["COMPLETED", "CLOSED"].includes(dto.status) ? "CLOSED" : dto.status;
    }

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const result = await tx.auditCycle.update({
        where: { id },
        data: {
          ...(dbStatus !== undefined && { status: dbStatus }),
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.endDate !== undefined && { endDate: new Date(dto.endDate) }),
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: existing.workspaceId,
          entityType: "AUDIT_CYCLE",
          entityId: id,
          action: dto.status ? "STATUS_CHANGE" : "UPDATE",
          actorStaffId,
          before: dto.status ? { ui: { status: uiPrevStatus } } : existing,
          after: {
            ...result,
            ...(dto.status ? { ui: { status: dto.status } } : {}),
          },
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: ws?.branchId,
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
    const finding = await this.ctx.prisma.auditFinding.findUnique({
      where: { id: findingId },
      include: {
        capa: true,
        audit: true,
      },
    });
    if (!finding) throw new NotFoundException("Finding not found");

    await this.ctx.assertWorkspaceAccess(principal, finding.audit.workspaceId);

    // Lead auditor name from auditCycle auditorStaffIds[0]
    const leadId = finding.audit.auditorStaffIds?.[0] ?? null;
    const lead = leadId
      ? await this.ctx.prisma.staff.findUnique({ where: { id: leadId }, select: { name: true } })
      : null;

    const item = finding.itemId
      ? await this.ctx.prisma.nabhWorkspaceItem.findUnique({
          where: { id: finding.itemId },
          select: { id: true, standardCode: true, meCode: true, title: true },
        })
      : null;

    // CAPA UI status from latest status log
    let capaUiStatus: any = null;
    if (finding.capa) {
      const capaStatusLog = await this.ctx.prisma.complianceAuditLog.findFirst({
        where: { entityType: "CAPA", entityId: finding.capa.id, action: "STATUS_CHANGE" },
        select: { after: true },
        orderBy: { createdAt: "desc" },
      });
      capaUiStatus =
        (capaStatusLog?.after as any)?.ui?.status ??
        (finding.capa.status === "CLOSED" ? "COMPLETED" : finding.capa.status);
    }

    return {
      id: finding.id,
      auditId: finding.auditId,
      auditName: finding.audit.name,
      nabhItemId: finding.itemId,
      nabhItemStandardNumber: item ? `${item.standardCode}-${item.meCode}` : null,
      nabhItemDescription: item?.title ?? null,
      severity: finding.severity,
      description: finding.description,
      recommendation: finding.recommendedAction ?? null,
      auditorName: lead?.name ?? null,
      capa: finding.capa
        ? {
            id: finding.capa.id,
            description: finding.capa.actionPlan,
            responsibleStaffId: finding.capa.ownerStaffId,
            responsibleStaffName: (
              await this.ctx.prisma.staff.findUnique({
                where: { id: finding.capa.ownerStaffId },
                select: { name: true },
              })
            )?.name,
            targetDate: finding.capa.dueDate,
            status: capaUiStatus,
            createdAt: finding.capa.createdAt,
          }
        : null,
      createdAt: finding.createdAt,
      updatedAt: finding.updatedAt,
    };
  }

  async createFinding(principal: Principal, dto: CreateFindingDto) {
    const audit = await this.ctx.prisma.auditCycle.findUnique({
      where: { id: dto.auditId },
    });
    if (!audit) throw new NotFoundException("Audit cycle not found");

    await this.ctx.assertWorkspaceAccess(principal, audit.workspaceId);
    const actorStaffId = await this.ctx.requireActorStaffId(principal);

    const ws = await this.ctx.prisma.complianceWorkspace.findUnique({
      where: { id: audit.workspaceId },
      select: { branchId: true },
    });

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
          severity: this.normalizeFindingSeverity(dto.severity),
          description: dto.description,
          recommendedAction: (dto as any).recommendedAction ?? (dto as any).recommendation ?? null,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: audit.workspaceId,
          entityType: "FINDING",
          entityId: created.id,
          action: "CREATE",
          actorStaffId,
          after: created,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: ws?.branchId,
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

    await this.ctx.assertWorkspaceAccess(principal, existing.audit.workspaceId);
    const actorStaffId = await this.ctx.requireActorStaffId(principal);

    const ws = await this.ctx.prisma.complianceWorkspace.findUnique({
      where: { id: existing.audit.workspaceId },
      select: { branchId: true },
    });

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
          actorStaffId,
          before: existing,
          after: result,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: ws?.branchId,
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
    const capa = await this.ctx.prisma.capaAction.findUnique({
      where: { id: capaId },
      include: {
        finding: {
          include: {
            audit: { select: { id: true, name: true, workspaceId: true } },
          },
        },
        owner: { select: { id: true, name: true } },
      },
    });
    if (!capa) throw new NotFoundException("CAPA not found");

    await this.ctx.assertWorkspaceAccess(principal, capa.finding.audit.workspaceId);

    // UI status from latest status log
    const statusLog = await this.ctx.prisma.complianceAuditLog.findFirst({
      where: { entityType: "CAPA", entityId: capaId, action: "STATUS_CHANGE" },
      select: { after: true },
      orderBy: { createdAt: "desc" },
    });
    const uiStatus =
      (statusLog?.after as any)?.ui?.status ?? (capa.status === "CLOSED" ? "COMPLETED" : capa.status);

    const evidenceLinks = await this.ctx.prisma.evidenceLink.findMany({
      where: { targetType: "CAPA", targetId: capaId },
      include: { evidence: { select: { id: true, title: true, fileName: true } } },
      orderBy: { createdAt: "desc" },
    });

    const statusChangesLogs = await this.ctx.prisma.complianceAuditLog.findMany({
      where: { entityType: "CAPA", entityId: capaId, action: "STATUS_CHANGE" },
      include: { actor: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return {
      id: capa.id,
      findingId: capa.findingId,
      findingDescription: capa.finding.description,
      findingSeverity: capa.finding.severity,
      auditId: capa.finding.audit.id,
      auditName: capa.finding.audit.name,
      description: capa.actionPlan,
      responsibleStaffId: capa.ownerStaffId,
      responsibleStaffName: capa.owner?.name ?? null,
      targetDate: capa.dueDate,
      status: uiStatus,
      actionPlan: capa.actionPlan,
      evidenceLinks: evidenceLinks.map((l) => ({
        id: l.id,
        evidenceId: l.evidenceId,
        title: l.evidence.title,
        fileName: l.evidence.fileName,
        linkedAt: l.createdAt,
      })),
      statusChanges: statusChangesLogs.map((l) => ({
        id: l.id,
        fromStatus: (l.before as any)?.ui?.status ?? (l.before as any)?.status ?? null,
        toStatus: (l.after as any)?.ui?.status ?? (l.after as any)?.status ?? null,
        changedBy: l.actor?.id ?? null,
        changedByName: l.actor?.name ?? null,
        changedAt: l.createdAt,
        comment: (l.after as any)?.ui?.comment ?? null,
      })),
      createdAt: capa.createdAt,
      updatedAt: capa.updatedAt,
    };
  }

  async createCapa(principal: Principal, dto: CreateCapaDto) {
    const finding = await this.ctx.prisma.auditFinding.findUnique({
      where: { id: dto.findingId },
      include: { audit: { select: { workspaceId: true } }, capa: true },
    });
    if (!finding) throw new NotFoundException("Finding not found");

    await this.ctx.assertWorkspaceAccess(principal, finding.audit.workspaceId);
    const actorStaffId = await this.ctx.requireActorStaffId(principal);

    const ws = await this.ctx.prisma.complianceWorkspace.findUnique({
      where: { id: finding.audit.workspaceId },
      select: { branchId: true },
    });

    if (finding.capa) {
      throw new BadRequestException("Finding already has a CAPA action assigned");
    }

    const capa = await this.ctx.prisma.$transaction(async (tx) => {
      const ownerStaffId = dto.ownerStaffId ?? (dto as any).responsibleStaffId ?? actorStaffId;
      const dueRaw = dto.dueDate ?? (dto as any).targetDate;
      const due = dueRaw ? new Date(dueRaw) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const actionPlan = dto.actionPlan ?? (dto as any).description ?? "CAPA Action";

      const created = await tx.capaAction.create({
        data: {
          findingId: dto.findingId,
          ownerStaffId,
          dueDate: due,
          actionPlan,
          status: "OPEN",
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: finding.audit.workspaceId,
          entityType: "CAPA",
          entityId: created.id,
          action: "CREATE",
          actorStaffId,
          after: created,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: ws?.branchId,
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

    await this.ctx.assertWorkspaceAccess(principal, existing.finding.audit.workspaceId);
    const actorStaffId = await this.ctx.requireActorStaffId(principal);

    const ws = await this.ctx.prisma.complianceWorkspace.findUnique({
      where: { id: existing.finding.audit.workspaceId },
      select: { branchId: true },
    });

    const prevStatusLog = await this.ctx.prisma.complianceAuditLog.findFirst({
      where: { entityType: "CAPA", entityId: id, action: "STATUS_CHANGE" },
      select: { after: true },
      orderBy: { createdAt: "desc" },
    });
    const uiPrevStatus =
      (prevStatusLog?.after as any)?.ui?.status ?? (existing.status === "CLOSED" ? "COMPLETED" : existing.status);

    const uiNewStatus = dto.status;
    const dbNewStatus = (() => {
      if (!uiNewStatus) return undefined;
      if (uiNewStatus === "OPEN" || uiNewStatus === "IN_PROGRESS") return uiNewStatus;
      return "CLOSED";
    })();
    const isClosure = dbNewStatus === "CLOSED" && existing.status !== "CLOSED";

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const result = await tx.capaAction.update({
        where: { id },
        data: {
          ...(dbNewStatus !== undefined && { status: dbNewStatus }),
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
          action: uiNewStatus ? "STATUS_CHANGE" : "UPDATE",
          actorStaffId,
          before: uiNewStatus ? { ui: { status: uiPrevStatus } } : existing,
          after: uiNewStatus
            ? { ...result, ui: { status: uiNewStatus, comment: dto.closureNotes ?? null } }
            : result,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: ws?.branchId,
          actorUserId: principal.userId,
          action: uiNewStatus ? "NABH_CAPA_STATUS_CHANGE" : isClosure ? "NABH_CAPA_CLOSE" : "NABH_CAPA_UPDATE",
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
