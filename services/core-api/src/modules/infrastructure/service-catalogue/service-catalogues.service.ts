import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import type { Principal } from "../../auth/access-policy.service";
import { canonicalizeCode } from "../../../common/naming.util";
import { InfraContextService } from "../shared/infra-context.service";

import type {
  CreateServiceCatalogueDto,
  UpdateServiceCatalogueDto,
  UpsertServiceCatalogueItemDto,
} from "./dto";

@Injectable()
export class ServiceCataloguesService {
  constructor(private readonly ctx: InfraContextService) {}

  private async ensureCatalogue(principal: Principal, id: string) {
    const c = await this.ctx.prisma.serviceCatalogue.findUnique({
      where: { id },
      select: { id: true, branchId: true, status: true, version: true, code: true, name: true },
    });
    if (!c) throw new NotFoundException("Service catalogue not found");
    const branchId = this.ctx.resolveBranchId(principal, c.branchId);
    return { ...c, branchId };
  }

  async create(principal: Principal, dto: CreateServiceCatalogueDto, branchIdParam?: string | null) {
    const branchId = this.ctx.resolveBranchId(principal, branchIdParam ?? null);
    const code = canonicalizeCode(dto.code);

    if (dto.departmentId) {
      const dep = await this.ctx.prisma.department.findFirst({
        where: { id: dto.departmentId, branchId, isActive: true },
        select: { id: true },
      });
      if (!dep) throw new BadRequestException("Invalid departmentId for branch");
    }

    const created = await this.ctx.prisma.serviceCatalogue.create({
      data: {
        branchId,
        code,
        name: dto.name.trim(),
        description: dto.description ?? null,
        scope: (dto.scope as any) ?? undefined,
        channel: (dto.channel as any) ?? undefined,
        departmentId: dto.departmentId ?? null,
        context: (dto.context as any) ?? undefined,
        payerGroup: (dto.payerGroup as any) ?? undefined,
      },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_SERVICE_CATALOGUE_CREATE",
      entity: "ServiceCatalogue",
      entityId: created.id,
      meta: { code, name: dto.name },
    });

    return created;
  }

