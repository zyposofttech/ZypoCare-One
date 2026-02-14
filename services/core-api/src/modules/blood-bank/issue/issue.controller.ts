import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { IssueService } from "./issue.service";
import {
  IssueBloodDto, BedsideVerifyDto, StartTransfusionDto,
  RecordVitalsDto, EndTransfusionDto, ReportReactionDto,
  ReturnUnitDto, ActivateMTPDto,
} from "./dto";

@ApiTags("blood-bank/issue")
@Controller("blood-bank")
export class IssueController {
  constructor(private readonly svc: IssueService) {}

  private principal(req: any) { return req.principal; }

  @Post("issue")
  @Permissions(PERM.BB_ISSUE_CREATE)
  issue(@Req() req: any, @Body() dto: IssueBloodDto) {
    return this.svc.issueBlood(this.principal(req), dto);
  }

  @Post("issue/:id/bedside-verify")
  @Permissions(PERM.BB_TRANSFUSION_CREATE)
  bedsideVerify(@Req() req: any, @Param("id") issueId: string, @Body() dto: BedsideVerifyDto) {
    return this.svc.bedsideVerify(this.principal(req), issueId, dto);
  }

  @Post("issue/:id/transfusion/start")
  @Permissions(PERM.BB_TRANSFUSION_CREATE)
  startTransfusion(@Req() req: any, @Param("id") issueId: string, @Body() dto: StartTransfusionDto) {
    return this.svc.startTransfusion(this.principal(req), issueId, dto);
  }

  @Post("issue/:id/transfusion/vitals")
  @Permissions(PERM.BB_TRANSFUSION_CREATE)
  recordVitals(@Req() req: any, @Param("id") issueId: string, @Body() dto: RecordVitalsDto) {
    return this.svc.recordVitals(this.principal(req), issueId, dto);
  }

  @Post("issue/:id/transfusion/end")
  @Permissions(PERM.BB_TRANSFUSION_CREATE)
  endTransfusion(@Req() req: any, @Param("id") issueId: string, @Body() dto: EndTransfusionDto) {
    return this.svc.endTransfusion(this.principal(req), issueId, dto);
  }

  @Post("issue/:id/reaction")
  @Permissions(PERM.BB_TRANSFUSION_REACTION)
  reaction(@Req() req: any, @Param("id") issueId: string, @Body() dto: ReportReactionDto) {
    return this.svc.reportReaction(this.principal(req), issueId, dto);
  }

  @Post("issue/:id/return")
  @Permissions(PERM.BB_ISSUE_RETURN)
  returnUnit(@Req() req: any, @Param("id") issueId: string, @Body() dto: ReturnUnitDto) {
    return this.svc.returnUnit(this.principal(req), issueId, dto);
  }

  @Post("mtp/activate")
  @Permissions(PERM.BB_MTP_ACTIVATE)
  activateMTP(@Req() req: any, @Body() dto: ActivateMTPDto) {
    return this.svc.activateMTP(this.principal(req), dto);
  }

  @Post("mtp/:id/deactivate")
  @Permissions(PERM.BB_MTP_ACTIVATE)
  deactivateMTP(@Req() req: any, @Param("id") id: string) {
    return this.svc.deactivateMTP(this.principal(req), id);
  }

  @Get("mtp/:id")
  @Permissions(PERM.BB_MTP_READ)
  getMTP(@Req() req: any, @Param("id") id: string) {
    return this.svc.getMTP(this.principal(req), id);
  }
}
