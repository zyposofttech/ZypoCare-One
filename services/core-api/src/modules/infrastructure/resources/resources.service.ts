import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { InfraContextService } from "../shared/infra-context.service";
import { BranchConfigService } from "../branch-config/branch-config.service";
import type { CreateUnitResourceDto, UpdateUnitResourceDto } from "./dto";
import { assertResourceCode, canonicalizeCode } from "../../../common/naming.util";

// Keep service-level unions stable even as Prisma enums evolve.
export type ResourceState =
  | "AVAILABLE"
  | "RESERVED"
  | "OCCUPIED"
  | "CLEANING"
  | "SANITIZATION"
  | "MAINTENANCE"
  | "BLOCKED"
  | "INACTIVE";

const ALL_STATES: ResourceState[] = [
  "AVAILABLE",
  "RESERVED",
  "OCCUPIED",
  "CLEANING",
  "SANITIZATION",
  "MAINTENANCE",
  "BLOCKED",
  "INACTIVE",
];

function isState(x: any): x is ResourceState {
  return typeof x === "string" && (ALL_STATES as string[]).includes(x.toUpperCase());
}

function requiresReasonForState(next: ResourceState) {
  return next === "RESERVED" || next === "BLOCKED";
}

function isMobileType(t: string) {
  const x = String(t || "").toUpperCase();
  return x === "TROLLEY" || x === "STRETCHER" || x === "WHEELCHAIR_POSITION";
}

function isBedLikeType(t: string) {
  const x = String(t || "").toUpperCase();
  return (
    x === "BED" ||
    x === "GENERAL_BED" ||
    x === "ICU_BED" ||
    x === "NICU_INCUBATOR" ||
    x === "INCUBATOR" ||
    x === "CRIB"
  );
}

function isSchedulableType(t: string) {
  const x = String(t || "").toUpperCase();
  if (x === "CONSULTATION_SLOT") return true;
  if (x === "EXAM_SLOT") return true;
  if (x.endsWith("_SLOT")) return true;
  if (x === "SAMPLE_COLLECTION_COUNTER") return true;
  return false;
}

type ResourceCategory = "BED" | "PROCEDURE" | "DIAGNOSTIC" | "CONSULTATION" | "OTHER";
function defaultCategoryForType(t: string): ResourceCategory {
  const x = String(t || "").toUpperCase();

  if (
    x === "BED" ||
    x === "GENERAL_BED" ||
    x === "ICU_BED" ||
    x === "NICU_INCUBATOR" ||
    x === "INCUBATOR" ||
    x === "CRIB" ||
    x === "TROLLEY" ||
    x === "STRETCHER" ||
    x === "WHEELCHAIR_POSITION"
  )
    return "BED";

  if (
    x === "OT_TABLE" ||
    x === "PROCEDURE_TABLE" ||
    x === "EXAMINATION_TABLE" ||
    x === "DIALYSIS_STATION" ||
    x === "CHEMOTHERAPY_CHAIR" ||
    x === "PROCEDURE_CHAIR" ||
    x === "RECOVERY_BAY" ||
    x === "DENTAL_CHAIR" ||
    x === "BAY" ||
    x === "CHAIR"
  )
    return "PROCEDURE";

  if (x.endsWith("_SLOT") || x === "SAMPLE_COLLECTION_COUNTER") return "DIAGNOSTIC";
  if (x === "CONSULTATION_SLOT" || x === "EXAM_SLOT") return "CONSULTATION";

  return "OTHER";
}

function allowedTransitions(from: ResourceState): Set<ResourceState> {
  // Matches your state model (plus SANITIZATION)
  switch (from) {
    case "AVAILABLE":
      return new Set(["OCCUPIED", "RESERVED", "MAINTENANCE", "BLOCKED", "INACTIVE"]);
    case "RESERVED":
      return new Set(["AVAILABLE", "OCCUPIED", "MAINTENANCE", "BLOCKED", "INACTIVE"]);
    case "OCCUPIED":
      return new Set(["CLEANING", "SANITIZATION", "MAINTENANCE", "BLOCKED", "INACTIVE"]);
    case "CLEANING":
      return new Set(["AVAILABLE", "MAINTENANCE", "BLOCKED", "INACTIVE"]);
    case "SANITIZATION":
      return new Set(["AVAILABLE", "MAINTENANCE", "BLOCKED", "INACTIVE"]);
    case "MAINTENANCE":
      return new Set(["AVAILABLE", "BLOCKED", "INACTIVE"]);
    case "BLOCKED":
      return new Set(["AVAILABLE", "MAINTENANCE", "INACTIVE"]);
    case "INACTIVE":
      return new Set([]);
  }
}

