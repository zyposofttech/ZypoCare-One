import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, PrismaClient } from "@zypocare/db";
import type { Principal } from "../../auth/access-policy.service";
import { resolveBranchId as resolveBranchIdCommon } from "../../../common/branch-scope.util";

import {
  CreateOtEquipmentDto,
  CreateOtSpaceDto,
  CreateOtSuiteDto,
  CreateOtTableDto,
  OtSpaceType,
  UpdateOtEquipmentDto,
  UpdateOtSpaceDto,
  UpdateOtSuiteDto,
  UpdateOtTableDto,
} from "./ot.dto";

@Injectable()
export class OtService {
  constructor(@Inject("PRISMA") private prisma: PrismaClient) {}

  private resolveBranchId(principal: Principal, requestedBranchId?: string | null) {
    return resolveBranchIdCommon(principal, requestedBranchId ?? null, { requiredForGlobal: true });
  }

  private normCode(code: string) {
    return String(code || "").trim().toUpperCase();
  }

  private assertCode(code: string, label: string) {
    const c = this.normCode(code);
    if (!/^[A-Z0-9][A-Z0-9_-]{1,19}$/.test(c)) {
      throw new BadRequestException(`${label} must be 2-20 chars (A-Z, 0-9, _ or -).`);
    }
    return c;
  }

  private normSuiteStatus(v: unknown): string {
    if (v === undefined || v === null) return "";
    const lower = String(v).trim().toLowerCase();
    if (["in used", "inuse", "in_used", "in-use"].includes(lower)) return "in_use";
    return lower;
  }

  private assertSuiteStatusTransition(fromRaw: unknown, toRaw: unknown) {
    const from = this.normSuiteStatus(fromRaw) || "draft";
    const to = this.normSuiteStatus(toRaw);

    const systemManaged = new Set(["booked", "in_use"]);
    if (systemManaged.has(to)) {
      throw new BadRequestException("BOOKED/IN_USE are system-managed by OT scheduling/workflows.");
    }

    const allowed: Record<string, Set<string>> = {
      draft: new Set(["draft", "ready", "archived"]),
      ready: new Set(["ready", "draft", "active", "maintenance", "archived"]),
      active: new Set(["active", "maintenance", "ready", "archived"]),
      maintenance: new Set(["maintenance", "active", "ready", "archived"]),
      booked: new Set(["booked"]), // system-managed
      in_use: new Set(["in_use"]), // system-managed
      archived: new Set(["archived"]),
    };

    if (!allowed[from]?.has(to)) {
      throw new BadRequestException(`Invalid OT Suite status transition: ${from} → ${to}`);
    }
  }

  private async assertReadyForActivation(principal: Principal, suiteId: string) {
    const r = await this.readiness(principal, suiteId);
    if (!r.isReady) {
      const failed = (r.checks || []).filter((c: any) => !c.ok).map((c: any) => c.label);
      throw new BadRequestException(`Cannot set status to ACTIVE until Go-Live checks pass. Missing: ${failed.join(", ")}`);
    }
  }

  // --------------------
  // Suites
  // --------------------

  async listSuites(principal: Principal, branchId?: string) {
    const bId = this.resolveBranchId(principal, branchId ?? null);
    return this.prisma.otSuite.findMany({
      where: { branchId: bId, isActive: true },
      orderBy: [{ createdAt: "desc" }],
    });
  }

  async getSuite(principal: Principal, id: string) {
    const suite = await this.prisma.otSuite.findUnique({
      where: { id },
      include: {
        spaces: {
          orderBy: [{ createdAt: "asc" }],
          include: {
            theatre: { include: { tables: { where: { isActive: true }, orderBy: [{ createdAt: "asc" }] } } },
            recoveryBay: true,
            equipment: { where: { isActive: true }, orderBy: [{ createdAt: "asc" }] },
          },
        },
        equipment: { where: { isActive: true }, orderBy: [{ createdAt: "asc" }] },
      },
    });

    if (!suite || !suite.isActive) throw new NotFoundException("OT Suite not found");
    this.resolveBranchId(principal, suite.branchId);

    return suite;
  }

