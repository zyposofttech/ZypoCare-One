import { Injectable, ConflictException, NotFoundException, BadRequestException } from "@nestjs/common";
import { InfraContextService } from "../shared/infra-context.service";
import type { CreateTherapeuticSubstitutionDto, UpdateTherapeuticSubstitutionDto } from "./dto/create-therapeutic-substitution.dto";

@Injectable()
export class TherapeuticSubstitutionService {
  constructor(private readonly ctx: InfraContextService) {}

  async listSubstitutions(
    principal: any,
    params: {
      branchId?: string;
      sourceDrugId?: string;
      isActive?: boolean;
      q?: string;
      page?: number;
      pageSize?: number;
    }
  ) {
    const { branchId: rawBranchId, sourceDrugId, isActive, q, page = 1, pageSize = 50 } = params;
    const branchId = await this.ctx.resolveBranchId(principal, rawBranchId);

    const where: any = { branchId };

    if (sourceDrugId) {
      where.sourceDrugId = sourceDrugId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (q) {
      where.OR = [
        { sourceDrug: { drugCode: { contains: q, mode: "insensitive" as const } } },
        { sourceDrug: { genericName: { contains: q, mode: "insensitive" as const } } },
        { sourceDrug: { brandName: { contains: q, mode: "insensitive" as const } } },
        { targetDrug: { drugCode: { contains: q, mode: "insensitive" as const } } },
        { targetDrug: { genericName: { contains: q, mode: "insensitive" as const } } },
        { targetDrug: { brandName: { contains: q, mode: "insensitive" as const } } },
      ];
    }

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const [rows, total] = await Promise.all([
      this.ctx.prisma.therapeuticSubstitution.findMany({
        where,
        skip,
        take,
        include: {
          sourceDrug: {
            select: {
              id: true,
              drugCode: true,
              genericName: true,
              brandName: true,
            },
          },
          targetDrug: {
            select: {
              id: true,
              drugCode: true,
              genericName: true,
              brandName: true,
            },
          },
        },
        orderBy: [{ createdAt: "desc" }],
      }),
      this.ctx.prisma.therapeuticSubstitution.count({ where }),
    ]);

    return { rows, total, page, pageSize };
  }

  async getAlternatives(
    principal: any,
    params: {
      branchId?: string;
      drugId: string;
    }
  ) {
    const { branchId: rawBranchId, drugId } = params;
    const branchId = await this.ctx.resolveBranchId(principal, rawBranchId);

    // Verify drug exists and belongs to branch
    const drug = await this.ctx.prisma.drugMaster.findFirst({
      where: { id: drugId, branchId },
    });

    if (!drug) {
      throw new NotFoundException("Drug not found in this branch");
    }

    const substitutions = await this.ctx.prisma.therapeuticSubstitution.findMany({
      where: {
        sourceDrugId: drugId,
        isActive: true,
        branchId,
      },
      include: {
        targetDrug: {
          select: {
            id: true,
            drugCode: true,
            genericName: true,
            brandName: true,
            therapeuticClass: true,
            dosageForm: true,
            strength: true,
          },
        },
      },
      orderBy: { targetDrug: { drugCode: "asc" } },
    });

    return {
      drugId,
      alternatives: substitutions.map((sub) => ({
        substitutionId: sub.id,
        drug: sub.targetDrug,
        notes: sub.notes,
      })),
    };
  }

  async createSubstitution(
    principal: any,
    dto: CreateTherapeuticSubstitutionDto,
    branchId?: string
  ) {
    const resolvedBranchId = await this.ctx.resolveBranchId(principal, branchId);

    if (dto.sourceDrugId === dto.targetDrugId) {
      throw new BadRequestException("Cannot create substitution to the same drug");
    }

    // Verify both drugs exist and belong to the same branch
    const [sourceDrug, targetDrug] = await Promise.all([
      this.ctx.prisma.drugMaster.findFirst({
        where: { id: dto.sourceDrugId, branchId: resolvedBranchId },
      }),
      this.ctx.prisma.drugMaster.findFirst({
        where: { id: dto.targetDrugId, branchId: resolvedBranchId },
      }),
    ]);

    if (!sourceDrug) {
      throw new NotFoundException("Source drug not found in this branch");
    }

    if (!targetDrug) {
      throw new NotFoundException("Target drug not found in this branch");
    }

    // Check for duplicate
    const existing = await this.ctx.prisma.therapeuticSubstitution.findFirst({
      where: {
        sourceDrugId: dto.sourceDrugId,
        targetDrugId: dto.targetDrugId,
        branchId: resolvedBranchId,
      },
    });

    if (existing) {
      throw new ConflictException("This therapeutic substitution already exists");
    }

    const substitution = await this.ctx.prisma.therapeuticSubstitution.create({
      data: {
        branchId: resolvedBranchId,
        sourceDrugId: dto.sourceDrugId,
        targetDrugId: dto.targetDrugId,
        notes: dto.notes,
        isActive: dto.isActive ?? true,
      },
      include: {
        sourceDrug: {
          select: { id: true, drugCode: true, genericName: true, brandName: true },
        },
        targetDrug: {
          select: { id: true, drugCode: true, genericName: true, brandName: true },
        },
      },
    });

    await this.ctx.audit.log({
      actorUserId: principal.userId,
      action: "PHARMACY_SUBSTITUTION_CREATE",
      entity: "TherapeuticSubstitution",
      entityId: substitution.id,
      branchId: resolvedBranchId,
      meta: {
        sourceDrugId: dto.sourceDrugId,
        targetDrugId: dto.targetDrugId,
      },
    });

    return substitution;
  }

  async updateSubstitution(
    principal: any,
    id: string,
    dto: UpdateTherapeuticSubstitutionDto
  ) {
    const existing = await this.ctx.prisma.therapeuticSubstitution.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException("Therapeutic substitution not found");
    }

    // Verify branch access
    await this.ctx.resolveBranchId(principal, existing.branchId);

    const updated = await this.ctx.prisma.therapeuticSubstitution.update({
      where: { id },
      data: {
        notes: dto.notes !== undefined ? dto.notes : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : undefined,
      },
      include: {
        sourceDrug: {
          select: { id: true, drugCode: true, genericName: true, brandName: true },
        },
        targetDrug: {
          select: { id: true, drugCode: true, genericName: true, brandName: true },
        },
      },
    });

    await this.ctx.audit.log({
      actorUserId: principal.userId,
      action: "PHARMACY_SUBSTITUTION_UPDATE",
      entity: "TherapeuticSubstitution",
      entityId: id,
      branchId: existing.branchId,
      meta: { changes: dto },
    });

    return updated;
  }

  async deleteSubstitution(principal: any, id: string) {
    const existing = await this.ctx.prisma.therapeuticSubstitution.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException("Therapeutic substitution not found");
    }

    // Verify branch access
    await this.ctx.resolveBranchId(principal, existing.branchId);

    await this.ctx.prisma.therapeuticSubstitution.delete({
      where: { id },
    });

    await this.ctx.audit.log({
      actorUserId: principal.userId,
      action: "PHARMACY_SUBSTITUTION_DELETE",
      entity: "TherapeuticSubstitution",
      entityId: id,
      branchId: existing.branchId,
      meta: {
        sourceDrugId: existing.sourceDrugId,
        targetDrugId: existing.targetDrugId,
      },
    });

    return { success: true };
  }
}