function allowedResourceTypesForUnitTypeCode(unitTypeCode: string | null | undefined): Set<string> | null {
  const c = String(unitTypeCode ?? "").trim().toUpperCase();
  if (!c) return null;

  // Unknown/custom codes: return null (no blocking).
  switch (c) {
    case "ICU":
    case "ICCU":
    case "HDU":
    case "NICU":
    case "PICU":
      return new Set([
        "ICU_BED",
        "GENERAL_BED",
        "BED",
        "BAY",
        "RECOVERY_BAY",
        "NICU_INCUBATOR",
        "INCUBATOR",
        "CRIB",
      ]);

    case "IPD_GEN":
    case "IPD_SEMI":
    case "IPD_PVT":
      return new Set(["GENERAL_BED", "BED", "BAY", "CHAIR", "PROCEDURE_CHAIR", "RECOVERY_BAY"]);

    case "OT":
    case "ENDO":
    case "CATH_LAB":
      return new Set(["OT_TABLE", "PROCEDURE_TABLE", "EXAMINATION_TABLE", "RECOVERY_BAY", "BAY"]);

    case "DIALYSIS":
      return new Set(["DIALYSIS_STATION", "CHAIR", "PROCEDURE_CHAIR", "GENERAL_BED", "BED"]);

    case "OPD":
    case "ER":
    case "TRIAGE":
      return new Set(["CONSULTATION_SLOT", "EXAM_SLOT", "CHAIR", "PROCEDURE_TABLE", "EXAMINATION_TABLE", "BAY"]);

    case "DAYCARE":
    case "CHEMO":
      return new Set([
        "CHEMOTHERAPY_CHAIR",
        "CHAIR",
        "PROCEDURE_CHAIR",
        "GENERAL_BED",
        "BED",
        "BAY",
        "PROCEDURE_TABLE",
      ]);

    default:
      if (c.startsWith("RAD_"))
        return new Set([
          "XRAY_MACHINE_SLOT",
          "CT_SCANNER_SLOT",
          "MRI_SCANNER_SLOT",
          "USG_MACHINE_SLOT",
          "ECG_MACHINE_SLOT",
          "ECHO_MACHINE_SLOT",
          "SAMPLE_COLLECTION_COUNTER",
          "EXAM_SLOT",
        ]);
      return null;
  }
}

function assertResourceTypeMatchesUnitType(unitTypeCode: string | null | undefined, resourceType: string) {
  // Mobile resources: allow anywhere
  if (isMobileType(resourceType)) return;

  const allowed = allowedResourceTypesForUnitTypeCode(unitTypeCode);
  if (!allowed) return;

  const t = String(resourceType || "").toUpperCase();
  if (!allowed.has(t)) {
    throw new BadRequestException(
      `Resource type '${t}' is not allowed for unit type '${String(unitTypeCode ?? "UNKNOWN")}'.`,
    );
  }
}

function parseDateOrNull(input?: string | null): Date | null {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`Invalid date: ${input}`);
  return d;
}

function computeIsAvailable(state: ResourceState) {
  return state === "AVAILABLE";
}

@Injectable()
export class ResourcesService {
  constructor(private readonly ctx: InfraContextService, private readonly cfgSvc: BranchConfigService) { }

  private shape(row: any) {
    const currentState = (String(row?.state || "AVAILABLE").toUpperCase() as any) as ResourceState;
    const category = (row?.resourceCategory as any) || defaultCategoryForType(row?.resourceType);

    return {
      ...row,
      currentState,
      isAvailable: computeIsAvailable(currentState),
      resourceCategory: category,
    };
  }