  async createSuite(principal: Principal, dto: CreateOtSuiteDto) {
    const branchId = this.resolveBranchId(principal, dto.branchId ?? null);
    const code = this.assertCode(dto.code, "Suite code");

    if (dto.locationNodeId) {
      const ln = await this.prisma.locationNode.findUnique({ where: { id: dto.locationNodeId }, select: { id: true } });
      if (!ln) throw new BadRequestException("Invalid locationNodeId");
    }

    try {
      return await this.prisma.otSuite.create({
        data: {
          branchId,
          code,
          name: dto.name.trim(),
          status: "draft" as any,
          locationNodeId: dto.locationNodeId ?? null,
          config: dto.config ?? undefined,
        },
      });
    } catch {
      throw new BadRequestException("Unable to create OT Suite. Code may already exist for this branch.");
    }
  }

  async updateSuite(principal: Principal, id: string, dto: UpdateOtSuiteDto) {
    const existing = await this.prisma.otSuite.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("OT Suite not found");
    this.resolveBranchId(principal, existing.branchId);

    if (dto.locationNodeId) {
      const ln = await this.prisma.locationNode.findUnique({ where: { id: dto.locationNodeId }, select: { id: true } });
      if (!ln) throw new BadRequestException("Invalid locationNodeId");
    }

    const nextStatus = dto.status ? this.normSuiteStatus(dto.status) : undefined;

    if (nextStatus) {
      this.assertSuiteStatusTransition(existing.status, nextStatus);
      if (nextStatus === "active") {
        // enforce go-live readiness before activation
        await this.assertReadyForActivation(principal, id);
      }
    }

    const archiving = nextStatus === "archived";
    const activating = nextStatus === "active";

    return this.prisma.otSuite.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        status: nextStatus ? (nextStatus as any) : undefined,
        locationNodeId: dto.locationNodeId ?? undefined,
        config: dto.config ?? undefined,

        // enforce consistent "enabled" semantics
        isActive: archiving
          ? false
          : activating
            ? true
            : typeof dto.isActive === "boolean"
              ? dto.isActive
              : undefined,
      },
    });
  }

  async deleteSuite(principal: Principal, id: string) {
    const existing = await this.prisma.otSuite.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("OT Suite not found");
    this.resolveBranchId(principal, existing.branchId);

    await this.prisma.$transaction([
      this.prisma.otEquipment.updateMany({ where: { suiteId: id }, data: { isActive: false } }),
      this.prisma.otSpace.updateMany({ where: { suiteId: id }, data: { isActive: false } }),
      // ✅ lowercase enum value
      this.prisma.otSuite.update({ where: { id }, data: { isActive: false, status: "archived" as any } }),
    ]);

    return { ok: true };
  }

  // --------------------
  // Suggest codes
  // --------------------

  async suggestSuiteCode(principal: Principal, branchId?: string) {
    const bId = this.resolveBranchId(principal, branchId ?? null);
    const existing = await this.prisma.otSuite.findMany({ where: { branchId: bId }, select: { code: true } });

    let max = 0;
    for (const e of existing) {
      const m = /^OTC(\d{1,3})$/.exec((e.code || "").toUpperCase());
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    const next = String(max + 1).padStart(2, "0");
    return { code: `OTC${next}` };
  }

  async suggestSpaceCode(principal: Principal, suiteId: string, type: OtSpaceType) {
    const suite = await this.prisma.otSuite.findUnique({ where: { id: suiteId }, select: { id: true, branchId: true } });
    if (!suite) throw new NotFoundException("OT Suite not found");
    this.resolveBranchId(principal, suite.branchId);

    const spaces = await this.prisma.otSpace.findMany({ where: { suiteId }, select: { code: true, type: true } });

    const prefix =
      type === OtSpaceType.THEATRE ? "OT" :
      type === OtSpaceType.RECOVERY_BAY ? "RB" :
      type === OtSpaceType.SCRUB_ROOM ? "SR" :
      type === OtSpaceType.PREOP_HOLDING ? "PH" :
      type === OtSpaceType.INDUCTION_ROOM ? "IR" :
      type === OtSpaceType.STERILE_STORE ? "SS" :
      type === OtSpaceType.ANESTHESIA_STORE ? "AS" :
      type === OtSpaceType.EQUIPMENT_STORE ? "ES" :
      type === OtSpaceType.STAFF_CHANGE ? "SC" : "SP";

    let max = 0;
    for (const s of spaces) {
      const m = new RegExp(`^${prefix}(\\d{1,3})$`).exec((s.code || "").toUpperCase());
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    const next = String(max + 1).padStart(2, "0");
    return { code: `${prefix}${next}` };
  }

  // --------------------
  // Spaces
  // --------------------

  async listSpaces(principal: Principal, suiteId: string) {
    const suite = await this.prisma.otSuite.findUnique({ where: { id: suiteId }, select: { id: true, branchId: true, isActive: true } });
    if (!suite || !suite.isActive) throw new NotFoundException("OT Suite not found");
    this.resolveBranchId(principal, suite.branchId);

    return this.prisma.otSpace.findMany({
      where: { suiteId, isActive: true },
      include: {
        theatre: { include: { tables: { where: { isActive: true }, orderBy: [{ createdAt: "asc" }] } } },
        recoveryBay: true,
        equipment: { where: { isActive: true }, orderBy: [{ createdAt: "asc" }] },
      },
      orderBy: [{ createdAt: "asc" }],
    });
  }

  async createSpace(principal: Principal, suiteId: string, dto: CreateOtSpaceDto) {
    const suite = await this.prisma.otSuite.findUnique({ where: { id: suiteId }, select: { id: true, branchId: true, isActive: true } });
    if (!suite || !suite.isActive) throw new NotFoundException("OT Suite not found");
    this.resolveBranchId(principal, suite.branchId);

    const code = this.assertCode(dto.code, "Space code");

    if (dto.locationNodeId) {
      const ln = await this.prisma.locationNode.findUnique({ where: { id: dto.locationNodeId }, select: { id: true } });
      if (!ln) throw new BadRequestException("Invalid locationNodeId");
    }

    const createDefaultTable = dto.createDefaultTable !== false;

    try {
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const space = await tx.otSpace.create({
          data: {
            suiteId,
            type: dto.type as any,
            code,
            name: dto.name.trim(),
            locationNodeId: dto.locationNodeId ?? null,
            notes: dto.notes ?? null,
            meta: dto.meta ?? undefined,
          },
        });

        if (dto.type === OtSpaceType.THEATRE) {
          const theatre = await tx.otTheatre.create({
            data: { spaceId: space.id, specialtyCodes: [] },
          });

          if (createDefaultTable) {
            await tx.otTable.create({
              data: {
                theatreId: theatre.id,
                code: "T01",
                name: "Primary OT Table",
                isPrimary: true,
              },
            });
          }
        }

        if (dto.type === OtSpaceType.RECOVERY_BAY) {
          await tx.otRecoveryBay.create({
            data: { spaceId: space.id, bedCount: 1, monitorCount: 0, oxygenPoints: 0 },
          });
        }

        return tx.otSpace.findUnique({
          where: { id: space.id },
          include: { theatre: { include: { tables: true } }, recoveryBay: true },
        });
      });
    } catch {
      throw new BadRequestException("Unable to create OT Space. Code may already exist in this suite.");
    }
  }

  async updateSpace(principal: Principal, spaceId: string, dto: UpdateOtSpaceDto) {
    const space = await this.prisma.otSpace.findUnique({
      where: { id: spaceId },
      include: { suite: { select: { branchId: true } } },
    });
    if (!space) throw new NotFoundException("OT Space not found");
    this.resolveBranchId(principal, space.suite.branchId);

    if (dto.locationNodeId) {
      const ln = await this.prisma.locationNode.findUnique({ where: { id: dto.locationNodeId }, select: { id: true } });
      if (!ln) throw new BadRequestException("Invalid locationNodeId");
    }

    return this.prisma.otSpace.update({
      where: { id: spaceId },
      data: {
        name: dto.name?.trim(),
        locationNodeId: dto.locationNodeId ?? undefined,
        notes: dto.notes ?? undefined,
        meta: dto.meta ?? undefined,
        isActive: typeof dto.isActive === "boolean" ? dto.isActive : undefined,
      },
    });
  }

  async deleteSpace(principal: Principal, spaceId: string) {
    const space = await this.prisma.otSpace.findUnique({
      where: { id: spaceId },
      include: { suite: { select: { branchId: true } }, theatre: { select: { id: true } } },
    });
    if (!space) throw new NotFoundException("OT Space not found");
    this.resolveBranchId(principal, space.suite.branchId);

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.otEquipment.updateMany({ where: { spaceId }, data: { isActive: false } });
      if (space.theatre?.id) {
        await tx.otTable.updateMany({ where: { theatreId: space.theatre.id }, data: { isActive: false } });
      }
      await tx.otSpace.update({ where: { id: spaceId }, data: { isActive: false } });
    });

    return { ok: true };
  }

  // --------------------
  // Tables
  // --------------------

  async createTable(principal: Principal, theatreId: string, dto: CreateOtTableDto) {
    const theatre = await this.prisma.otTheatre.findUnique({
      where: { id: theatreId },
      include: { space: { include: { suite: { select: { branchId: true } } } } },
    });
    if (!theatre) throw new NotFoundException("Theatre not found");
    this.resolveBranchId(principal, theatre.space.suite.branchId);

    const code = this.assertCode(dto.code, "Table code");

    try {
      const created = await this.prisma.otTable.create({
        data: {
          theatreId,
          code,
          name: dto.name.trim(),
          isPrimary: dto.isPrimary ?? false,
          manufacturer: dto.manufacturer ?? null,
          model: dto.model ?? null,
          serialNo: dto.serialNo ?? null,
          meta: dto.meta ?? undefined,
        },
      });

      if (created.isPrimary) {
        await this.prisma.otTable.updateMany({
          where: { theatreId, id: { not: created.id } },
          data: { isPrimary: false },
        });
      }

      return created;
    } catch {
      throw new BadRequestException("Unable to create OT Table. Code may already exist in this theatre.");
    }
  }

  async updateTable(principal: Principal, tableId: string, dto: UpdateOtTableDto) {
    const table = await this.prisma.otTable.findUnique({
      where: { id: tableId },
      include: { theatre: { include: { space: { include: { suite: { select: { branchId: true } } } } } } },
    });
    if (!table) throw new NotFoundException("OT Table not found");
    this.resolveBranchId(principal, table.theatre.space.suite.branchId);

    const updated = await this.prisma.otTable.update({
      where: { id: tableId },
      data: {
        name: dto.name?.trim(),
        isPrimary: typeof dto.isPrimary === "boolean" ? dto.isPrimary : undefined,
        manufacturer: dto.manufacturer ?? undefined,
        model: dto.model ?? undefined,
        serialNo: dto.serialNo ?? undefined,
        meta: dto.meta ?? undefined,
        isActive: typeof dto.isActive === "boolean" ? dto.isActive : undefined,
      },
    });

    if (updated.isPrimary) {
      await this.prisma.otTable.updateMany({
        where: { theatreId: updated.theatreId, id: { not: updated.id } },
        data: { isPrimary: false },
      });
    }

    return updated;
  }

  async deleteTable(principal: Principal, tableId: string) {
    const table = await this.prisma.otTable.findUnique({
      where: { id: tableId },
      include: { theatre: { include: { space: { include: { suite: { select: { branchId: true } } } } } } },
    });
    if (!table) throw new NotFoundException("OT Table not found");
    this.resolveBranchId(principal, table.theatre.space.suite.branchId);

    await this.prisma.otTable.update({ where: { id: tableId }, data: { isActive: false, isPrimary: false } });

    const active = await this.prisma.otTable.findMany({ where: { theatreId: table.theatreId, isActive: true } });
    if (active.length > 0 && !active.some((t) => t.isPrimary)) {
      await this.prisma.otTable.update({ where: { id: active[0].id }, data: { isPrimary: true } });
    }

    return { ok: true };
  }

  // --------------------
  // Equipment
  // --------------------

  async listEquipment(principal: Principal, suiteId: string) {
    const suite = await this.prisma.otSuite.findUnique({ where: { id: suiteId }, select: { id: true, branchId: true, isActive: true } });
    if (!suite || !suite.isActive) throw new NotFoundException("OT Suite not found");
    this.resolveBranchId(principal, suite.branchId);

    return this.prisma.otEquipment.findMany({
      where: { suiteId, isActive: true },
      include: { space: { select: { id: true, code: true, name: true, type: true } } },
      orderBy: [{ createdAt: "asc" }],
    });
  }

  async createEquipment(principal: Principal, suiteId: string, dto: CreateOtEquipmentDto) {
    const suite = await this.prisma.otSuite.findUnique({ where: { id: suiteId }, select: { branchId: true, isActive: true } });
    if (!suite || !suite.isActive) throw new NotFoundException("OT Suite not found");
    this.resolveBranchId(principal, suite.branchId);

    if (dto.spaceId) {
      const sp = await this.prisma.otSpace.findUnique({ where: { id: dto.spaceId }, select: { id: true, suiteId: true } });
      if (!sp || sp.suiteId !== suiteId) throw new BadRequestException("spaceId must belong to the same OT Suite.");
    }

    return this.prisma.otEquipment.create({
      data: {
        suiteId,
        spaceId: dto.spaceId ?? null,
        category: dto.category as any,
        name: dto.name.trim(),
        qty: dto.qty ?? 1,
        manufacturer: dto.manufacturer ?? null,
        model: dto.model ?? null,
        serialNo: dto.serialNo ?? null,
        meta: dto.meta ?? undefined,
      },
    });
  }

  async updateEquipment(principal: Principal, id: string, dto: UpdateOtEquipmentDto) {
    const eq = await this.prisma.otEquipment.findUnique({ where: { id }, include: { suite: { select: { branchId: true } } } });
    if (!eq) throw new NotFoundException("Equipment not found");
    this.resolveBranchId(principal, eq.suite.branchId);

    if (dto.spaceId) {
      const sp = await this.prisma.otSpace.findUnique({ where: { id: dto.spaceId }, select: { id: true, suiteId: true } });
      if (!sp || sp.suiteId !== eq.suiteId) throw new BadRequestException("spaceId must belong to the same OT Suite.");
    }

    return this.prisma.otEquipment.update({
      where: { id },
      data: {
        category: dto.category as any,
        name: dto.name?.trim(),
        qty: dto.qty ?? undefined,
        spaceId: dto.spaceId ?? undefined,
        manufacturer: dto.manufacturer ?? undefined,
        model: dto.model ?? undefined,
        serialNo: dto.serialNo ?? undefined,
        meta: dto.meta ?? undefined,
        isActive: typeof dto.isActive === "boolean" ? dto.isActive : undefined,
      },
    });
  }

  async deleteEquipment(principal: Principal, id: string) {
    const eq = await this.prisma.otEquipment.findUnique({ where: { id }, include: { suite: { select: { branchId: true } } } });
    if (!eq) throw new NotFoundException("Equipment not found");
    this.resolveBranchId(principal, eq.suite.branchId);

    await this.prisma.otEquipment.update({ where: { id }, data: { isActive: false } });
    return { ok: true };
  }

  // --------------------
  // Readiness (Go-Live)
  // --------------------

  async readiness(principal: Principal, suiteId: string) {
    const suite = await this.getSuite(principal, suiteId);

    const config = (suite.config || {}) as any;
    const minTheatres = config.minTheatres ?? 1;
    const minTablesPerTheatre = config.minTablesPerTheatre ?? 1;
    const requireRecovery = config.requireRecoveryBays ?? true;
    const minRecoveryBays = config.minRecoveryBays ?? 1;

    const activeTheatres = suite.spaces.filter((s: any) => s.isActive && s.type === "THEATRE" && s.theatre?.isActive);
    const activeRecovery = suite.spaces.filter((s: any) => s.isActive && s.type === "RECOVERY_BAY" && s.recoveryBay?.isActive);

    const theatreOk = activeTheatres.length >= minTheatres;
    const tablesOk = activeTheatres.every((t: any) => {
      const tables = (t.theatre?.tables || []).filter((x: any) => x.isActive);
      return tables.length >= minTablesPerTheatre;
    });
    const recoveryOk = requireRecovery ? activeRecovery.length >= minRecoveryBays : true;

    const checks = [
      { key: "SUITE_ENABLED", label: "OT Suite enabled", ok: !!suite.isActive },
      { key: "MIN_THEATRES", label: `Minimum theatres (${minTheatres})`, ok: theatreOk, details: { count: activeTheatres.length } },
      { key: "TABLES_PER_THEATRE", label: `Tables per theatre (${minTablesPerTheatre})`, ok: tablesOk },
      { key: "RECOVERY_BAYS", label: requireRecovery ? `Recovery bays present (${minRecoveryBays})` : "Recovery bays not required", ok: recoveryOk, details: { count: activeRecovery.length } },
    ];

    const isReady = checks.every((c) => c.ok);

    return { suiteId, isReady, badge: isReady ? "Ready for Operations" : "Not Ready", checks };
  }
}