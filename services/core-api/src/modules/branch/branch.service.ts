import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import { Prisma } from "@zypocare/db";
import { AuditService } from "../audit/audit.service";
import { Branch, UnitResourceType } from "@zypocare/db/src/generated/client";

type BranchCountsRaw = Partial<{
  users: number;
  departments: number;
  patients: number;
  branchFacilities: number;
  Specialty: number;

  // Core clinical/admin relations (delete protection)
  Staff: number;
  Encounter: number;
  Admission: number;
  tariffPlans: number;
  assets: number;
  statutoryCases: number;

  // Infrastructure (Setup Studio)
  locationNodes: number;
  branchUnitTypes: number;
  units: number;
  unitRooms: number;
  unitResources: number;

  // Infra ops / billing masters (delete protection)
  procedureBookings: number;
  equipmentAssets: number;
  chargeMasterItems: number;
  serviceItems: number;
  serviceChargeMappings: number;
  fixItTasks: number;
  bulkImportJobs: number;
  goLiveReports: number;
}>;

function normalizeBranchCode(input: string) {
  const code = String(input || "").trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9-]{1,31}$/.test(code)) {
    throw new BadRequestException("Invalid branch code. Example: BLR-EC");
  }
  return code;
}

function cleanOptional(v: any): string | null | undefined {
  if (v === undefined) return undefined;
  const s = String(v ?? "").trim();
  return s ? s : null;
}

export type BranchCounts = {
  users: number;
  departments: number;
  patients: number;

  // Derived from Setup Studio (NOT legacy Ward/Room/Bed/OT)
  wards: number; // derived as number of distinct bed-capable units
  oTs: number;   // derived as number of schedulable OT tables
  beds: number;  // derived as number of BED resources

  facilities: number;
  specialties: number;

  // Setup Studio raw totals (useful for dashboards + delete protection)
  locationNodes: number;
  units: number;
  unitRooms: number;
  unitResources: number;
};

export type BranchRow = Branch & {
  _count?: BranchCounts;
};

function normalizeCounts(
  raw?: BranchCountsRaw | null,
  derived?: { wards?: number; oTs?: number; beds?: number },
): BranchCounts | undefined {
  if (!raw) return undefined;
  return {
    users: raw.users ?? 0,
    departments: raw.departments ?? 0,
    patients: raw.patients ?? 0,

    wards: derived?.wards ?? 0,
    oTs: derived?.oTs ?? 0,
    beds: derived?.beds ?? 0,

    facilities: raw.branchFacilities ?? 0,
    specialties: (raw as any).Specialty ?? 0,

    locationNodes: raw.locationNodes ?? 0,
    units: raw.units ?? 0,
    unitRooms: raw.unitRooms ?? 0,
    unitResources: raw.unitResources ?? 0,
  };
}

function normalizeGstNumber(input: string) {
  const gst = String(input || "").trim().toUpperCase();
  // GSTIN (India) - 15 chars
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(gst)) {
    throw new BadRequestException("Invalid GSTIN. Example: 29ABCDE1234F1Z5");
  }
  return gst;
}

function countMapFromGroupBy(rows: Array<{ branchId: string; _count: { _all: number } }>): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of rows) map[r.branchId] = r._count?._all ?? 0;
  return map;
}

// input rows are groupBy(["branchId","unitId"]) => each row is one distinct unit per branch that has BED
function wardsMapFromBedUnitGroups(rows: Array<{ branchId: string; unitId: string }>): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of rows) map[r.branchId] = (map[r.branchId] ?? 0) + 1;
  return map;
}

@Injectable()
export class BranchService {
  constructor(
    @Inject("PRISMA") private prisma: PrismaClient,
    private audit: AuditService,
  ) {}

