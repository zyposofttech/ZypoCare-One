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
import { Permissions } from "../../auth/permissions.decorator";
import type { Principal } from "../../auth/access-policy.service";
import { PERM } from "../../iam/iam.constants";
import { IssueService } from "./issue.service";
import { StartTransfusionDto } from "./dto/start-transfusion.dto";
import { RecordVitalsDto } from "./dto/record-vitals.dto";
import { EndTransfusionDto } from "./dto/end-transfusion.dto";
import { ReportReactionDto } from "./dto/report-reaction.dto";

@Controller("blood-bank")
export class IssueController {
  constructor(private readonly svc: IssueService) {}

  private principal(req: any): Principal {
    return req.principal as Principal;
  }

  @Get("issue")
  @Permissions(PERM.BB_ISSUE_READ)
  listIssues(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("patientId") patientId?: string,
    @Query("q") q?: string,
    @Query("status") status?: string,
    @Query("transfusing") transfusing?: string,
    @Query("transfused_today") transfusedToday?: string,
    @Query("skip") skip?: string,
    @Query("take") take?: string,
  ) {
    return this.svc.listIssues(this.principal(req), {
      branchId,
      transfusing: transfusing === "true",
      transfusedToday: transfusedToday === "true",
    });
  }

  @Post("issue/:id/transfusion/start")
  @Permissions(PERM.BB_TRANSFUSION_CREATE)
  startTransfusion(@Req() req: any, @Param("id") issueId: string, @Body() dto: any) {
    const payload: StartTransfusionDto = {
      vitals: dto?.vitals ?? {},
      verifiedBy: dto?.verifiedBy ? String(dto.verifiedBy) : undefined,
      startNotes: dto?.startNotes ? String(dto.startNotes) : undefined,
      highRiskOverride: dto?.highRiskOverride === true || String(dto?.highRiskOverride ?? "").toLowerCase() === "true",
      highRiskOverrideReason: dto?.highRiskOverrideReason ? String(dto.highRiskOverrideReason) : undefined,
    };
    return this.svc.startTransfusion(this.principal(req), issueId, payload);
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
  reaction(@Req() req: any, @Param("id") issueId: string, @Body() dto: any) {
    // Backward compatible mapping (frontend historically used `management` + free-text `notes`)
    const payload: ReportReactionDto = {
      reactionType: String(dto?.reactionType ?? dto?.type ?? "").trim() as any,
      severity: dto?.severity ? String(dto.severity) : undefined,
      description: dto?.description ? String(dto.description) : (dto?.notes ? String(dto.notes) : undefined),
      onsetTime: dto?.onsetTime ? String(dto.onsetTime) : (dto?.onsetAt ? String(dto.onsetAt) : undefined),
      managementNotes: dto?.managementNotes ? String(dto.managementNotes) : (dto?.management ? String(dto.management) : undefined),
      investigationResults: dto?.investigationResults ?? undefined,
      transfusionStopped:
        dto?.transfusionStopped === false
          ? false
          : dto?.transfusionStopped === true || String(dto?.transfusionStopped ?? "").toLowerCase() === "true"
            ? true
            : undefined,
      doctorNotified:
        dto?.doctorNotified === true || String(dto?.doctorNotified ?? "").toLowerCase() === "true" ? true : undefined,
      doctorNotifiedAt: dto?.doctorNotifiedAt ? String(dto.doctorNotifiedAt) : undefined,
      stopVitals:
        dto?.stopVitals && typeof dto.stopVitals === "object"
          ? dto.stopVitals
          : undefined,
    };

    return this.svc.reportReaction(this.principal(req), issueId, payload);
  }

  @Patch("issue/:id/return")
  @Permissions(PERM.BB_ISSUE_RETURN)
  returnIssue(@Req() req: any, @Param("id") issueId: string, @Body() dto: any) {
    return this.svc.returnUnit(this.principal(req), issueId, dto);
  }
}
