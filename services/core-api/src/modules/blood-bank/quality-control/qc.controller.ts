import { Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { QCService } from "./qc.service";
import { RecordIQCDto, RecordEQASDto, RecordCalibrationDto } from "./dto";

@ApiTags("blood-bank/qc")
@Controller("blood-bank")
export class QCController {
  constructor(private readonly svc: QCService) {}

  private principal(req: any) { return req.principal; }

  @Get("qc/iqc")
  @Permissions(PERM.BB_QC_READ)
  listIQC(@Req() req: any, @Query("branchId") branchId?: string, @Query("from") from?: string, @Query("to") to?: string) {
    return this.svc.listIQC(this.principal(req), { branchId: branchId ?? null, from, to });
  }

  @Post("qc/iqc")
  @Permissions(PERM.BB_QC_CREATE)
  recordIQC(@Req() req: any, @Body() dto: RecordIQCDto) {
    return this.svc.recordIQC(this.principal(req), dto);
  }

  @Get("qc/eqas")
  @Permissions(PERM.BB_QC_READ)
  listEQAS(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.listEQAS(this.principal(req), branchId ?? null);
  }

  @Post("qc/eqas")
  @Permissions(PERM.BB_QC_CREATE)
  recordEQAS(@Req() req: any, @Body() dto: RecordEQASDto) {
    return this.svc.recordEQAS(this.principal(req), dto);
  }

  @Get("qc/calibration")
  @Permissions(PERM.BB_QC_READ)
  calibrationSchedule(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.calibrationSchedule(this.principal(req), branchId ?? null);
  }

  @Post("qc/calibration")
  @Permissions(PERM.BB_QC_CREATE)
  recordCalibration(@Req() req: any, @Body() dto: RecordCalibrationDto) {
    return this.svc.recordCalibration(this.principal(req), dto);
  }
}