  async list(opts: { q?: string | null; onlyActive?: boolean | null } = {}) {
    const q = (opts.q ?? "").trim();

    const rows = await this.prisma.branch.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
              { code: { equals: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: {
        _count: {
          select: {
            users: true,
            departments: true,
            patients: true,
            branchFacilities: true,
            Specialty: true,

            // Setup Studio infra totals
            locationNodes: true,
            units: true,
            unitRooms: true,
            unitResources: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const branchIds = rows.map((r) => r.id);
    if (branchIds.length === 0) return [];

    // Derived counts MUST use Setup Studio (single source of truth)
    const [bedsByBranch, otsByBranch, bedUnitsByBranch] = await Promise.all([
      // REQUIRED (per your checklist): groupBy for beds
      this.prisma.unitResource.groupBy({
        by: ["branchId"],
        where: {
          branchId: { in: branchIds },
          isActive: true,
          resourceType: UnitResourceType.BED,
        },
        _count: { _all: true },
      }),

      // REQUIRED (per your checklist): groupBy for OT tables (schedulable)
      this.prisma.unitResource.groupBy({
        by: ["branchId"],
        where: {
          branchId: { in: branchIds },
          isActive: true,
          resourceType: UnitResourceType.OT_TABLE,
          isSchedulable: true,
        },
        _count: { _all: true },
      }),

      // Wards = distinct Units that have >=1 BED resource
      this.prisma.unitResource.groupBy({
        by: ["branchId", "unitId"],
        where: {
          branchId: { in: branchIds },
          isActive: true,
          resourceType: UnitResourceType.BED,
        },
        _count: { _all: true },
      }),
    ]);

    const bedsMap = countMapFromGroupBy(bedsByBranch as any);
    const otsMap = countMapFromGroupBy(otsByBranch as any);
    const wardsMap = wardsMapFromBedUnitGroups(bedUnitsByBranch as any);

    return rows.map((r) => ({
      ...r,
      _count: normalizeCounts(r._count as any, {
        beds: bedsMap[r.id] ?? 0,
        oTs: otsMap[r.id] ?? 0,
        wards: wardsMap[r.id] ?? 0,
      }),
    }));
  }

  async get(id: string) {
    const row = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            departments: true,
            patients: true,
            branchFacilities: true,
            Specialty: true,

            // Setup Studio infra totals
            locationNodes: true,
            units: true,
            unitRooms: true,
            unitResources: true,
          },
        },
      },
    });

    if (!row) throw new NotFoundException("Branch not found");

    const [beds, oTs, wardUnits] = await Promise.all([
      this.prisma.unitResource.count({
        where: { branchId: id, isActive: true, resourceType: UnitResourceType.BED },
      }),
      this.prisma.unitResource.count({
        where: { branchId: id, isActive: true, resourceType: UnitResourceType.OT_TABLE, isSchedulable: true },
      }),
      this.prisma.unitResource.groupBy({
        by: ["unitId"],
        where: { branchId: id, isActive: true, resourceType: UnitResourceType.BED },
        _count: { _all: true },
      }),
    ]);

    return {
      ...row,
      _count: normalizeCounts(row._count as any, {
        beds,
        oTs,
        wards: wardUnits.length,
      }),
    };
  }

