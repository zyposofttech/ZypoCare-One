import { Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { TestingService } from "./testing.service";
import { RecordGroupingDto, RecordTTIDto, VerifyResultsDto, ConfirmLabelDto } from "./dto";

@ApiTags("blood-bank/testing")
@Controller("blood-bank")
export class TestingController {
  constructor(private readonly svc: TestingService) {}

  private principal(req: any) { return req.principal; }

  @Get("testing/worklist")
  @Permissions(PERM.BB_TESTING_READ)
  worklist(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.worklist(this.principal(req), branchId ?? null);
  }

  @Post("testing/grouping")
  @Permissions(PERM.BB_TESTING_CREATE)
  grouping(@Req() req: any, @Body() dto: RecordGroupingDto) {
    return this.svc.recordGrouping(this.principal(req), dto);
  }

  @Post("testing/tti")
  @Permissions(PERM.BB_TESTING_CREATE)
  tti(@Req() req: any, @Body() dto: RecordTTIDto) {
    return this.svc.recordTTI(this.principal(req), dto);
  }

  @Post("testing/verify")
  @Permissions(PERM.BB_TESTING_VERIFY)
  verify(@Req() req: any, @Body() dto: VerifyResultsDto) {
    return this.svc.verifyResults(this.principal(req), dto);
  }

  @Post("testing/confirm-label")
  @Permissions(PERM.BB_TESTING_VERIFY)
  confirmLabel(@Req() req: any, @Body() dto: ConfirmLabelDto) {
    return this.svc.confirmLabel(this.principal(req), dto);
  }

  @Get("testing/qc-status")
  @Permissions(PERM.BB_TESTING_READ)
  qcStatus(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.dailyQCStatus(this.principal(req), branchId ?? null);
  }
}
