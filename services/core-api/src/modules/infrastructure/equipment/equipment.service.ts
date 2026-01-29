import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { canonicalizeCode } from "../../../common/naming.util";
import { INFRA_POLICY } from "../infrastructure.constants";
import { InfraContextService } from "../shared/infra-context.service";
import type {
  CloseDowntimeDto,
  CreateDowntimeDto,
  CreateEquipmentAssetDto,
  ListEquipmentQueryDto,
  UpdateEquipmentAssetDto,
} from "./dto";

type ComplianceMode = "BLOCK" | "WARN";

type EquipmentCompliancePolicy = {
  mode?: ComplianceMode;
  schedulable?: {
    requireAerbForRadiology?: boolean;
    requireValidAerb?: boolean;
    requirePcpndtForUltrasound?: boolean;
    requireValidPcpndt?: boolean;
  };
};

function addDays(d: Date, days: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

function normalizeString(x?: string | null) {
  const v = (x ?? "").trim();
  return v.length ? v : null;
}

function parseDate(x?: string | null): Date | null {
  if (x === null || x === undefined) return null;
  const t = String(x).trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) throw new BadRequestException("Invalid date");
  return d;
}

@Injectable()
export class EquipmentService {
  constructor(private readonly ctx: InfraContextService) { }

  private async getCompliancePolicy(branchId: string): Promise<Required<EquipmentCompliancePolicy>> {
    const fallback: Required<EquipmentCompliancePolicy> = {
      mode: "BLOCK",
      schedulable: {
        requireAerbForRadiology: true,
        requireValidAerb: true,
        requirePcpndtForUltrasound: true,
        requireValidPcpndt: true,
      },
    };

    const p = (await this.ctx.policyEngine.getPayload(INFRA_POLICY.EQUIPMENT_COMPLIANCE, branchId, fallback)) as any;
    return {
      mode: (p?.mode ?? fallback.mode) as any,
      schedulable: {
        requireAerbForRadiology: p?.schedulable?.requireAerbForRadiology ?? fallback.schedulable.requireAerbForRadiology,
        requireValidAerb: p?.schedulable?.requireValidAerb ?? fallback.schedulable.requireValidAerb,
        requirePcpndtForUltrasound: p?.schedulable?.requirePcpndtForUltrasound ?? fallback.schedulable.requirePcpndtForUltrasound,
        requireValidPcpndt: p?.schedulable?.requireValidPcpndt ?? fallback.schedulable.requireValidPcpndt,
      },
    };
  }

  private async validateLocationBinding(branchId: string, dto: { unitId?: string | null; roomId?: string | null; locationNodeId?: string | null }) {
    // EquipmentAsset does not have Prisma relations to unit/room/locationNode in schema today.
    // We still validate IDs against the branch to prevent cross-branch contamination.
    if (dto.unitId) {
      const ok = await this.ctx.prisma.unit.findFirst({ where: { id: dto.unitId, branchId }, select: { id: true } });
      if (!ok) throw new BadRequestException("Invalid unitId for this branch");
    }
    if (dto.roomId) {
      const ok = await this.ctx.prisma.room.findFirst({ where: { id: dto.roomId, branchId }, select: { id: true } });
      if (!ok) throw new BadRequestException("Invalid roomId for this branch");
    }
    if (dto.locationNodeId) {
      const ok = await this.ctx.prisma.locationNode.findFirst({ where: { id: dto.locationNodeId, branchId }, select: { id: true } });
      if (!ok) throw new BadRequestException("Invalid locationNodeId for this branch");
    }
  }

  private validateContractDates(dto: { amcValidFrom?: string | null; amcValidTo?: string | null }) {
    const from = parseDate(dto.amcValidFrom ?? null);
    const to = parseDate(dto.amcValidTo ?? null);
    if (from && to && to.getTime() < from.getTime()) {
      throw new BadRequestException("amcValidTo must be on/after amcValidFrom");
    }
  }

