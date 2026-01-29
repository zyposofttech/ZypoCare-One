import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import type { Principal } from "./diagnostics.principal";
import { assertCode, assertName, parseOptionalFloat, parseOptionalInt, resolveBranchId } from "./diagnostics.util";
import {
  CreateCategoryDto,
  CreateDiagnosticItemDto,
  CreateParameterDto,
  CreateReferenceRangeDto,
  CreateSectionDto,
  CreateSpecimenDto,
  CreateTemplateDto,
  ListCategoriesQuery,
  ListItemsQuery,
  ListSectionsQuery,
  ListSpecimensQuery,
  ReplacePanelItemsDto,
  UpdateCategoryDto,
  UpdateDiagnosticItemDto,
  UpdateParameterDto,
  UpdateReferenceRangeDto,
  UpdateSectionDto,
  UpdateSpecimenDto,
  UpdateTemplateDto,
} from "./dto";
import { DiagnosticKind, DiagnosticTemplateKind } from "./diagnostics.types";

@Injectable()
export class DiagnosticsConfigService {
  constructor(@Inject("PRISMA") private readonly prisma: PrismaClient) {}

  private async assertServiceItemForBranch(branchId: string, serviceItemId: string) {
    const row = await this.prisma.serviceItem.findFirst({
      where: { id: serviceItemId, branchId, isActive: true },
      select: { id: true },
    });
    if (!row) throw new BadRequestException("Invalid serviceItemId for this branch");
  }

