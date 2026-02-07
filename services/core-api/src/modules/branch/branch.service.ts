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

  // Setup Studio raw totals (useful for dashboards  delete protection)
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


const RE_PHONE = /^[0-9+][0-9()\-\s]{6,19}$/;

function requiredTrim(v: any, label: string) {
  const s = String(v ?? "").trim();
  if (!s) throw new BadRequestException(`${label} is required`);
  return s;
}

function normalizePanNumber(input: string) {
  const pan = String(input || "").trim().toUpperCase();
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
    throw new BadRequestException("Invalid PAN. Example: ABCDE1234F");
  }
  return pan;
}

function normalizePinCode(input: string) {
  const pin = String(input || "").trim();
  if (!/^\d{6}$/.test(pin)) {
    throw new BadRequestException("Invalid PIN code. Example: 560100");
  }
  return pin;
}

function normalizeEmailRequired(input: string) {
  const email = String(input || "").trim().toLowerCase();
  if (!email) throw new BadRequestException("contactEmail is required");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BadRequestException("Invalid contactEmail");
  }
  return email;
}

function normalizePhoneRequired(input: string, label: string) {
  const phone = String(input || "").trim();
  if (!phone) throw new BadRequestException(`${label} is required`);
  if (!RE_PHONE.test(phone)) throw new BadRequestException(`Invalid ${label}`);
  return phone;
}

function parseDateOptional(input: any, label: string) {
  if (input === undefined) return undefined;
  if (input === null) return null;
  const s = String(input).trim();
  if (!s) return null;
  const t = Date.parse(s);
  if (!Number.isFinite(t)) throw new BadRequestException(`Invalid ${label}`);
  return new Date(t);
}

function normalizeMonth(input: any, fallback: number) {
  if (input === undefined || input === null) return fallback;
  const n = Number(input);
  if (!Number.isInteger(n) || n < 1 || n > 12) {
    throw new BadRequestException("fiscalYearStartMonth must be an integer between 1 and 12");
  }
  return n;
}

function cleanStringArray(input: any, opts?: { upper?: boolean }) {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (!Array.isArray(input)) throw new BadRequestException("Expected an array of strings");
  const upper = Boolean(opts?.upper);
  const out = input
    .map((x) => String(x ?? "").trim())
    .filter(Boolean)
    .map((x) => (upper ? x.toUpperCase() : x));
  return out.length ? out : null;
}

function cleanWorkingHours(input: any) {
  const s = cleanOptional(input);
  if (s === undefined) return undefined;
  if (s === null) return null;
  return { text: s };
}

function cleanSocialLinks(input: {
  facebook?: any;
  instagram?: any;
  linkedin?: any;
  x?: any;
  youtube?: any;
}) {
  const out: Record<string, string> = {};
  const f = cleanOptional(input.facebook);
  const i = cleanOptional(input.instagram);
  const l = cleanOptional(input.linkedin);
  const x = cleanOptional(input.x);
  const y = cleanOptional(input.youtube);

  if (f) out.facebook = f;
  if (i) out.instagram = i;
  if (l) out.linkedin = l;
  if (x) out.x = x;
  if (y) out.youtube = y;

  return Object.keys(out).length ? out : null;
}

// IMPORTANT: Prisma Json? fields don't accept JS `null`. Use Prisma.DbNull for DB NULL.
function jsonDbNull<T>(v: T | null | undefined) {
  if (v === undefined) return undefined;
  if (v === null) return Prisma.DbNull;
  return v as any;
}


function countMapFromGroupBy(rows: Array<{ branchId: string; _count: { _all: number } }>): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of rows) map[r.branchId] = r._count?._all ?? 0;
  return map;
}

// input rows are groupBy(["branchId","unitId"]) => each row is one distinct unit per branch that has BED
function wardsMapFromBedUnitGroups(rows: Array<{ branchId: string; unitId: string }>): Record<string, number> {
  const map: Record<string, number> = {};
  for (const r of rows) map[r.branchId] = (map[r.branchId] ?? 0) ;
  return map;
}