  private validatePmFields(dto: { pmFrequencyDays?: number | null; nextPmDueAt?: string | null }) {
    if (dto.pmFrequencyDays !== undefined && dto.pmFrequencyDays !== null) {
      const n = Number(dto.pmFrequencyDays);
      if (!Number.isFinite(n) || n < 1) throw new BadRequestException("pmFrequencyDays must be >= 1");
    }
    if (dto.nextPmDueAt !== undefined && dto.nextPmDueAt !== null) {
      parseDate(dto.nextPmDueAt);
    }
  }

  private complianceWarnings(category: string, dto: { aerbLicenseNo?: string | null; aerbValidTo?: string | null; pcpndtRegNo?: string | null; pcpndtValidTo?: string | null }, policy: Required<EquipmentCompliancePolicy>) {
    const warnings: string[] = [];
    const now = new Date();

    if (category === "RADIOLOGY" && policy.schedulable.requireAerbForRadiology) {
      if (!normalizeString(dto.aerbLicenseNo) || !dto.aerbValidTo) {
        warnings.push("AERB license no + validTo are required for RADIOLOGY equipment to be schedulable.");
      } else if (policy.schedulable.requireValidAerb) {
        const validTo = parseDate(dto.aerbValidTo);
        if (validTo && validTo.getTime() < now.getTime()) warnings.push("AERB validity has expired.");
      }
    }

    if (category === "ULTRASOUND" && policy.schedulable.requirePcpndtForUltrasound) {
      if (!normalizeString(dto.pcpndtRegNo) || !dto.pcpndtValidTo) {
        warnings.push("PCPNDT reg no + validTo are required for ULTRASOUND equipment to be schedulable.");
      } else if (policy.schedulable.requireValidPcpndt) {
        const validTo = parseDate(dto.pcpndtValidTo);
        if (validTo && validTo.getTime() < now.getTime()) warnings.push("PCPNDT validity has expired.");
      }
    }

    return warnings;
  }

  private normalizeCreate(dto: CreateEquipmentAssetDto) {
    const now = new Date();
    this.validateContractDates(dto);
    this.validatePmFields(dto);

    const pmFrequencyDays = dto.pmFrequencyDays ?? null;
    let nextPmDueAt = dto.nextPmDueAt ? parseDate(dto.nextPmDueAt) : null;
    if (!nextPmDueAt && pmFrequencyDays) {
      nextPmDueAt = addDays(now, pmFrequencyDays);
    }

    const operationalStatus = (dto.operationalStatus ?? "OPERATIONAL") as any;

    return {
      code: canonicalizeCode(dto.code),
      name: dto.name?.trim(),
      category: dto.category,
      make: normalizeString(dto.make),
      model: normalizeString(dto.model),
      serial: normalizeString(dto.serial),
      ownerDepartmentId: dto.ownerDepartmentId ?? null,
      unitId: dto.unitId ?? null,
      roomId: dto.roomId ?? null,
      locationNodeId: dto.locationNodeId ?? null,
      operationalStatus,
      amcVendor: normalizeString(dto.amcVendor),
      amcValidFrom: dto.amcValidFrom ? parseDate(dto.amcValidFrom) : null,
      amcValidTo: dto.amcValidTo ? parseDate(dto.amcValidTo) : null,
      warrantyValidTo: dto.warrantyValidTo ? parseDate(dto.warrantyValidTo) : null,
      pmFrequencyDays,
      nextPmDueAt,
      aerbLicenseNo: normalizeString(dto.aerbLicenseNo),
      aerbValidTo: dto.aerbValidTo ? parseDate(dto.aerbValidTo) : null,
      pcpndtRegNo: normalizeString(dto.pcpndtRegNo),
      pcpndtValidTo: dto.pcpndtValidTo ? parseDate(dto.pcpndtValidTo) : null,
      isSchedulable: dto.isSchedulable ?? false,
    };
  }

