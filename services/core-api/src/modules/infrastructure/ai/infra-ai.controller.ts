import { Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import {
  HospitalProfileDto,
  TemplateRecommendDto,
  DepartmentSuggestDto,
  DiagnosticPackSuggestDto,
  BranchQueryDto,
  ValidateGstinDto,
  ValidatePanDto,
  CredentialAlertQueryDto,
  PrivilegeGapQueryDto,
  EquipmentComplianceQueryDto,
  FixSuggestionsQueryDto,
} from "./dto";
import { InfraAiService } from "./infra-ai.service";

@ApiTags("infrastructure/ai")
@Controller(["infrastructure", "infra"])
export class InfraAiController {
  constructor(private readonly svc: InfraAiService) {}

  private principal(req: any) {
    return req.principal;
  }

  // ─── Category A: Setup Intelligence ─────────────────────────────────

  @Post("ai/smart-defaults")
  @Permissions(PERM.INFRA_GOLIVE_READ)
  @ApiOperation({ summary: "Generate smart infrastructure defaults from hospital profile" })
  async smartDefaults(@Body() dto: HospitalProfileDto) {
    return this.svc.getSmartDefaults(dto);
  }

  @Post("ai/template-recommend")
  @Permissions(PERM.INFRA_GOLIVE_READ)
  @ApiOperation({ summary: "Recommend SMALL/MEDIUM/LARGE hospital template" })
  async templateRecommend(@Body() dto: TemplateRecommendDto) {
    return this.svc.getTemplateRecommendation(dto);
  }

  @Post("ai/department-suggest")
  @Permissions(PERM.INFRA_GOLIVE_READ)
  @ApiOperation({ summary: "Suggest departments based on specialties" })
  async departmentSuggest(@Body() dto: DepartmentSuggestDto) {
    return this.svc.getDepartmentSuggestions(dto);
  }

  @Post("ai/diagnostic-packs-suggest")
  @Permissions(PERM.INFRA_GOLIVE_READ)
  @ApiOperation({ summary: "Recommend diagnostic packs based on specialties" })
  async diagnosticPacksSuggest(@Body() dto: DiagnosticPackSuggestDto) {
    return this.svc.getDiagnosticPackSuggestions(dto);
  }

  // ─── Category B: Compliance & Validation ────────────────────────────

  @Get("ai/nabh-readiness")
  @Permissions(PERM.INFRA_GOLIVE_READ)
  @ApiOperation({ summary: "Full NABH gap analysis for branch" })
  async nabhReadiness(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.getNABHReadiness(this.principal(req), branchId);
  }

  @Get("ai/consistency-check")
  @Permissions(PERM.INFRA_GOLIVE_READ)
  @ApiOperation({ summary: "Cross-module consistency analysis" })
  async consistencyCheck(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.getConsistencyCheck(this.principal(req), branchId);
  }

  @Get("ai/credential-alerts")
  @Permissions(PERM.INFRA_GOLIVE_READ)
  @ApiOperation({ summary: "Staff credential expiry alerts" })
  async credentialAlerts(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("days") days?: string,
  ) {
    return this.svc.getCredentialAlerts(this.principal(req), branchId, days ? parseInt(days) : undefined);
  }

  @Get("ai/privilege-gaps")
  @Permissions(PERM.INFRA_GOLIVE_READ)
  @ApiOperation({ summary: "Doctor privilege gap detection" })
  async privilegeGaps(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.getPrivilegeGaps(this.principal(req), branchId);
  }

  @Post("ai/validate-gstin")
  @Permissions(PERM.INFRA_GOLIVE_READ)
  @ApiOperation({ summary: "Validate GST number format and checksum" })
  async validateGstin(@Body() dto: ValidateGstinDto) {
    return this.svc.validateGSTIN(dto.gstin);
  }

  @Post("ai/validate-pan")
  @Permissions(PERM.INFRA_GOLIVE_READ)
  @ApiOperation({ summary: "Validate PAN number format" })
  async validatePan(@Body() dto: ValidatePanDto) {
    return this.svc.validatePAN(dto.pan);
  }

  @Get("ai/equipment-compliance")
  @Permissions(PERM.INFRA_GOLIVE_READ)
  @ApiOperation({ summary: "AERB/PCPNDT equipment compliance check" })
  async equipmentCompliance(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.getEquipmentCompliance(this.principal(req), branchId);
  }

  // ─── Category C: Operational Intelligence ───────────────────────────

  @Get("ai/go-live-score")
  @Permissions(PERM.INFRA_GOLIVE_READ)
  @ApiOperation({ summary: "Enhanced AI-weighted go-live readiness score" })
  async goLiveScore(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.getGoLiveScore(this.principal(req), branchId);
  }

  @Get("ai/fix-suggestions")
  @Permissions(PERM.INFRA_FIXIT_READ)
  @ApiOperation({ summary: "Actionable fix suggestions for all open FixIt tasks" })
  async fixSuggestions(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.getFixSuggestions(this.principal(req), branchId);
  }

  @Get("ai/naming-check")
  @Permissions(PERM.INFRA_GOLIVE_READ)
  @ApiOperation({ summary: "Naming convention enforcement check" })
  async namingCheck(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.getNamingCheck(this.principal(req), branchId);
  }
}
