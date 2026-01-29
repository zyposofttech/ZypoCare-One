import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import type { Principal } from "./diagnostics.principal";
import { assertCode, assertName, normalizeCode, parseOptionalFloat, parseOptionalInt, resolveBranchId } from "./diagnostics.util";
import type { ApplyPackDto, CreatePackDto, CreatePackVersionDto, ListPackVersionsQuery, ListPacksQuery, UpdatePackDto, UpdatePackVersionDto } from "./dto";
import { DiagnosticPackVersionStatus } from "./dto";
import { DiagnosticTemplateKind } from "./diagnostics.types";
import type { DiagnosticKind, DiagnosticResultDataType } from "./diagnostics.types";

type PackPayload = {
  servicePoints?: Array<{
    code: string;
    name: string;
    type?: string;
    sortOrder?: number;
    notes?: string;
    requiresPlacement?: boolean;
  }>;
  sections?: Array<{ code: string; name: string; sortOrder?: number }>;
  categories?: Array<{ code: string; name: string; sectionCode: string; sortOrder?: number }>;
  specimens?: Array<{ code: string; name: string; container?: string; minVolumeMl?: number; handlingNotes?: string }>;
  items?: Array<{
    code: string;
    name: string;
    kind: DiagnosticKind;
    sectionCode: string;
    categoryCode?: string;
    specimenCode?: string;
    tatMinsRoutine?: number;
    tatMinsStat?: number;
    requiresAppointment?: boolean;
    preparationText?: string;
    consentRequired?: boolean;
    isPanel?: boolean;
    sortOrder?: number;
  }>;
  panelItems?: Array<{ panelCode: string; itemCode: string; sortOrder?: number }>;
  parameters?: Array<{
    itemCode: string;
    code: string;
    name: string;
    dataType: DiagnosticResultDataType;
    unit?: string;
    precision?: number;
    allowedText?: string;
    sortOrder?: number;
  }>;
  ranges?: Array<{
    itemCode: string;
    parameterCode: string;
    sex?: string;
    ageMinDays?: number;
    ageMaxDays?: number;
    low?: number;
    high?: number;
    textRange?: string;
    sortOrder?: number;
  }>;
  templates?: Array<{ itemCode: string; kind?: DiagnosticTemplateKind; name: string; body: string }>;
  capabilities?: Array<{
    servicePointCode: string;
    itemCode: string;
    modality?: string;
    defaultDurationMins?: number;
    isPrimary?: boolean;
  }>;
};

function safeArray<T>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

@Injectable()
export class DiagnosticsPacksService {
  constructor(@Inject("PRISMA") private readonly prisma: PrismaClient) {}

