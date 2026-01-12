import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@excelcare/db";
import { Prisma } from "@excelcare/db";
import { AuditService } from "../audit/audit.service";
import { Branch } from "@excelcare/db/src/generated/client";

type BranchCountsRaw = {
  users: number;
  departments: number;
  patients: number;
  wards: number;
  oTs: number;
  Bed: number; // Prisma relation field name in schema is "Bed"
  branchFacilities: number;
  Specialty: number;
};

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
  wards: number;
  oTs: number;
  beds: number;
  facilities: number;
  specialties: number;
};

export type BranchRow = Branch & {
  _count?: BranchCounts;
};

function normalizeCounts(raw?: BranchCountsRaw | null): BranchCounts | undefined {
  if (!raw) return undefined;
  return {
    users: raw.users ?? 0,
    departments: raw.departments ?? 0,
    patients: raw.patients ?? 0,
    wards: raw.wards ?? 0,
    oTs: raw.oTs ?? 0,
    beds: (raw as any).Bed ?? 0,
    facilities: (raw as any).branchFacilities ?? 0,
    specialties: (raw as any).Specialty ?? 0,
  };
}

function normalizeGstNumber(input: string) {
  const gst = String(input || "").trim().toUpperCase();
  // GSTIN (India) – 15 chars
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(gst)) {
    throw new BadRequestException("Invalid GSTIN. Example: 29ABCDE1234F1Z5");
  }
  return gst;
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
            wards: true,
            oTs: true,
            Bed: true,
            branchFacilities: true,
            Specialty: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return rows.map((r) => ({
      ...r,
      _count: normalizeCounts(r._count as any),
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
            wards: true,
            oTs: true,
            Bed: true,
            branchFacilities: true,
            Specialty: true,
          },
        },
      },
    });

    if (!row) throw new NotFoundException("Branch not found");

    return {
      ...row,
      _count: normalizeCounts(row._count as any),
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
            wards: true,
            oTs: true,
            Bed: true,
          },
        },
      },
    });
    if (!existing) throw new NotFoundException("Branch not found");

    const counts = normalizeCounts(existing._count as any);
    const hasData =
      (counts?.users || 0) +
        (counts?.departments || 0) +
        (counts?.patients || 0) +
        (counts?.wards || 0) +
        (counts?.oTs || 0) +
        (counts?.beds || 0) >
      0;

    if (hasData) {
      throw new BadRequestException(
        "Cannot delete a branch that already has users/departments/patients/wards/OT/beds. Remove dependent data first.",
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
