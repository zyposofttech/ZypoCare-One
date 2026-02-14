import { Controller, Get, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { ReportsService } from "./reports.service";

@ApiTags("blood-bank/reports")
@Controller("blood-bank")
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  private principal(req: any) { return req.principal; }

  @Get("reports/naco-annual")
  @Permissions(PERM.BB_REPORT_READ)
  nacoAnnual(@Req() req: any, @Query("branchId") branchId?: string, @Query("year") year?: string) {
    return this.svc.nacoAnnualReturn(this.principal(req), branchId ?? null, year ? Number(year) : new Date().getFullYear());
  }

  @Get("reports/sbtc-quarterly")
  @Permissions(PERM.BB_REPORT_READ)
  sbtcQuarterly(@Req() req: any, @Query("branchId") branchId?: string, @Query("year") year?: string, @Query("quarter") quarter?: string) {
    return this.svc.sbtcQuarterlyReturn(this.principal(req), branchId ?? null, year ? Number(year) : new Date().getFullYear(), quarter ? Number(quarter) : 1);
  }

  @Get("reports/utilization")
  @Permissions(PERM.BB_REPORT_READ)
  utilization(@Req() req: any, @Query("branchId") branchId?: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.svc.utilizationReport(this.principal(req), branchId ?? null, from, to);
  }

  @Get("reports/haemovigilance")
  @Permissions(PERM.BB_REPORT_READ)
  haemovigilance(@Req() req: any, @Query("branchId") branchId?: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.svc.haemovigilanceReport(this.principal(req), branchId ?? null, from, to);
  }

  @Get("reports/discard-analysis")
  @Permissions(PERM.BB_REPORT_READ)
  discardAnalysis(@Req() req: any, @Query("branchId") branchId?: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.svc.discardAnalysis(this.principal(req), branchId ?? null, from, to);
  }

  @Get("reports/donor-deferral")
  @Permissions(PERM.BB_REPORT_READ)
  donorDeferral(@Req() req: any, @Query("branchId") branchId?: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.svc.donorDeferralReport(this.principal(req), branchId ?? null, from, to);
  }

  @Get("reports/tti-seroprevalence")
  @Permissions(PERM.BB_REPORT_READ)
  ttiSeroprevalence(@Req() req: any, @Query("branchId") branchId?: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.svc.ttiSeroprevalence(this.principal(req), branchId ?? null, from, to);
  }

  @Get("reports/daily-summary")
  @Permissions(PERM.BB_REPORT_READ)
  dailySummary(@Req() req: any, @Query("branchId") branchId?: string, @Query("date") date?: string) {
    return this.svc.dailySummary(this.principal(req), branchId ?? null, date);
  }
}
