import { Injectable, NotFoundException } from "@nestjs/common";
import { BBContextService } from "../shared/bb-context.service";
import type { Principal } from "../../auth/access-policy.service";
import type { CreateReagentDto, UpdateReagentDto } from "./dto";

@Injectable()
export class ReagentService {
  constructor(private readonly ctx: BBContextService) {}

  async list(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    return this.ctx.prisma.bloodBankReagent.findMany({
      where: { branchId: bid, isActive: true },
      orderBy: { name: "asc" },
    });
  }

  async create(principal: Principal, dto: CreateReagentDto) {
    const bid = this.ctx.resolveBranchId(principal, dto.branchId);
    const result = await this.ctx.prisma.bloodBankReagent.create({
      data: {
        branchId: bid,
        name: dto.name!,
        code: dto.code!,
        category: dto.reagentType ?? "GENERAL",
        lotNumber: dto.lotNumber,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        stockQty: dto.currentStock ?? 0,
        minStockQty: dto.minStock ?? 0,
      },
    });
    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_REAGENT_CREATE", entity: "BloodBankReagent", entityId: result.id, meta: { dto },
    });
    return result;
  }

  async update(principal: Principal, id: string, dto: UpdateReagentDto) {
    const existing = await this.ctx.prisma.bloodBankReagent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Reagent not found");
    const bid = this.ctx.resolveBranchId(principal, existing.branchId);
    const result = await this.ctx.prisma.bloodBankReagent.update({
      where: { id },
      data: {
        name: dto.name, code: dto.code, lotNumber: dto.lotNumber,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        stockQty: dto.currentStock, minStockQty: dto.minStock, isActive: dto.isActive,
      },
    });
    await this.ctx.audit.log({
      branchId: bid, actorUserId: principal.userId,
      action: "BB_REAGENT_UPDATE", entity: "BloodBankReagent", entityId: id, meta: { dto },
    });
    return result;
  }
}
