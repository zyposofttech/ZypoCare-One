import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import type { Principal } from "../../auth/access-policy.service";
import { canonicalizeCode } from "../../../common/naming.util";
import { InfraContextService } from "../shared/infra-context.service";

import type { CreateOrderSetDto, UpdateOrderSetDto, UpsertOrderSetItemDto } from "./dto";

@Injectable()
export class OrderSetsService {
  constructor(private readonly ctx: InfraContextService) {}

  private async ensureOrderSet(principal: Principal, id: string) {
    const os = await this.ctx.prisma.orderSet.findUnique({
      where: { id },
      select: { id: true, branchId: true, status: true, version: true, code: true, name: true },
    });
    if (!os) throw new NotFoundException("Order set not found");
    const branchId = this.ctx.resolveBranchId(principal, os.branchId);
    return { ...os, branchId };
  }

  async create(principal: Principal, dto: CreateOrderSetDto, branchIdParam?: string | null) {
    const branchId = this.ctx.resolveBranchId(principal, branchIdParam ?? null);
    const code = canonicalizeCode(dto.code);

    const created = await this.ctx.prisma.orderSet.create({
      data: {
        branchId,
        code,
        name: dto.name.trim(),
        description: dto.description ?? null,
        // Note: schema does not include departmentId in OrderSet. If you add it later,
        // you can wire dto.departmentId here.
        channel: (dto.channel as any) ?? undefined,
      },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_ORDER_SET_CREATE",
      entity: "OrderSet",
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

    return this.ctx.prisma.orderSet.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: { serviceItem: true, diagnosticItem: true, pkg: true },
        },
      },
    });
  }

  async get(principal: Principal, id: string) {
    const os = await this.ensureOrderSet(principal, id);
    return this.ctx.prisma.orderSet.findUnique({
      where: { id: os.id },
      include: {
        items: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: { serviceItem: true, diagnosticItem: true, pkg: true },
        },
      },
    });
  }

  async update(principal: Principal, id: string, dto: UpdateOrderSetDto) {
    const os = await this.ensureOrderSet(principal, id);

    const updated = await this.ctx.prisma.orderSet.update({
      where: { id: os.id },
      data: {
        code: dto.code ? canonicalizeCode(dto.code) : undefined,
        name: dto.name?.trim(),
        description: dto.description ?? undefined,
        channel: dto.channel !== undefined ? (dto.channel as any) : undefined,
        status: dto.status !== undefined ? (dto.status as any) : undefined,
      },
    });

    await this.ctx.audit.log({
      branchId: os.branchId,
      actorUserId: principal.userId,
      action: "INFRA_ORDER_SET_UPDATE",
      entity: "OrderSet",
      entityId: os.id,
      meta: dto,
    });

    return updated;
  }

  async upsertItem(principal: Principal, orderSetId: string, dto: UpsertOrderSetItemDto) {
    const os = await this.ensureOrderSet(principal, orderSetId);

    const svc = await this.ctx.prisma.serviceItem.findFirst({
      where: { id: dto.serviceItemId, branchId: os.branchId },
      select: { id: true },
    });
    if (!svc) throw new BadRequestException("Invalid serviceItemId for branch");

    // Schema does not currently support isOptional/rules; we accept them in DTO but do not persist.
    const existing = await this.ctx.prisma.orderSetItem.findFirst({
      where: { orderSetId: os.id, itemType: "SERVICE_ITEM" as any, serviceItemId: dto.serviceItemId, isActive: true },
      select: { id: true },
    });

    const item = existing
      ? await this.ctx.prisma.orderSetItem.update({
          where: { id: existing.id },
          data: { sortOrder: dto.sortOrder ?? undefined, isActive: true },
        })
      : await this.ctx.prisma.orderSetItem.create({
          data: {
            orderSetId: os.id,
            itemType: "SERVICE_ITEM" as any,
            serviceItemId: dto.serviceItemId,
            quantity: 1,
            sortOrder: dto.sortOrder ?? 0,
            isActive: true,
          },
        });

    await this.ctx.audit.log({
      branchId: os.branchId,
      actorUserId: principal.userId,
      action: "INFRA_ORDER_SET_ITEM_UPSERT",
      entity: "OrderSet",
      entityId: os.id,
      meta: { serviceItemId: dto.serviceItemId },
    });

    return item;
  }

  async removeItem(principal: Principal, orderSetId: string, serviceItemId: string) {
    const os = await this.ensureOrderSet(principal, orderSetId);

    await this.ctx.prisma.orderSetItem.updateMany({
      where: { orderSetId: os.id, itemType: "SERVICE_ITEM" as any, serviceItemId },
      data: { isActive: false },
    });

    await this.ctx.audit.log({
      branchId: os.branchId,
      actorUserId: principal.userId,
      action: "INFRA_ORDER_SET_ITEM_REMOVE",
      entity: "OrderSet",
      entityId: os.id,
      meta: { serviceItemId },
    });

    return { ok: true };
  }

  async submit(principal: Principal, id: string, note?: string) {
    const os = await this.ensureOrderSet(principal, id);
    const updated = await this.ctx.prisma.orderSet.update({
      where: { id: os.id },
      data: { status: "IN_REVIEW" as any },
    });

    await this.ctx.audit.log({
      branchId: os.branchId,
      actorUserId: principal.userId,
      action: "INFRA_ORDER_SET_SUBMIT",
      entity: "OrderSet",
      entityId: os.id,
      meta: { note },
    });

    return updated;
  }

  async approve(principal: Principal, id: string, note?: string) {
    const os = await this.ensureOrderSet(principal, id);
    const updated = await this.ctx.prisma.orderSet.update({
      where: { id: os.id },
      data: { status: "APPROVED" as any },
    });

    await this.ctx.audit.log({
      branchId: os.branchId,
      actorUserId: principal.userId,
      action: "INFRA_ORDER_SET_APPROVE",
      entity: "OrderSet",
      entityId: os.id,
      meta: { note },
    });

    return updated;
  }

  async publish(principal: Principal, id: string, note?: string) {
    const os = await this.ensureOrderSet(principal, id);

    const full = await this.ctx.prisma.orderSet.findUnique({
      where: { id: os.id },
      include: { items: { orderBy: [{ sortOrder: "asc" }], include: { serviceItem: true, diagnosticItem: true, pkg: true } } },
    });
    if (!full) throw new NotFoundException("Order set not found");

    const nextVersion = (full.version ?? 0) + 1;

    const updated = await this.ctx.prisma.orderSet.update({
      where: { id: os.id },
      data: {
        status: "PUBLISHED" as any,
        version: nextVersion as any,
        effectiveFrom: full.effectiveFrom ?? new Date(),
        effectiveTo: null,
      },
    });

    await this.ctx.prisma.orderSetVersion.create({
      data: {
        orderSetId: os.id,
        version: nextVersion as any,
        status: "PUBLISHED" as any,
        snapshot: full as any,
        effectiveFrom: new Date(),
        effectiveTo: null,
      } as any,
    });

    await this.ctx.audit.log({
      branchId: os.branchId,
      actorUserId: principal.userId,
      action: "INFRA_ORDER_SET_PUBLISH",
      entity: "OrderSet",
      entityId: os.id,
      meta: { version: nextVersion, note },
    });

    return updated;
  }

  async retire(principal: Principal, id: string, note?: string) {
    const os = await this.ensureOrderSet(principal, id);
    const updated = await this.ctx.prisma.orderSet.update({
      where: { id: os.id },
      data: { status: "RETIRED" as any, effectiveTo: new Date() },
    });

    await this.ctx.audit.log({
      branchId: os.branchId,
      actorUserId: principal.userId,
      action: "INFRA_ORDER_SET_RETIRE",
      entity: "OrderSet",
      entityId: os.id,
      meta: { note },
    });

    return updated;
  }

  async versions(principal: Principal, id: string) {
    const os = await this.ensureOrderSet(principal, id);
    return this.ctx.prisma.orderSetVersion.findMany({
      where: { orderSetId: os.id },
      orderBy: [{ version: "desc" }],
    });
  }
}