  async listResources(
    principal: Principal,
    q: {
      branchId?: string | null;
      unitId?: string | null;
      roomId?: string | null;
      resourceType?: string | null;
      state?: string | null;
      q?: string | null;
      includeInactive?: boolean;
    },
  ) {
    const includeInactive = !!q.includeInactive;

    // Determine branch scope
    let branchId: string;
    if (q.unitId) {
      const unit = await this.ctx.prisma.unit.findUnique({ where: { id: q.unitId }, select: { id: true, branchId: true } });
      if (!unit) throw new NotFoundException("Unit not found");
      branchId = this.ctx.resolveBranchId(principal, unit.branchId);
    } else if (q.roomId) {
      const room = await this.ctx.prisma.unitRoom.findUnique({ where: { id: q.roomId }, select: { id: true, branchId: true } });
      if (!room) throw new NotFoundException("Room not found");
      branchId = this.ctx.resolveBranchId(principal, room.branchId);
    } else {
      branchId = this.ctx.resolveBranchId(principal, q.branchId ?? null);
    }

    const where: any = {
      branchId,
      ...(includeInactive ? {} : { isActive: true }),
    };

    if (q.unitId) where.unitId = q.unitId;
    if (q.roomId) where.roomId = q.roomId;
    if (q.resourceType) where.resourceType = String(q.resourceType).toUpperCase();
    if (q.state) {
      const s = String(q.state).toUpperCase();
      if (!isState(s)) throw new BadRequestException(`Invalid state '${q.state}'`);
      where.state = s;
    }

    if (q.q) {
      const term = String(q.q);
      where.OR = [
        { code: { contains: term, mode: "insensitive" } },
        { name: { contains: term, mode: "insensitive" } },
        { assetTag: { contains: term, mode: "insensitive" } },
      ];
    }

    const list = await this.ctx.prisma.unitResource.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        unit: { select: { id: true, code: true, name: true, usesRooms: true } },
        room: { select: { id: true, code: true, name: true } },
      },
    });

    return list.map((r) => this.shape(r));
  }

  async createResource(principal: Principal, dto: CreateUnitResourceDto) {
    const unit = await this.ctx.prisma.unit.findUnique({
      where: { id: dto.unitId },
      select: {
        id: true,
        branchId: true,
        code: true,
        usesRooms: true,
        isActive: true,
        unitType: { select: { code: true } },
      },
    });
    if (!unit) throw new NotFoundException("Unit not found");

    const branchId = this.ctx.resolveBranchId(principal, unit.branchId);

    const resourceType = String(dto.resourceType).toUpperCase();
    assertResourceTypeMatchesUnitType(unit.unitType?.code ?? null, resourceType);

    const isMobile = isMobileType(resourceType);

    const room = dto.roomId
      ? await this.ctx.prisma.unitRoom.findUnique({
        where: { id: dto.roomId },
        select: { id: true, unitId: true, code: true, isActive: true },
      })
      : null;

    if (dto.roomId && (!room || room.unitId !== unit.id)) {
      throw new BadRequestException("Invalid roomId for this unit");
    }

    if (unit.usesRooms) {
      // Room required unless mobile
      if (!room && !isMobile) throw new BadRequestException("This unit uses rooms; roomId is required for this resource type.");
    } else {
      // open-bay: roomId must be null
      if (room) throw new BadRequestException("This unit is open-bay; roomId must be null.");
    }

    const willBeActive = dto.isActive ?? true;
    if (!unit.isActive && willBeActive) {
      throw new BadRequestException("Cannot create an active resource under an inactive unit");
    }
    if (room && !room.isActive && willBeActive) {
      throw new BadRequestException("Cannot create an active resource under an inactive room");
    }

    // Initial state + reason rules
    const requestedState = dto.state ? String(dto.state).toUpperCase() : "AVAILABLE";
    if (!isState(requestedState)) throw new BadRequestException(`Invalid state '${dto.state}'`);

    if (requestedState === "OCCUPIED") throw new BadRequestException("Cannot create a resource in OCCUPIED state");

    if (requiresReasonForState(requestedState)) {
      const rr = String(dto.reason ?? "").trim();
      if (!rr) throw new BadRequestException(`Reason is required when state is ${requestedState}`);
    }

    const finalState: ResourceState = willBeActive ? requestedState : "INACTIVE";

    const code = assertResourceCode({
      unitCode: unit.code,
      roomCode: room?.code ?? null,
      resourceType: resourceType as any,
      resourceCode: dto.code,
    });

    // Uniqueness: code within unit
    const dup = await this.ctx.prisma.unitResource.findFirst({
      where: { unitId: unit.id, code },
      select: { id: true },
    });
    if (dup) throw new BadRequestException(`Resource code '${code}' already exists in this unit`);

    // assetTag (unique within branch)
    const assetTag = dto.assetTag ? canonicalizeCode(dto.assetTag) : null;
    if (assetTag) {
      const atDup = await this.ctx.prisma.unitResource.findFirst({
        where: { branchId, assetTag },
        select: { id: true },
      });
      if (atDup) throw new ConflictException(`assetTag '${assetTag}' already exists in this branch`);
    }

    // Scheduling
    const isSchedulable = typeof dto.isSchedulable === "boolean" ? dto.isSchedulable : isSchedulableType(resourceType);
    const slotDurationMinutes = isSchedulable ? dto.slotDurationMinutes ?? null : null;

    // Category
    const resourceCategory = (dto as any).resourceCategory ?? defaultCategoryForType(resourceType);

    const created = await this.ctx.prisma.unitResource.create({
      data: {
        branchId,
        unitId: unit.id,
        roomId: room?.id ?? null,

        resourceType: resourceType as any,
        code,
        assetTag,
        name: String(dto.name).trim(),

        resourceCategory,
        manufacturer: (dto as any).manufacturer?.trim() ?? null,
        model: (dto as any).model?.trim() ?? null,
        serialNumber: (dto as any).serialNumber?.trim() ?? null,

        hasMonitor: !!(dto as any).hasMonitor,
        hasOxygenSupply: !!(dto as any).hasOxygenSupply,
        hasSuction: !!(dto as any).hasSuction,
        hasVentilatorSupport: !!(dto as any).hasVentilatorSupport,
        isPowerRequired: !!(dto as any).isPowerRequired,

        state: finalState as any,
        reservedReason: finalState === "RESERVED" ? String(dto.reason ?? "").trim() : null,
        blockedReason: finalState === "BLOCKED" ? String(dto.reason ?? "").trim() : null,

        assignedPatientId: (dto as any).assignedPatientId ?? null,

        isActive: willBeActive,
        isSchedulable,
        slotDurationMinutes,

        lastMaintenanceDate: parseDateOrNull((dto as any).lastMaintenanceDate),
        nextMaintenanceDate: parseDateOrNull((dto as any).nextMaintenanceDate),
        warrantyExpiryDate: parseDateOrNull((dto as any).warrantyExpiryDate),

        commissionedAt: parseDateOrNull((dto as any).commissionedAt),

        // If created inactive, fill deactivation metadata for traceability
        ...(willBeActive
          ? {}
          : {
            deactivatedAt: new Date(),
            deactivationReason: "Created as inactive",
            deactivatedByUserId: principal.userId,
          }),
      },
      include: {
        unit: { select: { id: true, code: true, name: true, usesRooms: true } },
        room: { select: { id: true, code: true, name: true } },
      },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_RESOURCE_CREATE",
      entity: "UnitResource",
      entityId: created.id,
      meta: dto,
    });

    return this.shape(created);
  }
  async getResource(principal: Principal, id: string) {
    const row = await this.ctx.prisma.unitResource.findUnique({
      where: { id },
      include: {
        unit: { select: { id: true, code: true, name: true, usesRooms: true } },
        room: { select: { id: true, code: true, name: true } },
      },
    });

    if (!row) throw new NotFoundException("Resource not found");

    // Enforce branch access
    this.ctx.resolveBranchId(principal, row.branchId);

    return this.shape(row);
  }

  async updateResource(principal: Principal, id: string, dto: UpdateUnitResourceDto) {
    const existing = await this.ctx.prisma.unitResource.findUnique({
      where: { id },
      select: {
        id: true,
        branchId: true,
        unitId: true,
        roomId: true,
        isActive: true,
        state: true,
        assetTag: true,
      },
    });
    if (!existing) throw new NotFoundException("Resource not found");

    const branchId = this.ctx.resolveBranchId(principal, existing.branchId);

    const patch: any = {};

    if (typeof dto.name === "string") patch.name = dto.name.trim();

    if (typeof (dto as any).assetTag === "string") {
      const at = String((dto as any).assetTag).trim();
      patch.assetTag = at ? canonicalizeCode(at) : null;

      // Validate uniqueness within branch (if changed)
      if (patch.assetTag && patch.assetTag !== existing.assetTag) {
        const atDup = await this.ctx.prisma.unitResource.findFirst({
          where: { branchId, assetTag: patch.assetTag, NOT: { id } },
          select: { id: true },
        });
        if (atDup) throw new ConflictException(`assetTag '${patch.assetTag}' already exists in this branch`);
      }
    }

    if (typeof (dto as any).resourceCategory === "string") patch.resourceCategory = (dto as any).resourceCategory;

    if (typeof (dto as any).manufacturer === "string") patch.manufacturer = (dto as any).manufacturer.trim() || null;
    if (typeof (dto as any).model === "string") patch.model = (dto as any).model.trim() || null;
    if (typeof (dto as any).serialNumber === "string") patch.serialNumber = (dto as any).serialNumber.trim() || null;

    for (const k of [
      "hasMonitor",
      "hasOxygenSupply",
      "hasSuction",
      "hasVentilatorSupport",
      "isPowerRequired",
      "isSchedulable",
    ] as const) {
      if (typeof (dto as any)[k] === "boolean") patch[k] = (dto as any)[k];
    }

    if (typeof (dto as any).slotDurationMinutes === "number") patch.slotDurationMinutes = (dto as any).slotDurationMinutes;

    if (typeof (dto as any).lastMaintenanceDate === "string") patch.lastMaintenanceDate = parseDateOrNull((dto as any).lastMaintenanceDate);
    if (typeof (dto as any).nextMaintenanceDate === "string") patch.nextMaintenanceDate = parseDateOrNull((dto as any).nextMaintenanceDate);
    if (typeof (dto as any).warrantyExpiryDate === "string") patch.warrantyExpiryDate = parseDateOrNull((dto as any).warrantyExpiryDate);
    if (typeof (dto as any).commissionedAt === "string") patch.commissionedAt = parseDateOrNull((dto as any).commissionedAt);

    if (typeof (dto as any).assignedPatientId === "string") patch.assignedPatientId = (dto as any).assignedPatientId.trim() || null;

    // Activation is allowed; deactivation must go through deactivate endpoint
    if (dto.isActive === true) {
      patch.isActive = true;
      if (String(existing.state).toUpperCase() === "INACTIVE") {
        // re-activate resets state to AVAILABLE unless explicitly changed later
        patch.state = "AVAILABLE";
      }
      patch.deactivatedAt = null;
      patch.deactivationReason = null;
      patch.deactivatedByUserId = null;
    }

    if (dto.isActive === false) {
      throw new BadRequestException("Use /deactivate endpoint to deactivate a resource.");
    }

    const updated = await this.ctx.prisma.unitResource.update({
      where: { id },
      data: patch,
      include: {
        unit: { select: { id: true, code: true, name: true, usesRooms: true } },
        room: { select: { id: true, code: true, name: true } },
      },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_RESOURCE_UPDATE",
      entity: "UnitResource",
      entityId: id,
      meta: dto,
    });

    return this.shape(updated);
  }

  async setResourceState(principal: Principal, id: string, nextStateRaw: any, reason?: string) {
    const res = await this.ctx.prisma.unitResource.findUnique({
      where: { id },
      select: {
        id: true,
        branchId: true,
        resourceType: true,
        state: true,
        isActive: true,
      },
    });
    if (!res) throw new NotFoundException("Resource not found");

    const branchId = this.ctx.resolveBranchId(principal, res.branchId);

    if (!res.isActive) throw new BadRequestException("Cannot change state of an inactive resource");

    const from = String(res.state).toUpperCase();
    const to = String(nextStateRaw).toUpperCase();

    if (!isState(from)) throw new BadRequestException(`Invalid current state '${res.state}'`);
    if (!isState(to)) throw new BadRequestException(`Invalid next state '${nextStateRaw}'`);

    const allowed = allowedTransitions(from);
    if (!allowed.has(to)) throw new BadRequestException(`Invalid transition ${from} → ${to}`);

    if (requiresReasonForState(to)) {
      const rr = String(reason ?? "").trim();
      if (!rr) throw new BadRequestException(`Reason is required when state is ${to}`);
    }

    // Housekeeping gate: beds cannot move from OCCUPIED → AVAILABLE directly
    if (isBedLikeType(res.resourceType)) {
      const cfg = await this.cfgSvc.ensureBranchInfraConfig(branchId);
      const gateEnabled = !!cfg?.housekeepingGateEnabled;
      if (gateEnabled && from === "OCCUPIED" && to === "AVAILABLE") {
        throw new BadRequestException(
          "Housekeeping Gate: Bed cannot move from OCCUPIED to AVAILABLE directly. Move to CLEANING/SANITIZATION first.",
        );
      }
    }

    const patch: any = {
      state: to,
      reservedReason: to === "RESERVED" ? String(reason ?? "").trim() : null,
      blockedReason: to === "BLOCKED" ? String(reason ?? "").trim() : null,
    };

    // Keep isActive consistent with INACTIVE state
    if (to === "INACTIVE") patch.isActive = false;

    const updated = await this.ctx.prisma.unitResource.update({
      where: { id },
      data: patch,
      include: {
        unit: { select: { id: true, code: true, name: true, usesRooms: true } },
        room: { select: { id: true, code: true, name: true } },
      },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_RESOURCE_STATE_UPDATE",
      entity: "UnitResource",
      entityId: id,
      meta: { from: res.state, to, reason: reason ?? null },
    });

    return this.shape(updated);
  }

  async deactivateResource(principal: Principal, id: string, opts: { hard?: boolean; reason?: string } = {}) {
    const res = await this.ctx.prisma.unitResource.findUnique({
      where: { id },
      select: { id: true, branchId: true, isActive: true, state: true, bookings: { select: { id: true }, take: 1 } },
    });
    if (!res) throw new NotFoundException("Resource not found");

    const branchId = this.ctx.resolveBranchId(principal, res.branchId);

    const hard = !!opts.hard;

    if (hard) {
      // Hard delete is blocked if bookings exist
      if (res.bookings?.length) {
        throw new BadRequestException("Cannot hard delete resource that has bookings");
      }

      await this.ctx.prisma.unitResource.delete({ where: { id } });

      await this.ctx.audit.log({
        branchId,
        actorUserId: principal.userId,
        action: "INFRA_RESOURCE_DELETE_HARD",
        entity: "UnitResource",
        entityId: id,
        meta: { hard: true },
      });

      return { ok: true, hardDeleted: true };
    }

    const reason = String(opts.reason ?? "").trim();
    if (!reason) throw new BadRequestException("Deactivation reason is required");

    const stateNow = String(res.state).toUpperCase();
    if (stateNow === "OCCUPIED" || stateNow === "RESERVED") {
      throw new BadRequestException(`Cannot deactivate resource while in state ${stateNow}`);
    }

    const updated = await this.ctx.prisma.unitResource.update({
      where: { id },
      data: {
        isActive: false,
        state: "INACTIVE",
        deactivatedAt: new Date(),
        deactivationReason: reason,
        deactivatedByUserId: principal.userId,
      },
      include: {
        unit: { select: { id: true, code: true, name: true, usesRooms: true } },
        room: { select: { id: true, code: true, name: true } },
      },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_RESOURCE_DEACTIVATE",
      entity: "UnitResource",
      entityId: id,
      meta: { hard: false, reason },
    });

    return this.shape(updated);
  }
}
