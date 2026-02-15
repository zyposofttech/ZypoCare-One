import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { BBEquipmentService } from "./bb-equipment.service";
import { CreateEquipmentDto, UpdateEquipmentDto, RecordTempLogDto, ReviewTempBreachDto } from "./dto";

@ApiTags("blood-bank/equipment")
@Controller("blood-bank")
export class BBEquipmentController {
  constructor(private readonly svc: BBEquipmentService) {}

  private principal(req: any) {
    return req.principal;
  }

  @Get("equipment")
  @Permissions(PERM.BB_EQUIPMENT_READ)
  list(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.list(this.principal(req), branchId ?? null);
  }

  @Post("equipment")
  @Permissions(PERM.BB_EQUIPMENT_CREATE)
  create(@Req() req: any, @Body() dto: CreateEquipmentDto) {
    return this.svc.create(this.principal(req), dto);
  }

  @Patch("equipment/:id")
  @Permissions(PERM.BB_EQUIPMENT_UPDATE)
  update(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateEquipmentDto) {
    return this.svc.update(this.principal(req), id, dto);
  }

  @Get("equipment/:id/temp-logs")
  @Permissions(PERM.BB_EQUIPMENT_READ)
  tempLogs(
    @Req() req: any,
    @Param("id") equipmentId: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("take") take?: string,
  ) {
    return this.svc.getTempLogs(this.principal(req), equipmentId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      take: take ? Number(take) : 200,
    });
  }

  @Post("equipment/:id/temp-logs")
  @Permissions(PERM.BB_EQUIPMENT_UPDATE)
  recordTemp(@Req() req: any, @Param("id") equipmentId: string, @Body() dto: RecordTempLogDto) {
    return this.svc.recordTempLog(this.principal(req), equipmentId, dto);
  }

  // IoT ingestion endpoint by iotSensorId
  @Post("equipment/sensors/:sensorId/temp-logs")
  @Permissions(PERM.BB_EQUIPMENT_UPDATE)
  recordTempBySensor(@Req() req: any, @Param("sensorId") sensorId: string, @Body() dto: RecordTempLogDto) {
    return this.svc.recordTempLogBySensor(this.principal(req), sensorId, dto);
  }

  @Get("equipment/temp-alerts")
  @Permissions(PERM.BB_EQUIPMENT_READ)
  tempAlerts(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.getTempAlerts(this.principal(req), branchId ?? null);
  }

  @Post("equipment/temp-logs/:logId/acknowledge")
  @Permissions(PERM.BB_EQUIPMENT_UPDATE)
  acknowledgeTempBreach(@Req() req: any, @Param("logId") logId: string) {
    return this.svc.acknowledgeTempBreach(this.principal(req), logId);
  }

  // P10: breach review workflow (ack + release/discard)
  @Post("equipment/temp-logs/:logId/review")
  @Permissions(PERM.BB_EQUIPMENT_UPDATE)
  reviewTempBreach(@Req() req: any, @Param("logId") logId: string, @Body() dto: ReviewTempBreachDto) {
    return this.svc.reviewTempBreach(this.principal(req), logId, dto);
  }
}
