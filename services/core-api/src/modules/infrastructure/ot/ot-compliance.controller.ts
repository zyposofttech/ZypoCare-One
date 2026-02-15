import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { PrincipalGuard } from "../../auth/principal.guard";
import { PermissionsGuard } from "../../auth/permissions.guard";
import { Permissions } from "../../auth/permissions.decorator";
import type { Principal } from "../../auth/access-policy.service";
import { PERM } from "../../iam/iam.constants";

import { OtComplianceService } from "./ot-compliance.service";
import {
  CreateChecklistTemplateDto,
  CreateComplianceConfigDto,
  UpdateChecklistTemplateDto,
  UpdateComplianceConfigDto,
} from "./ot-compliance.dto";

@ApiTags("infrastructure/ot/compliance")
@Controller("infrastructure/ot/compliance")
@UseGuards(PrincipalGuard, PermissionsGuard)
export class OtComplianceController {
  constructor(private readonly svc: OtComplianceService) {}

  private principal(req: any): Principal {
    return req.principal as Principal;
  }

  // ---- Checklist Templates (OTS-040, OTS-052) ----

  @Get("suites/:suiteId/checklist-templates")
  @Permissions(PERM.OT_COMPLIANCE_READ)
  listChecklistTemplates(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.listChecklistTemplates(this.principal(req), suiteId);
  }

  @Post("suites/:suiteId/checklist-templates")
  @Permissions(PERM.OT_COMPLIANCE_CREATE)
  createChecklistTemplate(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateChecklistTemplateDto) {
    return this.svc.createChecklistTemplate(this.principal(req), suiteId, dto);
  }

  @Patch("checklist-templates/:id")
  @Permissions(PERM.OT_COMPLIANCE_UPDATE)
  updateChecklistTemplate(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateChecklistTemplateDto) {
    return this.svc.updateChecklistTemplate(this.principal(req), id, dto);
  }

  @Delete("checklist-templates/:id")
  @Permissions(PERM.OT_COMPLIANCE_DELETE)
  deleteChecklistTemplate(@Req() req: any, @Param("id") id: string) {
    return this.svc.deleteChecklistTemplate(this.principal(req), id);
  }

  // ---- Compliance Configs (OTS-053-058) ----

  @Get("suites/:suiteId/compliance-configs")
  @Permissions(PERM.OT_COMPLIANCE_READ)
  listComplianceConfigs(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.listComplianceConfigs(this.principal(req), suiteId);
  }

  @Post("suites/:suiteId/compliance-configs")
  @Permissions(PERM.OT_COMPLIANCE_CREATE)
  upsertComplianceConfig(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateComplianceConfigDto) {
    return this.svc.upsertComplianceConfig(this.principal(req), suiteId, dto);
  }

  @Patch("compliance-configs/:id")
  @Permissions(PERM.OT_COMPLIANCE_UPDATE)
  updateComplianceConfig(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateComplianceConfigDto) {
    return this.svc.updateComplianceConfig(this.principal(req), id, dto);
  }

  // ---- NABH Validation (OTS-057) ----

  @Get("suites/:suiteId/nabh-validation")
  @Permissions(PERM.OT_COMPLIANCE_READ)
  getNabhValidation(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.getNabhValidation(this.principal(req), suiteId);
  }
}
