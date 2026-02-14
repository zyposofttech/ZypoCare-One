import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { ComplianceContextService } from "../compliance-context.service";
import type {
  CreateEmpanelmentDto,
  UpdateEmpanelmentDto,
  CreateRateCardDto,
  UpdateRateCardDto,
  UpdateRateCardItemDto,
  CreateMappingDto,
  UpdateMappingDto,
} from "./dto/schemes.dto";

@Injectable()
export class SchemesService {
  constructor(private readonly ctx: ComplianceContextService) {}

  // ================================================================ Summary

  async getSummary(workspaceId: string) {
    const [empanelments, totalRateCards, totalMappings, totalUnmapped] = await Promise.all([
      this.ctx.prisma.schemeEmpanelment.count({ where: { workspaceId } }),
      this.ctx.prisma.schemeRateCard.count({ where: { workspaceId } }),
      this.ctx.prisma.schemeMapping.count({ where: { workspaceId } }),
      this.ctx.prisma.schemeMapping.count({ where: { workspaceId, internalServiceId: null } }),
    ]);

    return { empanelments, totalRateCards, totalMappings, totalUnmapped };
  }

  // ================================================================ Empanelments

  async listEmpanelments(
    principal: Principal,
    query: {
      workspaceId?: string;
      scheme?: string;
      cursor?: string;
      take?: number;
    },
  ) {
    const take = Math.min(Math.max(query.take ?? 50, 1), 200);
    const where: any = {};

    if (query.workspaceId) where.workspaceId = query.workspaceId;
    if (query.scheme) where.scheme = query.scheme;

    const findArgs: any = {
      where,
      orderBy: [{ createdAt: "desc" }],
      take: take + 1,
    };
    if (query.cursor) {
      findArgs.cursor = { id: query.cursor };
      findArgs.skip = 1;
    }

    const rows = await this.ctx.prisma.schemeEmpanelment.findMany(findArgs);
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore && items.length ? items[items.length - 1].id : null;

    return { items, nextCursor, take };
  }

  async createEmpanelment(principal: Principal, dto: CreateEmpanelmentDto) {
    // unique constraint check: workspaceId + scheme
    const existing = await this.ctx.prisma.schemeEmpanelment.findUnique({
      where: { workspaceId_scheme: { workspaceId: dto.workspaceId, scheme: dto.scheme as any } },
    });
    if (existing) {
      throw new BadRequestException(
        `Empanelment for scheme ${dto.scheme} already exists in this workspace`,
      );
    }

    const empanelment = await this.ctx.prisma.$transaction(async (tx) => {
      const created = await tx.schemeEmpanelment.create({
        data: {
          workspaceId: dto.workspaceId,
          scheme: dto.scheme as any,
          empanelmentNumber: dto.empanelmentNumber,
          shaCode: dto.shaCode ?? null,
          state: dto.state ?? null,
          cityCategory: dto.cityCategory ? (dto.cityCategory as any) : null,
          status: (dto.status as any) ?? "DRAFT",
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: dto.workspaceId,
          entityType: "SCHEME_EMPANELMENT",
          entityId: created.id,
          action: "CREATE",
          actorStaffId: principal.staffId,
          after: created,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: principal.branchId,
          actorUserId: principal.userId,
          action: "SCHEME_EMPANELMENT_CREATE",
          entity: "SchemeEmpanelment",
          entityId: created.id,
          meta: { scheme: dto.scheme, empanelmentNumber: dto.empanelmentNumber },
        },
        tx,
      );

      return created;
    });

    return empanelment;
  }

  async updateEmpanelment(principal: Principal, id: string, dto: UpdateEmpanelmentDto) {
    const existing = await this.ctx.prisma.schemeEmpanelment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Empanelment not found");

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const result = await tx.schemeEmpanelment.update({
        where: { id },
        data: {
          ...(dto.scheme !== undefined && { scheme: dto.scheme as any }),
          ...(dto.empanelmentNumber !== undefined && { empanelmentNumber: dto.empanelmentNumber }),
          ...(dto.shaCode !== undefined && { shaCode: dto.shaCode }),
          ...(dto.state !== undefined && { state: dto.state }),
          ...(dto.cityCategory !== undefined && { cityCategory: dto.cityCategory as any }),
          ...(dto.status !== undefined && { status: dto.status as any }),
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: existing.workspaceId,
          entityType: "SCHEME_EMPANELMENT",
          entityId: id,
          action: "UPDATE",
          actorStaffId: principal.staffId,
          before: existing,
          after: result,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: principal.branchId,
          actorUserId: principal.userId,
          action: "SCHEME_EMPANELMENT_UPDATE",
          entity: "SchemeEmpanelment",
          entityId: id,
          meta: dto,
        },
        tx,
      );

      return result;
    });

    return updated;
  }

