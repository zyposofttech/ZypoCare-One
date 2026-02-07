import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@zypocare/db";
import type { Principal } from "../../auth/access-policy.service";
import { InfraContextService } from "../shared/infra-context.service";

const UNIT_CATEGORIES = new Set([
  "OUTPATIENT",
  "INPATIENT",
  "CRITICAL_CARE",
  "PROCEDURE",
  "DIAGNOSTIC",
  "SUPPORT",
]);

function toBool(v: any, dflt: boolean) {
  if (v === undefined) return dflt;
  return !!v;
}

function normalizeJsonInput(v: any) {
  if (v === undefined) return undefined;
  if (v === null) return Prisma.DbNull; // real SQL NULL for Json?
  return v;
}

function normalizeStringArrayJson(v: any) {
  if (v === undefined) return undefined;
  if (v === null) return Prisma.DbNull;
  if (!Array.isArray(v)) throw new BadRequestException("standardEquipment must be an array of strings");
  const arr = v.map((x) => String(x ?? "").trim()).filter(Boolean);
  return arr;
}

@Injectable()
export class UnitTypesService {
  constructor(private readonly ctx: InfraContextService) {}

  async listUnitTypeCatalog(_principal: Principal, includeInactive = false) {
    return this.ctx.prisma.unitTypeCatalog.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        usesRoomsDefault: true,
        schedulableByDefault: true,
        bedBasedDefault: true,
        requiresPreAuthDefault: true,
        defaultOperatingHours: true,
        standardEquipment: true,
        isSystemDefined: true,
        isActive: true,
        sortOrder: true,
      },
    });
  }

  async createUnitTypeCatalog(principal: Principal, body: any) {
    const code = String(body?.code ?? "").trim().toUpperCase();
    const name = String(body?.name ?? "").trim();

    if (!name) throw new BadRequestException("name is required");
    if (!code) throw new BadRequestException("code is required");

    if (code.length < 2 || code.length > 32) {
      throw new BadRequestException("code must be between 2 and 32 characters");
    }
    if (!/^[A-Z0-9_-]+$/.test(code)) {
      throw new BadRequestException("code can contain only A–Z, 0–9, underscore (_) and hyphen (-)");
    }
    if (name.length < 2 || name.length > 120) {
      throw new BadRequestException("name must be between 2 and 120 characters");
    }

    const categoryRaw = body?.category ?? "OUTPATIENT";
    const category = String(categoryRaw).trim().toUpperCase();
    if (!UNIT_CATEGORIES.has(category)) {
      throw new BadRequestException(`category must be one of: ${Array.from(UNIT_CATEGORIES).join(", ")}`);
    }

    const usesRoomsDefault = toBool(body?.usesRoomsDefault, true);
    const schedulableByDefault = toBool(body?.schedulableByDefault, false);
    const bedBasedDefault = toBool(body?.bedBasedDefault, false);
    const requiresPreAuthDefault = toBool(body?.requiresPreAuthDefault, false);
    const isActive = toBool(body?.isActive, true);

    let sortOrder: number;
    if (typeof body?.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
      sortOrder = Math.max(0, Math.floor(body.sortOrder));
    } else {
      const agg = await this.ctx.prisma.unitTypeCatalog.aggregate({ _max: { sortOrder: true } });
      sortOrder = Number(agg?._max?.sortOrder ?? 0) + 10;
    }

    const defaultOperatingHours = normalizeJsonInput(body?.defaultOperatingHours);
    const standardEquipment = normalizeStringArrayJson(body?.standardEquipment);

    const exists = await this.ctx.prisma.unitTypeCatalog.findFirst({
      where: { code },
      select: { id: true },
    });
    if (exists) throw new BadRequestException(`Catalog code "${code}" already exists`);

    try {
      const created = await this.ctx.prisma.unitTypeCatalog.create({
        data: {
          code,
          name,
          category: category as any,
          usesRoomsDefault,
          schedulableByDefault,
          bedBasedDefault,
          requiresPreAuthDefault,
          defaultOperatingHours,
          standardEquipment,
          isSystemDefined: false,
          isActive,
          sortOrder,
        },
        select: {
          id: true,
          code: true,
          name: true,
          category: true,
          usesRoomsDefault: true,
          schedulableByDefault: true,
          bedBasedDefault: true,
          requiresPreAuthDefault: true,
          defaultOperatingHours: true,
          standardEquipment: true,
          isSystemDefined: true,
          isActive: true,
          sortOrder: true,
        },
      });

      await this.ctx.audit.log({
        branchId: null,
        actorUserId: principal.userId,
        action: "INFRA_UNITTYPE_CATALOG_CREATE",
        entity: "UnitTypeCatalog",
        entityId: created.id,
        meta: { code: created.code, name: created.name, category: created.category },
      });

      return created;
    } catch (e: any) {
      if (e?.code === "P2002") throw new BadRequestException(`Catalog code "${code}" already exists`);
      throw e;
    }
  }

  async updateUnitTypeCatalog(principal: Principal, id: string, body: any) {
    const row = await this.ctx.prisma.unitTypeCatalog.findFirst({
      where: { id },
      select: { id: true, isSystemDefined: true },
    });
    if (!row) throw new NotFoundException("UnitTypeCatalog not found");

    const data: any = {};

    if (body?.name !== undefined) {
      const name = String(body?.name ?? "").trim();
      if (!name) throw new BadRequestException("name cannot be empty");
      if (name.length < 2 || name.length > 120) throw new BadRequestException("name must be between 2 and 120 characters");
      data.name = name;
    }

    if (body?.category !== undefined) {
      const category = String(body?.category ?? "").trim().toUpperCase();
      if (!UNIT_CATEGORIES.has(category)) {
        throw new BadRequestException(`category must be one of: ${Array.from(UNIT_CATEGORIES).join(", ")}`);
      }
      data.category = category;
    }

    if (body?.usesRoomsDefault !== undefined) data.usesRoomsDefault = !!body.usesRoomsDefault;
    if (body?.schedulableByDefault !== undefined) data.schedulableByDefault = !!body.schedulableByDefault;
    if (body?.bedBasedDefault !== undefined) data.bedBasedDefault = !!body.bedBasedDefault;
    if (body?.requiresPreAuthDefault !== undefined) data.requiresPreAuthDefault = !!body.requiresPreAuthDefault;

    if (body?.defaultOperatingHours !== undefined) data.defaultOperatingHours = normalizeJsonInput(body.defaultOperatingHours);
    if (body?.standardEquipment !== undefined) data.standardEquipment = normalizeStringArrayJson(body.standardEquipment);

    if (body?.isActive !== undefined) data.isActive = !!body.isActive;

    if (body?.sortOrder !== undefined) {
      const n = Number(body.sortOrder);
      if (!Number.isFinite(n) || n < 0) throw new BadRequestException("sortOrder must be a non-negative number");
      data.sortOrder = Math.floor(n);
    }

    const updated = await this.ctx.prisma.unitTypeCatalog.update({
      where: { id },
      data,
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        usesRoomsDefault: true,
        schedulableByDefault: true,
        bedBasedDefault: true,
        requiresPreAuthDefault: true,
        defaultOperatingHours: true,
        standardEquipment: true,
        isSystemDefined: true,
        isActive: true,
        sortOrder: true,
      },
    });

    await this.ctx.audit.log({
      branchId: null,
      actorUserId: principal.userId,
      action: "INFRA_UNITTYPE_CATALOG_UPDATE",
      entity: "UnitTypeCatalog",
      entityId: id,
      meta: { changed: Object.keys(data), systemDefined: row.isSystemDefined },
    });

    return updated;
  }

  async getBranchUnitTypes(principal: Principal, branchIdParam?: string) {
    const branchId = this.ctx.resolveBranchId(principal, branchIdParam ?? null);

    const links = await this.ctx.prisma.branchUnitType.findMany({
      where: { branchId },
      include: { unitType: true },
      orderBy: [{ unitType: { sortOrder: "asc" } }, { unitType: { name: "asc" } }],
    });

    return links.map((l) => ({
      id: l.id,
      unitTypeId: l.unitTypeId,
      isEnabled: l.isEnabled,
      enabledAt: l.enabledAt,
      unitType: {
        id: l.unitType.id,
        code: l.unitType.code,
        name: l.unitType.name,
        category: l.unitType.category,
        usesRoomsDefault: l.unitType.usesRoomsDefault,
        schedulableByDefault: l.unitType.schedulableByDefault,
        bedBasedDefault: l.unitType.bedBasedDefault,
        requiresPreAuthDefault: l.unitType.requiresPreAuthDefault,
        defaultOperatingHours: l.unitType.defaultOperatingHours,
        standardEquipment: l.unitType.standardEquipment,
        isSystemDefined: l.unitType.isSystemDefined,
        isActive: l.unitType.isActive,
        sortOrder: l.unitType.sortOrder,
      },
    }));
  }

  async setBranchUnitTypes(principal: Principal, unitTypeIdsRaw: string[], branchIdParam?: string) {
    const branchId = this.ctx.resolveBranchId(principal, branchIdParam ?? null);
    const unitTypeIds = this.ctx.uniq(unitTypeIdsRaw);

    if (!unitTypeIds.length) {
      throw new BadRequestException("unitTypeIds cannot be empty (you want all unit types day-1)");
    }

    const valid = await this.ctx.prisma.unitTypeCatalog.findMany({
      where: { id: { in: unitTypeIds }, isActive: true },
      select: { id: true },
    });

    const ok = new Set(valid.map((v) => v.id));
    const bad = unitTypeIds.filter((x) => !ok.has(x));
    if (bad.length) throw new BadRequestException(`Unknown/inactive unitTypeIds: ${bad.join(", ")}`);

    const current = await this.ctx.prisma.branchUnitType.findMany({
      where: { branchId },
      select: { unitTypeId: true, isEnabled: true },
    });

    const enabledNow = new Set(current.filter((x) => x.isEnabled).map((x) => x.unitTypeId));
    const desired = new Set(unitTypeIds);

    const toDisable = Array.from(enabledNow).filter((id) => !desired.has(id));
    const toEnable = unitTypeIds.filter((id) => !enabledNow.has(id));

    await this.ctx.prisma.$transaction(async (tx) => {
      if (toDisable.length) {
        await tx.branchUnitType.updateMany({
          where: { branchId, unitTypeId: { in: toDisable } },
          data: { isEnabled: false },
        });
      }

      for (const id of toEnable) {
        await tx.branchUnitType.upsert({
          where: { branchId_unitTypeId: { branchId, unitTypeId: id } },
          update: { isEnabled: true, enabledAt: new Date() },
          create: { branchId, unitTypeId: id, isEnabled: true, enabledAt: new Date() },
        });
      }
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_UNITTYPE_SET",
      entity: "Branch",
      entityId: branchId,
      meta: { enabled: unitTypeIds },
    });

    return this.getBranchUnitTypes(principal, branchId);
  }
}
