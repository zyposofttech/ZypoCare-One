import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import type { Principal } from "../../auth/access-policy.service";
import { canonicalizeCode } from "../../../common/naming.util";
import { InfraContextService } from "../shared/infra-context.service";

import type { CreateCodeSetDto, CreateServiceCodeMappingDto, UpdateCodeSetDto, UpsertCodeEntryDto } from "./dto";

/**
 * Service Library = Standard Code Sets + Standard Code Entries + mapping to ServiceItem.
 *
 * Prisma models used (per schema):
 * - StandardCodeSet
 * - StandardCodeEntry
 * - ServiceItemStandardMapping
 */
@Injectable()
export class ServiceLibraryService {
  constructor(private readonly ctx: InfraContextService) {}

  async createCodeSet(principal: Principal, dto: CreateCodeSetDto, branchIdParam?: string | null) {
    const branchIdForAudit = this.ctx.resolveBranchId(principal, branchIdParam ?? null);
    const code = canonicalizeCode(dto.code);

    const created = await this.ctx.prisma.standardCodeSet.create({
      data: {
        code,
        name: dto.name.trim(),
        description: dto.description ?? null,
        system: "INTERNAL",
        isActive: true,
      } as any,
    });

    await this.ctx.audit.log({
      branchId: branchIdForAudit,
      actorUserId: principal.userId ?? null,
      action: "INFRA_STANDARD_CODE_SET_CREATE",
      entity: "StandardCodeSet",
      entityId: created.id,
      meta: { code: created.code, system: created.system },
    });

    return created;
  }