  private normalizePatch(dto: UpdateEquipmentAssetDto) {
    this.validateContractDates(dto);
    this.validatePmFields(dto);

    // NOTE: In PATCH semantics, `null` means clear; `undefined` means untouched.
    return {
      code: dto.code ? canonicalizeCode(dto.code) : undefined,
      name: dto.name !== undefined ? dto.name?.trim() : undefined,
      category: dto.category as any,
      make: dto.make === undefined ? undefined : normalizeString(dto.make),
      model: dto.model === undefined ? undefined : normalizeString(dto.model),
      serial: dto.serial === undefined ? undefined : normalizeString(dto.serial),
      ownerDepartmentId: dto.ownerDepartmentId === undefined ? undefined : dto.ownerDepartmentId,
      unitId: dto.unitId === undefined ? undefined : dto.unitId,
      roomId: dto.roomId === undefined ? undefined : dto.roomId,
      locationNodeId: dto.locationNodeId === undefined ? undefined : dto.locationNodeId,
      operationalStatus: dto.operationalStatus as any,
      amcVendor: dto.amcVendor === undefined ? undefined : normalizeString(dto.amcVendor),
      amcValidFrom: dto.amcValidFrom === undefined ? undefined : dto.amcValidFrom ? parseDate(dto.amcValidFrom) : null,
      amcValidTo: dto.amcValidTo === undefined ? undefined : dto.amcValidTo ? parseDate(dto.amcValidTo) : null,
      warrantyValidTo: dto.warrantyValidTo === undefined ? undefined : dto.warrantyValidTo ? parseDate(dto.warrantyValidTo) : null,
      pmFrequencyDays: dto.pmFrequencyDays === undefined ? undefined : dto.pmFrequencyDays,
      nextPmDueAt: dto.nextPmDueAt === undefined ? undefined : dto.nextPmDueAt ? parseDate(dto.nextPmDueAt) : null,
      aerbLicenseNo: dto.aerbLicenseNo === undefined ? undefined : normalizeString(dto.aerbLicenseNo),
      aerbValidTo: dto.aerbValidTo === undefined ? undefined : dto.aerbValidTo ? parseDate(dto.aerbValidTo) : null,
      pcpndtRegNo: dto.pcpndtRegNo === undefined ? undefined : normalizeString(dto.pcpndtRegNo),
      pcpndtValidTo: dto.pcpndtValidTo === undefined ? undefined : dto.pcpndtValidTo ? parseDate(dto.pcpndtValidTo) : null,
      isSchedulable: dto.isSchedulable === undefined ? undefined : dto.isSchedulable,
    };
  }

  private async enforceSchedulableOrWarn(branchId: string, category: string, dto: any) {
    const policy = await this.getCompliancePolicy(branchId);
    if (!dto.isSchedulable) return { warnings: [] as string[], policy };

    const warnings = this.complianceWarnings(category, dto, policy);
    if (warnings.length && policy.mode === "BLOCK") {
      throw new BadRequestException(warnings[0]);
    }
    return { warnings, policy };
  }