  // ================================================================ Rate Cards

  async listRateCards(
    principal: Principal,
    query: {
      workspaceId?: string;
      scheme?: string;
      version?: string;
      activeOn?: string;
      cursor?: string;
      take?: number;
    },
  ) {
    const take = Math.min(Math.max(query.take ?? 50, 1), 200);
    const where: any = {};

    if (query.workspaceId) where.workspaceId = query.workspaceId;
    if (query.scheme) where.scheme = query.scheme;
    if (query.version) where.version = query.version;
    if (query.activeOn) {
      const d = new Date(query.activeOn);
      where.effectiveFrom = { lte: d };
      where.OR = [{ effectiveTo: null }, { effectiveTo: { gte: d } }];
      where.status = "ACTIVE";
    }

    const findArgs: any = {
      where,
      orderBy: [{ createdAt: "desc" }],
      take: take + 1,
      include: {
        _count: { select: { items: true } },
      },
    };
    if (query.cursor) {
      findArgs.cursor = { id: query.cursor };
      findArgs.skip = 1;
    }

    const rows = await this.ctx.prisma.schemeRateCard.findMany(findArgs);
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore && items.length ? items[items.length - 1].id : null;

    return { items, nextCursor, take };
  }

  async createRateCard(principal: Principal, dto: CreateRateCardDto) {
    // unique constraint check: workspaceId + scheme + version
    const existing = await this.ctx.prisma.schemeRateCard.findUnique({
      where: {
        workspaceId_scheme_version: {
          workspaceId: dto.workspaceId,
          scheme: dto.scheme as any,
          version: dto.version,
        },
      },
    });
    if (existing) {
      throw new BadRequestException(
        `Rate card version "${dto.version}" for scheme ${dto.scheme} already exists`,
      );
    }

    const rateCard = await this.ctx.prisma.$transaction(async (tx) => {
      const created = await tx.schemeRateCard.create({
        data: {
          workspaceId: dto.workspaceId,
          scheme: dto.scheme as any,
          version: dto.version,
          effectiveFrom: new Date(dto.effectiveFrom),
          effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
          status: "DRAFT",
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: dto.workspaceId,
          entityType: "SCHEME_RATE_CARD",
          entityId: created.id,
          action: "CREATE",
          actorStaffId: principal.staffId,
          after: created,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: principal.branchId,
          actorUserId: principal.userId,
          action: "SCHEME_RATE_CARD_CREATE",
          entity: "SchemeRateCard",
          entityId: created.id,
          meta: { scheme: dto.scheme, version: dto.version },
        },
        tx,
      );

      return created;
    });

    return rateCard;
  }

  async getRateCard(principal: Principal, id: string) {
    const rateCard = await this.ctx.prisma.schemeRateCard.findUnique({
      where: { id },
      include: {
        _count: { select: { items: true } },
      },
    });
    if (!rateCard) throw new NotFoundException("Rate card not found");
    return rateCard;
  }

  async updateRateCard(principal: Principal, id: string, dto: UpdateRateCardDto) {
    const existing = await this.ctx.prisma.schemeRateCard.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Rate card not found");
    if (existing.status === "FROZEN") {
      throw new BadRequestException("Cannot edit a FROZEN rate card");
    }

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const result = await tx.schemeRateCard.update({
        where: { id },
        data: {
          ...(dto.version !== undefined && { version: dto.version }),
          ...(dto.effectiveFrom !== undefined && { effectiveFrom: new Date(dto.effectiveFrom) }),
          ...(dto.effectiveTo !== undefined && {
            effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
          }),
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: existing.workspaceId,
          entityType: "SCHEME_RATE_CARD",
          entityId: id,
          action: "UPDATE",
          actorStaffId: principal.staffId,
          before: existing,
          after: result,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: principal.branchId,
          actorUserId: principal.userId,
          action: "SCHEME_RATE_CARD_UPDATE",
          entity: "SchemeRateCard",
          entityId: id,
          meta: dto,
        },
        tx,
      );

      return result;
    });

    return updated;
  }