  async listPacks(principal: Principal, q: ListPacksQuery) {
    const where: any = {
      ...(q.includeInactive ? {} : { isActive: true }),
      ...(q.labType ? { labType: q.labType } : {}),
    };

    return this.prisma.diagnosticPack.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        versions: { orderBy: { version: "desc" }, take: 1 },
      },
    });
  }

  async createPack(principal: Principal, dto: CreatePackDto) {
    const code = assertCode(dto.code, "Pack");
    const name = assertName(dto.name, "Pack");

    return this.prisma.diagnosticPack.create({
      data: {
        code,
        name,
        labType: dto.labType?.trim() || null,
        description: dto.description?.trim() || null,
        isActive: true,
      },
    });
  }

  async updatePack(principal: Principal, id: string, dto: UpdatePackDto) {
    const existing = await this.prisma.diagnosticPack.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Pack not found");

    return this.prisma.diagnosticPack.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: assertName(dto.name, "Pack") } : {}),
        ...(dto.labType !== undefined ? { labType: dto.labType?.trim() || null } : {}),
        ...(dto.description !== undefined ? { description: dto.description ?? null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async listPackVersions(principal: Principal, packId: string, q: ListPackVersionsQuery) {
    const pack = await this.prisma.diagnosticPack.findUnique({ where: { id: packId }, select: { id: true } });
    if (!pack) throw new NotFoundException("Pack not found");

    return this.prisma.diagnosticPackVersion.findMany({
      where: { packId, ...(q.status ? { status: q.status } : {}) },
      orderBy: [{ version: "desc" }],
    });
  }

  async createPackVersion(principal: Principal, packId: string, dto: CreatePackVersionDto) {
    const pack = await this.prisma.diagnosticPack.findUnique({ where: { id: packId }, select: { id: true } });
    if (!pack) throw new NotFoundException("Pack not found");

    let version = dto.version;
    if (!version) {
      const max = await this.prisma.diagnosticPackVersion.aggregate({ where: { packId }, _max: { version: true } });
      version = (max._max.version ?? 0) + 1;
    }

    return this.prisma.diagnosticPackVersion.create({
      data: {
        packId,
        version,
        status: dto.status ?? DiagnosticPackVersionStatus.DRAFT,
        notes: dto.notes?.trim() || null,
        payload: dto.payload,
        createdByUserId: principal?.userId ?? null,
      },
    });
  }

  async updatePackVersion(principal: Principal, id: string, dto: UpdatePackVersionDto) {
    const existing = await this.prisma.diagnosticPackVersion.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Pack version not found");

    return this.prisma.diagnosticPackVersion.update({
      where: { id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes ?? null } : {}),
        ...(dto.payload !== undefined ? { payload: dto.payload } : {}),
      },
    });
  }

  async applyPack(principal: Principal, dto: ApplyPackDto) {
    const branchId = resolveBranchId(principal, dto.branchId);

    const version = await this.prisma.diagnosticPackVersion.findUnique({
      where: { id: dto.packVersionId },
      include: { pack: true },
    });
    if (!version) throw new NotFoundException("Pack version not found");
    if (version.status !== DiagnosticPackVersionStatus.ACTIVE) {
      throw new BadRequestException("Only ACTIVE pack versions can be applied");
    }

    const payload = (version.payload ?? {}) as PackPayload;
    const servicePoints = safeArray<NonNullable<PackPayload["servicePoints"]>[number]>(payload.servicePoints);
    const sections = safeArray<NonNullable<PackPayload["sections"]>[number]>(payload.sections);
    const categories = safeArray<NonNullable<PackPayload["categories"]>[number]>(payload.categories);
    const specimens = safeArray<NonNullable<PackPayload["specimens"]>[number]>(payload.specimens);
    const items = safeArray<NonNullable<PackPayload["items"]>[number]>(payload.items);
    const panelItems = safeArray<NonNullable<PackPayload["panelItems"]>[number]>(payload.panelItems);
    const parameters = safeArray<NonNullable<PackPayload["parameters"]>[number]>(payload.parameters);
    const ranges = safeArray<NonNullable<PackPayload["ranges"]>[number]>(payload.ranges);
    const templates = safeArray<NonNullable<PackPayload["templates"]>[number]>(payload.templates);
    const capabilities = safeArray<NonNullable<PackPayload["capabilities"]>[number]>(payload.capabilities);

    const placements = new Map<string, string>();
    for (const p of dto.placements ?? []) {
      placements.set(normalizeCode(p.servicePointCode), p.locationNodeId);
    }

    for (const sp of servicePoints) {
      const code = normalizeCode(sp.code);
      const requiresPlacement = sp.requiresPlacement !== false;
      if (requiresPlacement && !placements.get(code)) {
        throw new BadRequestException(`Missing placement for servicePointCode=${code}`);
      }
      const locId = placements.get(code);
      if (locId) {
        const node = await this.prisma.locationNode.findFirst({
          where: { id: locId, branchId },
          select: { id: true },
        });
        if (!node) throw new BadRequestException(`Invalid locationNodeId for ${code}`);
      }
    }

    const summary = {
      servicePoints: 0,
      sections: 0,
      categories: 0,
      specimens: 0,
      items: 0,
      panelItems: 0,
      parameters: 0,
      ranges: 0,
      templates: 0,
      capabilities: 0,
    };

    return this.prisma.$transaction(async (tx) => {
      const sectionByCode = new Map<string, string>();
      const categoryByCode = new Map<string, string>();
      const specimenByCode = new Map<string, string>();
      const itemByCode = new Map<string, string>();
      const parameterByKey = new Map<string, string>();
      const servicePointByCode = new Map<string, string>();

      for (const sp of servicePoints) {
        const code = assertCode(sp.code, "Service point");
        const name = assertName(sp.name, "Service point");
        const locId = placements.get(code);
        if (!locId) throw new BadRequestException(`Missing placement for servicePointCode=${code}`);

        const row = await tx.diagnosticServicePoint.upsert({
          where: { branchId_code: { branchId, code } },
          create: {
            branchId,
            locationNodeId: locId,
            unitId: null,
            code,
            name,
            type: (sp.type ?? "OTHER") as any,
            sortOrder: parseOptionalInt(sp.sortOrder) ?? 0,
            notes: sp.notes?.trim() || null,
            isActive: true,
          },
          update: {
            name,
            type: (sp.type ?? "OTHER") as any,
            sortOrder: parseOptionalInt(sp.sortOrder) ?? 0,
            notes: sp.notes?.trim() || null,
            locationNodeId: locId,
            isActive: true,
          },
        });
        servicePointByCode.set(code, row.id);
        summary.servicePoints++;
      }

      for (const s of sections) {
        const code = assertCode(s.code, "Section");
        const name = assertName(s.name, "Section");
        const row = await tx.diagnosticSection.upsert({
          where: { branchId_code: { branchId, code } },
          create: { branchId, code, name, sortOrder: parseOptionalInt(s.sortOrder) ?? 0, isActive: true },
          update: { name, sortOrder: parseOptionalInt(s.sortOrder) ?? 0, isActive: true },
        });
        sectionByCode.set(code, row.id);
        summary.sections++;
      }

      for (const c of categories) {
        const code = assertCode(c.code, "Category");
        const name = assertName(c.name, "Category");
        const sectionId = sectionByCode.get(normalizeCode(c.sectionCode));
        if (!sectionId) throw new BadRequestException(`Invalid sectionCode for category=${code}`);

        const row = await tx.diagnosticCategory.upsert({
          where: { branchId_code: { branchId, code } },
          create: { branchId, sectionId, code, name, sortOrder: parseOptionalInt(c.sortOrder) ?? 0, isActive: true },
          update: { sectionId, name, sortOrder: parseOptionalInt(c.sortOrder) ?? 0, isActive: true },
        });
        categoryByCode.set(code, row.id);
        summary.categories++;
      }

      for (const s of specimens) {
        const code = assertCode(s.code, "Specimen");
        const name = assertName(s.name, "Specimen");
        const row = await tx.specimenType.upsert({
          where: { branchId_code: { branchId, code } },
          create: {
            branchId,
            code,
            name,
            container: s.container?.trim() || null,
            minVolumeMl: parseOptionalFloat(s.minVolumeMl),
            handlingNotes: s.handlingNotes?.trim() || null,
            isActive: true,
          },
          update: {
            name,
            container: s.container?.trim() || null,
            minVolumeMl: parseOptionalFloat(s.minVolumeMl),
            handlingNotes: s.handlingNotes?.trim() || null,
            isActive: true,
          },
        });
        specimenByCode.set(code, row.id);
        summary.specimens++;
      }

      for (const i of items) {
        const code = assertCode(i.code, "Item");
        const name = assertName(i.name, "Item");
        const sectionId = sectionByCode.get(normalizeCode(i.sectionCode));
        if (!sectionId) throw new BadRequestException(`Invalid sectionCode for item=${code}`);
        const categoryId = i.categoryCode ? categoryByCode.get(normalizeCode(i.categoryCode)) ?? null : null;
        const specimenId = i.specimenCode ? specimenByCode.get(normalizeCode(i.specimenCode)) ?? null : null;

        const row = await tx.diagnosticItem.upsert({
          where: { branchId_code: { branchId, code } },
          create: {
            branchId,
            code,
            name,
            kind: i.kind,
            sectionId,
            categoryId,
            specimenId,
            tatMinsRoutine: parseOptionalInt(i.tatMinsRoutine),
            tatMinsStat: parseOptionalInt(i.tatMinsStat),
            requiresAppointment: i.requiresAppointment ?? false,
            preparationText: i.preparationText?.trim() || null,
            consentRequired: i.consentRequired ?? false,
            isPanel: i.isPanel ?? false,
            sortOrder: parseOptionalInt(i.sortOrder) ?? 0,
            isActive: true,
          },
          update: {
            name,
            kind: i.kind,
            sectionId,
            categoryId,
            specimenId,
            tatMinsRoutine: parseOptionalInt(i.tatMinsRoutine),
            tatMinsStat: parseOptionalInt(i.tatMinsStat),
            requiresAppointment: i.requiresAppointment ?? false,
            preparationText: i.preparationText?.trim() || null,
            consentRequired: i.consentRequired ?? false,
            isPanel: i.isPanel ?? false,
            sortOrder: parseOptionalInt(i.sortOrder) ?? 0,
            isActive: true,
          },
        });
        itemByCode.set(code, row.id);
        summary.items++;
      }

      const panelGroups = new Map<string, Array<{ itemCode: string; sortOrder?: number }>>();
      for (const p of panelItems) {
        const panelCode = normalizeCode(p.panelCode);
        const list = panelGroups.get(panelCode) ?? [];
        list.push({ itemCode: normalizeCode(p.itemCode), sortOrder: p.sortOrder });
        panelGroups.set(panelCode, list);
      }

      for (const [panelCode, items] of panelGroups.entries()) {
        const panelId = itemByCode.get(panelCode);
        if (!panelId) throw new BadRequestException(`Invalid panelCode=${panelCode}`);
        await tx.diagnosticPanelItem.updateMany({ where: { panelId }, data: { isActive: false } });

        for (let i = 0; i < items.length; i++) {
          const itCode = items[i].itemCode;
          const itemId = itemByCode.get(itCode);
          if (!itemId) throw new BadRequestException(`Invalid panel item code=${itCode}`);
          await tx.diagnosticPanelItem.upsert({
            where: { panelId_itemId: { panelId, itemId } },
            create: { panelId, itemId, sortOrder: parseOptionalInt(items[i].sortOrder) ?? i, isActive: true },
            update: { sortOrder: parseOptionalInt(items[i].sortOrder) ?? i, isActive: true },
          });
          summary.panelItems++;
        }
      }

      for (const p of parameters) {
        const itemId = itemByCode.get(normalizeCode(p.itemCode));
        if (!itemId) throw new BadRequestException(`Invalid itemCode for parameter=${p.code}`);
        const code = assertCode(p.code, "Parameter");
        const name = assertName(p.name, "Parameter");

        const row = await tx.diagnosticParameter.upsert({
          where: { testId_code: { testId: itemId, code } },
          create: {
            testId: itemId,
            code,
            name,
            dataType: p.dataType,
            unit: p.unit?.trim() || null,
            precision: parseOptionalInt(p.precision),
            allowedText: p.allowedText?.trim() || null,
            criticalLow: parseOptionalFloat((p as any).criticalLow),
            criticalHigh: parseOptionalFloat((p as any).criticalHigh),
            sortOrder: parseOptionalInt(p.sortOrder) ?? 0,
            isActive: true,
          },
          update: {
            name,
            dataType: p.dataType,
            unit: p.unit?.trim() || null,
            precision: parseOptionalInt(p.precision),
            allowedText: p.allowedText?.trim() || null,
            criticalLow: parseOptionalFloat((p as any).criticalLow),
            criticalHigh: parseOptionalFloat((p as any).criticalHigh),
            sortOrder: parseOptionalInt(p.sortOrder) ?? 0,
            isActive: true,
          },
        });
        parameterByKey.set(`${normalizeCode(p.itemCode)}::${code}`, row.id);
        summary.parameters++;
      }

      for (const r of ranges) {
        const key = `${normalizeCode(r.itemCode)}::${normalizeCode(r.parameterCode)}`;
        const parameterId = parameterByKey.get(key);
        if (!parameterId) throw new BadRequestException(`Invalid parameterCode for range=${r.parameterCode}`);

        const existing = await tx.diagnosticReferenceRange.findFirst({
          where: {
            parameterId,
            sex: r.sex ?? null,
            ageMinDays: parseOptionalInt(r.ageMinDays) ?? null,
            ageMaxDays: parseOptionalInt(r.ageMaxDays) ?? null,
            low: parseOptionalFloat(r.low),
            high: parseOptionalFloat(r.high),
            textRange: r.textRange ?? null,
          },
          select: { id: true },
        });

        if (existing) {
          await tx.diagnosticReferenceRange.update({
            where: { id: existing.id },
            data: {
              isActive: true,
              sortOrder: parseOptionalInt(r.sortOrder) ?? 0,
              notes: (r as any).notes ? String((r as any).notes).trim() : null,
            },
          });
        } else {
          await tx.diagnosticReferenceRange.create({
            data: {
              parameterId,
              sex: r.sex ?? null,
              ageMinDays: parseOptionalInt(r.ageMinDays),
              ageMaxDays: parseOptionalInt(r.ageMaxDays),
              low: parseOptionalFloat(r.low),
              high: parseOptionalFloat(r.high),
              textRange: r.textRange ?? null,
              notes: (r as any).notes ? String((r as any).notes).trim() : null,
              sortOrder: parseOptionalInt(r.sortOrder) ?? 0,
              isActive: true,
            },
          });
        }
        summary.ranges++;
      }

      for (const t of templates) {
        const itemId = itemByCode.get(normalizeCode(t.itemCode));
        if (!itemId) throw new BadRequestException(`Invalid itemCode for template=${t.name}`);
        const name = assertName(t.name, "Template", 200);
        const kind = t.kind ?? DiagnosticTemplateKind.IMAGING_REPORT;

        const existing = await tx.diagnosticTemplate.findFirst({
          where: { itemId, name, kind },
          select: { id: true },
        });

        if (existing) {
          await tx.diagnosticTemplate.update({
            where: { id: existing.id },
            data: { body: t.body, isActive: true },
          });
        } else {
          await tx.diagnosticTemplate.create({
            data: { itemId, name, kind, body: t.body, isActive: true },
          });
        }
        summary.templates++;
      }

      for (const c of capabilities) {
        const servicePointId = servicePointByCode.get(normalizeCode(c.servicePointCode));
        if (!servicePointId) throw new BadRequestException(`Invalid servicePointCode=${c.servicePointCode}`);
        const itemId = itemByCode.get(normalizeCode(c.itemCode));
        if (!itemId) throw new BadRequestException(`Invalid itemCode for capability=${c.itemCode}`);

        await tx.diagnosticCapability.upsert({
          where: { servicePointId_diagnosticItemId: { servicePointId, diagnosticItemId: itemId } },
          create: {
            branchId,
            servicePointId,
            diagnosticItemId: itemId,
            modality: (c.modality ?? null) as any,
            defaultDurationMins: parseOptionalInt(c.defaultDurationMins),
            isPrimary: c.isPrimary ?? false,
            isActive: true,
          },
          update: {
            modality: (c.modality ?? null) as any,
            defaultDurationMins: parseOptionalInt(c.defaultDurationMins),
            isPrimary: c.isPrimary ?? false,
            isActive: true,
          },
        });
        summary.capabilities++;
      }

      return {
        packId: version.packId,
        packVersionId: version.id,
        branchId,
        summary,
      };
    });
  }
}
