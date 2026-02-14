import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Principal } from "../../auth/access-policy.service";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { AbdmService } from "./abdm.service";
import {
  CreateAbdmConfigDto,
  UpdateAbdmConfigDto,
  CreateHfrProfileDto,
  UpdateHfrProfileDto,
  CreateHprLinkDto,
  UpdateHprLinkDto,
} from "./dto/abdm.dto";

@ApiTags("compliance/abdm")
@Controller("compliance/abdm")
export class AbdmController {
  constructor(private readonly svc: AbdmService) {}

  private principal(req: any): Principal {
    return req.principal as Principal;
  }

  // ──────────────────────────────────────────────────────────────
  // ABDM Config
  // ──────────────────────────────────────────────────────────────

  @Get("config")
  @Permissions(PERM.COMPLIANCE_ABDM_CONFIG)
  async getConfig(
    @Req() req: any,
    @Query("workspaceId") workspaceId: string,
    @Query("environment") environment?: "SANDBOX" | "PRODUCTION",
  ) {
    return this.svc.getConfig(this.principal(req), workspaceId, environment);
  }

  @Post("config")
  @Permissions(PERM.COMPLIANCE_ABDM_CONFIG)
  async createConfig(
    @Req() req: any,
    @Body() dto: CreateAbdmConfigDto,
  ) {
    return this.svc.upsertConfig(this.principal(req), dto);
  }

  @Patch("config/:abdmConfigId")
  @Permissions(PERM.COMPLIANCE_ABDM_CONFIG)
  async updateConfig(
    @Req() req: any,
    @Param("abdmConfigId") abdmConfigId: string,
    @Body() dto: UpdateAbdmConfigDto,
  ) {
    return this.svc.upsertConfig(this.principal(req), dto, abdmConfigId);
  }

  @Post("config/:abdmConfigId/test")
  @Permissions(PERM.COMPLIANCE_ABDM_CONFIG)
  async testConfig(
    @Req() req: any,
    @Param("abdmConfigId") abdmConfigId: string,
  ) {
    return this.svc.testConfig(abdmConfigId, this.principal(req).staffId!);
  }

  // ──────────────────────────────────────────────────────────────
  // HFR Profile
  // ──────────────────────────────────────────────────────────────

  @Get("hfr")
  @Permissions(PERM.COMPLIANCE_ABDM_HFR_UPDATE)
  async getHfrProfile(
    @Req() req: any,
    @Query("workspaceId") workspaceId: string,
  ) {
    return this.svc.getHfrProfile(this.principal(req), workspaceId);
  }

  @Post("hfr")
  @Permissions(PERM.COMPLIANCE_ABDM_HFR_UPDATE)
  async createHfrProfile(
    @Req() req: any,
    @Body() dto: CreateHfrProfileDto,
  ) {
    return this.svc.upsertHfrProfile(this.principal(req), dto);
  }

  @Patch("hfr/:hfrProfileId")
  @Permissions(PERM.COMPLIANCE_ABDM_HFR_UPDATE)
  async updateHfrProfile(
    @Req() req: any,
    @Param("hfrProfileId") hfrProfileId: string,
    @Body() dto: UpdateHfrProfileDto,
  ) {
    return this.svc.upsertHfrProfile(this.principal(req), dto, hfrProfileId);
  }

  @Post("hfr/:hfrProfileId/validate")
  @Permissions(PERM.COMPLIANCE_ABDM_HFR_UPDATE)
  async validateHfrProfile(
    @Req() req: any,
    @Param("hfrProfileId") hfrProfileId: string,
  ) {
    return this.svc.validateHfrProfile(this.principal(req), hfrProfileId, true);
  }

  @Post("hfr/:hfrProfileId/status")
  @Permissions(PERM.COMPLIANCE_ABDM_HFR_UPDATE)
  async updateHfrStatus(
    @Req() req: any,
    @Param("hfrProfileId") hfrProfileId: string,
    @Body() body: { verificationStatus: string; verificationNotes?: string },
  ) {
    return this.svc.updateHfrStatus(
      hfrProfileId,
      body.verificationStatus,
      body.verificationNotes,
      this.principal(req).staffId!,
    );
  }

  // ──────────────────────────────────────────────────────────────
  // HPR Links
  // ──────────────────────────────────────────────────────────────

  @Get("hpr/summary")
  @Permissions(PERM.COMPLIANCE_ABDM_HPR_UPDATE)
  async hprSummary(
    @Req() req: any,
    @Query("workspaceId") workspaceId: string,
  ) {
    return this.svc.getHprSummary(workspaceId);
  }

  @Get("hpr")
  @Permissions(PERM.COMPLIANCE_ABDM_HPR_UPDATE)
  async listHprLinks(
    @Req() req: any,
    @Query("workspaceId") workspaceId?: string,
    @Query("staffId") staffId?: string,
    @Query("status") status?: string,
    @Query("cursor") cursor?: string,
    @Query("take") take?: string,
  ) {
    return this.svc.listHprLinks(this.principal(req), {
      workspaceId,
      staffId,
      status,
      cursor,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Post("hpr/bulk-import")
  @Permissions(PERM.COMPLIANCE_ABDM_HPR_UPDATE)
  async bulkImportHpr(@Body() dto: any, @Req() req: any) {
    return this.svc.bulkImportHpr(this.principal(req), dto);
  }

  @Post("hpr")
  @Permissions(PERM.COMPLIANCE_ABDM_HPR_UPDATE)
  async createHprLink(
    @Req() req: any,
    @Body() dto: CreateHprLinkDto,
  ) {
    return this.svc.createHprLink(this.principal(req), dto);
  }

  @Patch("hpr/:hprLinkId")
  @Permissions(PERM.COMPLIANCE_ABDM_HPR_UPDATE)
  async updateHprLink(
    @Req() req: any,
    @Param("hprLinkId") hprLinkId: string,
    @Body() dto: UpdateHprLinkDto,
  ) {
    return this.svc.updateHprLink(this.principal(req), hprLinkId, dto);
  }

  @Post("hpr/:hprLinkId/verify")
  @Permissions(PERM.COMPLIANCE_ABDM_HPR_UPDATE)
  async verifyHprLink(
    @Req() req: any,
    @Param("hprLinkId") hprLinkId: string,
  ) {
    return this.svc.verifyHprLink(this.principal(req), hprLinkId);
  }
}
