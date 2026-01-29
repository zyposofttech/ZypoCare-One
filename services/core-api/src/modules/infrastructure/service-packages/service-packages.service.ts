import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import type { Principal } from "../../auth/access-policy.service";
import { canonicalizeCode } from "../../../common/naming.util";
import { InfraContextService } from "../shared/infra-context.service";

import type { CreateServicePackageDto, UpdateServicePackageDto, UpsertPackageComponentDto } from "./dto";

@Injectable()
export class ServicePackagesService {
  constructor(private readonly ctx: InfraContextService) {}

  private async ensurePackage(principal: Principal, id: string) {
    const p = await this.ctx.prisma.servicePackage.findUnique({
      where: { id },
      select: { id: true, branchId: true, status: true, version: true, code: true, name: true },
    });
    if (!p) throw new NotFoundException("Service package not found");
    const branchId = this.ctx.resolveBranchId(principal, p.branchId);
    return { ...p, branchId };
  }

  async create(principal: Principal, dto: CreateServicePackageDto, branchIdParam?: string | null) {
    const branchId = this.ctx.resolveBranchId(principal, branchIdParam ?? null);
    const code = canonicalizeCode(dto.code);

    const created = await this.ctx.prisma.servicePackage.create({
      data: {
        branchId,
        code,
        name: dto.name.trim(),
        description: dto.description ?? null,
      },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_SERVICE_PACKAGE_CREATE",
      entity: "ServicePackage",
      entityId: created.id,
      meta: { code, name: dto.name },
    });

    return created;
  }

