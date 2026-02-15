import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import {
  CreateFormularyCommitteeDto,
  UpdateFormularyCommitteeDto,
  UpsertCommitteeMembersDto,
  UpdateFormularyPolicyDto,
} from "./dto";
import { FormularyGovernanceService } from "./formulary-governance.service";

@ApiTags("infrastructure/pharmacy/formulary-governance")
@Controller(["infrastructure/pharmacy", "infra/pharmacy"])
export class FormularyGovernanceController {
  constructor(private readonly svc: FormularyGovernanceService) {}

  private principal(req: any) {
    return req.principal;
  }

  @Get("formulary/committees")
  @Permissions(PERM.INFRA_PHARMACY_FORMULARY_READ)
  async listCommittees(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.listCommittees(this.principal(req), branchId ?? null);
  }

  @Post("formulary/committees")
  @Permissions(PERM.INFRA_PHARMACY_FORMULARY_UPDATE)
  async createCommittee(@Req() req: any, @Body() dto: CreateFormularyCommitteeDto, @Query("branchId") branchId?: string) {
    return this.svc.createCommittee(this.principal(req), dto, branchId ?? null);
  }

  @Patch("formulary/committees/:id")
  @Permissions(PERM.INFRA_PHARMACY_FORMULARY_UPDATE)
  async updateCommittee(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateFormularyCommitteeDto) {
    return this.svc.updateCommittee(this.principal(req), id, dto);
  }

  @Post("formulary/committees/:id/members")
  @Permissions(PERM.INFRA_PHARMACY_FORMULARY_UPDATE)
  async addMembers(@Req() req: any, @Param("id") id: string, @Body() dto: UpsertCommitteeMembersDto) {
    return this.svc.addMembers(this.principal(req), id, dto);
  }

  @Get("formulary/policy")
  @Permissions(PERM.INFRA_PHARMACY_FORMULARY_READ)
  async getPolicy(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.getPolicy(this.principal(req), branchId ?? null);
  }

  @Post("formulary/policy")
  @Permissions(PERM.INFRA_PHARMACY_FORMULARY_UPDATE)
  async upsertPolicy(@Req() req: any, @Body() dto: UpdateFormularyPolicyDto, @Query("branchId") branchId?: string) {
    return this.svc.upsertPolicy(this.principal(req), dto, branchId ?? null);
  }
}
