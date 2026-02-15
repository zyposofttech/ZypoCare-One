import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { AccessPolicyService } from "../../auth/access-policy.service";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { DiagnosticsCopilotService } from "./diagnostics-copilot.service";
import type { Principal } from "./diagnostics.principal";

@ApiTags("infrastructure/diagnostics/copilot")
@Controller("infrastructure/diagnostics/copilot")
export class DiagnosticsCopilotController {
  constructor(
    private readonly copilot: DiagnosticsCopilotService,
    private readonly access: AccessPolicyService,
  ) {}

  private principalFrom(req: any): Principal {
    return (req?.principal ?? {}) as Principal;
  }

  private branchIdFrom(principal: Principal, branchId: string | null | undefined) {
    return this.access.resolveBranchId(principal as any, branchId, { require: true }) as string;
  }

  @Get("suggest-loinc")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  suggestLoinc(@Query("testName") testName: string) {
    return this.copilot.suggestLoinc(testName || "");
  }

  @Get("suggest-snomed")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  suggestSnomed(@Query("testName") testName: string) {
    return this.copilot.suggestSnomed(testName || "");
  }

  @Get("detect-pcpndt")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  detectPcpndt(@Query("testName") testName: string) {
    return this.copilot.detectPcpndt(testName || "");
  }

  @Get("validate-ranges/:parameterId")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  validateRanges(
    @Req() req: any,
    @Param("parameterId") parameterId: string,
    @Query("branchId") branchId: string,
  ) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.copilot.validateRanges(p, parameterId, b);
  }

  @Get("analyze-gaps")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  analyzeGaps(@Req() req: any, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.copilot.analyzeGaps(p, b);
  }

  @Get("auto-map-loinc")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  autoMapLoinc(@Req() req: any, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.copilot.autoMapLoinc(p, b);
  }

  @Post("apply-loinc-mappings")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  applyLoincMappings(
    @Req() req: any,
    @Query("branchId") branchId: string,
    @Body() body: { mappings: { itemId: string; loincCode: string }[] },
  ) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.copilot.applyLoincMappings(p, b, body.mappings ?? []);
  }

  @Post("suggest-panels")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  suggestPanelMembers(
    @Req() req: any,
    @Query("branchId") branchId: string,
    @Body() body: { items: { id: string; name: string }[] },
  ) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.copilot.suggestPanelMembers(p, b, body.items ?? []);
  }

  @Get("tube-consolidation")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  suggestTubeConsolidation(@Req() req: any, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.copilot.suggestTubeConsolidation(p, b);
  }

  @Get("readiness-score")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  readinessScore(@Req() req: any, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.copilot.readinessScore(p, b);
  }
}
