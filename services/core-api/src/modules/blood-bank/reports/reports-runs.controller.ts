import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { CreateReportRunDto, RejectReportRunDto } from "./dto";
import { ReportsRunsService } from "./reports-runs.service";

@ApiTags("blood-bank/reports/runs")
@Controller("blood-bank/reports/runs")
export class ReportsRunsController {
  constructor(private readonly svc: ReportsRunsService) {}

  private principal(req: any) {
    return req.principal;
  }

  @Get()
  @Permissions(PERM.BB_REPORT_READ)
  list(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("status") status?: string,
    @Query("reportType") reportType?: string,
    @Query("take") take?: string,
  ) {
    return this.svc.list(this.principal(req), {
      branchId: branchId ?? null,
      status,
      reportType,
      take: take ? Number(take) : undefined,
    });
  }

  @Get(":id")
  @Permissions(PERM.BB_REPORT_READ)
  get(@Req() req: any, @Param("id") id: string) {
    return this.svc.get(this.principal(req), id);
  }

  @Post()
  @Permissions(PERM.BB_REPORT_RUN)
  create(@Req() req: any, @Body() dto: CreateReportRunDto) {
    return this.svc.create(this.principal(req), dto);
  }

  @Post(":id/submit")
  @Permissions(PERM.BB_REPORT_SUBMIT)
  submit(@Req() req: any, @Param("id") id: string) {
    return this.svc.submit(this.principal(req), id);
  }

  @Post(":id/approve")
  @Permissions(PERM.BB_REPORT_APPROVE)
  approve(@Req() req: any, @Param("id") id: string) {
    return this.svc.approve(this.principal(req), id);
  }

  @Post(":id/reject")
  @Permissions(PERM.BB_REPORT_APPROVE)
  reject(@Req() req: any, @Param("id") id: string, @Body() dto: RejectReportRunDto) {
    return this.svc.reject(this.principal(req), id, dto);
  }

  @Get(":id/export")
  @Permissions(PERM.BB_REPORT_EXPORT)
  async export(
    @Req() req: any,
    @Param("id") id: string,
    @Query("format") format: string,
    @Res() res: Response,
  ) {
    const f = (format || "json").toLowerCase();
    if (!["json", "csv", "xlsx", "pdf"].includes(f)) throw new BadRequestException("Invalid format");
    const out = await this.svc.export(this.principal(req), id, f as any);
    res.setHeader("Content-Type", out.mime);
    res.setHeader("Content-Disposition", `attachment; filename=\"${out.filename}\"`);
    res.send(out.buffer);
  }
}
