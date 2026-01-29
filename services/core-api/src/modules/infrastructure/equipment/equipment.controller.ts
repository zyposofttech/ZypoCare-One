import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import {
  CloseDowntimeDto,
  CreateDowntimeDto,
  CreateEquipmentAssetDto,
  ListEquipmentQueryDto,
  UpdateEquipmentAssetDto,
} from "./dto";
import { EquipmentService } from "./equipment.service";

@ApiTags("infrastructure/equipment")
@Controller(["infrastructure", "infra"])
export class EquipmentController {
  constructor(private readonly svc: EquipmentService) {}

  private principal(req: any) {
    return req.principal;
  }

  /**
   * List equipment assets (search + filters + due/expiry windows).
   *
   * Query params are validated via global ValidationPipe(transform=true).
   */
  @Get("equipment")
  @Permissions(PERM.INFRA_EQUIPMENT_READ)
  async listEquipment(@Req() req: any, @Query() q: ListEquipmentQueryDto) {
    return this.svc.listEquipment(this.principal(req), q);
  }

  /**
   * Lightweight rollups for dashboards: counts + due/expiry counts.
   */
  @Get("equipment-summary")
  @Permissions(PERM.INFRA_EQUIPMENT_READ)
  async summary(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.summary(this.principal(req), { branchId: branchId ?? null });
  }

  /**
   * Due/expiry alerts (lists) for PM, AMC/Warranty and compliance windows.
   */
  @Get("equipment-alerts")
  @Permissions(PERM.INFRA_EQUIPMENT_READ)
  async alerts(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("withinDays") withinDays?: string,
  ) {
    return this.svc.alerts(this.principal(req), {
      branchId: branchId ?? null,
      withinDays: withinDays ? Number(withinDays) : 30,
    });
  }

  @Get("equipment/:id")
  @Permissions(PERM.INFRA_EQUIPMENT_READ)
  async getOne(@Req() req: any, @Param("id") id: string) {
    return this.svc.getEquipment(this.principal(req), id);
  }

  @Get("equipment/:id/downtime")
  @Permissions(PERM.INFRA_EQUIPMENT_READ)
  async listDowntime(@Req() req: any, @Param("id") id: string) {
    return this.svc.listDowntime(this.principal(req), id);
  }

  @Post("equipment")
  @Permissions(PERM.INFRA_EQUIPMENT_CREATE)
  async createEquipment(@Req() req: any, @Body() dto: CreateEquipmentAssetDto, @Query("branchId") branchId?: string) {
    return this.svc.createEquipment(this.principal(req), dto, branchId ?? null);
  }

  @Patch("equipment/:id")
  @Permissions(PERM.INFRA_EQUIPMENT_UPDATE)
  async updateEquipment(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateEquipmentAssetDto) {
    return this.svc.updateEquipment(this.principal(req), id, dto);
  }

  /** Soft-decommission (no hard deletes). */
  @Post("equipment/:id/retire")
  @Permissions(PERM.INFRA_EQUIPMENT_UPDATE)
  async retire(@Req() req: any, @Param("id") id: string) {
    return this.svc.retireEquipment(this.principal(req), id);
  }

  @Post("equipment/downtime")
  @Permissions(PERM.INFRA_EQUIPMENT_UPDATE)
  async openDowntime(@Req() req: any, @Body() dto: CreateDowntimeDto) {
    return this.svc.openDowntime(this.principal(req), dto);
  }

  @Post("equipment/downtime/close")
  @Permissions(PERM.INFRA_EQUIPMENT_UPDATE)
  async closeDowntime(@Req() req: any, @Body() dto: CloseDowntimeDto) {
    return this.svc.closeDowntime(this.principal(req), dto);
  }
}