@Injectable()
export class BranchService {
  constructor(
    @Inject("PRISMA") private prisma: PrismaClient,
    private audit: AuditService,
  ) {}

  async list(opts: { q?: string | null; onlyActive?: boolean | null; mode?: "full" | "selector" } = {}) {
    const q = (opts.q ?? "").trim();
    const onlyActive = Boolean(opts.onlyActive);
    const mode = opts.mode === "selector" ? "selector" : "full";

    const where: Prisma.BranchWhereInput | undefined =
      q || onlyActive
        ? {
            ...(onlyActive ? { isActive: true } : {}),
            ...(q
              ? {
                  OR: [
                    { name: { contains: q, mode: "insensitive" } },
                    { city: { contains: q, mode: "insensitive" } },
                    { code: { equals: q, mode: "insensitive" } },
                  ],
                }
              : {}),
          }
        : undefined;

    // Fast path for branch selector dropdowns: avoid heavy derived-count queries.
    if (mode === "selector") {
      return this.prisma.branch.findMany({
        where,
        select: {
          id: true,
          code: true,
          name: true,
          city: true,
          isActive: true,
        },
        orderBy: { name: "asc" },
      });
    }
    const rows = await this.prisma.branch.findMany({
      where,
      include: {
        _count: {
          select: {
            users: true,
            departments: true,
            patients: true,
            branchFacilities: true,
            specialties: true,

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
            specialties: true,

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

      legalEntityName: string;
      address: string;
      pinCode: string;
      state?: string;
      country?: string;

      contactPhone1: string;
      contactPhone2?: string;
      contactEmail: string;

      gstNumber: string;
      panNumber: string;
      clinicalEstRegNumber: string;
      rohiniId?: string;
      hfrId?: string;

      logoUrl?: string;
      website?: string;

      facebook?: string;
      instagram?: string;
      linkedin?: string;
      x?: string;
      youtube?: string;

      accreditations?: string[];
      bedCount?: number;
      establishedDate?: string;

      defaultCurrency?: string;
      timezone?: string;
      fiscalYearStartMonth?: number;
      workingHoursText?: string;
      emergency24x7?: boolean;
      multiLanguageSupport?: boolean;
      supportedLanguages?: string[];
    },
    actorUserId?: string | null,
  ) {
    const code = normalizeBranchCode(input.code);
    const name = requiredTrim(input.name, "name");
    const city = requiredTrim(input.city, "city");

    const legalEntityName = requiredTrim(input.legalEntityName, "legalEntityName");
    const address = requiredTrim(input.address, "address");
    const pinCode = normalizePinCode(input.pinCode);

    const state = cleanOptional(input.state);
    const country = cleanOptional(input.country);

    const contactPhone1 = normalizePhoneRequired(input.contactPhone1, "contactPhone1");
    const contactPhone2 = cleanOptional(input.contactPhone2);
    const contactEmail = normalizeEmailRequired(input.contactEmail);

    const gstNumber = normalizeGstNumber(input.gstNumber);
    const panNumber = normalizePanNumber(input.panNumber);
    const clinicalEstRegNumber = requiredTrim(input.clinicalEstRegNumber, "clinicalEstRegNumber");
    const rohiniId = cleanOptional(input.rohiniId);
    const hfrId = cleanOptional(input.hfrId); // ABDM auto-populated later

    const logoUrl = cleanOptional(input.logoUrl);
    const website = cleanOptional(input.website);

    const socialLinks = cleanSocialLinks({
      facebook: input.facebook,
      instagram: input.instagram,
      linkedin: input.linkedin,
      x: input.x,
      youtube: input.youtube,
    });

    const accreditations = cleanStringArray(input.accreditations, { upper: true });
    const supportedLanguages = cleanStringArray(input.supportedLanguages);

    const bedCount =
      input.bedCount === undefined || input.bedCount === null
        ? undefined
        : (() => {
            const n = Number(input.bedCount);
            if (!Number.isFinite(n) || n < 0) throw new BadRequestException("bedCount must be a non-negative number");
            return Math.trunc(n);
          })();

    const establishedDate = parseDateOptional(input.establishedDate, "establishedDate");

    const defaultCurrency = (cleanOptional(input.defaultCurrency) ?? "INR").toUpperCase();
    const timezone = cleanOptional(input.timezone) ?? "Asia/Kolkata";
    const fiscalYearStartMonth = normalizeMonth(input.fiscalYearStartMonth, 4);
    const workingHours = cleanWorkingHours(input.workingHoursText);

    const emergency24x7 = input.emergency24x7 === undefined ? true : Boolean(input.emergency24x7);
    const multiLanguageSupport = input.multiLanguageSupport === undefined ? false : Boolean(input.multiLanguageSupport);

    try {
      const created = await this.prisma.branch.create({
        data: {
          code,
          name,
          city,

          legalEntityName,
          address,
          pinCode,
          state: state ?? null,
          country: country ?? null,

          contactPhone1,
          contactPhone2: contactPhone2 ?? null,
          contactEmail,

          gstNumber,
          panNumber,
          clinicalEstRegNumber,
          rohiniId: rohiniId ?? null,
          hfrId: hfrId ?? null,

          logoUrl: logoUrl ?? null,
          website: website ?? null,

          // Json? fields: use Prisma.DbNull instead of JS null
          socialLinks: jsonDbNull(socialLinks),
          accreditations: jsonDbNull(accreditations),
          workingHours: jsonDbNull(workingHours),
          supportedLanguages: jsonDbNull(supportedLanguages),

          bedCount: bedCount ?? undefined,
          establishedDate: establishedDate ?? null,

          defaultCurrency,
          timezone,
          fiscalYearStartMonth,
          emergency24x7,
          multiLanguageSupport,
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
          legalEntityName: created.legalEntityName,
          gstNumber: created.gstNumber,
          panNumber: created.panNumber,
          clinicalEstRegNumber: created.clinicalEstRegNumber,
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

      legalEntityName?: string;
      address?: string;
      pinCode?: string;
      state?: string;
      country?: string;

      contactPhone1?: string;
      contactPhone2?: string;
      contactEmail?: string;

      gstNumber?: string;
      panNumber?: string;
      clinicalEstRegNumber?: string;
      rohiniId?: string;
      hfrId?: string;

      logoUrl?: string;
      website?: string;

      facebook?: string;
      instagram?: string;
      linkedin?: string;
      x?: string;
      youtube?: string;

      accreditations?: string[];
      bedCount?: number;
      establishedDate?: string;

      defaultCurrency?: string;
      timezone?: string;
      fiscalYearStartMonth?: number;
      workingHoursText?: string;
      emergency24x7?: boolean;
      multiLanguageSupport?: boolean;
      supportedLanguages?: string[];
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

    if (typeof input.legalEntityName === "string") {
      const v = input.legalEntityName.trim();
      if (!v) throw new BadRequestException("legalEntityName cannot be empty");
      patch.legalEntityName = v;
    }

    if (typeof input.address === "string") {
      const v = input.address.trim();
      if (!v) throw new BadRequestException("address cannot be empty");
      patch.address = v;
    }

    if (typeof input.pinCode === "string") patch.pinCode = normalizePinCode(input.pinCode);
    if (input.state !== undefined) patch.state = cleanOptional(input.state) ?? null;
    if (input.country !== undefined) patch.country = cleanOptional(input.country) ?? null;

    if (typeof input.contactPhone1 === "string") {
      patch.contactPhone1 = normalizePhoneRequired(input.contactPhone1, "contactPhone1");
    }
    if (input.contactPhone2 !== undefined) patch.contactPhone2 = cleanOptional(input.contactPhone2) ?? null;
    if (typeof input.contactEmail === "string") patch.contactEmail = normalizeEmailRequired(input.contactEmail);

    if (typeof input.gstNumber === "string") patch.gstNumber = normalizeGstNumber(input.gstNumber);
    if (typeof input.panNumber === "string") patch.panNumber = normalizePanNumber(input.panNumber);

    if (typeof input.clinicalEstRegNumber === "string") {
      const v = input.clinicalEstRegNumber.trim();
      if (!v) throw new BadRequestException("clinicalEstRegNumber cannot be empty");
      patch.clinicalEstRegNumber = v;
    }

    if (input.rohiniId !== undefined) patch.rohiniId = cleanOptional(input.rohiniId) ?? null;
    if (input.hfrId !== undefined) patch.hfrId = cleanOptional(input.hfrId) ?? null;

    if (input.logoUrl !== undefined) patch.logoUrl = cleanOptional(input.logoUrl) ?? null;
    if (input.website !== undefined) patch.website = cleanOptional(input.website) ?? null;

    // Social links: if any social field is provided, merge into existing.socialLinks
    const socialTouched =
      input.facebook !== undefined ||
      input.instagram !== undefined ||
      input.linkedin !== undefined ||
      input.x !== undefined ||
      input.youtube !== undefined;

    if (socialTouched) {
      const base =
        (existing as any).socialLinks && typeof (existing as any).socialLinks === "object" ? (existing as any).socialLinks : {};
      const merged: Record<string, string> = { ...base };

      const apply = (key: string, val: any) => {
        if (val === undefined) return;
        const s = cleanOptional(val);
        if (!s) delete (merged as any)[key];
        else (merged as any)[key] = s;
      };

      apply("facebook", input.facebook);
      apply("instagram", input.instagram);
      apply("linkedin", input.linkedin);
      apply("x", input.x);
      apply("youtube", input.youtube);

      patch.socialLinks = Object.keys(merged).length ? merged : Prisma.DbNull;
    }

    if (input.accreditations !== undefined) {
      const acc = cleanStringArray(input.accreditations, { upper: true });
      patch.accreditations = acc ? acc : Prisma.DbNull;
    }

    if (input.bedCount !== undefined) {
      if (input.bedCount === null) patch.bedCount = null;
      else {
        const n = Number(input.bedCount);
        if (!Number.isFinite(n) || n < 0) throw new BadRequestException("bedCount must be a non-negative number");
        patch.bedCount = Math.trunc(n);
      }
    }

    if (input.establishedDate !== undefined) patch.establishedDate = parseDateOptional(input.establishedDate, "establishedDate") ?? null;

    // Settings
    if (input.defaultCurrency !== undefined) {
      const v = cleanOptional(input.defaultCurrency);
      if (!v) throw new BadRequestException("defaultCurrency cannot be empty");
      patch.defaultCurrency = v.toUpperCase();
    }

    if (input.timezone !== undefined) {
      const v = cleanOptional(input.timezone);
      if (!v) throw new BadRequestException("timezone cannot be empty");
      patch.timezone = v;
    }

    if (input.fiscalYearStartMonth !== undefined) patch.fiscalYearStartMonth = normalizeMonth(input.fiscalYearStartMonth, existing.fiscalYearStartMonth ?? 4);

    if (input.workingHoursText !== undefined) {
      const wh = cleanWorkingHours(input.workingHoursText);
      patch.workingHours = wh ? wh : Prisma.DbNull;
    }

    if (input.emergency24x7 !== undefined) patch.emergency24x7 = Boolean(input.emergency24x7);
    if (input.multiLanguageSupport !== undefined) patch.multiLanguageSupport = Boolean(input.multiLanguageSupport);

    if (input.supportedLanguages !== undefined) {
      const langs = cleanStringArray(input.supportedLanguages);
      patch.supportedLanguages = langs ? langs : Prisma.DbNull;
    }

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


  async setActive(id: string, isActive: boolean, actorUserId?: string | null) {
    const existing = await this.prisma.branch.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Branch not found");

    if (existing.isActive === isActive) {
      return existing;
    }

    const updated = await this.prisma.branch.update({
      where: { id },
      data: { isActive },
    });

    await this.audit.log({
      actorUserId: actorUserId ?? null,
      branchId: updated.id,
      action: isActive ? "REACTIVATE" : "DEACTIVATE",
      entity: "Branch",
      entityId: updated.id,
      meta: {
        before: { isActive: existing.isActive },
        after: { isActive },
      },
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
            specialties: true,
            //staff: true,
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

    const total = blockers.reduce((acc, [, v]) => acc + (v ?? 0), 0);

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
