import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { PrincipalGuard } from "../../auth/principal.guard";
import { PermissionsGuard } from "../../auth/permissions.guard";
import { Permissions } from "../../auth/permissions.decorator";
import type { Principal } from "../../auth/access-policy.service";
import { PERM } from "../../iam/iam.constants";

import { OtValidationService } from "./ot-validation.service";
import { DecommissionSuiteDto, ReviewSuiteDto, SubmitReviewDto } from "./ot-validation.dto";

@ApiTags("infrastructure/ot/validation")
@Controller("infrastructure/ot/validation")
@UseGuards(PrincipalGuard, PermissionsGuard)
export class OtValidationController {
  constructor(private readonly svc: OtValidationService) {}

  private principal(req: any): Principal {
    return req.principal as Principal;
  }

  // ---- Go-Live Validation (OTS-059) ----

  @Get("suites/:suiteId/go-live")
  @Permissions(PERM.OT_VALIDATION_READ)
  runGoLiveValidation(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.runGoLiveValidation(this.principal(req), suiteId);
  }

  // ---- Submit for Review (OTS-060) ----

  @Post("suites/:suiteId/submit-review")
  @Permissions(PERM.OT_VALIDATION_CREATE)
  submitForReview(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.submitForReview(this.principal(req), suiteId);
  }

  // ---- Review Suite (OTS-061) ----

  @Post("suites/:suiteId/review")
  @Permissions(PERM.OT_VALIDATION_CREATE)
  reviewSuite(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: ReviewSuiteDto) {
    return this.svc.reviewSuite(this.principal(req), suiteId, dto);
  }

  // ---- Activate Suite (OTS-062) ----

  @Post("suites/:suiteId/activate")
  @Permissions(PERM.OT_VALIDATION_CREATE)
  activateSuite(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.activateSuite(this.principal(req), suiteId);
  }

  // ---- Decommission Suite (OTS-063) ----

  @Post("suites/:suiteId/decommission")
  @Permissions(PERM.OT_VALIDATION_CREATE)
  decommissionSuite(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: DecommissionSuiteDto) {
    return this.svc.decommissionSuite(this.principal(req), suiteId, dto);
  }

  // ---- Completion Report (OTS-064) ----

  @Get("suites/:suiteId/completion-report")
  @Permissions(PERM.OT_VALIDATION_READ)
  getCompletionReport(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.getCompletionReport(this.principal(req), suiteId);
  }

  // ---- Review History (OTS-061) ----

  @Get("suites/:suiteId/review-history")
  @Permissions(PERM.OT_VALIDATION_READ)
  getReviewHistory(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.getReviewHistory(this.principal(req), suiteId);
  }
}