  async listEquipment(principal: Principal, q: ListEquipmentQueryDto) {
    const branchId = this.ctx.resolveBranchId(principal, q.branchId ?? null);

    const where: any = { branchId };
    if (q.q) {
      where.OR = [
        { name: { contains: q.q, mode: "insensitive" } },
        { code: { contains: q.q, mode: "insensitive" } },
        { serial: { contains: q.q, mode: "insensitive" } },
      ];
    }
    if (q.category) where.category = q.category;
    if (q.operationalStatus) where.operationalStatus = q.operationalStatus;
    if (q.ownerDepartmentId) where.ownerDepartmentId = q.ownerDepartmentId;
    if (q.unitId) where.unitId = q.unitId;
    if (q.roomId) where.roomId = q.roomId;
    if (q.locationNodeId) where.locationNodeId = q.locationNodeId;

    const now = new Date();

    // Due/expiry windows
    const and: any[] = [];
    const within = (days: number) => addDays(now, days);

    if (q.pmDueInDays !== undefined) {
      and.push({ nextPmDueAt: { lte: within(q.pmDueInDays) } });
    }
    if (q.amcExpiringInDays !== undefined) {
      and.push({ amcValidTo: { lte: within(q.amcExpiringInDays) } });
    }
    if (q.warrantyExpiringInDays !== undefined) {
      and.push({ warrantyValidTo: { lte: within(q.warrantyExpiringInDays) } });
    }
    if (q.complianceExpiringInDays !== undefined) {
      // Either AERB or PCPNDT expiry depending on category.
      and.push({
        OR: [
          { category: "RADIOLOGY", aerbValidTo: { lte: within(q.complianceExpiringInDays) } },
          { category: "ULTRASOUND", pcpndtValidTo: { lte: within(q.complianceExpiringInDays) } },
        ],
      });
    }
    if (and.length) where.AND = and;

    const page = Math.max(1, Number(q.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(q.pageSize ?? 50)));
    const skip = (page - 1) * pageSize;

    const [rows, total] = await this.ctx.prisma.$transaction([
      this.ctx.prisma.equipmentAsset.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: pageSize,
        include: {
          ownerDepartment: { select: { id: true, code: true, name: true } },
          downtimeTickets: { where: { status: "OPEN" as any }, orderBy: [{ openedAt: "desc" }], take: 3 },
        },
      }),
      this.ctx.prisma.equipmentAsset.count({ where }),
    ]);

    return { page, pageSize, total, rows };
  }

  async summary(principal: Principal, q: { branchId?: string | null }) {
    const branchId = this.ctx.resolveBranchId(principal, q.branchId ?? null);
    const now = new Date();
    const in30 = addDays(now, 30);

    const [byStatus, byCategory, openDowntimeCount, pmDueCount, amcExpiringCount, warrantyExpiringCount, complianceExpiringCount] =
      await this.ctx.prisma.$transaction([
        this.ctx.prisma.equipmentAsset.groupBy({
          by: ["operationalStatus"],
          where: { branchId },
          orderBy: [{ operationalStatus: "asc" }],
          _count: { _all: true },
        }),
        this.ctx.prisma.equipmentAsset.groupBy({
          by: ["category"],
          where: { branchId },
          orderBy: [{ category: "asc" }],
          _count: { _all: true },
        }),
        this.ctx.prisma.downtimeTicket.count({ where: { asset: { branchId }, status: "OPEN" as any } }),
        this.ctx.prisma.equipmentAsset.count({ where: { branchId, nextPmDueAt: { lte: now } } }),
        this.ctx.prisma.equipmentAsset.count({ where: { branchId, amcValidTo: { lte: in30 } } }),
        this.ctx.prisma.equipmentAsset.count({ where: { branchId, warrantyValidTo: { lte: in30 } } }),
        this.ctx.prisma.equipmentAsset.count({
          where: {
            branchId,
            OR: [
              { category: "RADIOLOGY", aerbValidTo: { lte: in30 } },
              { category: "ULTRASOUND", pcpndtValidTo: { lte: in30 } },
            ],
          },
        }),
      ]);

    return {
      branchId,
      byStatus,
      byCategory,
      openDowntimeCount,
      due: {
        pmDueCount,
        amcExpiringIn30Count: amcExpiringCount,
        warrantyExpiringIn30Count: warrantyExpiringCount,
        complianceExpiringIn30Count: complianceExpiringCount,
      },
    };
  }

  async alerts(principal: Principal, q: { branchId?: string | null; withinDays: number }) {
    const branchId = this.ctx.resolveBranchId(principal, q.branchId ?? null);
    const withinDays = Number.isFinite(q.withinDays) ? Math.max(0, Math.min(365, Number(q.withinDays))) : 30;
    const now = new Date();
    const until = addDays(now, withinDays);

    const [pmDue, amcExpiring, warrantyExpiring, complianceExpiring, openDowntime] = await this.ctx.prisma.$transaction([
      this.ctx.prisma.equipmentAsset.findMany({
        where: { branchId, nextPmDueAt: { lte: until } },
        orderBy: [{ nextPmDueAt: "asc" }],
        take: 200,
      }),
      this.ctx.prisma.equipmentAsset.findMany({
        where: { branchId, amcValidTo: { lte: until } },
        orderBy: [{ amcValidTo: "asc" }],
        take: 200,
      }),
      this.ctx.prisma.equipmentAsset.findMany({
        where: { branchId, warrantyValidTo: { lte: until } },
        orderBy: [{ warrantyValidTo: "asc" }],
        take: 200,
      }),
      this.ctx.prisma.equipmentAsset.findMany({
        where: {
          branchId,
          OR: [
            { category: "RADIOLOGY", aerbValidTo: { lte: until } },
            { category: "ULTRASOUND", pcpndtValidTo: { lte: until } },
          ],
        },
        orderBy: [{ updatedAt: "desc" }],
        take: 200,
      }),
      this.ctx.prisma.downtimeTicket.findMany({
        where: { asset: { branchId }, status: "OPEN" as any },
        orderBy: [{ openedAt: "desc" }],
        take: 200,
        include: { asset: { select: { id: true, code: true, name: true, category: true } } },
      }),
    ]);

    return {
      branchId,
      withinDays,
      pmDue,
      amcExpiring,
      warrantyExpiring,
      complianceExpiring,
      openDowntime,
    };
  }

  async getEquipment(principal: Principal, id: string) {
    const asset = await this.ctx.prisma.equipmentAsset.findUnique({
      where: { id },
      include: {
        ownerDepartment: { select: { id: true, code: true, name: true } },
        downtimeTickets: { orderBy: [{ openedAt: "desc" }], take: 50 },
      },
    });
    if (!asset) throw new NotFoundException("Equipment not found");
    this.ctx.resolveBranchId(principal, asset.branchId);
    return asset;
  }

  async listDowntime(principal: Principal, assetId: string) {
    const asset = await this.ctx.prisma.equipmentAsset.findUnique({ where: { id: assetId }, select: { id: true, branchId: true } });
    if (!asset) throw new NotFoundException("Equipment not found");
    this.ctx.resolveBranchId(principal, asset.branchId);

    return this.ctx.prisma.downtimeTicket.findMany({
      where: { assetId },
      orderBy: [{ openedAt: "desc" }],
    });
  }

  async createEquipment(principal: Principal, dto: CreateEquipmentAssetDto, branchIdParam?: string | null) {
    const branchId = this.ctx.resolveBranchId(principal, branchIdParam ?? null);
    await this.validateLocationBinding(branchId, dto);

    const data = this.normalizeCreate(dto);
    const { warnings } = await this.enforceSchedulableOrWarn(branchId, data.category, data);

    // Business rule: Retired equipment cannot be schedulable.
    if (data.operationalStatus === "RETIRED") {
      data.isSchedulable = false;
    }

    const created = await this.ctx.prisma.equipmentAsset.create({
      data: {
        ...data,
        branchId,
      } as any,
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_EQUIPMENT_CREATE",
      entity: "EquipmentAsset",
      entityId: created.id,
      meta: { ...dto, warnings },
    });

    return warnings.length ? { ...created, warnings } : created;
  }

  async updateEquipment(principal: Principal, id: string, dto: UpdateEquipmentAssetDto) {
    const current = await this.ctx.prisma.equipmentAsset.findUnique({
      where: { id },
      select: {
        id: true,
        branchId: true,
        category: true,
        isSchedulable: true,
        aerbLicenseNo: true,
        aerbValidTo: true,
        pcpndtRegNo: true,
        pcpndtValidTo: true,
        operationalStatus: true,
      },
    });
    if (!current) throw new NotFoundException("Equipment not found");
    const branchId = this.ctx.resolveBranchId(principal, current.branchId);

    await this.validateLocationBinding(branchId, dto);

    const patch = this.normalizePatch(dto);
    const effectiveCategory = (patch.category ?? current.category) as any;

    // Evaluate effective fields for schedulable enforcement
    const effective = {
      ...current,
      ...patch,
    } as any;

    const { warnings } = await this.enforceSchedulableOrWarn(branchId, effectiveCategory, {
      isSchedulable: effective.isSchedulable,
      aerbLicenseNo: effective.aerbLicenseNo,
      aerbValidTo: effective.aerbValidTo ? new Date(effective.aerbValidTo).toISOString() : null,
      pcpndtRegNo: effective.pcpndtRegNo,
      pcpndtValidTo: effective.pcpndtValidTo ? new Date(effective.pcpndtValidTo).toISOString() : null,
    });

    // Retired equipment cannot be schedulable.
    const effectiveStatus = (patch.operationalStatus ?? current.operationalStatus) as any;
    if (effectiveStatus === "RETIRED") {
      patch.isSchedulable = false;
    }

    // If PM frequency is provided but next due isn't, auto-schedule from now.
    if (dto.pmFrequencyDays !== undefined && dto.pmFrequencyDays !== null && dto.nextPmDueAt === undefined) {
      patch.nextPmDueAt = addDays(new Date(), Number(dto.pmFrequencyDays));
    }

    const updated = await this.ctx.prisma.equipmentAsset.update({
      where: { id },
      data: patch as any,
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_EQUIPMENT_UPDATE",
      entity: "EquipmentAsset",
      entityId: id,
      meta: { ...dto, warnings },
    });

    return warnings.length ? { ...updated, warnings } : updated;
  }

  async retireEquipment(principal: Principal, id: string) {
    const asset = await this.ctx.prisma.equipmentAsset.findUnique({ where: { id }, select: { id: true, branchId: true } });
    if (!asset) throw new NotFoundException("Equipment not found");
    const branchId = this.ctx.resolveBranchId(principal, asset.branchId);

    // Close any open downtime tickets (optional). Here we leave them as-is for audit.
    const updated = await this.ctx.prisma.equipmentAsset.update({
      where: { id },
      data: { operationalStatus: "RETIRED" as any, isSchedulable: false },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_EQUIPMENT_RETIRE",
      entity: "EquipmentAsset",
      entityId: id,
      meta: { id },
    });

    return updated;
  }

  async openDowntime(principal: Principal, dto: CreateDowntimeDto) {
    const asset = await this.ctx.prisma.equipmentAsset.findUnique({
      where: { id: dto.assetId },
      select: { id: true, branchId: true, operationalStatus: true },
    });
    if (!asset) throw new NotFoundException("Equipment not found");
    const branchId = this.ctx.resolveBranchId(principal, asset.branchId);

    if (asset.operationalStatus === ("RETIRED" as any)) {
      throw new BadRequestException("Cannot open downtime for retired equipment");
    }

    const existingOpen = await this.ctx.prisma.downtimeTicket.findFirst({
      where: { assetId: dto.assetId, status: "OPEN" as any },
      select: { id: true },
    });
    if (existingOpen) {
      throw new BadRequestException("An OPEN downtime ticket already exists for this asset");
    }

    const ticket = await this.ctx.prisma.downtimeTicket.create({
      data: { assetId: dto.assetId, reason: dto.reason.trim(), notes: dto.notes ? dto.notes.trim() : null },
    });

    await this.ctx.prisma.equipmentAsset.update({ where: { id: dto.assetId }, data: { operationalStatus: "DOWN" as any } });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_EQUIPMENT_DOWNTIME_OPEN",
      entity: "DowntimeTicket",
      entityId: ticket.id,
      meta: dto,
    });

    return ticket;
  }

  async closeDowntime(principal: Principal, dto: CloseDowntimeDto) {
    const ticket = await this.ctx.prisma.downtimeTicket.findUnique({
      where: { id: dto.ticketId },
      include: { asset: { select: { id: true, branchId: true, operationalStatus: true } } },
    });
    if (!ticket) throw new NotFoundException("Downtime ticket not found");
    const branchId = this.ctx.resolveBranchId(principal, ticket.asset.branchId);

    if (ticket.status !== ("OPEN" as any)) {
      throw new BadRequestException("Downtime ticket is not OPEN");
    }

    const updated = await this.ctx.prisma.downtimeTicket.update({
      where: { id: dto.ticketId },
      data: {
        status: "CLOSED" as any,
        notes: dto.notes ? dto.notes.trim() : undefined,
        closedAt: new Date(),
      },
    });

    // If no other OPEN tickets remain, return equipment to OPERATIONAL.
    const stillOpen = await this.ctx.prisma.downtimeTicket.count({ where: { assetId: ticket.assetId, status: "OPEN" as any } });
    if (!stillOpen && ticket.asset.operationalStatus !== ("RETIRED" as any)) {
      await this.ctx.prisma.equipmentAsset.update({ where: { id: ticket.assetId }, data: { operationalStatus: "OPERATIONAL" as any } });
    }

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_EQUIPMENT_DOWNTIME_CLOSE",
      entity: "DowntimeTicket",
      entityId: updated.id,
      meta: dto,
    });

    return updated;
  }
}