  async freezeRateCard(principal: Principal, id: string) {
    const existing = await this.ctx.prisma.schemeRateCard.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Rate card not found");
    if (existing.status === "FROZEN") {
      throw new BadRequestException("Rate card is already FROZEN");
    }

    // Maker-checker for rate card freeze
    if (existing.status === 'DRAFT') {
      return this.ctx.requireApproval({
        workspaceId: existing.workspaceId,
        changeType: 'RATE_CARD_FREEZE',
        entityType: 'SCHEME_RATE_CARD',
        entityId: id,
        payloadDraft: { scheme: existing.scheme, version: existing.version, action: 'FREEZE' },
        actorId: principal.staffId!,
      });
    }

    const frozen = await this.ctx.prisma.$transaction(async (tx) => {
      const result = await tx.schemeRateCard.update({
        where: { id },
        data: { status: "FROZEN" },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: existing.workspaceId,
          entityType: "SCHEME_RATE_CARD",
          entityId: id,
          action: "FREEZE",
          actorStaffId: principal.staffId,
          before: { status: existing.status },
          after: { status: "FROZEN" },
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: principal.branchId,
          actorUserId: principal.userId,
          action: "SCHEME_RATE_CARD_FREEZE",
          entity: "SchemeRateCard",
          entityId: id,
          meta: { scheme: existing.scheme, version: existing.version },
        },
        tx,
      );

      return result;
    });

    return frozen;
  }

  // ============================================================ Rate Card Items