  async create(
    input: {
      code: string;
      name: string;
      city: string;
      gstNumber: string;
      address?: string;
      contactPhone1?: string;
      contactPhone2?: string;
      contactEmail?: string;
    },
    actorUserId?: string | null,
  ) {
    const code = normalizeBranchCode(input.code);
    const name = String(input.name || "").trim();
    const city = String(input.city || "").trim();
    const gstNumber = normalizeGstNumber(input.gstNumber);

    if (!name) throw new BadRequestException("name is required");
    if (!city) throw new BadRequestException("city is required");

    const address = cleanOptional(input.address);
    const contactPhone1 = cleanOptional(input.contactPhone1);
    const contactPhone2 = cleanOptional(input.contactPhone2);
    const contactEmail = cleanOptional(input.contactEmail);

    try {
      const created = await this.prisma.branch.create({
        data: {
          code,
          name,
          city,
          gstNumber,
          address: address ?? null,
          contactPhone1: contactPhone1 ?? null,
          contactPhone2: contactPhone2 ?? null,
          contactEmail: contactEmail ?? null,
        },
      });

      await this.audit.log({
        actorUserId: actorUserId ?? null,
        branchId: created.id,
        action: "CREATE",
        entity: "Branch",
        entityId: created.id,
        meta: {
          code: created.code,
          name: created.name,
          city: created.city,
          gstNumber: created.gstNumber,
          address: created.address,
          contactPhone1: created.contactPhone1,
          contactPhone2: created.contactPhone2,
          contactEmail: created.contactEmail,
        },
      });

      return created;
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        throw new BadRequestException(`Branch code "${code}" already exists`);
      }
      throw e;
    }
  }

  async update(
    id: string,
    input: {
      name?: string;
      city?: string;
      gstNumber?: string;
      address?: string;
      contactPhone1?: string;
      contactPhone2?: string;
      contactEmail?: string;
    },
    actorUserId?: string | null,
  ) {
    const existing = await this.prisma.branch.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Branch not found");

    const patch: any = {};

    if (typeof input.name === "string") {
      const v = input.name.trim();
      if (!v) throw new BadRequestException("name cannot be empty");
      patch.name = v;
    }

    if (typeof input.city === "string") {
      const v = input.city.trim();
      if (!v) throw new BadRequestException("city cannot be empty");
      patch.city = v;
    }

    if (typeof input.gstNumber === "string") {
      patch.gstNumber = normalizeGstNumber(input.gstNumber);
    }

    if (input.address !== undefined) patch.address = cleanOptional(input.address) ?? null;
    if (input.contactPhone1 !== undefined) patch.contactPhone1 = cleanOptional(input.contactPhone1) ?? null;
    if (input.contactPhone2 !== undefined) patch.contactPhone2 = cleanOptional(input.contactPhone2) ?? null;
    if (input.contactEmail !== undefined) patch.contactEmail = cleanOptional(input.contactEmail) ?? null;

    if (!Object.keys(patch).length) throw new BadRequestException("No changes");

    const updated = await this.prisma.branch.update({ where: { id }, data: patch });

    await this.audit.log({
      actorUserId: actorUserId ?? null,
      branchId: updated.id,
      action: "UPDATE",
      entity: "Branch",
      entityId: updated.id,
      meta: { before: existing, after: patch },
    });

    return updated;
  }

  async remove(id: string, actorUserId?: string | null) {
    const existing = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            departments: true,
            patients: true,
            branchFacilities: true,
            Specialty: true,
            Staff: true,
            Encounter: true,
            Admission: true,
            tariffPlans: true,
            assets: true,
            statutoryCases: true,

            // Setup Studio infra (NEW master)
            locationNodes: true,
            branchUnitTypes: true,
            units: true,
            unitRooms: true,
            unitResources: true,

            // Ops / setup masters
            procedureBookings: true,
            equipmentAssets: true,
            chargeMasterItems: true,
            serviceItems: true,
            serviceChargeMappings: true,
            fixItTasks: true,
            bulkImportJobs: true,
            goLiveReports: true,
          },
        },
      },
    });
    if (!existing) throw new NotFoundException("Branch not found");

    const c = existing._count as any as BranchCountsRaw;

    // IMPORTANT: delete protection uses Setup Studio, not legacy Ward/Room/Bed/OT
    const blockers: Array<[string, number]> = [
      ["users", c.users ?? 0],
      ["departments", c.departments ?? 0],
      ["patients", c.patients ?? 0],
      ["staff", (c as any).Staff ?? 0],
      ["encounters", (c as any).Encounter ?? 0],
      ["admissions", (c as any).Admission ?? 0],
      ["facilities", (c as any).branchFacilities ?? 0],
      ["specialties", (c as any).Specialty ?? 0],
      ["tariffPlans", (c as any).tariffPlans ?? 0],
      ["assets", (c as any).assets ?? 0],
      ["statutoryCases", (c as any).statutoryCases ?? 0],

      // Setup Studio infra
      ["locationNodes", (c as any).locationNodes ?? 0],
      ["branchUnitTypes", (c as any).branchUnitTypes ?? 0],
      ["units", (c as any).units ?? 0],
      ["unitRooms", (c as any).unitRooms ?? 0],
      ["unitResources", (c as any).unitResources ?? 0],
      ["procedureBookings", (c as any).procedureBookings ?? 0],
      ["equipmentAssets", (c as any).equipmentAssets ?? 0],
      ["chargeMasterItems", (c as any).chargeMasterItems ?? 0],
      ["serviceItems", (c as any).serviceItems ?? 0],
      ["serviceChargeMappings", (c as any).serviceChargeMappings ?? 0],
      ["fixItTasks", (c as any).fixItTasks ?? 0],
      ["bulkImportJobs", (c as any).bulkImportJobs ?? 0],
      ["goLiveReports", (c as any).goLiveReports ?? 0],
    ];

    const total = blockers.reduce((acc, [, v]) => acc + (v || 0), 0);

    if (total > 0) {
      const nonZero = blockers
        .filter(([, v]) => (v || 0) > 0)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");

      throw new BadRequestException(
        `Cannot delete a branch that already has dependent data. Remove dependent data first. (${nonZero})`,
      );
    }

    await this.prisma.branch.delete({ where: { id } });

    await this.audit.log({
      actorUserId: actorUserId ?? null,
      branchId: id,
      action: "DELETE",
      entity: "Branch",
      entityId: id,
      meta: { code: existing.code, name: existing.name, city: existing.city },
    });

    return { ok: true };
  }
}
