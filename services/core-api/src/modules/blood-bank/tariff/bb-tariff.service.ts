import { Injectable } from "@nestjs/common";
import { BBContextService } from "../shared/bb-context.service";
import type { Principal } from "../../auth/access-policy.service";
import type { UpsertTariffDto } from "./dto";

@Injectable()
export class BBTariffService {
  constructor(private readonly ctx: BBContextService) {}

  async list(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    return this.ctx.prisma.bBTariffConfig.findMany({
      where: { branchId: bid, isActive: true },
      include: { componentMaster: { select: { id: true, name: true, componentType: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async upsert(principal: Principal, dto: UpsertTariffDto) {
    const bid = this.ctx.resolveBranchId(principal, dto.branchId);
    let result;
    if (dto.id) {
      result = await this.ctx.prisma.bBTariffConfig.update({
        where: { id: dto.id },
        data: {
          chargeType: dto.chargeType,
          amount: dto.amount,
          currency: dto.currency,
          gstPercent: dto.gstPercent,
          govSchemeCode: dto.govSchemeCode,
          govSchemeRate: dto.govSchemeRate,
        },
      });
    } else {
      result = await this.ctx.prisma.bBTariffConfig.create({
        data: {
          branchId: bid,
          componentMasterId: dto.componentMasterId,
          chargeType: dto.chargeType,
          amount: dto.amount,
          currency: dto.currency,
          gstPercent: dto.gstPercent,
          govSchemeCode: dto.govSchemeCode,
          govSchemeRate: dto.govSchemeRate,
        },
      });
    }
    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: dto.id ? "BB_TARIFF_UPDATE" : "BB_TARIFF_CREATE",
      entity: "BBTariffConfig", entityId: result.id, meta: { dto },
    });
    return result;
  }
}
