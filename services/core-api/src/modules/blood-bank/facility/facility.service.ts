import { Injectable } from "@nestjs/common";
import { BBContextService } from "../shared/bb-context.service";
import type { Principal } from "../../auth/access-policy.service";
import type { UpsertFacilityDto, UpsertMSBOSDto } from "./dto";

@Injectable()
export class FacilityService {
  constructor(private readonly ctx: BBContextService) {}

  async get(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    return this.ctx.prisma.bloodBankFacility.findUnique({ where: { branchId: bid } });
  }

  async upsert(principal: Principal, dto: UpsertFacilityDto) {
    const bid = this.ctx.resolveBranchId(principal, dto.branchId);
    const data = {
      facilityType: dto.type as any,
      drugLicenseNo: dto.licenseNumber,
      licenseValidTo: dto.licenseExpiryDate ? new Date(dto.licenseExpiryDate) : undefined,
      sbtcRegNo: dto.sbtsRegistrationId,
      nacoId: dto.nacoId,
      operatingHours: dto.operatingHours,
      physicalLayout: dto.physicalLayout,
    };
    const result = await this.ctx.prisma.bloodBankFacility.upsert({
      where: { branchId: bid },
      create: { branchId: bid, ...data },
      update: data,
    });
    await this.ctx.audit.log({
      branchId: bid,
      actorUserId: principal.userId,
      action: "BB_FACILITY_UPSERT",
      entity: "BloodBankFacility",
      entityId: result.id,
      meta: { dto },
    });
    return result;
  }

  async listMSBOS(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId);
    return this.ctx.prisma.mSBOSConfig.findMany({
      where: { branchId: bid, isActive: true },
      orderBy: { procedureName: "asc" },
    });
  }

  async upsertMSBOS(principal: Principal, dto: UpsertMSBOSDto) {
    const bid = this.ctx.resolveBranchId(principal, dto.branchId);
    let result;
    if (dto.id) {
      result = await this.ctx.prisma.mSBOSConfig.update({
        where: { id: dto.id },
        data: {
          procedureCode: dto.procedureCode,
          procedureName: dto.procedureName,
          recommendedPRBC: dto.recommendedPRBC,
          recommendedFFP: dto.recommendedFFP,
          recommendedPlatelet: dto.recommendedPlatelet,
        },
      });
    } else {
      result = await this.ctx.prisma.mSBOSConfig.create({
        data: {
          branchId: bid,
          procedureCode: dto.procedureCode!,
          procedureName: dto.procedureName!,
          recommendedPRBC: dto.recommendedPRBC ?? 0,
          recommendedFFP: dto.recommendedFFP ?? 0,
          recommendedPlatelet: dto.recommendedPlatelet ?? 0,
        },
      });
    }
    await this.ctx.audit.log({
      branchId: bid,
      actorUserId: principal.userId,
      action: dto.id ? "BB_MSBOS_UPDATE" : "BB_MSBOS_CREATE",
      entity: "MSBOSConfig",
      entityId: result.id,
      meta: { dto },
    });
    return result;
  }
}