  /**
   * Prevent panel composition cycles:
   * Adding edge (panelId -> itemId) is invalid if panelId is reachable from itemId.
   */
  private async assertNoPanelCycle(panelId: string, itemIds: string[]) {
    if (!itemIds.length) return;

    const candidates = await this.prisma.diagnosticItem.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, isPanel: true },
    });
    const isPanel = new Map(candidates.map((c) => [c.id, c.isPanel] as const));

    for (const startId of itemIds) {
      if (!isPanel.get(startId)) continue; // non-panels cannot have children

      const visited = new Set<string>();
      let frontier: string[] = [startId];

      while (frontier.length) {
        const batch = frontier.filter((x) => !visited.has(x));
        frontier = [];
        for (const x of batch) visited.add(x);
        if (!batch.length) break;

        const edges = await this.prisma.diagnosticPanelItem.findMany({
          where: { panelId: { in: batch }, isActive: true },
          select: { itemId: true, item: { select: { isPanel: true } } },
        });

        for (const e of edges) {
          if (e.itemId === panelId) {
            throw new BadRequestException("Invalid panel composition: cycle detected (nested panel loop)");
          }
          if (e.item?.isPanel && !visited.has(e.itemId)) frontier.push(e.itemId);
        }
      }
    }
  }

  // ---------------- Sections ----------------
  async listSections(principal: Principal, q: ListSectionsQuery) {
    const branchId = resolveBranchId(principal, q.branchId);
    const where: any = {
      branchId,
      ...(q.includeInactive ? {} : { isActive: true }),
      ...(q.q
        ? {
            OR: [
              { code: { contains: String(q.q).trim(), mode: "insensitive" } },
              { name: { contains: String(q.q).trim(), mode: "insensitive" } },
            ],
          }
        : {}),
    };

    return this.prisma.diagnosticSection.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { categories: true, items: true } } },
    });
  }

  async createSection(principal: Principal, dto: CreateSectionDto) {
    const branchId = resolveBranchId(principal, dto.branchId);
    const code = assertCode(dto.code, "Section");
    const name = assertName(dto.name, "Section");

    return this.prisma.diagnosticSection.upsert({
      where: { branchId_code: { branchId, code } },
      create: { branchId, code, name, sortOrder: dto.sortOrder ?? 0, isActive: true },
      update: { name, sortOrder: dto.sortOrder ?? 0, isActive: true },
    });
  }

  async updateSection(principal: Principal, id: string, dto: UpdateSectionDto) {
    const existing = await this.prisma.diagnosticSection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Section not found");

    const branchId = resolveBranchId(principal, dto.branchId ?? existing.branchId);
    if (existing.branchId !== branchId) throw new BadRequestException("Invalid branchId for this section");

    return this.prisma.diagnosticSection.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: assertCode(dto.code, "Section") } : {}),
        ...(dto.name !== undefined ? { name: assertName(dto.name, "Section") } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deleteSection(principal: Principal, id: string, branchId?: string) {
    const existing = await this.prisma.diagnosticSection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Section not found");
    const b = resolveBranchId(principal, branchId ?? existing.branchId);
    if (existing.branchId !== b) throw new BadRequestException("Invalid branchId for this section");
    return this.prisma.diagnosticSection.update({ where: { id }, data: { isActive: false } });
  }

  // ---------------- Categories ----------------
  async listCategories(principal: Principal, q: ListCategoriesQuery) {
    const branchId = resolveBranchId(principal, q.branchId);

    const where: any = {
      branchId,
      ...(q.sectionId ? { sectionId: q.sectionId } : {}),
      ...(q.includeInactive ? {} : { isActive: true }),
      ...(q.q
        ? {
            OR: [
              { code: { contains: String(q.q).trim(), mode: "insensitive" } },
              { name: { contains: String(q.q).trim(), mode: "insensitive" } },
            ],
          }
        : {}),
    };

    return this.prisma.diagnosticCategory.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { section: true, _count: { select: { items: true } } },
    });
  }

  async createCategory(principal: Principal, dto: CreateCategoryDto) {
    const branchId = resolveBranchId(principal, dto.branchId);
    const code = assertCode(dto.code, "Category");
    const name = assertName(dto.name, "Category");

    const section = await this.prisma.diagnosticSection.findFirst({ where: { id: dto.sectionId, branchId, isActive: true }, select: { id: true } });
    if (!section) throw new BadRequestException("Invalid sectionId for this branch");

    return this.prisma.diagnosticCategory.upsert({
      where: { branchId_code: { branchId, code } },
      create: { branchId, sectionId: dto.sectionId, code, name, sortOrder: dto.sortOrder ?? 0, isActive: true },
      update: { sectionId: dto.sectionId, name, sortOrder: dto.sortOrder ?? 0, isActive: true },
      include: { section: true },
    });
  }

  async updateCategory(principal: Principal, id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.diagnosticCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Category not found");

    const branchId = resolveBranchId(principal, dto.branchId ?? existing.branchId);
    if (existing.branchId !== branchId) throw new BadRequestException("Invalid branchId for this category");

    if (dto.sectionId !== undefined) {
      const section = await this.prisma.diagnosticSection.findFirst({ where: { id: dto.sectionId, branchId, isActive: true }, select: { id: true } });
      if (!section) throw new BadRequestException("Invalid sectionId for this branch");
    }

    return this.prisma.diagnosticCategory.update({
      where: { id },
      data: {
        ...(dto.sectionId !== undefined ? { sectionId: dto.sectionId } : {}),
        ...(dto.code !== undefined ? { code: assertCode(dto.code, "Category") } : {}),
        ...(dto.name !== undefined ? { name: assertName(dto.name, "Category") } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: { section: true },
    });
  }

  async deleteCategory(principal: Principal, id: string, branchId?: string) {
    const existing = await this.prisma.diagnosticCategory.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Category not found");
    const b = resolveBranchId(principal, branchId ?? existing.branchId);
    if (existing.branchId !== b) throw new BadRequestException("Invalid branchId for this category");
    return this.prisma.diagnosticCategory.update({ where: { id }, data: { isActive: false } });
  }

  // ---------------- Specimens ----------------
  async listSpecimens(principal: Principal, q: ListSpecimensQuery) {
    const branchId = resolveBranchId(principal, q.branchId);

    const where: any = {
      branchId,
      ...(q.includeInactive ? {} : { isActive: true }),
      ...(q.q
        ? {
            OR: [
              { code: { contains: String(q.q).trim(), mode: "insensitive" } },
              { name: { contains: String(q.q).trim(), mode: "insensitive" } },
            ],
          }
        : {}),
    };

    return this.prisma.specimenType.findMany({
      where,
      orderBy: [{ name: "asc" }],
      include: { _count: { select: { items: true } } },
    });
  }

  async createSpecimen(principal: Principal, dto: CreateSpecimenDto) {
    const branchId = resolveBranchId(principal, dto.branchId);
    const code = assertCode(dto.code, "Specimen");
    const name = assertName(dto.name, "Specimen");

    return this.prisma.specimenType.upsert({
      where: { branchId_code: { branchId, code } },
      create: {
        branchId,
        code,
        name,
        container: dto.container ?? null,
        minVolumeMl: dto.minVolumeMl !== undefined ? parseOptionalFloat(dto.minVolumeMl) : null,
        handlingNotes: dto.handlingNotes ?? null,
        isActive: true,
      },
      update: {
        name,
        container: dto.container ?? null,
        minVolumeMl: dto.minVolumeMl !== undefined ? parseOptionalFloat(dto.minVolumeMl) : null,
        handlingNotes: dto.handlingNotes ?? null,
        isActive: true,
      },
    });
  }

  async updateSpecimen(principal: Principal, id: string, dto: UpdateSpecimenDto) {
    const existing = await this.prisma.specimenType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Specimen not found");

    const branchId = resolveBranchId(principal, dto.branchId ?? existing.branchId);
    if (existing.branchId !== branchId) throw new BadRequestException("Invalid branchId for this specimen");

    return this.prisma.specimenType.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: assertCode(dto.code, "Specimen") } : {}),
        ...(dto.name !== undefined ? { name: assertName(dto.name, "Specimen") } : {}),
        ...(dto.container !== undefined ? { container: dto.container } : {}),
        ...(dto.minVolumeMl !== undefined ? { minVolumeMl: parseOptionalFloat(dto.minVolumeMl) } : {}),
        ...(dto.handlingNotes !== undefined ? { handlingNotes: dto.handlingNotes } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deleteSpecimen(principal: Principal, id: string, branchId?: string) {
    const existing = await this.prisma.specimenType.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Specimen not found");
    const b = resolveBranchId(principal, branchId ?? existing.branchId);
    if (existing.branchId !== b) throw new BadRequestException("Invalid branchId for this specimen");
    return this.prisma.specimenType.update({ where: { id }, data: { isActive: false } });
  }

  // ---------------- Items ----------------
  async listItems(principal: Principal, q: ListItemsQuery) {
    const branchId = resolveBranchId(principal, q.branchId);

    const where: any = {
      branchId,
      ...(q.kind ? { kind: q.kind } : {}),
      ...(q.sectionId ? { sectionId: q.sectionId } : {}),
      ...(q.categoryId ? { categoryId: q.categoryId } : {}),
      ...(q.isPanel !== undefined ? { isPanel: q.isPanel } : {}),
      ...(q.includeInactive ? {} : { isActive: true }),
      ...(q.q
        ? {
            OR: [
              { code: { contains: String(q.q).trim(), mode: "insensitive" } },
              { name: { contains: String(q.q).trim(), mode: "insensitive" } },
            ],
          }
        : {}),
    };

    return this.prisma.diagnosticItem.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        section: true,
        category: true,
        specimen: true,
        serviceItem: { select: { id: true, code: true, name: true, type: true, isActive: true } },
        _count: { select: { parameters: true, templates: true, panelChildren: true, panelParents: true } },
      },
    });
  }

  async createItem(principal: Principal, dto: CreateDiagnosticItemDto) {
    const branchId = resolveBranchId(principal, dto.branchId);
    const code = assertCode(dto.code, "Item");
    const name = assertName(dto.name, "Item");

    // validate section
    const section = await this.prisma.diagnosticSection.findFirst({ where: { id: dto.sectionId, branchId, isActive: true }, select: { id: true } });
    if (!section) throw new BadRequestException("Invalid sectionId for this branch");

    // validate category (optional)
    if (dto.categoryId) {
      const cat = await this.prisma.diagnosticCategory.findFirst({ where: { id: dto.categoryId, branchId, isActive: true }, select: { id: true } });
      if (!cat) throw new BadRequestException("Invalid categoryId for this branch");
    }

    // validate specimen (optional)
    if (dto.specimenId) {
      const sp = await this.prisma.specimenType.findFirst({ where: { id: dto.specimenId, branchId, isActive: true }, select: { id: true } });
      if (!sp) throw new BadRequestException("Invalid specimenId for this branch");
    }

    // validate serviceItem (optional)
    if (dto.serviceItemId) {
      await this.assertServiceItemForBranch(branchId, dto.serviceItemId);
    }

    try {
      return await this.prisma.diagnosticItem.upsert({
      where: { branchId_code: { branchId, code } },
      create: {
        branchId,
        code,
        name,
        kind: dto.kind,
        sectionId: dto.sectionId,
        categoryId: dto.categoryId ?? null,
        specimenId: dto.specimenId ?? null,
        tatMinsRoutine: parseOptionalInt(dto.tatMinsRoutine) ?? null,
        tatMinsStat: parseOptionalInt(dto.tatMinsStat) ?? null,
        requiresAppointment: dto.requiresAppointment ?? false,
        preparationText: dto.preparationText ?? null,
        consentRequired: dto.consentRequired ?? false,
        isPanel: dto.isPanel ?? false,
          sortOrder: dto.sortOrder ?? 0,
          serviceItemId: dto.serviceItemId ?? null,
        isActive: true,
      },
      update: {
        name,
        kind: dto.kind,
        sectionId: dto.sectionId,
        categoryId: dto.categoryId ?? null,
        specimenId: dto.specimenId ?? null,
        tatMinsRoutine: parseOptionalInt(dto.tatMinsRoutine) ?? null,
        tatMinsStat: parseOptionalInt(dto.tatMinsStat) ?? null,
        requiresAppointment: dto.requiresAppointment ?? false,
        preparationText: dto.preparationText ?? null,
        consentRequired: dto.consentRequired ?? false,
        isPanel: dto.isPanel ?? false,
          sortOrder: dto.sortOrder ?? 0,
          serviceItemId: dto.serviceItemId ?? null,
        isActive: true,
      },
      include: { section: true, category: true, specimen: true },
      });
    } catch (e: any) {
      if (e?.code === "P2002" && String(e?.meta?.target ?? "").includes("serviceItemId")) {
        throw new BadRequestException("serviceItemId is already linked to another diagnostic item");
      }
      throw e;
    }
  }

  async updateItem(principal: Principal, id: string, dto: UpdateDiagnosticItemDto) {
    const existing = await this.prisma.diagnosticItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Diagnostic item not found");

    const branchId = resolveBranchId(principal, dto.branchId ?? existing.branchId);
    if (existing.branchId !== branchId) throw new BadRequestException("Invalid branchId for this item");

    if (dto.sectionId !== undefined) {
      const section = await this.prisma.diagnosticSection.findFirst({ where: { id: dto.sectionId, branchId, isActive: true }, select: { id: true } });
      if (!section) throw new BadRequestException("Invalid sectionId for this branch");
    }

    if (dto.categoryId !== undefined && dto.categoryId !== null) {
      const cat = await this.prisma.diagnosticCategory.findFirst({ where: { id: dto.categoryId, branchId, isActive: true }, select: { id: true } });
      if (!cat) throw new BadRequestException("Invalid categoryId for this branch");
    }

    if (dto.specimenId !== undefined && dto.specimenId !== null) {
      const sp = await this.prisma.specimenType.findFirst({ where: { id: dto.specimenId, branchId, isActive: true }, select: { id: true } });
      if (!sp) throw new BadRequestException("Invalid specimenId for this branch");
    }

    if (dto.serviceItemId !== undefined && dto.serviceItemId !== null) {
      await this.assertServiceItemForBranch(branchId, dto.serviceItemId);
    }

    try {
      return await this.prisma.diagnosticItem.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: assertCode(dto.code, "Item") } : {}),
        ...(dto.name !== undefined ? { name: assertName(dto.name, "Item") } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.sectionId !== undefined ? { sectionId: dto.sectionId } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.specimenId !== undefined ? { specimenId: dto.specimenId } : {}),
        ...(dto.tatMinsRoutine !== undefined ? { tatMinsRoutine: parseOptionalInt(dto.tatMinsRoutine) } : {}),
        ...(dto.tatMinsStat !== undefined ? { tatMinsStat: parseOptionalInt(dto.tatMinsStat) } : {}),
        ...(dto.requiresAppointment !== undefined ? { requiresAppointment: dto.requiresAppointment } : {}),
        ...(dto.preparationText !== undefined ? { preparationText: dto.preparationText } : {}),
        ...(dto.consentRequired !== undefined ? { consentRequired: dto.consentRequired } : {}),
        ...(dto.isPanel !== undefined ? { isPanel: dto.isPanel } : {}),
          ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
          ...(dto.serviceItemId !== undefined ? { serviceItemId: dto.serviceItemId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: { section: true, category: true, specimen: true },
      });
    } catch (e: any) {
      if (e?.code === "P2002" && String(e?.meta?.target ?? "").includes("serviceItemId")) {
        throw new BadRequestException("serviceItemId is already linked to another diagnostic item");
      }
      throw e;
    }
  }

  async deleteItem(principal: Principal, id: string, branchId?: string) {
    const existing = await this.prisma.diagnosticItem.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Diagnostic item not found");
    const b = resolveBranchId(principal, branchId ?? existing.branchId);
    if (existing.branchId !== b) throw new BadRequestException("Invalid branchId for this item");
    return this.prisma.diagnosticItem.update({ where: { id }, data: { isActive: false } });
  }

  // ---------------- Panel composition ----------------
  async getPanelItems(principal: Principal, panelId: string, branchId: string) {
    const b = resolveBranchId(principal, branchId);

    const panel = await this.prisma.diagnosticItem.findFirst({ where: { id: panelId, branchId: b }, select: { id: true, isPanel: true } });
    if (!panel) throw new NotFoundException("Panel not found");
    if (!panel.isPanel) throw new BadRequestException("This item is not configured as a panel");

    return this.prisma.diagnosticPanelItem.findMany({
      where: { panelId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { item: true },
    });
  }

  async replacePanelItems(principal: Principal, panelId: string, branchId: string, dto: ReplacePanelItemsDto) {
    const b = resolveBranchId(principal, branchId);

    const panel = await this.prisma.diagnosticItem.findFirst({ where: { id: panelId, branchId: b, isActive: true }, select: { id: true, isPanel: true } });
    if (!panel) throw new NotFoundException("Panel not found");
    if (!panel.isPanel) throw new BadRequestException("This item is not configured as a panel");

    const itemIds = Array.from(new Set((dto.items ?? []).map((x) => x.itemId)));
    if (itemIds.some((x) => x === panelId)) throw new BadRequestException("Panel cannot contain itself");

    if (itemIds.length) {
      const found = await this.prisma.diagnosticItem.findMany({
        where: { id: { in: itemIds }, branchId: b, isActive: true },
        select: { id: true },
      });
      const foundIds = new Set(found.map((f) => f.id));
      const missing = itemIds.filter((x) => !foundIds.has(x));
      if (missing.length) throw new BadRequestException(`Invalid panel item ids: ${missing.join(", ")}`);
    }

    // prevent A -> B -> A cycles if nested panels are used
    await this.assertNoPanelCycle(panelId, itemIds);

    return this.prisma.$transaction(async (tx) => {
      await tx.diagnosticPanelItem.updateMany({ where: { panelId }, data: { isActive: false } });

      for (let i = 0; i < (dto.items ?? []).length; i++) {
        const it = dto.items[i];
        await tx.diagnosticPanelItem.upsert({
          where: { panelId_itemId: { panelId, itemId: it.itemId } },
          create: { panelId, itemId: it.itemId, sortOrder: it.sortOrder ?? i, isActive: true },
          update: { sortOrder: it.sortOrder ?? i, isActive: true },
        });
      }

      return tx.diagnosticPanelItem.findMany({
        where: { panelId, isActive: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { item: true },
      });
    });
  }

  // ---------------- Parameters ----------------
  async listParameters(principal: Principal, testId: string, branchId: string, includeInactive = false) {
    const b = resolveBranchId(principal, branchId);

    const test = await this.prisma.diagnosticItem.findFirst({ where: { id: testId, branchId: b }, select: { id: true, kind: true } });
    if (!test) throw new NotFoundException("Diagnostic item not found");

    return this.prisma.diagnosticParameter.findMany({
      where: { testId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        ranges: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });
  }

  async createParameter(principal: Principal, testId: string, dto: CreateParameterDto, branchId: string) {
    const b = resolveBranchId(principal, branchId);

    const test = await this.prisma.diagnosticItem.findFirst({ where: { id: testId, branchId: b, isActive: true }, select: { id: true, kind: true } });
    if (!test) throw new NotFoundException("Diagnostic item not found");
    if (test.kind !== DiagnosticKind.LAB) throw new BadRequestException("Parameters are only valid for LAB items");

    const code = assertCode(dto.code, "Parameter");
    const name = assertName(dto.name, "Parameter");

    if (dto.dataType === "CHOICE" && !String(dto.allowedText ?? "").trim()) {
      throw new BadRequestException("allowedText is required for CHOICE parameters");
    }

    return this.prisma.diagnosticParameter.upsert({
      where: { testId_code: { testId, code } },
      create: {
        testId,
        code,
        name,
        dataType: dto.dataType,
        unit: dto.unit ?? null,
        precision: dto.precision ?? null,
        allowedText: dto.allowedText ?? null,
        criticalLow: dto.criticalLow ?? null,
        criticalHigh: dto.criticalHigh ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: true,
      },
      update: {
        name,
        dataType: dto.dataType,
        unit: dto.unit ?? null,
        precision: dto.precision ?? null,
        allowedText: dto.allowedText ?? null,
        criticalLow: dto.criticalLow ?? null,
        criticalHigh: dto.criticalHigh ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: true,
      },
      include: { ranges: { where: { isActive: true } } },
    });
  }

  async updateParameter(principal: Principal, id: string, dto: UpdateParameterDto) {
    const existing = await this.prisma.diagnosticParameter.findUnique({ where: { id }, include: { test: true } });
    if (!existing) throw new NotFoundException("Parameter not found");

    const branchId = resolveBranchId(principal, dto.branchId ?? existing.test.branchId);
    if (existing.test.branchId !== branchId) throw new BadRequestException("Invalid branchId for this parameter");

    if (dto.dataType === "CHOICE" && dto.allowedText !== undefined && !String(dto.allowedText ?? "").trim()) {
      throw new BadRequestException("allowedText cannot be empty for CHOICE parameters");
    }

    return this.prisma.diagnosticParameter.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: assertCode(dto.code, "Parameter") } : {}),
        ...(dto.name !== undefined ? { name: assertName(dto.name, "Parameter") } : {}),
        ...(dto.dataType !== undefined ? { dataType: dto.dataType } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit } : {}),
        ...(dto.precision !== undefined ? { precision: dto.precision } : {}),
        ...(dto.allowedText !== undefined ? { allowedText: dto.allowedText } : {}),
        ...(dto.criticalLow !== undefined ? { criticalLow: dto.criticalLow } : {}),
        ...(dto.criticalHigh !== undefined ? { criticalHigh: dto.criticalHigh } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: { ranges: { where: { isActive: true } } },
    });
  }

  async deleteParameter(principal: Principal, id: string, branchId: string) {
    const existing = await this.prisma.diagnosticParameter.findUnique({ where: { id }, include: { test: true } });
    if (!existing) throw new NotFoundException("Parameter not found");
    const b = resolveBranchId(principal, branchId);
    if (existing.test.branchId !== b) throw new BadRequestException("Invalid branchId for this parameter");
    return this.prisma.diagnosticParameter.update({ where: { id }, data: { isActive: false } });
  }

  // ---------------- Reference Ranges ----------------
  async listRanges(principal: Principal, parameterId: string, branchId: string, includeInactive = false) {
    const b = resolveBranchId(principal, branchId);

    const p = await this.prisma.diagnosticParameter.findFirst({
      where: { id: parameterId, test: { branchId: b } },
      select: { id: true },
    });
    if (!p) throw new NotFoundException("Parameter not found");

    return this.prisma.diagnosticReferenceRange.findMany({
      where: { parameterId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  async createRange(principal: Principal, parameterId: string, dto: CreateReferenceRangeDto, branchId: string) {
    const b = resolveBranchId(principal, branchId);

    const p = await this.prisma.diagnosticParameter.findFirst({
      where: { id: parameterId, test: { branchId: b } },
      select: { id: true },
    });
    if (!p) throw new NotFoundException("Parameter not found");

    const ageMinDays = dto.ageMinDays ?? null;
    const ageMaxDays = dto.ageMaxDays ?? null;
    if (ageMinDays !== null && ageMaxDays !== null && ageMinDays > ageMaxDays) {
      throw new BadRequestException("ageMinDays cannot be greater than ageMaxDays");
    }
    const low = dto.low ?? null;
    const high = dto.high ?? null;
    if (low !== null && high !== null && low > high) {
      throw new BadRequestException("low cannot be greater than high");
    }
    const textRange = (dto.textRange ?? "").trim() || null;
    if (low === null && high === null && !textRange) {
      throw new BadRequestException("At least one of low/high/textRange is required");
    }

    return this.prisma.diagnosticReferenceRange.create({
      data: {
        parameterId,
        sex: dto.sex ? String(dto.sex).trim() : null,
        ageMinDays,
        ageMaxDays,
        low,
        high,
        textRange,
        notes: dto.notes ? String(dto.notes).trim() : null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: true,
      },
    });
  }

  async updateRange(principal: Principal, id: string, dto: UpdateReferenceRangeDto) {
    const existing = await this.prisma.diagnosticReferenceRange.findUnique({
      where: { id },
      include: { parameter: { include: { test: true } } },
    });
    if (!existing) throw new NotFoundException("Reference range not found");

    const branchId = resolveBranchId(principal, dto.branchId ?? existing.parameter.test.branchId);
    if (existing.parameter.test.branchId !== branchId) throw new BadRequestException("Invalid branchId for this reference range");

    return this.prisma.diagnosticReferenceRange.update({
      where: { id },
      data: {
        ...(dto.sex !== undefined ? { sex: dto.sex } : {}),
        ...(dto.ageMinDays !== undefined ? { ageMinDays: dto.ageMinDays } : {}),
        ...(dto.ageMaxDays !== undefined ? { ageMaxDays: dto.ageMaxDays } : {}),
        ...(dto.low !== undefined ? { low: dto.low } : {}),
        ...(dto.high !== undefined ? { high: dto.high } : {}),
        ...(dto.textRange !== undefined ? { textRange: dto.textRange } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deleteRange(principal: Principal, id: string, branchId: string) {
    const existing = await this.prisma.diagnosticReferenceRange.findUnique({
      where: { id },
      include: { parameter: { include: { test: true } } },
    });
    if (!existing) throw new NotFoundException("Reference range not found");
    const b = resolveBranchId(principal, branchId);
    if (existing.parameter.test.branchId !== b) throw new BadRequestException("Invalid branchId for this reference range");
    return this.prisma.diagnosticReferenceRange.update({ where: { id }, data: { isActive: false } });
  }

  // ---------------- Report Templates ----------------
  async listTemplates(principal: Principal, itemId: string, branchId?: string, includeInactive = false) {
    const item = await this.prisma.diagnosticItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException("Diagnostic item not found");

    const b = resolveBranchId(principal, branchId ?? item.branchId);
    if (item.branchId !== b) throw new BadRequestException("Invalid branchId for this item");

    return this.prisma.diagnosticTemplate.findMany({
      where: { itemId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: [{ name: "asc" }, { updatedAt: "desc" }],
    });
  }

  async createTemplate(principal: Principal, itemId: string, dto: CreateTemplateDto, branchId?: string) {
    const item = await this.prisma.diagnosticItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException("Diagnostic item not found");

    const b = resolveBranchId(principal, branchId ?? item.branchId);
    if (item.branchId !== b) throw new BadRequestException("Invalid branchId for this item");

    const kind = dto.kind ?? (item.kind === DiagnosticKind.LAB ? DiagnosticTemplateKind.LAB_REPORT : DiagnosticTemplateKind.IMAGING_REPORT);

    const name = assertName(dto.name, "Template", 200);

    // Idempotent create to avoid duplicates (itemId + kind + name)
    return this.prisma.$transaction(async (tx) => {
      const matches = await tx.diagnosticTemplate.findMany({
        where: { itemId, kind, name },
        orderBy: [{ updatedAt: "desc" }],
        select: { id: true },
      });

      if (matches.length) {
        const keepId = matches[0].id;
        if (matches.length > 1) {
          await tx.diagnosticTemplate.updateMany({
            where: { id: { in: matches.slice(1).map((m) => m.id) } },
            data: { isActive: false },
          });
        }

        return tx.diagnosticTemplate.update({
          where: { id: keepId },
          data: { body: dto.body, isActive: true },
        });
      }

      return tx.diagnosticTemplate.create({
        data: { itemId, kind, name, body: dto.body, isActive: true },
      });
    });
  }

  async updateTemplate(principal: Principal, id: string, dto: UpdateTemplateDto) {
    const existing = await this.prisma.diagnosticTemplate.findUnique({ where: { id }, include: { item: true } });
    if (!existing) throw new NotFoundException("Template not found");

    const branchId = resolveBranchId(principal, dto.branchId ?? existing.item.branchId);
    if (existing.item.branchId !== branchId) throw new BadRequestException("Invalid branchId for this template");

    // prevent duplicates when renaming/changing kind
    const nextKind = dto.kind ?? existing.kind;
    const nextName = dto.name !== undefined ? assertName(dto.name, "Template", 200) : existing.name;
    if (nextKind !== existing.kind || nextName !== existing.name) {
      const dup = await this.prisma.diagnosticTemplate.findFirst({
        where: { itemId: existing.itemId, kind: nextKind, name: nextName, id: { not: existing.id } },
        select: { id: true },
      });
      if (dup) throw new BadRequestException("A template with the same name and kind already exists for this item");
    }

    return this.prisma.diagnosticTemplate.update({
      where: { id },
      data: {
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.name !== undefined ? { name: nextName } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deleteTemplate(principal: Principal, id: string) {
    const existing = await this.prisma.diagnosticTemplate.findUnique({ where: { id }, include: { item: true } });
    if (!existing) throw new NotFoundException("Template not found");

    // Branch enforced through principal branch (if present)
    resolveBranchId(principal, existing.item.branchId);

    return this.prisma.diagnosticTemplate.update({ where: { id }, data: { isActive: false } });
  }
}