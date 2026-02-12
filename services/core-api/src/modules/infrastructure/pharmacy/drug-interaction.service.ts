import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InfraContextService } from "../shared/infra-context.service";
import type {
  CreateDrugInteractionDto,
  UpdateDrugInteractionDto,
} from "./dto/create-drug-interaction.dto";

@Injectable()
export class DrugInteractionService {
  constructor(private readonly ctx: InfraContextService) {}

  async listInteractions(
    principal: any,
    options: {
      branchId?: string;
      drugId?: string;
      severity?: string;
      source?: string;
      q?: string;
      page?: number;
      pageSize?: number;
    }
  ) {
    const {
      branchId: rawBranchId,
      drugId,
      severity,
      source,
      q,
      page = 1,
      pageSize = 50,
    } = options;

    const branchId = await this.ctx.resolveBranchId(principal, rawBranchId);
    const skip = (page - 1) * pageSize;

    // DrugInteraction has no branchId — filter by drugs belonging to this branch
    const where: any = {
      drugA: { branchId },
    };

    if (drugId) {
      where.OR = [{ drugAId: drugId }, { drugBId: drugId }];
    }

    if (severity) {
      where.severity = severity as any;
    }

    if (source) {
      where.source = source as any;
    }

    if (q) {
      const searchFilter = [
        { drugA: { drugCode: { contains: q, mode: "insensitive" as const } } },
        { drugA: { genericName: { contains: q, mode: "insensitive" as const } } },
        { drugA: { brandName: { contains: q, mode: "insensitive" as const } } },
        { drugB: { drugCode: { contains: q, mode: "insensitive" as const } } },
        { drugB: { genericName: { contains: q, mode: "insensitive" as const } } },
        { drugB: { brandName: { contains: q, mode: "insensitive" as const } } },
      ];
      where.OR = [...(where.OR || []), ...searchFilter];
    }

    const [rows, total] = await Promise.all([
      this.ctx.prisma.drugInteraction.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          drugA: {
            select: {
              id: true,
              drugCode: true,
              genericName: true,
              brandName: true,
            },
          },
          drugB: {
            select: {
              id: true,
              drugCode: true,
              genericName: true,
              brandName: true,
            },
          },
        },
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
      }),
      this.ctx.prisma.drugInteraction.count({ where }),
    ]);

    return { rows, total, page, pageSize };
  }

  async getInteraction(principal: any, id: string) {
    const interaction = await this.ctx.prisma.drugInteraction.findUnique({
      where: { id },
      include: {
        drugA: {
          select: {
            id: true,
            drugCode: true,
            genericName: true,
            brandName: true,
          },
        },
        drugB: {
          select: {
            id: true,
            drugCode: true,
            genericName: true,
            brandName: true,
          },
        },
      },
    });

    if (!interaction) {
      throw new NotFoundException("Drug interaction not found");
    }

    return interaction;
  }

  async createInteraction(
    principal: any,
    dto: CreateDrugInteractionDto,
    branchId?: string
  ) {
    const resolvedBranchId = await this.ctx.resolveBranchId(principal, branchId);

    // Validate both drugs exist in the same branch
    const [drugA, drugB] = await Promise.all([
      this.ctx.prisma.drugMaster.findUnique({ where: { id: dto.drugAId } }),
      this.ctx.prisma.drugMaster.findUnique({ where: { id: dto.drugBId } }),
    ]);

    if (!drugA || drugA.branchId !== resolvedBranchId) {
      throw new BadRequestException("Drug A not found in the specified branch");
    }

    if (!drugB || drugB.branchId !== resolvedBranchId) {
      throw new BadRequestException("Drug B not found in the specified branch");
    }

    if (dto.drugAId === dto.drugBId) {
      throw new BadRequestException("A drug cannot interact with itself");
    }

    // Check for duplicate pair (A-B or B-A)
    const existing = await this.ctx.prisma.drugInteraction.findFirst({
      where: {
        OR: [
          { drugAId: dto.drugAId, drugBId: dto.drugBId },
          { drugAId: dto.drugBId, drugBId: dto.drugAId },
        ],
      },
    });

    if (existing) {
      throw new BadRequestException("Interaction between these drugs already exists");
    }

    const interaction = await this.ctx.prisma.drugInteraction.create({
      data: {
        drugAId: dto.drugAId,
        drugBId: dto.drugBId,
        severity: dto.severity as any,
        description: dto.description,
        recommendation: dto.recommendation,
        source: (dto.source || "CUSTOM") as any,
      },
      include: {
        drugA: {
          select: { id: true, drugCode: true, genericName: true, brandName: true },
        },
        drugB: {
          select: { id: true, drugCode: true, genericName: true, brandName: true },
        },
      },
    });

    await this.ctx.audit.log({
      actorUserId: principal.userId,
      action: "PHARMACY_INTERACTION_CREATE",
      entity: "DrugInteraction",
      entityId: interaction.id,
      branchId: resolvedBranchId,
      meta: {
        drugAId: dto.drugAId,
        drugBId: dto.drugBId,
        severity: dto.severity,
      },
    });

    return interaction;
  }

  async updateInteraction(
    principal: any,
    id: string,
    dto: UpdateDrugInteractionDto
  ) {
    const existing = await this.ctx.prisma.drugInteraction.findUnique({
      where: { id },
      include: { drugA: { select: { branchId: true } } },
    });

    if (!existing) {
      throw new NotFoundException("Drug interaction not found");
    }

    const data: any = {};
    if (dto.severity !== undefined) data.severity = dto.severity as any;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.recommendation !== undefined) data.recommendation = dto.recommendation;

    const interaction = await this.ctx.prisma.drugInteraction.update({
      where: { id },
      data,
      include: {
        drugA: {
          select: { id: true, drugCode: true, genericName: true, brandName: true },
        },
        drugB: {
          select: { id: true, drugCode: true, genericName: true, brandName: true },
        },
      },
    });

    await this.ctx.audit.log({
      actorUserId: principal.userId,
      action: "PHARMACY_INTERACTION_UPDATE",
      entity: "DrugInteraction",
      entityId: id,
      branchId: existing.drugA.branchId,
      meta: { updates: dto },
    });

    return interaction;
  }

  async deleteInteraction(principal: any, id: string) {
    const existing = await this.ctx.prisma.drugInteraction.findUnique({
      where: { id },
      include: { drugA: { select: { branchId: true } } },
    });

    if (!existing) {
      throw new NotFoundException("Drug interaction not found");
    }

    await this.ctx.prisma.drugInteraction.delete({ where: { id } });

    await this.ctx.audit.log({
      actorUserId: principal.userId,
      action: "PHARMACY_INTERACTION_DELETE",
      entity: "DrugInteraction",
      entityId: id,
      branchId: existing.drugA.branchId,
      meta: {
        drugAId: existing.drugAId,
        drugBId: existing.drugBId,
      },
    });

    return { success: true };
  }

  async bulkImportInteractions(
    principal: any,
    items: CreateDrugInteractionDto[],
    branchId?: string
  ) {
    const resolvedBranchId = await this.ctx.resolveBranchId(principal, branchId);

    let created = 0;
    const errors: Array<{ index: number; error: string }> = [];

    for (const [index, dto] of (items ?? []).entries()) {
      try {
        const [drugA, drugB] = await Promise.all([
          this.ctx.prisma.drugMaster.findUnique({ where: { id: dto.drugAId } }),
          this.ctx.prisma.drugMaster.findUnique({ where: { id: dto.drugBId } }),
        ]);

        if (!drugA || drugA.branchId !== resolvedBranchId) {
          errors.push({ index, error: "Drug A not found in branch" });
          continue;
        }

        if (!drugB || drugB.branchId !== resolvedBranchId) {
          errors.push({ index, error: "Drug B not found in branch" });
          continue;
        }

        if (dto.drugAId === dto.drugBId) {
          errors.push({ index, error: "Self-interaction not allowed" });
          continue;
        }

        const existing = await this.ctx.prisma.drugInteraction.findFirst({
          where: {
            OR: [
              { drugAId: dto.drugAId, drugBId: dto.drugBId },
              { drugAId: dto.drugBId, drugBId: dto.drugAId },
            ],
          },
        });

        if (existing) {
          errors.push({ index, error: "Interaction already exists" });
          continue;
        }

        await this.ctx.prisma.drugInteraction.create({
          data: {
            drugAId: dto.drugAId,
            drugBId: dto.drugBId,
            severity: dto.severity as any,
            description: dto.description,
            recommendation: dto.recommendation,
            source: (dto.source || "CUSTOM") as any,
          },
        });

        created++;
      } catch (error: any) {
        errors.push({ index, error: error.message });
      }
    }

    await this.ctx.audit.log({
      actorUserId: principal.userId,
      action: "PHARMACY_INTERACTION_BULK_IMPORT",
      entity: "DrugInteraction",
      branchId: resolvedBranchId,
      meta: { created, errorCount: errors.length, totalItems: items?.length ?? 0 },
    });

    return { created, errors };
  }
}