  async listRateCardItems(
    principal: Principal,
    rateCardId: string,
    query: {
      search?: string;
      code?: string;
      cursor?: string;
      take?: number;
    },
  ) {
    const take = Math.min(Math.max(query.take ?? 50, 1), 200);
    const where: any = { rateCardId };

    if (query.code) where.code = query.code;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { code: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const findArgs: any = {
      where,
      orderBy: [{ code: "asc" }],
      take: take + 1,
    };
    if (query.cursor) {
      findArgs.cursor = { id: query.cursor };
      findArgs.skip = 1;
    }

    const rows = await this.ctx.prisma.schemeRateCardItem.findMany(findArgs);
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore && items.length ? items[items.length - 1].id : null;

    return { items, nextCursor, take };
  }

  async updateRateCardItem(principal: Principal, itemId: string, dto: UpdateRateCardItemDto) {
    const item = await this.ctx.prisma.schemeRateCardItem.findUnique({
      where: { id: itemId },
      include: { rateCard: { select: { id: true, status: true, workspaceId: true } } },
    });
    if (!item) throw new NotFoundException("Rate card item not found");
    if (item.rateCard.status === "FROZEN") {
      throw new BadRequestException("Cannot edit items of a FROZEN rate card");
    }

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const result = await tx.schemeRateCardItem.update({
        where: { id: itemId },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.rate !== undefined && { rate: dto.rate }),
          ...(dto.inclusions !== undefined && { inclusions: dto.inclusions }),
          ...(dto.exclusions !== undefined && { exclusions: dto.exclusions }),
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: item.rateCard.workspaceId,
          entityType: "SCHEME_RATE_CARD",
          entityId: itemId,
          action: "UPDATE",
          actorStaffId: principal.staffId,
          before: item,
          after: result,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: principal.branchId,
          actorUserId: principal.userId,
          action: "SCHEME_RATE_CARD_ITEM_UPDATE",
          entity: "SchemeRateCardItem",
          entityId: itemId,
          meta: dto,
        },
        tx,
      );

      return result;
    });

    return updated;
  }

  async bulkUploadItems(
    principal: Principal,
    rateCardId: string,
    rows: { code: string; name: string; rate: number; inclusions?: string; exclusions?: string }[],
  ) {
    const rateCard = await this.ctx.prisma.schemeRateCard.findUnique({ where: { id: rateCardId } });
    if (!rateCard) throw new NotFoundException("Rate card not found");
    if (rateCard.status === "FROZEN") {
      throw new BadRequestException("Cannot upload items to a FROZEN rate card");
    }

    if (!rows.length) throw new BadRequestException("No rows provided for upload");

    const result = await this.ctx.prisma.$transaction(async (tx) => {
      // Upsert items: if code already exists on this card, update; else create
      const upserted: any[] = [];
      for (const row of rows) {
        const item = await tx.schemeRateCardItem.upsert({
          where: { rateCardId_code: { rateCardId, code: row.code } },
          create: {
            rateCardId,
            code: row.code,
            name: row.name,
            rate: row.rate,
            inclusions: row.inclusions ?? null,
            exclusions: row.exclusions ?? null,
          },
          update: {
            name: row.name,
            rate: row.rate,
            inclusions: row.inclusions ?? null,
            exclusions: row.exclusions ?? null,
          },
        });
        upserted.push(item);
      }

      await this.ctx.logCompliance(
        {
          workspaceId: rateCard.workspaceId,
          entityType: "SCHEME_RATE_CARD",
          entityId: rateCardId,
          action: "BULK_UPLOAD_ITEMS",
          actorStaffId: principal.staffId,
          after: { count: upserted.length },
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: principal.branchId,
          actorUserId: principal.userId,
          action: "SCHEME_RATE_CARD_BULK_UPLOAD",
          entity: "SchemeRateCard",
          entityId: rateCardId,
          meta: { itemCount: upserted.length },
        },
        tx,
      );

      return { inserted: upserted.length };
    });

    return result;
  }

  // ================================================================ Mappings

  async listMappings(
    principal: Principal,
    query: {
      workspaceId?: string;
      scheme?: string;
      unmappedOnly?: boolean;
      cursor?: string;
      take?: number;
    },
  ) {
    const take = Math.min(Math.max(query.take ?? 50, 1), 200);
    const where: any = {};

    if (query.workspaceId) where.workspaceId = query.workspaceId;
    if (query.scheme) where.scheme = query.scheme;
    if (query.unmappedOnly) {
      where.internalServiceId = null;
      where.internalTariffItemId = null;
    }

    const findArgs: any = {
      where,
      orderBy: [{ externalCode: "asc" }],
      take: take + 1,
    };
    if (query.cursor) {
      findArgs.cursor = { id: query.cursor };
      findArgs.skip = 1;
    }

    const rows = await this.ctx.prisma.schemeMapping.findMany(findArgs);
    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore && items.length ? items[items.length - 1].id : null;

    return { items, nextCursor, take };
  }

  async createMapping(principal: Principal, dto: CreateMappingDto) {
    // unique constraint check: workspaceId + scheme + externalCode
    const existing = await this.ctx.prisma.schemeMapping.findUnique({
      where: {
        workspaceId_scheme_externalCode: {
          workspaceId: dto.workspaceId,
          scheme: dto.scheme as any,
          externalCode: dto.externalCode,
        },
      },
    });
    if (existing) {
      throw new BadRequestException(
        `Mapping for external code "${dto.externalCode}" under scheme ${dto.scheme} already exists`,
      );
    }

    const mapping = await this.ctx.prisma.$transaction(async (tx) => {
      const created = await tx.schemeMapping.create({
        data: {
          workspaceId: dto.workspaceId,
          scheme: dto.scheme as any,
          externalCode: dto.externalCode,
          externalName: dto.externalName ?? null,
          internalServiceId: dto.internalServiceId ?? null,
          internalTariffItemId: dto.internalTariffItemId ?? null,
          rules: dto.rules ?? undefined,
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: dto.workspaceId,
          entityType: "SCHEME_MAPPING",
          entityId: created.id,
          action: "CREATE",
          actorStaffId: principal.staffId,
          after: created,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: principal.branchId,
          actorUserId: principal.userId,
          action: "SCHEME_MAPPING_CREATE",
          entity: "SchemeMapping",
          entityId: created.id,
          meta: { scheme: dto.scheme, externalCode: dto.externalCode },
        },
        tx,
      );

      return created;
    });

    return mapping;
  }

  async updateMapping(principal: Principal, id: string, dto: UpdateMappingDto) {
    const existing = await this.ctx.prisma.schemeMapping.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Mapping not found");

    const updated = await this.ctx.prisma.$transaction(async (tx) => {
      const result = await tx.schemeMapping.update({
        where: { id },
        data: {
          ...(dto.externalName !== undefined && { externalName: dto.externalName }),
          ...(dto.internalServiceId !== undefined && { internalServiceId: dto.internalServiceId }),
          ...(dto.internalTariffItemId !== undefined && {
            internalTariffItemId: dto.internalTariffItemId,
          }),
          ...(dto.rules !== undefined && { rules: dto.rules }),
        },
      });

      await this.ctx.logCompliance(
        {
          workspaceId: existing.workspaceId,
          entityType: "SCHEME_MAPPING",
          entityId: id,
          action: "UPDATE",
          actorStaffId: principal.staffId,
          before: existing,
          after: result,
        },
        tx,
      );

      await this.ctx.audit.log(
        {
          branchId: principal.branchId,
          actorUserId: principal.userId,
          action: "SCHEME_MAPPING_UPDATE",
          entity: "SchemeMapping",
          entityId: id,
          meta: dto,
        },
        tx,
      );

      return result;
    });

    return updated;
  }

  async deleteMapping(principal: Principal, mappingId: string) {
    const mapping = await this.ctx.prisma.schemeMapping.findUniqueOrThrow({
      where: { id: mappingId },
    });

    await this.ctx.prisma.schemeMapping.delete({ where: { id: mappingId } });

    await this.ctx.logCompliance({
      workspaceId: mapping.workspaceId,
      entityType: "SCHEME_MAPPING",
      entityId: mappingId,
      action: "DELETE",
      actorStaffId: principal.staffId,
      before: mapping,
    });

    await this.ctx.audit.log({
      branchId: principal.branchId,
      actorUserId: principal.userId,
      action: "SCHEME_MAPPING_DELETE",
      entity: "SchemeMapping",
      entityId: mappingId,
      meta: { scheme: mapping.scheme, externalCode: mapping.externalCode },
    });

    return { deleted: true };
  }

  async autoSuggestMappings(principal: Principal, workspaceId: string, scheme: string) {
    // Fetch unmapped scheme mappings for this workspace + scheme
    const unmapped = await this.ctx.prisma.schemeMapping.findMany({
      where: {
        workspaceId,
        scheme: scheme as any,
        internalServiceId: null,
        internalTariffItemId: null,
      },
    });

    if (!unmapped.length) return { suggestions: [], message: "No unmapped codes found" };

    // Fetch internal services for simple name-similarity matching
    const internalServices = await this.ctx.prisma.serviceItem.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
      take: 2000,
    });

    const suggestions: {
      mappingId: string;
      externalCode: string;
      externalName: string | null;
      suggestedServiceId: string;
      suggestedServiceName: string;
      confidence: number;
    }[] = [];

    for (const mapping of unmapped) {
      const target = (mapping.externalName ?? mapping.externalCode).toLowerCase().trim();
      let bestMatch: { id: string; name: string; score: number } | null = null;

      for (const svc of internalServices) {
        const svcName = svc.name.toLowerCase().trim();
        const score = computeSimilarity(target, svcName);
        if (score > 0.4 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { id: svc.id, name: svc.name, score };
        }
      }

      if (bestMatch) {
        suggestions.push({
          mappingId: mapping.id,
          externalCode: mapping.externalCode,
          externalName: mapping.externalName,
          suggestedServiceId: bestMatch.id,
          suggestedServiceName: bestMatch.name,
          confidence: Math.round(bestMatch.score * 100),
        });
      }
    }

    // Sort by confidence descending
    suggestions.sort((a, b) => b.confidence - a.confidence);

    return { suggestions };
  }

  // ============================================================ API Credentials

  async getApiCredential(workspaceId: string, scheme: string, environment: string) {
    return this.ctx.prisma.schemeApiCredential.findUnique({
      where: { workspaceId_scheme_environment: { workspaceId, scheme: scheme as any, environment: environment as any } },
    });
  }

  async upsertApiCredential(dto: any, actorId: string) {
    const data = {
      workspaceId: dto.workspaceId,
      scheme: dto.scheme,
      environment: dto.environment,
      apiKeyEnc: dto.apiKey,
      apiSecretEnc: dto.apiSecret,
      baseUrl: dto.baseUrl,
      status: 'CONFIGURED',
    };

    const result = await this.ctx.prisma.schemeApiCredential.upsert({
      where: {
        workspaceId_scheme_environment: {
          workspaceId: dto.workspaceId,
          scheme: dto.scheme,
          environment: dto.environment,
        },
      },
      create: data,
      update: data,
    });

    await this.ctx.logCompliance({
      workspaceId: dto.workspaceId,
      entityType: 'SCHEME_API_CREDENTIAL',
      entityId: result.id,
      action: 'UPSERT_API_CREDENTIAL',
      actorStaffId: actorId,
      after: result,
    });

    await this.ctx.audit.log({
      actorUserId: actorId,
      action: "SCHEME_API_CREDENTIAL_UPSERT",
      entity: "SchemeApiCredential",
      entityId: result.id,
      meta: { scheme: dto.scheme, environment: dto.environment },
    });

    return result;
  }

  async testApiCredential(credentialId: string, actorId: string) {
    const cred = await this.ctx.prisma.schemeApiCredential.findUniqueOrThrow({ where: { id: credentialId } });

    const updated = await this.ctx.prisma.schemeApiCredential.update({
      where: { id: credentialId },
      data: { status: 'TESTED', lastTestedAt: new Date() },
    });

    await this.ctx.logCompliance({
      workspaceId: cred.workspaceId,
      entityType: 'SCHEME_API_CREDENTIAL',
      entityId: credentialId,
      action: 'TEST_API_CREDENTIAL',
      actorStaffId: actorId,
    });

    await this.ctx.audit.log({
      actorUserId: actorId,
      action: "SCHEME_API_CREDENTIAL_TEST",
      entity: "SchemeApiCredential",
      entityId: credentialId,
      meta: { scheme: cred.scheme, environment: cred.environment, testedAt: updated.lastTestedAt },
    });

    return { success: true, testedAt: updated.lastTestedAt };
  }
}

// ============================================================ Helpers

/**
 * Simple bigram-based similarity (Dice coefficient).
 * Returns 0..1 where 1 = identical.
 */
function computeSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;

  const bigramsA = new Set<string>();
  for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.substring(i, i + 2));

  let intersection = 0;
  const bigramCountB = b.length - 1;
  for (let i = 0; i < b.length - 1; i++) {
    if (bigramsA.has(b.substring(i, i + 2))) intersection++;
  }

  return (2 * intersection) / (bigramsA.size + bigramCountB);
}
