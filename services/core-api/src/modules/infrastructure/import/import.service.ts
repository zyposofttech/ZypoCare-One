import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { InfraContextService } from "../shared/infra-context.service";
import type { ValidateImportDto } from "./dto";
import { assertLocationCode, assertUnitCode, canonicalizeCode } from "../../../common/naming.util";

const SERVICE_ITEM_TYPES = [
  "DIAGNOSTIC_LAB",
  "DIAGNOSTIC_IMAGING",
  "PROCEDURE",
  "NURSING",
  "THERAPY",
  "BED_CHARGE",
  "ADMIN",
  "PACKAGE",
  "OTHER",
] as const;

const CARE_CONTEXTS = [
  "OPD",
  "IPD",
  "ER",
  "OT",
  "DAYCARE",
  "TELECONSULT",
  "HOMECARE",
] as const;

function asString(v: any) {
  return v === undefined || v === null ? "" : String(v);
}

function parseBool(v: any): boolean | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["true", "1", "yes", "y"].includes(s)) return true;
  if (["false", "0", "no", "n"].includes(s)) return false;
  return null;
}

function parseIntStrict(v: any): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function parseList(v: any): string[] | null {
  if (v === undefined || v === null) return null;
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  const s = String(v).trim();
  if (!s) return [];
  return s
    .split(/[,;|]/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

@Injectable()
export class ImportService {
  constructor(private readonly ctx: InfraContextService) {}

  async validateImport(principal: Principal, dto: ValidateImportDto, branchIdParam?: string | null) {
    const branchId = this.ctx.resolveBranchId(principal, branchIdParam ?? null);

    const rows = Array.isArray(dto.rows) ? dto.rows : [];
    if (!rows.length) throw new BadRequestException("No rows provided");

    const errors: Array<{ row: number; field?: string; message: string }> = [];

    if (dto.entityType === "LOCATIONS") {
      rows.forEach((r, idx) => {
        try {
          if (!r.kind || !r.code || !r.name) throw new Error("kind, code, name required");
          assertLocationCode(r.kind, canonicalizeCode(r.code), r.parentCode ? canonicalizeCode(r.parentCode) : undefined);
        } catch (e: any) {
          errors.push({ row: idx + 1, message: e?.message ?? "Invalid row" });
        }
      });
    }

    if (dto.entityType === "UNITS") {
      rows.forEach((r, idx) => {
        try {
          if (!r.departmentId || !r.unitTypeId || !r.code || !r.name) {
            throw new Error("departmentId, unitTypeId, code, name required");
          }
          assertUnitCode(r.code);
        } catch (e: any) {
          errors.push({ row: idx + 1, message: e?.message ?? "Invalid row" });
        }
      });
    }

    if (dto.entityType === "SERVICE_ITEMS") {
      const departmentIds = new Set<string>();
      const chargeMasterCodes = new Set<string>();

      // 1) Syntactic validation per row
      rows.forEach((r, idx) => {
        const rowNo = idx + 1;
        try {
          const code = asString(r.code).trim();
          const name = asString(r.name).trim();
          const category = asString(r.category).trim();

          if (!code) errors.push({ row: rowNo, field: "code", message: "code is required" });
          if (!name) errors.push({ row: rowNo, field: "name", message: "name is required" });
          if (!category) errors.push({ row: rowNo, field: "category", message: "category is required" });

          // Validate canonicalization doesn't throw
          if (code) canonicalizeCode(code);

          const type = asString(r.type).trim();
          if (type && !(SERVICE_ITEM_TYPES as readonly string[]).includes(type)) {
            errors.push({ row: rowNo, field: "type", message: `Invalid type: ${type}` });
          }

          const contexts = parseList(r.contexts);
          if (contexts !== null) {
            for (const c of contexts) {
              if (!(CARE_CONTEXTS as readonly string[]).includes(c)) {
                errors.push({ row: rowNo, field: "contexts", message: `Invalid context: ${c}` });
              }
            }
          }

          const boolFields = [
            "isOrderable",
            "isBillable",
            "isActive",
            "consentRequired",
            "requiresAppointment",
          ];
          for (const f of boolFields) {
            if (r[f] !== undefined) {
              const b = parseBool(r[f]);
              if (b === null) errors.push({ row: rowNo, field: f, message: `${f} must be boolean` });
            }
          }

          const intFields = [
            "cooldownMins",
            "estimatedDurationMins",
            "prepMins",
            "recoveryMins",
            "tatMinsRoutine",
            "tatMinsStat",
          ];
          for (const f of intFields) {
            if (r[f] !== undefined) {
              const n = parseIntStrict(r[f]);
              if (n === null) errors.push({ row: rowNo, field: f, message: `${f} must be a number` });
            }
          }

          if (r.departmentId) departmentIds.add(String(r.departmentId));
          if (r.chargeMasterCode) chargeMasterCodes.add(canonicalizeCode(r.chargeMasterCode));
        } catch (e: any) {
          errors.push({ row: rowNo, message: e?.message ?? "Invalid row" });
        }
      });

      // 2) Referential validation (departmentId, chargeMasterCode)
      if (departmentIds.size) {
        const existing = await this.ctx.prisma.department.findMany({
          where: { id: { in: Array.from(departmentIds) } },
          select: { id: true },
        });
        const ok = new Set(existing.map((d) => d.id));
        rows.forEach((r, idx) => {
          const rowNo = idx + 1;
          if (r.departmentId && !ok.has(String(r.departmentId))) {
            errors.push({ row: rowNo, field: "departmentId", message: "departmentId not found" });
          }
        });
      }

      if (chargeMasterCodes.size) {
        const existing = await this.ctx.prisma.chargeMasterItem.findMany({
          where: { branchId, code: { in: Array.from(chargeMasterCodes) }, isActive: true },
          select: { code: true },
        });
        const ok = new Set(existing.map((c) => c.code));
        rows.forEach((r, idx) => {
          const rowNo = idx + 1;
          if (r.chargeMasterCode) {
            const cmCode = canonicalizeCode(r.chargeMasterCode);
            if (!ok.has(cmCode)) {
              // For PRD: treat this as validation error to force clean catalog imports.
              errors.push({ row: rowNo, field: "chargeMasterCode", message: `Charge master not found: ${cmCode}` });
            }
          }
        });
      }
    }

    const invalidRowCount = new Set(errors.map((e) => e.row)).size;
    const validRows = rows.length - invalidRowCount;

    const job = await this.ctx.prisma.bulkImportJob.create({
      data: {
        branchId,
        entityType: dto.entityType,
        status: "VALIDATED" as any,
        fileName: dto.fileName ?? null,
        payload: rows,
        errors,
        totalRows: rows.length,
        validRows,
        invalidRows: invalidRowCount,
        createdByUserId: principal.userId,
      },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_IMPORT_VALIDATE",
      entity: "BulkImportJob",
      entityId: job.id,
      meta: { entityType: dto.entityType, totalRows: rows.length, invalidRows: invalidRowCount, errorCount: errors.length },
    });

    return { jobId: job.id, totalRows: rows.length, validRows, invalidRows: invalidRowCount, errors };
  }

  async commitImport(principal: Principal, jobId: string) {
    const job = await this.ctx.prisma.bulkImportJob.findUnique({
      where: { id: jobId },
      select: { id: true, branchId: true, status: true, entityType: true, payload: true, errors: true },
    });

    if (!job) throw new NotFoundException("Import job not found");

    const branchId = this.ctx.resolveBranchId(principal, job.branchId);

    if (job.status !== ("VALIDATED" as any)) {
      throw new BadRequestException("Import job must be VALIDATED before COMMIT");
    }

    const rows = (job.payload as any[]) || [];
    const errors = (job.errors as any[]) || [];
    if (errors.length) throw new BadRequestException("Fix validation errors before committing");

    const entityType = job.entityType as any;

    await this.ctx.prisma.$transaction(async (tx) => {
      if (entityType === "UNITS") {
        for (const r of rows) {
          await tx.unit.create({
            data: {
              branchId,
              departmentId: r.departmentId,
              unitTypeId: r.unitTypeId,
              code: assertUnitCode(r.code),
              name: String(r.name).trim(),
              usesRooms: r.usesRooms ?? true,
              isActive: r.isActive ?? true,
            },
          });
        }
      } else if (entityType === "CHARGE_MASTER") {
        for (const r of rows) {
          await tx.chargeMasterItem.upsert({
            where: { branchId_code: { branchId, code: canonicalizeCode(r.code) } } as any,
            update: {
              name: String(r.name).trim(),
              category: r.category ?? null,
              unit: r.unit ?? null,
              isActive: r.isActive ?? true,
            },
            create: {
              branchId,
              code: canonicalizeCode(r.code),
              name: String(r.name).trim(),
              category: r.category ?? null,
              unit: r.unit ?? null,
              isActive: r.isActive ?? true,
            },
          });
        }
      } else if (entityType === "SERVICE_ITEMS") {
        const now = new Date();

        for (const r of rows) {
          const code = canonicalizeCode(r.code);
          const name = String(r.name).trim();
          const category = String(r.category).trim();
          const type = (asString(r.type).trim() || "OTHER") as any;

          const service = await tx.serviceItem.upsert({
            where: { branchId_serviceCode: { branchId, code } } as any,
            update: {
              departmentId: r.departmentId ?? null,
              name,
              type,
              category,
              unit: r.unit ?? null,
              externalId: r.externalId ?? null,

              isOrderable: parseBool(r.isOrderable) ?? undefined,
              isBillable: parseBool(r.isBillable) ?? undefined,
              isActive: parseBool(r.isActive) ?? undefined,

              cooldownMins: parseIntStrict(r.cooldownMins) ?? undefined,
              consentRequired: parseBool(r.consentRequired) ?? undefined,
              preparationText: r.preparationText ?? undefined,
              contraindicationsText: (r.contraindicationsText ?? r.contraindications) ?? undefined,
              instructionsText: r.instructionsText ?? r.description ?? undefined,

              requiresAppointment: parseBool(r.requiresAppointment) ?? undefined,
              estimatedDurationMins: parseIntStrict(r.estimatedDurationMins) ?? undefined,
              prepMins: parseIntStrict(r.prepMins) ?? undefined,
              recoveryMins: parseIntStrict(r.recoveryMins) ?? undefined,
              tatMinsRoutine: parseIntStrict(r.tatMinsRoutine) ?? undefined,
              tatMinsStat: parseIntStrict(r.tatMinsStat) ?? undefined,

              // Imports always land as DRAFT unless explicitly managed via workflow endpoints
              lifecycleStatus: "DRAFT" as any,
              updatedByUserId: principal.userId,
            },
            create: {
              branchId,
              departmentId: r.departmentId ?? null,
              code,
              name,
              type,
              category,
              unit: r.unit ?? null,
              externalId: r.externalId ?? null,
              isOrderable: parseBool(r.isOrderable) ?? true,
              isBillable: parseBool(r.isBillable) ?? true,
              isActive: parseBool(r.isActive) ?? true,
              lifecycleStatus: "DRAFT" as any,
              cooldownMins: parseIntStrict(r.cooldownMins),
              consentRequired: parseBool(r.consentRequired) ?? false,
              preparationText: r.preparationText ?? null,
              contraindicationsText: (r.contraindicationsText ?? r.contraindications) ?? null,
              instructionsText: (r.instructionsText ?? r.description) ?? null,
              requiresAppointment: parseBool(r.requiresAppointment) ?? false,
              estimatedDurationMins: parseIntStrict(r.estimatedDurationMins),
              prepMins: parseIntStrict(r.prepMins),
              recoveryMins: parseIntStrict(r.recoveryMins),
              tatMinsRoutine: parseIntStrict(r.tatMinsRoutine),
              tatMinsStat: parseIntStrict(r.tatMinsStat),
              createdByUserId: principal.userId,
              updatedByUserId: principal.userId,
            },
          });

          // Contexts: replace only if provided in the payload
          if (Object.prototype.hasOwnProperty.call(r, "contexts")) {
            const contexts = parseList(r.contexts) ?? null;
            const list = contexts === null ? null : (contexts.length ? contexts : ["OPD"]);
            if (list) {
              await tx.serviceItemContext.deleteMany({ where: { serviceItemId: service.id } });
              await tx.serviceItemContext.createMany({
                data: list.map((c) => ({ serviceItemId: service.id, context: c as any, isAllowed: true })),
              });
            }
          }

          // Aliases: replace only if provided
          if (Object.prototype.hasOwnProperty.call(r, "aliases")) {
            const aliases = parseList(r.aliases) ?? null;
            if (aliases !== null) {
              await tx.serviceItemAlias.deleteMany({ where: { serviceItemId: service.id } });
              if (aliases.length) {
                await tx.serviceItemAlias.createMany({
                  data: aliases
                    .map((a) => String(a).trim())
                    .filter(Boolean)
                    .map((a) => ({
                      serviceItemId: service.id,
                      alias: a,
                      normalized: a.toLowerCase().replace(/\s+/g, " ").trim(),
                      isActive: true,
                    })),
                });
              }
            }
          }

          // Charge mapping: if provided, upsert as current open mapping
          if (r.chargeMasterCode) {
            const cmCode = canonicalizeCode(r.chargeMasterCode);
            const cm = await tx.chargeMasterItem.findFirst({
              where: { branchId, code: cmCode, isActive: true },
              select: { id: true },
            });
            if (!cm) {
              // Should have been caught by validation, but keep safe.
              throw new BadRequestException(`Charge master not found for code ${cmCode}`);
            }

            const open = await tx.serviceChargeMapping.findFirst({
              where: { branchId, serviceItemId: service.id, effectiveTo: null },
              orderBy: { effectiveFrom: "desc" },
              select: { id: true, chargeMasterItemId: true, version: true },
            });

            if (!open) {
              const last = await tx.serviceChargeMapping.findFirst({
                where: { branchId, serviceItemId: service.id },
                orderBy: { version: "desc" },
                select: { version: true },
              });
              const nextVersion = (last?.version ?? 0) + 1;
              await tx.serviceChargeMapping.create({
                data: {
                  branchId,
                  serviceItemId: service.id,
                  chargeMasterItemId: cm.id,
                  effectiveFrom: now,
                  effectiveTo: null,
                  version: nextVersion,
                },
              });
            } else if (open.chargeMasterItemId !== cm.id) {
              // Close open mapping and create a new one
              await tx.serviceChargeMapping.update({ where: { id: open.id }, data: { effectiveTo: now } });
              const last = await tx.serviceChargeMapping.findFirst({
                where: { branchId, serviceItemId: service.id },
                orderBy: { version: "desc" },
                select: { version: true },
              });
              const nextVersion = (last?.version ?? open.version ?? 0) + 1;
              await tx.serviceChargeMapping.create({
                data: {
                  branchId,
                  serviceItemId: service.id,
                  chargeMasterItemId: cm.id,
                  effectiveFrom: now,
                  effectiveTo: null,
                  version: nextVersion,
                },
              });
            }

            // Resolve related fix-it tasks
            await tx.fixItTask.updateMany({
              where: {
                branchId,
                serviceItemId: service.id,
                type: "SERVICE_CHARGE_MAPPING_MISSING" as any,
                status: { in: ["OPEN", "IN_PROGRESS"] as any },
              },
              data: { status: "RESOLVED" as any, resolvedAt: new Date() },
            });
          } else {
            // Create Fix-It if no mapping exists
            const anyMapping = await tx.serviceChargeMapping.findFirst({
              where: { branchId, serviceItemId: service.id },
              select: { id: true },
            });

            if (!anyMapping) {
              const existingFix = await tx.fixItTask.findFirst({
                where: {
                  branchId,
                  serviceItemId: service.id,
                  type: "SERVICE_CHARGE_MAPPING_MISSING" as any,
                  status: { in: ["OPEN", "IN_PROGRESS"] as any },
                },
                select: { id: true },
              });
              if (!existingFix) {
                await tx.fixItTask.create({
                  data: {
                    branchId,
                    type: "SERVICE_CHARGE_MAPPING_MISSING" as any,
                    status: "OPEN" as any,
                    title: `Charge mapping missing for service ${service.code}`,
                    details: { serviceItemId: service.id, serviceCode: service.code },
                    serviceItemId: service.id,
                  },
                });
              }
            }
          }
        }
      } else {
        throw new BadRequestException(`Unsupported import entityType: ${entityType}`);
      }

      await tx.bulkImportJob.update({ where: { id: jobId }, data: { status: "COMMITTED" as any, committedAt: new Date() } });
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_IMPORT_COMMIT",
      entity: "BulkImportJob",
      entityId: jobId,
      meta: { jobId, entityType },
    });

    return { jobId, status: "COMMITTED" };
  }
}