  async list(principal: Principal, q: { branchId?: string | null; q?: string; status?: string | null }) {
    const branchId = this.ctx.resolveBranchId(principal, q.branchId ?? null);
    const where: any = { branchId };
    if (q.status) where.status = q.status as any;
    if (q.q)
      where.OR = [
        { name: { contains: q.q, mode: "insensitive" } },
        { code: { contains: q.q, mode: "insensitive" } },
      ];

    return this.ctx.prisma.servicePackage.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        components: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: { serviceItem: true, diagnosticItem: true, chargeMaster: true },

        },
      },
    });
  }

  async get(principal: Principal, id: string) {
    const p = await this.ensurePackage(principal, id);
    return this.ctx.prisma.servicePackage.findUnique({
      where: { id: p.id },
      include: {
        components: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: { serviceItem: true, diagnosticItem: true, chargeMaster: true },
        },
      },
    });
  }

  async update(principal: Principal, id: string, dto: UpdateServicePackageDto) {
    const p = await this.ensurePackage(principal, id);

    const updated = await this.ctx.prisma.servicePackage.update({
      where: { id: p.id },
      data: {
        code: dto.code ? canonicalizeCode(dto.code) : undefined,
        name: dto.name?.trim(),
        description: dto.description ?? undefined,
        status: dto.status !== undefined ? (dto.status as any) : undefined,
      },
    });

    await this.ctx.audit.log({
      branchId: p.branchId,
      actorUserId: principal.userId,
      action: "INFRA_SERVICE_PACKAGE_UPDATE",
      entity: "ServicePackage",
      entityId: p.id,
      meta: dto,
    });

    return updated;
  }

  async upsertComponent(principal: Principal, packageId: string, dto: UpsertPackageComponentDto) {
    const p = await this.ensurePackage(principal, packageId);

    const svc = await this.ctx.prisma.serviceItem.findFirst({
      where: { id: dto.serviceItemId, branchId: p.branchId },
      select: { id: true },
    });
    if (!svc) throw new BadRequestException("Invalid serviceItemId for branch");

    // Schema uses `condition` (Json?) on ServicePackageComponent.
    const condition = dto.rules ?? undefined;

    const existing = await this.ctx.prisma.servicePackageComponent.findFirst({
      where: {
        packageId: p.id,
        componentType: "SERVICE_ITEM" as any,
        serviceItemId: dto.serviceItemId,
        isActive: true,
      },
      select: { id: true },
    });

    const component = existing
      ? await this.ctx.prisma.servicePackageComponent.update({
          where: { id: existing.id },
          data: {
            quantity: dto.quantity ?? undefined,
            isIncluded: dto.isIncluded ?? undefined,
            condition,
            isActive: true,
          },
        })
      : await this.ctx.prisma.servicePackageComponent.create({
          data: {
            packageId: p.id,
            componentType: "SERVICE_ITEM" as any,
            serviceItemId: dto.serviceItemId,
            quantity: dto.quantity ?? 1,
            isIncluded: dto.isIncluded ?? true,
            condition,
            sortOrder: 0,
            isActive: true,
          },
        });

    await this.ctx.audit.log({
      branchId: p.branchId,
      actorUserId: principal.userId,
      action: "INFRA_SERVICE_PACKAGE_COMPONENT_UPSERT",
      entity: "ServicePackage",
      entityId: p.id,
      meta: { serviceItemId: dto.serviceItemId },
    });

    return component;
  }

  async removeComponent(principal: Principal, packageId: string, serviceItemId: string) {
    const p = await this.ensurePackage(principal, packageId);

    await this.ctx.prisma.servicePackageComponent.updateMany({
      where: { packageId: p.id, componentType: "SERVICE_ITEM" as any, serviceItemId },
      data: { isActive: false },
    });

    await this.ctx.audit.log({
      branchId: p.branchId,
      actorUserId: principal.userId,
      action: "INFRA_SERVICE_PACKAGE_COMPONENT_REMOVE",
      entity: "ServicePackage",
      entityId: p.id,
      meta: { serviceItemId },
    });

    return { ok: true };
  }

  async submit(principal: Principal, id: string, note?: string) {
    const p = await this.ensurePackage(principal, id);
    const updated = await this.ctx.prisma.servicePackage.update({
      where: { id: p.id },
      data: { status: "IN_REVIEW" as any },
    });

    await this.ctx.audit.log({
      branchId: p.branchId,
      actorUserId: principal.userId,
      action: "INFRA_SERVICE_PACKAGE_SUBMIT",
      entity: "ServicePackage",
      entityId: p.id,
      meta: { note },
    });

    return updated;
  }

  async approve(principal: Principal, id: string, note?: string) {
    const p = await this.ensurePackage(principal, id);
    const updated = await this.ctx.prisma.servicePackage.update({
      where: { id: p.id },
      data: { status: "APPROVED" as any },
    });

    await this.ctx.audit.log({
      branchId: p.branchId,
      actorUserId: principal.userId,
      action: "INFRA_SERVICE_PACKAGE_APPROVE",
      entity: "ServicePackage",
      entityId: p.id,
      meta: { note },
    });

    return updated;
  }

  async publish(principal: Principal, id: string, note?: string) {
    const p = await this.ensurePackage(principal, id);

    const full = await this.ctx.prisma.servicePackage.findUnique({
      where: { id: p.id },
      include: {
        components: {
          orderBy: [{ sortOrder: "asc" }],
          include: { serviceItem: true, diagnosticItem: true, chargeMaster: true },
        },
      },
    });
    if (!full) throw new NotFoundException("Service package not found");

    const nextVersion = (full.version ?? 0) + 1;

    const updated = await this.ctx.prisma.servicePackage.update({
      where: { id: p.id },
      data: {
        status: "PUBLISHED" as any,
        version: nextVersion as any,
        effectiveFrom: full.effectiveFrom ?? new Date(),
        effectiveTo: null,
      },
    });

    await this.ctx.prisma.servicePackageVersion.create({
      data: {
        packageId: p.id,
        version: nextVersion as any,
        status: "PUBLISHED" as any,
        snapshot: full as any,
        effectiveFrom: new Date(),
        effectiveTo: null,
      } as any,
    });

    await this.ctx.audit.log({
      branchId: p.branchId,
      actorUserId: principal.userId,
      action: "INFRA_SERVICE_PACKAGE_PUBLISH",
      entity: "ServicePackage",
      entityId: p.id,
      meta: { version: nextVersion, note },
    });

    return updated;
  }

  async retire(principal: Principal, id: string, note?: string) {
    const p = await this.ensurePackage(principal, id);
    const updated = await this.ctx.prisma.servicePackage.update({
      where: { id: p.id },
      data: { status: "RETIRED" as any, effectiveTo: new Date() },
    });

    await this.ctx.audit.log({
      branchId: p.branchId,
      actorUserId: principal.userId,
      action: "INFRA_SERVICE_PACKAGE_RETIRE",
      entity: "ServicePackage",
      entityId: p.id,
      meta: { note },
    });

    return updated;
  }

  async versions(principal: Principal, id: string) {
    const p = await this.ensurePackage(principal, id);
    return this.ctx.prisma.servicePackageVersion.findMany({
      where: { packageId: p.id },
      orderBy: [{ version: "desc" }],
    });
  }
}
