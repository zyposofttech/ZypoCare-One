import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { InfraContextService } from "../shared/infra-context.service";
import type { CreateGovSchemeDto, UpdateGovSchemeDto } from "./dto";
import { canonicalizeCode } from "../../../common/naming.util";

@Injectable()
export class GovSchemeService {
  constructor(private readonly ctx: InfraContextService) {}

  async createScheme(principal: Principal, dto: CreateGovSchemeDto, branchIdParam?: string | null) {
    const branchId = this.ctx.resolveBranchId(principal, branchIdParam ?? null);
    const schemeCode = canonicalizeCode(dto.schemeCode);

    const duplicate = await this.ctx.prisma.governmentSchemeConfig.findFirst({
      where: { branchId, schemeCode },
      select: { id: true },
    });
    if (duplicate) throw new BadRequestException(`Scheme code "${schemeCode}" already exists in this branch`);

    const created = await this.ctx.prisma.governmentSchemeConfig.create({
      data: {
        branchId,
        schemeType: dto.schemeType as any,
        schemeName: dto.schemeName.trim(),
        schemeCode,
        registrationNumber: dto.registrationNumber ?? null,
        registrationDate: dto.registrationDate ? new Date(dto.registrationDate) : null,
        validTill: dto.validTill ? new Date(dto.validTill) : null,
        shaCode: dto.shaCode ?? null,
        nhaCode: dto.nhaCode ?? null,
        nhaHospitalCode: dto.nhaHospitalCode ?? null,
        empaneledSpecialtyIds: dto.empaneledSpecialtyIds ?? [],
        preauthRequired: dto.preauthRequired ?? false,
        verificationMethod: dto.verificationMethod ?? null,
        packageMapping: dto.packageMapping ?? undefined,
        claimSubmissionWindowDays: dto.claimSubmissionWindowDays ?? null,
        claimProcessingTimeDays: dto.claimProcessingTimeDays ?? null,
        requiredDocuments: dto.requiredDocuments ?? [],
        isActive: dto.isActive ?? true,
      },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_GOV_SCHEME_CREATE",
      entity: "GovernmentSchemeConfig",
      entityId: created.id,
      meta: dto,
    });

    return created;
  }

  async listSchemes(
    principal: Principal,
    q: { branchId?: string | null; q?: string; schemeType?: string; includeInactive?: boolean; take?: number },
  ) {
    const branchId = this.ctx.resolveBranchId(principal, q.branchId ?? null);
    const where: any = { branchId };

    if (!q.includeInactive) where.isActive = true;
    if (q.schemeType) where.schemeType = q.schemeType;
    if (q.q) {
      where.OR = [
        { schemeName: { contains: q.q, mode: "insensitive" } },
        { schemeCode: { contains: q.q, mode: "insensitive" } },
      ];
    }

    return this.ctx.prisma.governmentSchemeConfig.findMany({
      where,
      orderBy: [{ schemeName: "asc" }],
      take: q.take && Number.isFinite(q.take) ? Math.min(Math.max(q.take, 1), 500) : 200,
      include: {
        empanelment: {
          select: { id: true, scheme: true, status: true, lastSyncedAt: true },
        },
      },
    });
  }

  async getScheme(principal: Principal, id: string) {
    const row = await this.ctx.prisma.governmentSchemeConfig.findUnique({
      where: { id },
      include: {
        empanelment: {
          select: { id: true, scheme: true, empanelmentNumber: true, status: true, lastSyncedAt: true, workspaceId: true },
        },
      },
    });
    if (!row) throw new NotFoundException("Government scheme not found");

    this.ctx.resolveBranchId(principal, row.branchId);
    return row;
  }

  async updateScheme(principal: Principal, id: string, dto: UpdateGovSchemeDto) {
    const existing = await this.ctx.prisma.governmentSchemeConfig.findUnique({
      where: { id },
      select: { id: true, branchId: true },
    });
    if (!existing) throw new NotFoundException("Government scheme not found");

    const branchId = this.ctx.resolveBranchId(principal, existing.branchId);

    const updated = await this.ctx.prisma.governmentSchemeConfig.update({
      where: { id },
      data: {
        schemeType: dto.schemeType ? (dto.schemeType as any) : undefined,
        schemeName: dto.schemeName?.trim(),
        schemeCode: dto.schemeCode ? canonicalizeCode(dto.schemeCode) : undefined,
        registrationNumber: dto.registrationNumber === undefined ? undefined : (dto.registrationNumber ?? null),
        registrationDate:
          dto.registrationDate === undefined
            ? undefined
            : dto.registrationDate
              ? new Date(dto.registrationDate)
              : null,
        validTill:
          dto.validTill === undefined ? undefined : dto.validTill ? new Date(dto.validTill) : null,
        shaCode: dto.shaCode === undefined ? undefined : (dto.shaCode ?? null),
        nhaCode: dto.nhaCode === undefined ? undefined : (dto.nhaCode ?? null),
        nhaHospitalCode: dto.nhaHospitalCode === undefined ? undefined : (dto.nhaHospitalCode ?? null),
        empaneledSpecialtyIds: dto.empaneledSpecialtyIds ?? undefined,
        preauthRequired: dto.preauthRequired ?? undefined,
        verificationMethod: dto.verificationMethod === undefined ? undefined : (dto.verificationMethod ?? null),
        packageMapping: dto.packageMapping === undefined ? undefined : (dto.packageMapping ?? undefined),
        claimSubmissionWindowDays:
          dto.claimSubmissionWindowDays === undefined ? undefined : (dto.claimSubmissionWindowDays ?? null),
        claimProcessingTimeDays:
          dto.claimProcessingTimeDays === undefined ? undefined : (dto.claimProcessingTimeDays ?? null),
        requiredDocuments: dto.requiredDocuments ?? undefined,
        isActive: dto.isActive ?? undefined,
      },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_GOV_SCHEME_UPDATE",
      entity: "GovernmentSchemeConfig",
      entityId: id,
      meta: dto,
    });

    return updated;
  }

  async deactivateScheme(principal: Principal, id: string) {
    const existing = await this.ctx.prisma.governmentSchemeConfig.findUnique({
      where: { id },
      select: { id: true, branchId: true, isActive: true },
    });
    if (!existing) throw new NotFoundException("Government scheme not found");

    const branchId = this.ctx.resolveBranchId(principal, existing.branchId);

    if (!existing.isActive) {
      return this.ctx.prisma.governmentSchemeConfig.findUnique({ where: { id } });
    }

    const updated = await this.ctx.prisma.governmentSchemeConfig.update({
      where: { id },
      data: { isActive: false },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_GOV_SCHEME_DEACTIVATE",
      entity: "GovernmentSchemeConfig",
      entityId: id,
      meta: {},
    });

    return updated;
  }
}