  async listCodeSets(principal: Principal, args: { branchId?: string | null; q?: string; includeInactive?: boolean }) {
    // branchId is not stored on StandardCodeSet; we only use it for access scoping / audit parity.
    this.ctx.resolveBranchId(principal, args.branchId ?? null);

    const q = (args.q ?? "").trim();
    const where: any = {
      ...(args.includeInactive ? {} : { isActive: true }),
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    return this.ctx.prisma.standardCodeSet.findMany({
      where,
      orderBy: [{ system: "asc" }, { name: "asc" }],
      take: 200,
    });
  }

  async getCodeSet(principal: Principal, id: string, branchIdParam?: string | null) {
    this.ctx.resolveBranchId(principal, branchIdParam ?? null);
    const cs = await this.ctx.prisma.standardCodeSet.findUnique({ where: { id } });
    if (!cs) throw new NotFoundException("Code set not found");
    return cs;
  }

  async updateCodeSet(principal: Principal, id: string, dto: UpdateCodeSetDto, branchIdParam?: string | null) {
    const branchIdForAudit = this.ctx.resolveBranchId(principal, branchIdParam ?? null);

    const cs = await this.ctx.prisma.standardCodeSet.findUnique({ where: { id } });
    if (!cs) throw new NotFoundException("Code set not found");

    const updated = await this.ctx.prisma.standardCodeSet.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: canonicalizeCode(dto.code) } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      } as any,
    });

    await this.ctx.audit.log({
      branchId: branchIdForAudit,
      actorUserId: principal.userId ?? null,
      action: "INFRA_STANDARD_CODE_SET_UPDATE",
      entity: "StandardCodeSet",
      entityId: id,
      meta: { changes: dto },
    });

    return updated;
  }

  async listEntries(principal: Principal, codeSetId: string, q?: string, branchIdParam?: string | null) {
    this.ctx.resolveBranchId(principal, branchIdParam ?? null);

    const cs = await this.ctx.prisma.standardCodeSet.findUnique({ where: { id: codeSetId } });
    if (!cs) throw new NotFoundException("Code set not found");

    const qq = (q ?? "").trim();
    const where: any = {
      codeSetId,
      isActive: true,
      ...(qq
        ? {
            OR: [
              { code: { contains: qq, mode: "insensitive" } },
              { display: { contains: qq, mode: "insensitive" } },
              { category: { contains: qq, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    return this.ctx.prisma.standardCodeEntry.findMany({ where, orderBy: [{ code: "asc" }], take: 500 });
  }

  async upsertEntry(principal: Principal, codeSetId: string, dto: UpsertCodeEntryDto, branchIdParam?: string | null) {
    const branchIdForAudit = this.ctx.resolveBranchId(principal, branchIdParam ?? null);

    const cs = await this.ctx.prisma.standardCodeSet.findUnique({ where: { id: codeSetId } });
    if (!cs) throw new NotFoundException("Code set not found");

    const code = canonicalizeCode(dto.code);

    const attributes: any = {
      ...(dto.meta ?? {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    };
    const attributesValue = Object.keys(attributes).length ? attributes : undefined;

    const data: any = {
      codeSetId,
      code,
      display: dto.display.trim(),
      category: null,
      attributes: attributesValue,
      isActive: true,
    };

    let entry: any;
    try {
      entry = await this.ctx.prisma.standardCodeEntry.upsert({
        where: { codeSetId_code: { codeSetId, code } },
        create: data,
        update: {
          display: data.display,
          category: data.category,
          attributes: data.attributes,
          isActive: data.isActive,
        },
      });
    } catch {
      const existing = await this.ctx.prisma.standardCodeEntry.findFirst({ where: { codeSetId, code } });
      entry = existing
        ? await this.ctx.prisma.standardCodeEntry.update({
            where: { id: existing.id },
            data: { display: data.display, category: data.category, attributes: data.attributes, isActive: data.isActive },
          })
        : await this.ctx.prisma.standardCodeEntry.create({ data });
    }

    await this.ctx.audit.log({
      branchId: branchIdForAudit,
      actorUserId: principal.userId ?? null,
      action: "INFRA_STANDARD_CODE_ENTRY_UPSERT",
      entity: "StandardCodeEntry",
      entityId: entry.id,
      meta: { codeSetId, code },
    });

    return entry;
  }

  async deleteEntry(principal: Principal, codeSetId: string, code: string, branchIdParam?: string | null) {
    const branchIdForAudit = this.ctx.resolveBranchId(principal, branchIdParam ?? null);

    const cs = await this.ctx.prisma.standardCodeSet.findUnique({ where: { id: codeSetId } });
    if (!cs) throw new NotFoundException("Code set not found");

    const canon = canonicalizeCode(code);
    const entry = await this.ctx.prisma.standardCodeEntry.findFirst({ where: { codeSetId, code: canon, isActive: true } });
    if (!entry) throw new NotFoundException("Code entry not found");

    const updated = await this.ctx.prisma.standardCodeEntry.update({ where: { id: entry.id }, data: { isActive: false } });

    await this.ctx.audit.log({
      branchId: branchIdForAudit,
      actorUserId: principal.userId ?? null,
      action: "INFRA_STANDARD_CODE_ENTRY_RETIRE",
      entity: "StandardCodeEntry",
      entityId: entry.id,
      meta: { codeSetId, code: canon },
    });

    return updated;
  }

  async createMapping(principal: Principal, dto: CreateServiceCodeMappingDto, branchIdParam?: string | null) {
    const branchId = this.ctx.resolveBranchId(principal, branchIdParam ?? null);

    const svcItem = await this.ctx.prisma.serviceItem.findFirst({
      where: { id: dto.serviceItemId, branchId, isActive: true },
      select: { id: true },
    });
    if (!svcItem) throw new NotFoundException("Service item not found");

    const entry = await this.ctx.prisma.standardCodeEntry.findFirst({
      where: { id: dto.codeEntryId, isActive: true },
      select: { id: true, codeSetId: true },
    });
    if (!entry) throw new NotFoundException("Code entry not found");

    const isPrimary = dto.isPrimary === true;

    if (isPrimary) {
      await this.ctx.prisma.serviceItemStandardMapping.updateMany({
        where: { branchId, serviceItemId: dto.serviceItemId },
        data: { isPrimary: false },
      });
    }

    const mapping = await this.ctx.prisma.serviceItemStandardMapping.upsert({
      where: {
        branchId_serviceItemId_entryId: {
          branchId,
          serviceItemId: dto.serviceItemId,
          entryId: dto.codeEntryId,
        },
      },
      create: {
        branchId,
        serviceItemId: dto.serviceItemId,
        entryId: dto.codeEntryId,
        isPrimary,
      },
      update: {
        isPrimary,
      },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId ?? null,
      action: "INFRA_SERVICE_STANDARD_MAPPING_UPSERT",
      entity: "ServiceItemStandardMapping",
      entityId: mapping.id,
      meta: { serviceItemId: dto.serviceItemId, entryId: dto.codeEntryId, isPrimary },
    });

    return mapping;
  }

  async listMappings(
    principal: Principal,
    args: { branchId?: string | null; serviceItemId?: string | null; codeSetId?: string | null; q?: string },
  ) {
    const branchId = this.ctx.resolveBranchId(principal, args.branchId ?? null);
    const q = (args.q ?? "").trim();

    const where: any = {
      branchId,
      ...(args.serviceItemId ? { serviceItemId: args.serviceItemId } : {}),
      ...(args.codeSetId ? { entry: { codeSetId: args.codeSetId } } : {}),
      ...(q
        ? {
            OR: [
              { entry: { code: { contains: q, mode: "insensitive" } } },
              { entry: { display: { contains: q, mode: "insensitive" } } },
              { serviceItem: { code: { contains: q, mode: "insensitive" } } },
              { serviceItem: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    return this.ctx.prisma.serviceItemStandardMapping.findMany({
      where,
      include: {
        entry: { include: { codeSet: true } },
        serviceItem: { select: { id: true, code: true, name: true, category: true } },
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      take: 500,
    });
  }

  async deleteMapping(principal: Principal, id: string, branchIdParam?: string | null) {
    const branchId = this.ctx.resolveBranchId(principal, branchIdParam ?? null);
    const mapping = await this.ctx.prisma.serviceItemStandardMapping.findFirst({ where: { id, branchId } });
    if (!mapping) throw new NotFoundException("Mapping not found");

    await this.ctx.prisma.serviceItemStandardMapping.delete({ where: { id } });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId ?? null,
      action: "INFRA_SERVICE_STANDARD_MAPPING_DELETE",
      entity: "ServiceItemStandardMapping",
      entityId: id,
    });

    return { ok: true };
  }
}
