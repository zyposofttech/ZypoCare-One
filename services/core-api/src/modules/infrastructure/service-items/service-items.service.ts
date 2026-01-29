import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { InfraContextService } from "../shared/infra-context.service";
import { ServiceChargeMappingService } from "./service-charge-mapping.service";
import type { CreateServiceItemDto } from "./dto";
import { canonicalizeCode } from "../../../common/naming.util";

@Injectable()
export class ServiceItemsService {
  constructor(
    private readonly ctx: InfraContextService,
    private readonly mappingSvc: ServiceChargeMappingService,
  ) {}

  async createServiceItem(principal: Principal, dto: CreateServiceItemDto, branchIdParam?: string | null) {
    const branchId = this.ctx.resolveBranchId(principal, branchIdParam ?? null);
    const code = canonicalizeCode(dto.code);

    const created = await this.ctx.prisma.serviceItem.create({
      data: {
        branchId,
        code,
        name: dto.name.trim(),
        category: dto.category.trim(),
        unit: dto.unit ?? null,
        isOrderable: dto.isOrderable ?? true,
        isActive: dto.isActive ?? true,
      },
    });

    // If no mapping, open Fix-It (as per requirement)
    if (!dto.chargeMasterCode) {
      await this.ctx.prisma.fixItTask.create({
        data: {
          branchId,
          type: "SERVICE_CHARGE_MAPPING_MISSING" as any,
          status: "OPEN" as any,
          title: `Charge mapping missing for service ${created.code}`,
          details: { serviceItemId: created.id, serviceCode: created.code },
          serviceItemId: created.id,
        },
      });
    } else {
      const cm = await this.ctx.prisma.chargeMasterItem.findFirst({
        where: { branchId, code: canonicalizeCode(dto.chargeMasterCode), isActive: true },
        select: { id: true },
      });

      if (!cm) {
        await this.ctx.prisma.fixItTask.create({
          data: {
            branchId,
            type: "SERVICE_CHARGE_MAPPING_MISSING" as any,
            status: "OPEN" as any,
            title: `Charge master code not found for service ${created.code}`,
            details: { serviceItemId: created.id, serviceCode: created.code, chargeMasterCode: dto.chargeMasterCode },
            serviceItemId: created.id,
          },
        });
      } else {
        await this.mappingSvc.upsertServiceChargeMapping(principal, {
          serviceItemId: created.id,
          chargeMasterItemId: cm.id,
          effectiveFrom: new Date().toISOString(),
          effectiveTo: null,
        });
      }
    }

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_SERVICE_CREATE",
      entity: "ServiceItem",
      entityId: created.id,
      meta: dto,
    });

    return created;
  }

  async listServiceItems(principal: Principal, q: { branchId?: string | null; q?: string; includeInactive?: boolean }) {
    const branchId = this.ctx.resolveBranchId(principal, q.branchId ?? null);
    const where: any = { branchId };
    if (!q.includeInactive) where.isActive = true;
    if (q.q) where.OR = [{ name: { contains: q.q, mode: "insensitive" } }, { code: { contains: q.q, mode: "insensitive" } }];

    return this.ctx.prisma.serviceItem.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: {
        mappings: { orderBy: [{ effectiveFrom: "desc" }], take: 3, include: { chargeMasterItem: true } },
      },
    });
  }

  async updateServiceItem(principal: Principal, id: string, dto: Partial<CreateServiceItemDto>) {
    const svc = await this.ctx.prisma.serviceItem.findUnique({ where: { id }, select: { id: true, branchId: true } });
    if (!svc) throw new NotFoundException("Service not found");
    const branchId = this.ctx.resolveBranchId(principal, svc.branchId);

    const updated = await this.ctx.prisma.serviceItem.update({
      where: { id },
      data: {
        code: dto.code ? canonicalizeCode(dto.code) : undefined,
        name: dto.name?.trim(),
        category: dto.category?.trim(),
        unit: dto.unit ?? undefined,
        isOrderable: dto.isOrderable ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_SERVICE_UPDATE",
      entity: "ServiceItem",
      entityId: id,
      meta: dto,
    });

    return updated;
  }
}