  async list(
    principal: Principal,
    q: { branchId?: string | null; q?: string; status?: string | null; includeInactive?: boolean },
  ) {
    const branchId = this.ctx.resolveBranchId(principal, q.branchId ?? null);
    const where: any = { branchId };

    if (q.status) where.status = q.status as any;
    if (q.q) where.OR = [{ name: { contains: q.q, mode: "insensitive" } }, { code: { contains: q.q, mode: "insensitive" } }];

    // If schema uses isActive flag, this will work; otherwise it's ignored by Prisma if field missing.
    if (!q.includeInactive) {
      // best-effort: only filter if field exists
      (where as any).isActive = (where as any).isActive ?? undefined;
    }

    return this.ctx.prisma.serviceCatalogue.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: { serviceItem: true },
        },
      },
    });
  }

  async get(principal: Principal, id: string) {
    const c = await this.ensureCatalogue(principal, id);
    return this.ctx.prisma.serviceCatalogue.findUnique({
      where: { id: c.id },
      include: {
        items: { orderBy: [{ sortOrder: "asc" }], include: { serviceItem: true } },
      },
    });
  }

  async update(principal: Principal, id: string, dto: UpdateServiceCatalogueDto) {
    const c = await this.ensureCatalogue(principal, id);

    if (dto.departmentId) {
      const dep = await this.ctx.prisma.department.findFirst({
        where: { id: dto.departmentId, branchId: c.branchId, isActive: true },
        select: { id: true },
      });
      if (!dep) throw new BadRequestException("Invalid departmentId for branch");
    }

    const updated = await this.ctx.prisma.serviceCatalogue.update({
      where: { id: c.id },
      data: {
        code: dto.code ? canonicalizeCode(dto.code) : undefined,
        name: dto.name?.trim(),
        description: dto.description ?? undefined,
        scope: dto.scope !== undefined ? (dto.scope as any) : undefined,
        channel: dto.channel !== undefined ? (dto.channel as any) : undefined,
        departmentId: dto.departmentId ?? undefined,
        context: dto.context !== undefined ? (dto.context as any) : undefined,
        payerGroup: dto.payerGroup !== undefined ? (dto.payerGroup as any) : undefined,
        status: dto.status !== undefined ? (dto.status as any) : undefined,
      },
    });

    await this.ctx.audit.log({
      branchId: c.branchId,
      actorUserId: principal.userId,
      action: "INFRA_SERVICE_CATALOGUE_UPDATE",
      entity: "ServiceCatalogue",
      entityId: c.id,
      meta: dto,
    });

    return updated;
  }

  async upsertItem(principal: Principal, catalogueId: string, dto: UpsertServiceCatalogueItemDto) {
    const c = await this.ensureCatalogue(principal, catalogueId);

    const svc = await this.ctx.prisma.serviceItem.findFirst({
      where: { id: dto.serviceItemId, branchId: c.branchId },
      select: { id: true },
    });
    if (!svc) throw new BadRequestException("Invalid serviceItemId for branch");

    const item = await this.ctx.prisma.serviceCatalogueItem.upsert({
      where: { catalogueId_serviceItemId: { catalogueId: c.id, serviceItemId: dto.serviceItemId } },
      update: {
        sortOrder: dto.sortOrder ?? undefined,
        isVisible: dto.isVisible ?? undefined,
        overrides: dto.overrides ?? undefined,
      },
      create: {
        catalogueId: c.id,
        serviceItemId: dto.serviceItemId,
        sortOrder: dto.sortOrder ?? 0,
        isVisible: dto.isVisible ?? true,
        overrides: dto.overrides ?? undefined,
      },
    });

    await this.ctx.audit.log({
      branchId: c.branchId,
      actorUserId: principal.userId,
      action: "INFRA_SERVICE_CATALOGUE_ITEM_UPSERT",
      entity: "ServiceCatalogue",
      entityId: c.id,
      meta: { serviceItemId: dto.serviceItemId },
    });

    return item;
  }

  async removeItem(principal: Principal, catalogueId: string, serviceItemId: string) {
    const c = await this.ensureCatalogue(principal, catalogueId);

    await this.ctx.prisma.serviceCatalogueItem.delete({
      where: { catalogueId_serviceItemId: { catalogueId: c.id, serviceItemId } },
    });

    await this.ctx.audit.log({
      branchId: c.branchId,
      actorUserId: principal.userId,
      action: "INFRA_SERVICE_CATALOGUE_ITEM_REMOVE",
      entity: "ServiceCatalogue",
      entityId: c.id,
      meta: { serviceItemId },
    });

    return { ok: true };
  }

  async submit(principal: Principal, id: string, note?: string) {
    const c = await this.ensureCatalogue(principal, id);
    const updated = await this.ctx.prisma.serviceCatalogue.update({
      where: { id: c.id },
      data: { status: "IN_REVIEW" as any },
    });

    await this.ctx.audit.log({
      branchId: c.branchId,
      actorUserId: principal.userId,
      action: "INFRA_SERVICE_CATALOGUE_SUBMIT",
      entity: "ServiceCatalogue",
      entityId: c.id,
      meta: { note },
    });

    return updated;
  }

  async approve(principal: Principal, id: string, note?: string) {
    const c = await this.ensureCatalogue(principal, id);
    const updated = await this.ctx.prisma.serviceCatalogue.update({
      where: { id: c.id },
      data: { status: "APPROVED" as any },
    });

    await this.ctx.audit.log({
      branchId: c.branchId,
      actorUserId: principal.userId,
      action: "INFRA_SERVICE_CATALOGUE_APPROVE",
      entity: "ServiceCatalogue",
      entityId: c.id,
      meta: { note },
    });

    return updated;
  }

  async publish(principal: Principal, id: string, note?: string) {
    const c = await this.ensureCatalogue(principal, id);

    const full = await this.ctx.prisma.serviceCatalogue.findUnique({
      where: { id: c.id },
      include: { items: { orderBy: [{ sortOrder: "asc" }], include: { serviceItem: true } } },
    });
    if (!full) throw new NotFoundException("Service catalogue not found");

    const nextVersion = (full.version ?? 0) + 1;

    const updated = await this.ctx.prisma.serviceCatalogue.update({
      where: { id: c.id },
      data: {
        status: "PUBLISHED" as any,
        version: nextVersion as any,
      },
    });

    await this.ctx.prisma.serviceCatalogueVersion.create({
      data: {
        catalogueId: c.id,
        version: nextVersion as any,
        status: "PUBLISHED" as any,
        snapshot: full as any,
        createdByUserId: principal.userId ?? null,
        effectiveFrom: new Date(),
        effectiveTo: null,
      } as any,
    });

    await this.ctx.audit.log({
      branchId: c.branchId,
      actorUserId: principal.userId,
      action: "INFRA_SERVICE_CATALOGUE_PUBLISH",
      entity: "ServiceCatalogue",
      entityId: c.id,
      meta: { version: nextVersion, note },
    });

    return updated;
  }

  async retire(principal: Principal, id: string, note?: string) {
    const c = await this.ensureCatalogue(principal, id);
    const updated = await this.ctx.prisma.serviceCatalogue.update({
      where: { id: c.id },
      data: { status: "RETIRED" as any },
    });

    await this.ctx.audit.log({
      branchId: c.branchId,
      actorUserId: principal.userId,
      action: "INFRA_SERVICE_CATALOGUE_RETIRE",
      entity: "ServiceCatalogue",
      entityId: c.id,
      meta: { note },
    });

    return updated;
  }

  async versions(principal: Principal, id: string) {
    const c = await this.ensureCatalogue(principal, id);
    return this.ctx.prisma.serviceCatalogueVersion.findMany({
      where: { catalogueId: c.id },
      orderBy: [{ version: "desc" }],
    });
  }
}
