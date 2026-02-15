import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { PrincipalGuard } from "../../auth/principal.guard";
import { PermissionsGuard } from "../../auth/permissions.guard";
import { Permissions } from "../../auth/permissions.decorator";
import type { Principal } from "../../auth/access-policy.service";

import { PERM } from "../../iam/iam.constants";
import { OtCopilotService } from "./ot-copilot.service";

@ApiTags("infrastructure/ot/copilot")
@Controller("infrastructure/ot/copilot")
@UseGuards(PrincipalGuard, PermissionsGuard)
export class OtCopilotController {
  constructor(private readonly copilot: OtCopilotService) {}

  private principal(req: any): Principal {
    return req.principal as Principal;
  }

  // ---- Readiness Score ----

  @Get("readiness-score")
  @Permissions(PERM.OT_SUITE_READ)
  readinessScore(
    @Req() req: any,
    @Query("branchId") branchId: string,
    @Query("suiteId") suiteId: string,
  ) {
    return this.copilot.readinessScore(this.principal(req), branchId, suiteId);
  }

  // ---- Analyze Gaps ----

  @Get("analyze-gaps")
  @Permissions(PERM.OT_SUITE_READ)
  analyzeGaps(
    @Req() req: any,
    @Query("branchId") branchId: string,
    @Query("suiteId") suiteId: string,
  ) {
    return this.copilot.analyzeGaps(this.principal(req), branchId, suiteId);
  }

  // ---- Suggest Equipment ----

  @Get("suggest-equipment")
  @Permissions(PERM.OT_SUITE_READ)
  suggestEquipment(
    @Req() req: any,
    @Query("branchId") branchId: string,
    @Query("suiteId") suiteId: string,
  ) {
    return this.copilot.suggestEquipment(this.principal(req), branchId, suiteId);
  }

  // ---- Suggest Staffing ----

  @Get("suggest-staffing")
  @Permissions(PERM.OT_SUITE_READ)
  suggestStaffing(
    @Req() req: any,
    @Query("branchId") branchId: string,
    @Query("suiteId") suiteId: string,
  ) {
    return this.copilot.suggestStaffing(this.principal(req), branchId, suiteId);
  }

  // ---- Suggest Scheduling ----

  @Get("suggest-scheduling")
  @Permissions(PERM.OT_SUITE_READ)
  suggestScheduling(
    @Req() req: any,
    @Query("branchId") branchId: string,
    @Query("suiteId") suiteId: string,
  ) {
    return this.copilot.suggestScheduling(this.principal(req), branchId, suiteId);
  }

  // ---- Compliance Checkup ----

  @Get("compliance-checkup")
  @Permissions(PERM.OT_SUITE_READ)
  complianceCheckup(
    @Req() req: any,
    @Query("branchId") branchId: string,
    @Query("suiteId") suiteId: string,
  ) {
    return this.copilot.complianceCheckup(this.principal(req), branchId, suiteId);
  }
}
