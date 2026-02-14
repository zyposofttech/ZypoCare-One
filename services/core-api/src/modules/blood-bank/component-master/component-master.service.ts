import { Injectable, NotFoundException } from "@nestjs/common";
import { BBContextService } from "../shared/bb-context.service";
import type { Principal } from "../../auth/access-policy.service";
import type { CreateComponentDto, UpdateComponentDto } from "./dto";

@Injectable()
export class ComponentMasterService {
  constructor(private readonly ctx: BBContextService) {}

  async list(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    return this.ctx.prisma.bloodComponentMaster.findMany({
      where: { branchId: bid, isActive: true },
      orderBy: { name: "asc" },
    });
  }

  async create(principal: Principal, dto: CreateComponentDto) {
    const bid = this.ctx.resolveBranchId(principal, dto.branchId);
    const result = await this.ctx.prisma.bloodComponentMaster.create({
      data: {
        branchId: bid,
        componentType: dto.componentType as any,
        name: dto.name!,
        code: dto.code!,
        shelfLifeDays: dto.shelfLifeDays!,
        storageMinTempC: dto.storageMinTemp!,
        storageMaxTempC: dto.storageMaxTemp!,
        volumeMinMl: dto.minVolumeMl,
        volumeMaxMl: dto.maxVolumeMl,
        preparationMethod: dto.preparationMethod,
      },
    });
    await this.ctx.audit.log({
      branchId: bid,
      actorUserId: principal.userId,
      action: "BB_COMPONENT_CREATE",
      entity: "BloodComponentMaster",
      entityId: result.id,
      meta: { dto },
    });
    return result;
  }

  async update(principal: Principal, id: string, dto: UpdateComponentDto) {
    const existing = await this.ctx.prisma.bloodComponentMaster.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Component not found");
    const bid = this.ctx.resolveBranchId(principal, existing.branchId);
    const result = await this.ctx.prisma.bloodComponentMaster.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        shelfLifeDays: dto.shelfLifeDays,
        storageMinTempC: dto.storageMinTemp,
        storageMaxTempC: dto.storageMaxTemp,
        volumeMinMl: dto.minVolumeMl,
        volumeMaxMl: dto.maxVolumeMl,
        preparationMethod: dto.preparationMethod,
        isActive: dto.isActive,
      },
    });
    await this.ctx.audit.log({
      branchId: bid,
      actorUserId: principal.userId,
      action: "BB_COMPONENT_UPDATE",
      entity: "BloodComponentMaster",
      entityId: id,
      meta: { dto },
    });
    return result;
  }
}
