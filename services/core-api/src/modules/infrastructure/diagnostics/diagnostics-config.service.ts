import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import { Prisma } from "@zypocare/db";
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
      create: {
        branchId,
        code,
        name,
        type: dto.type ?? "LAB",
        headStaffId: dto.headStaffId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: true,
      },
      update: {
        name,
        type: dto.type ?? "LAB",
        headStaffId: dto.headStaffId ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: true,
      },
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
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.headStaffId !== undefined ? { headStaffId: dto.headStaffId } : {}),
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
        fastingRequired: dto.fastingRequired ?? false,
        fastingHours: dto.fastingHours !== undefined ? parseOptionalInt(dto.fastingHours) : null,
        collectionInstructions: dto.collectionInstructions ?? null,
        storageTemperature: dto.storageTemperature ?? null,
        isActive: true,
      },
      update: {
        name,
        container: dto.container ?? null,
        minVolumeMl: dto.minVolumeMl !== undefined ? parseOptionalFloat(dto.minVolumeMl) : null,
        handlingNotes: dto.handlingNotes ?? null,
        fastingRequired: dto.fastingRequired ?? false,
        fastingHours: dto.fastingHours !== undefined ? parseOptionalInt(dto.fastingHours) : null,
        collectionInstructions: dto.collectionInstructions ?? null,
        storageTemperature: dto.storageTemperature ?? null,
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
        ...(dto.fastingRequired !== undefined ? { fastingRequired: dto.fastingRequired } : {}),
        ...(dto.fastingHours !== undefined ? { fastingHours: parseOptionalInt(dto.fastingHours) } : {}),
        ...(dto.collectionInstructions !== undefined ? { collectionInstructions: dto.collectionInstructions } : {}),
        ...(dto.storageTemperature !== undefined ? { storageTemperature: dto.storageTemperature } : {}),
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
              { loincCode: { contains: String(q.q).trim(), mode: "insensitive" } },
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
        loincCode: dto.loincCode ?? null,
        snomedCode: dto.snomedCode ?? null,
        searchAliases: dto.searchAliases ?? Prisma.JsonNull,
        careContext: dto.careContext ?? "ALL",
        specimenId: dto.specimenId ?? null,
        tatMinsRoutine: parseOptionalInt(dto.tatMinsRoutine) ?? null,
        tatMinsStat: parseOptionalInt(dto.tatMinsStat) ?? null,
        requiresAppointment: dto.requiresAppointment ?? false,
        preparationText: dto.preparationText ?? null,
        consentRequired: dto.consentRequired ?? false,
        requiresPcpndt: dto.requiresPcpndt ?? false,
        isPanel: dto.isPanel ?? false,
        panelType: dto.panelType ?? null,
          sortOrder: dto.sortOrder ?? 0,
          serviceItemId: dto.serviceItemId ?? null,
        isActive: true,
      },
      update: {
        name,
        kind: dto.kind,
        sectionId: dto.sectionId,
        categoryId: dto.categoryId ?? null,
        loincCode: dto.loincCode ?? null,
        snomedCode: dto.snomedCode ?? null,
        searchAliases: dto.searchAliases ?? Prisma.JsonNull,
        careContext: dto.careContext ?? "ALL",
        specimenId: dto.specimenId ?? null,
        tatMinsRoutine: parseOptionalInt(dto.tatMinsRoutine) ?? null,
        tatMinsStat: parseOptionalInt(dto.tatMinsStat) ?? null,
        requiresAppointment: dto.requiresAppointment ?? false,
        preparationText: dto.preparationText ?? null,
        consentRequired: dto.consentRequired ?? false,
        requiresPcpndt: dto.requiresPcpndt ?? false,
        isPanel: dto.isPanel ?? false,
        panelType: dto.panelType ?? null,
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
        ...(dto.loincCode !== undefined ? { loincCode: dto.loincCode } : {}),
        ...(dto.snomedCode !== undefined ? { snomedCode: dto.snomedCode } : {}),
        ...(dto.searchAliases !== undefined ? { searchAliases: dto.searchAliases ?? Prisma.JsonNull } : {}),
        ...(dto.careContext !== undefined ? { careContext: dto.careContext } : {}),
        ...(dto.specimenId !== undefined ? { specimenId: dto.specimenId } : {}),
        ...(dto.tatMinsRoutine !== undefined ? { tatMinsRoutine: parseOptionalInt(dto.tatMinsRoutine) } : {}),
        ...(dto.tatMinsStat !== undefined ? { tatMinsStat: parseOptionalInt(dto.tatMinsStat) } : {}),
        ...(dto.requiresAppointment !== undefined ? { requiresAppointment: dto.requiresAppointment } : {}),
        ...(dto.preparationText !== undefined ? { preparationText: dto.preparationText } : {}),
        ...(dto.consentRequired !== undefined ? { consentRequired: dto.consentRequired } : {}),
        ...(dto.requiresPcpndt !== undefined ? { requiresPcpndt: dto.requiresPcpndt } : {}),
        ...(dto.isPanel !== undefined ? { isPanel: dto.isPanel } : {}),
        ...(dto.panelType !== undefined ? { panelType: dto.panelType } : {}),
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
        isDerived: dto.isDerived ?? false,
        formula: dto.formula ?? null,
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
        isDerived: dto.isDerived ?? false,
        formula: dto.formula ?? null,
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
        ...(dto.isDerived !== undefined ? { isDerived: dto.isDerived } : {}),
        ...(dto.formula !== undefined ? { formula: dto.formula } : {}),
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
        source: dto.source ?? null,
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
        ...(dto.source !== undefined ? { source: dto.source } : {}),
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
          data: {
            body: dto.body,
            isActive: true,
            ...(dto.headerConfig !== undefined ? { headerConfig: dto.headerConfig } : {}),
            ...(dto.footerConfig !== undefined ? { footerConfig: dto.footerConfig } : {}),
            ...(dto.parameterLayout !== undefined ? { parameterLayout: dto.parameterLayout } : {}),
            ...(dto.signatureRoles !== undefined ? { signatureRoles: dto.signatureRoles } : {}),
          },
        });
      }

      return tx.diagnosticTemplate.create({
        data: {
          itemId,
          kind,
          name,
          body: dto.body,
          isActive: true,
          headerConfig: dto.headerConfig ?? Prisma.JsonNull,
          footerConfig: dto.footerConfig ?? Prisma.JsonNull,
          parameterLayout: dto.parameterLayout ?? Prisma.JsonNull,
          signatureRoles: dto.signatureRoles ?? Prisma.JsonNull,
        },
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
        ...(dto.headerConfig !== undefined ? { headerConfig: dto.headerConfig ?? Prisma.JsonNull } : {}),
        ...(dto.footerConfig !== undefined ? { footerConfig: dto.footerConfig ?? Prisma.JsonNull } : {}),
        ...(dto.parameterLayout !== undefined ? { parameterLayout: dto.parameterLayout ?? Prisma.JsonNull } : {}),
        ...(dto.signatureRoles !== undefined ? { signatureRoles: dto.signatureRoles ?? Prisma.JsonNull } : {}),
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

  // ---------------- Go-Live Validation ----------------
  async runGoLiveValidation(principal: Principal, branchId: string) {
    const b = resolveBranchId(principal, branchId);
    const checks: Array<{ id: number; name: string; severity: "BLOCKER" | "WARNING"; status: "PASS" | "FAIL"; details?: string }> = [];

    // 1. At least one diagnostic section enabled with active tests
    const activeSections = await this.prisma.diagnosticSection.count({ where: { branchId: b, isActive: true } });
    checks.push({
      id: 1,
      name: "At least one diagnostic section is enabled with active tests",
      severity: "BLOCKER",
      status: activeSections > 0 ? "PASS" : "FAIL",
      details: `${activeSections} active section(s)`,
    });

    // 2. All active tests have at least one parameter configured
    const testsWithoutParams = await this.prisma.diagnosticItem.count({
      where: { branchId: b, isActive: true, kind: "LAB", isPanel: false, parameters: { none: { isActive: true } } },
    });
    checks.push({
      id: 2,
      name: "All active lab tests have at least one parameter configured",
      severity: "BLOCKER",
      status: testsWithoutParams === 0 ? "PASS" : "FAIL",
      details: testsWithoutParams > 0 ? `${testsWithoutParams} test(s) without parameters` : undefined,
    });

    // 3. All numeric parameters have at least a default reference range
    const numericParamsWithoutRange = await this.prisma.diagnosticParameter.count({
      where: {
        test: { branchId: b, isActive: true },
        dataType: "NUMERIC",
        isActive: true,
        ranges: { none: { isActive: true } },
      },
    });
    checks.push({
      id: 3,
      name: "All numeric parameters have at least a default reference range",
      severity: "BLOCKER",
      status: numericParamsWithoutRange === 0 ? "PASS" : "FAIL",
      details: numericParamsWithoutRange > 0 ? `${numericParamsWithoutRange} parameter(s) without reference ranges` : undefined,
    });

    // 4. Critical ranges do not overlap with normal ranges
    const paramsWithBadCritical = await this.prisma.diagnosticParameter.findMany({
      where: { test: { branchId: b, isActive: true }, isActive: true, OR: [{ criticalLow: { not: null } }, { criticalHigh: { not: null } }] },
      include: { ranges: { where: { isActive: true } } },
    });
    let criticalOverlapCount = 0;
    for (const p of paramsWithBadCritical) {
      for (const r of p.ranges) {
        if (r.low != null && r.high != null) {
          if (p.criticalLow != null && p.criticalLow >= r.low) criticalOverlapCount++;
          if (p.criticalHigh != null && p.criticalHigh <= r.high) criticalOverlapCount++;
        }
      }
    }
    checks.push({
      id: 4,
      name: "Critical ranges do not overlap with normal ranges",
      severity: "BLOCKER",
      status: criticalOverlapCount === 0 ? "PASS" : "FAIL",
      details: criticalOverlapCount > 0 ? `${criticalOverlapCount} critical/normal range overlap(s) found` : undefined,
    });

    // 5. All lab tests have sample requirements configured
    const labTestsWithoutSpecimen = await this.prisma.diagnosticItem.count({
      where: { branchId: b, isActive: true, kind: "LAB", isPanel: false, specimenId: null },
    });
    checks.push({
      id: 5,
      name: "All lab tests have sample requirements configured",
      severity: "BLOCKER",
      status: labTestsWithoutSpecimen === 0 ? "PASS" : "FAIL",
      details: labTestsWithoutSpecimen > 0 ? `${labTestsWithoutSpecimen} lab test(s) without specimen` : undefined,
    });

    // 6. All enabled sections have at least one service point
    const sectionsWithoutSP = await this.prisma.diagnosticSection.count({
      where: {
        branchId: b,
        isActive: true,
        items: { some: { isActive: true } },
        servicePoints: { none: { isActive: true } },
      },
    });
    checks.push({
      id: 6,
      name: "All enabled sections have at least one service point",
      severity: "BLOCKER",
      status: sectionsWithoutSP === 0 ? "PASS" : "FAIL",
      details: sectionsWithoutSP > 0 ? `${sectionsWithoutSP} section(s) without service points` : undefined,
    });

    // 7. All service points have at least one staff member assigned
    const spWithoutStaff = await this.prisma.diagnosticServicePoint.count({
      where: { branchId: b, isActive: true, staff: { none: { isActive: true } } },
    });
    checks.push({
      id: 7,
      name: "All service points have at least one staff member assigned",
      severity: "WARNING",
      status: spWithoutStaff === 0 ? "PASS" : "FAIL",
      details: spWithoutStaff > 0 ? `${spWithoutStaff} service point(s) without staff` : undefined,
    });

    // 8. All service points have equipment linked
    const spWithoutEquipment = await this.prisma.diagnosticServicePoint.count({
      where: { branchId: b, isActive: true, type: { not: "OTHER" }, equipment: { none: { isActive: true } } },
    });
    checks.push({
      id: 8,
      name: "All processing service points have equipment linked",
      severity: "WARNING",
      status: spWithoutEquipment === 0 ? "PASS" : "FAIL",
      details: spWithoutEquipment > 0 ? `${spWithoutEquipment} service point(s) without equipment` : undefined,
    });

    // 9. LOINC mapping coverage > 80%
    const totalActiveTests = await this.prisma.diagnosticItem.count({ where: { branchId: b, isActive: true } });
    const testsWithLoinc = await this.prisma.diagnosticItem.count({
      where: { branchId: b, isActive: true, loincCode: { not: null } },
    });
    const loincPct = totalActiveTests > 0 ? Math.round((testsWithLoinc / totalActiveTests) * 100) : 0;
    checks.push({
      id: 9,
      name: "LOINC mapping coverage > 80% of active tests",
      severity: "WARNING",
      status: loincPct >= 80 ? "PASS" : "FAIL",
      details: `${loincPct}% coverage (${testsWithLoinc}/${totalActiveTests})`,
    });

    // 10. All imaging tests linked to equipment
    const imagingWithoutEquipment = await this.prisma.diagnosticItem.count({
      where: { branchId: b, isActive: true, kind: "IMAGING", capabilities: { none: { isActive: true } } },
    });
    checks.push({
      id: 10,
      name: "All imaging tests linked to equipment with valid capability",
      severity: "BLOCKER",
      status: imagingWithoutEquipment === 0 ? "PASS" : "FAIL",
      details: imagingWithoutEquipment > 0 ? `${imagingWithoutEquipment} imaging test(s) without capability` : undefined,
    });

    // 11. All ultrasound tests have PCPNDT compliance flag
    const usgWithoutPcpndt = await this.prisma.diagnosticItem.count({
      where: {
        branchId: b,
        isActive: true,
        kind: "IMAGING",
        requiresPcpndt: false,
        OR: [
          { name: { contains: "ultrasound", mode: "insensitive" } },
          { name: { contains: "USG", mode: "insensitive" } },
          { name: { contains: "sonography", mode: "insensitive" } },
        ],
      },
    });
    checks.push({
      id: 11,
      name: "All ultrasound tests have PCPNDT compliance flag set",
      severity: "BLOCKER",
      status: usgWithoutPcpndt === 0 ? "PASS" : "FAIL",
      details: usgWithoutPcpndt > 0 ? `${usgWithoutPcpndt} ultrasound test(s) missing PCPNDT flag` : undefined,
    });

    // 12. Report templates configured for each active section
    const sectionsWithoutTemplate = await this.prisma.diagnosticSection.count({
      where: {
        branchId: b,
        isActive: true,
        items: { some: { isActive: true, templates: { none: { isActive: true } } } },
      },
    });
    checks.push({
      id: 12,
      name: "Report templates configured for each active section",
      severity: "WARNING",
      status: sectionsWithoutTemplate === 0 ? "PASS" : "FAIL",
      details: sectionsWithoutTemplate > 0 ? `${sectionsWithoutTemplate} section(s) with tests missing templates` : undefined,
    });

    // 13. Diagnostic tests have ServiceCatalog entries with pricing
    const testsWithoutServiceItem = await this.prisma.diagnosticItem.count({
      where: { branchId: b, isActive: true, serviceItemId: null },
    });
    checks.push({
      id: 13,
      name: "Diagnostic tests have ServiceCatalog entries",
      severity: "BLOCKER",
      status: testsWithoutServiceItem === 0 ? "PASS" : "FAIL",
      details: testsWithoutServiceItem > 0 ? `${testsWithoutServiceItem} test(s) without ServiceCatalog entry` : undefined,
    });

    // 14. TAT configured for all active tests
    const testsWithoutTat = await this.prisma.diagnosticItem.count({
      where: { branchId: b, isActive: true, isPanel: false, tatMinsRoutine: null },
    });
    checks.push({
      id: 14,
      name: "TAT configured for all active tests (Routine + Stat)",
      severity: "WARNING",
      status: testsWithoutTat === 0 ? "PASS" : "FAIL",
      details: testsWithoutTat > 0 ? `${testsWithoutTat} test(s) without TAT` : undefined,
    });

    // 15. No age-range gaps in reference ranges for pediatric-relevant tests
    const paramsWithAgeRanges = await this.prisma.diagnosticParameter.findMany({
      where: { test: { branchId: b, isActive: true }, isActive: true, dataType: "NUMERIC", ranges: { some: { isActive: true, ageMaxDays: { not: null } } } },
      include: { ranges: { where: { isActive: true, ageMaxDays: { not: null } }, orderBy: { ageMinDays: "asc" } } },
    });
    let ageGapCount = 0;
    for (const p of paramsWithAgeRanges) {
      const sexGroups = new Map<string, typeof p.ranges>();
      for (const r of p.ranges) {
        const key = r.sex ?? "ALL";
        if (!sexGroups.has(key)) sexGroups.set(key, []);
        sexGroups.get(key)!.push(r);
      }
      for (const [, group] of sexGroups) {
        const sorted = group.filter(r => r.ageMinDays != null && r.ageMaxDays != null).sort((a, b) => (a.ageMinDays ?? 0) - (b.ageMinDays ?? 0));
        for (let i = 0; i < sorted.length - 1; i++) {
          const gapStart = (sorted[i].ageMaxDays ?? 0) + 1;
          const nextStart = sorted[i + 1].ageMinDays ?? 0;
          if (gapStart < nextStart) ageGapCount++;
        }
      }
    }
    checks.push({
      id: 15,
      name: "No age-range gaps in reference ranges for pediatric-relevant tests",
      severity: "WARNING",
      status: ageGapCount === 0 ? "PASS" : "FAIL",
      details: ageGapCount > 0 ? `${ageGapCount} age-range gap(s) detected across parameters` : undefined,
    });

    // 16. Signatory roles configured for report templates
    const templatesWithoutSignatory = await this.prisma.diagnosticTemplate.count({
      where: { item: { branchId: b, isActive: true }, isActive: true, signatureRoles: { equals: Prisma.AnyNull } },
    });
    checks.push({
      id: 16,
      name: "Signatory roles configured for report templates",
      severity: "WARNING",
      status: templatesWithoutSignatory === 0 ? "PASS" : "FAIL",
      details: templatesWithoutSignatory > 0 ? `${templatesWithoutSignatory} template(s) without signatory roles` : undefined,
    });

    const blockers = checks.filter((c) => c.severity === "BLOCKER" && c.status === "FAIL").length;
    const warnings = checks.filter((c) => c.severity === "WARNING" && c.status === "FAIL").length;
    const passed = checks.filter((c) => c.status === "PASS").length;
    const score = Math.round((passed / checks.length) * 100);

    return { checks, summary: { total: checks.length, passed, blockers, warnings, score } };
  }

  // ==================== Bulk Import/Export ====================

  async exportAll(principal: Principal, branchIdInput: string) {
    const branchId = resolveBranchId(principal, branchIdInput);

    const [sections, categories, specimens, items, servicePoints] = await Promise.all([
      this.prisma.diagnosticSection.findMany({ where: { branchId, isActive: true }, orderBy: { sortOrder: "asc" } }),
      this.prisma.diagnosticCategory.findMany({ where: { branchId, isActive: true }, orderBy: { sortOrder: "asc" } }),
      this.prisma.specimenType.findMany({ where: { branchId, isActive: true }, orderBy: { name: "asc" } }),
      this.prisma.diagnosticItem.findMany({
        where: { branchId, isActive: true },
        include: {
          parameters: { where: { isActive: true }, include: { ranges: { where: { isActive: true } } } },
          templates: { where: { isActive: true } },
        },
        orderBy: { sortOrder: "asc" },
      }),
      this.prisma.diagnosticServicePoint.findMany({ where: { branchId, isActive: true } }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      branchId,
      sections: sections.map((s) => ({
        code: s.code,
        name: s.name,
        type: s.type,
      })),
      categories: categories.map((c) => ({
        code: c.code,
        name: c.name,
        sectionCode: sections.find((s) => s.id === c.sectionId)?.code ?? null,
      })),
      specimens: specimens.map((sp) => ({
        code: sp.code,
        name: sp.name,
        container: sp.container,
        minVolumeMl: sp.minVolumeMl,
        handlingNotes: sp.handlingNotes,
        fastingRequired: sp.fastingRequired,
        fastingHours: sp.fastingHours,
        collectionInstructions: sp.collectionInstructions,
        storageTemperature: sp.storageTemperature,
      })),
      items: items.map((i) => ({
        code: i.code,
        name: i.name,
        kind: i.kind,
        sectionCode: sections.find((s) => s.id === i.sectionId)?.code ?? null,
        categoryCode: categories.find((c) => c.id === i.categoryId)?.code ?? null,
        specimenCode: specimens.find((sp) => sp.id === i.specimenId)?.code ?? null,
        loincCode: i.loincCode,
        snomedCode: i.snomedCode,
        careContext: i.careContext,
        requiresPcpndt: i.requiresPcpndt,
        panelType: i.panelType,
        searchAliases: i.searchAliases,
        isPanel: i.isPanel,
        tatMinsRoutine: i.tatMinsRoutine,
        tatMinsStat: i.tatMinsStat,
        consentRequired: i.consentRequired,
        requiresAppointment: i.requiresAppointment,
        preparationText: i.preparationText,
        parameters: i.parameters.map((p) => ({
          code: p.code,
          name: p.name,
          dataType: p.dataType,
          unit: p.unit,
          precision: p.precision,
          isDerived: p.isDerived,
          formula: p.formula,
          ranges: p.ranges.map((r) => ({
            sex: r.sex,
            ageMinDays: r.ageMinDays,
            ageMaxDays: r.ageMaxDays,
            low: r.low,
            high: r.high,
            textRange: r.textRange,
            source: r.source,
            notes: r.notes,
          })),
        })),
        templates: i.templates.map((t) => ({
          name: t.name,
          kind: t.kind,
          body: t.body,
          headerConfig: t.headerConfig,
          footerConfig: t.footerConfig,
          signatureRoles: t.signatureRoles,
        })),
      })),
    };
  }

  async importBulk(principal: Principal, branchIdInput: string, data: any, dryRun: boolean) {
    const branchId = resolveBranchId(principal, branchIdInput);
    const errors: string[] = [];
    const warnings: string[] = [];
    let sectionsCount = 0;
    let categoriesCount = 0;
    let specimensCount = 0;
    let itemsCount = 0;
    let parametersCount = 0;
    let rangesCount = 0;
    let templatesCount = 0;

    // Validate structure
    if (!data || typeof data !== "object") {
      return { success: false, errors: ["Invalid data format"], warnings: [], counts: {} };
    }

    const importSections = Array.isArray(data.sections) ? data.sections : [];
    const importCategories = Array.isArray(data.categories) ? data.categories : [];
    const importSpecimens = Array.isArray(data.specimens) ? data.specimens : [];
    const importItems = Array.isArray(data.items) ? data.items : [];

    // Validate sections
    for (const s of importSections) {
      if (!s.code || !s.name) errors.push(`Section missing code or name: ${JSON.stringify(s)}`);
    }

    // Validate items
    for (const item of importItems) {
      if (!item.code || !item.name) errors.push(`Item missing code or name: ${JSON.stringify(item).slice(0, 100)}`);
      if (!item.kind) errors.push(`Item "${item.code}" missing kind`);
      if (!item.sectionCode) warnings.push(`Item "${item.code}" missing section reference`);
    }

    if (errors.length > 0 || dryRun) {
      return {
        success: errors.length === 0,
        dryRun: true,
        errors,
        warnings,
        counts: {
          sections: importSections.length,
          categories: importCategories.length,
          specimens: importSpecimens.length,
          items: importItems.length,
        },
      };
    }

    // Execute import
    const sectionMap = new Map<string, string>(); // code -> id
    const categoryMap = new Map<string, string>();
    const specimenMap = new Map<string, string>();

    // Import sections
    for (const s of importSections) {
      const existing = await this.prisma.diagnosticSection.findFirst({ where: { branchId, code: s.code } });
      if (existing) {
        sectionMap.set(s.code, existing.id);
      } else {
        const created = await this.prisma.diagnosticSection.create({
          data: { branchId, code: s.code, name: s.name, type: s.type || "LAB" },
        });
        sectionMap.set(s.code, created.id);
        sectionsCount++;
      }
    }

    // Import categories
    for (const c of importCategories) {
      const sid = sectionMap.get(c.sectionCode);
      if (!sid) { warnings.push(`Category "${c.code}" references unknown section "${c.sectionCode}"`); continue; }
      const existing = await this.prisma.diagnosticCategory.findFirst({ where: { branchId, code: c.code } });
      if (existing) {
        categoryMap.set(c.code, existing.id);
      } else {
        const created = await this.prisma.diagnosticCategory.create({
          data: { branchId, code: c.code, name: c.name, sectionId: sid },
        });
        categoryMap.set(c.code, created.id);
        categoriesCount++;
      }
    }

    // Import specimens
    for (const sp of importSpecimens) {
      const existing = await this.prisma.specimenType.findFirst({ where: { branchId, code: sp.code } });
      if (existing) {
        specimenMap.set(sp.code, existing.id);
      } else {
        const created = await this.prisma.specimenType.create({
          data: {
            branchId,
            code: sp.code,
            name: sp.name,
            container: sp.container,
            minVolumeMl: sp.minVolumeMl,
            handlingNotes: sp.handlingNotes,
            fastingRequired: sp.fastingRequired ?? false,
            fastingHours: sp.fastingHours,
            collectionInstructions: sp.collectionInstructions,
            storageTemperature: sp.storageTemperature,
          },
        });
        specimenMap.set(sp.code, created.id);
        specimensCount++;
      }
    }

    // Import items
    for (const item of importItems) {
      const sectionId = sectionMap.get(item.sectionCode);
      if (!sectionId) { warnings.push(`Item "${item.code}" references unknown section "${item.sectionCode}"`); continue; }

      const existing = await this.prisma.diagnosticItem.findFirst({ where: { branchId, code: item.code } });
      let itemId: string;

      if (existing) {
        itemId = existing.id;
        warnings.push(`Item "${item.code}" already exists, skipping creation (updating sub-items only)`);
      } else {
        const created = await this.prisma.diagnosticItem.create({
          data: {
            branchId,
            code: item.code,
            name: item.name,
            kind: item.kind,
            sectionId,
            categoryId: item.categoryCode ? categoryMap.get(item.categoryCode) : undefined,
            specimenId: item.specimenCode ? specimenMap.get(item.specimenCode) : undefined,
            loincCode: item.loincCode,
            snomedCode: item.snomedCode,
            careContext: item.careContext || "ALL",
            requiresPcpndt: item.requiresPcpndt ?? false,
            panelType: item.panelType,
            searchAliases: item.searchAliases,
            isPanel: item.isPanel ?? false,
            tatMinsRoutine: item.tatMinsRoutine,
            tatMinsStat: item.tatMinsStat,
            consentRequired: item.consentRequired ?? false,
            requiresAppointment: item.requiresAppointment ?? false,
            preparationText: item.preparationText,
          },
        });
        itemId = created.id;
        itemsCount++;
      }

      // Import parameters
      if (Array.isArray(item.parameters)) {
        for (const param of item.parameters) {
          const existingParam = await this.prisma.diagnosticParameter.findFirst({
            where: { testId: itemId, code: param.code },
          });

          let paramId: string;
          if (existingParam) {
            paramId = existingParam.id;
          } else {
            const created = await this.prisma.diagnosticParameter.create({
              data: {
                testId: itemId,
                code: param.code,
                name: param.name,
                dataType: param.dataType || "NUMERIC",
                unit: param.unit,
                precision: param.precision,
                isDerived: param.isDerived ?? false,
                formula: param.formula,
              },
            });
            paramId = created.id;
            parametersCount++;
          }

          // Import ranges
          if (Array.isArray(param.ranges)) {
            for (const range of param.ranges) {
              await this.prisma.diagnosticReferenceRange.create({
                data: {
                  parameterId: paramId,
                  sex: range.sex,
                  ageMinDays: range.ageMinDays,
                  ageMaxDays: range.ageMaxDays,
                  low: range.low,
                  high: range.high,
                  textRange: range.textRange,
                  source: range.source,
                  notes: range.notes,
                },
              });
              rangesCount++;
            }
          }
        }
      }

      // Import templates
      if (Array.isArray(item.templates)) {
        for (const tmpl of item.templates) {
          await this.prisma.diagnosticTemplate.create({
            data: {
              itemId: itemId,
              name: tmpl.name,
              kind: tmpl.kind || "LAB_REPORT",
              body: tmpl.body || "",
              headerConfig: tmpl.headerConfig,
              footerConfig: tmpl.footerConfig,
              signatureRoles: tmpl.signatureRoles,
            },
          });
          templatesCount++;
        }
      }
    }

    return {
      success: true,
      dryRun: false,
      errors,
      warnings,
      counts: {
        sections: sectionsCount,
        categories: categoriesCount,
        specimens: specimensCount,
        items: itemsCount,
        parameters: parametersCount,
        ranges: rangesCount,
        templates: templatesCount,
      },
    };
  }

  // ==================== Branch Cloning ====================
  async cloneBranch(principal: Principal, sourceBranchId: string, targetBranchId: string) {
    const source = resolveBranchId(principal, sourceBranchId);
    const target = resolveBranchId(principal, targetBranchId);
    if (source === target) throw new BadRequestException("Source and target branches must be different");

    const exported = await this.exportAll(principal, source);
    const result = await this.importBulk(principal, target, exported, false);
    return { ...result, clonedFrom: source, clonedTo: target };
  }
}
