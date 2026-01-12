import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrincipalGuard } from "../auth/principal.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Permissions } from "../auth/permissions.decorator";
import type { Principal } from "../auth/access-policy.service";
import { PERM } from "../iam/iam.constants";
import { InfrastructureService } from "./infrastructure.service";
import {
  CancelProcedureBookingDto,
  CloseDowntimeDto,
  CommitImportDto,
  CreateChargeMasterItemDto,
  CreateDowntimeDto,
  CreateEquipmentAssetDto,
  CreateLocationNodeDto,
  CreateProcedureBookingDto,
  CreateServiceItemDto,
  CreateUnitDto,
  CreateUnitResourceDto,
  CreateUnitRoomDto,
  RunGoLiveDto,
  SetBranchUnitTypesDto,
  SetResourceStateDto,
  UpdateEquipmentAssetDto,
  UpdateFixItDto,
  UpdateLocationNodeDto,
  UpdateUnitDto,
  UpdateUnitResourceDto,
  UpdateUnitRoomDto,
  UpsertServiceChargeMappingDto,
  ValidateImportDto,
} from "./infrastructure.dto";

@ApiTags("infrastructure")
@Controller()
@UseGuards(PrincipalGuard, PermissionsGuard)
export class InfrastructureController {
  constructor(private svc: InfrastructureService) {}

  private principal(req: any): Principal {
    return req.principal as Principal;
  }

  // ---------------- Locations ----------------

  @Get("infra/locations")
  @Permissions(PERM.INFRA_LOCATION_READ)
  async listLocations(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("kind") kind?: string,
    @Query("at") at?: string,
  ) {
    return this.svc.listLocations(this.principal(req), { branchId, kind, at });
  }

  @Post("infra/locations")
  @Permissions(PERM.INFRA_LOCATION_CREATE)
  async createLocation(@Req() req: any, @Body() dto: CreateLocationNodeDto) {
    return this.svc.createLocation(this.principal(req), dto);
  }

  @Patch("infra/locations/:id")
  @Permissions(PERM.INFRA_LOCATION_UPDATE)
  async updateLocation(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateLocationNodeDto) {
    return this.svc.updateLocation(this.principal(req), id, dto);
  }

  // ---------------- Unit Types (catalog + branch enablement) ----------------

  @Get("infra/unit-types/catalog")
  @Permissions(PERM.INFRA_UNITTYPE_READ)
  async unitTypeCatalog(@Req() req: any) {
    return this.svc.listUnitTypeCatalog(this.principal(req));
  }

  @Get("infra/branch/unit-types")
  @Permissions(PERM.INFRA_UNITTYPE_READ)
  async myBranchUnitTypes(@Req() req: any) {
    return this.svc.getBranchUnitTypes(this.principal(req));
  }

  @Get("infra/branches/:branchId/unit-types")
  @Permissions(PERM.INFRA_UNITTYPE_READ)
  async branchUnitTypes(@Req() req: any, @Param("branchId") branchId: string) {
    return this.svc.getBranchUnitTypes(this.principal(req), branchId);
  }

  @Put("infra/branch/unit-types")
  @Permissions(PERM.INFRA_UNITTYPE_UPDATE)
  async setMyBranchUnitTypes(@Req() req: any, @Body() dto: SetBranchUnitTypesDto) {
    return this.svc.setBranchUnitTypes(this.principal(req), dto.unitTypeIds);
  }

  @Put("infra/branches/:branchId/unit-types")
  @Permissions(PERM.INFRA_UNITTYPE_UPDATE)
  async setBranchUnitTypes(@Req() req: any, @Param("branchId") branchId: string, @Body() dto: SetBranchUnitTypesDto) {
    return this.svc.setBranchUnitTypes(this.principal(req), dto.unitTypeIds, branchId);
  }

  // ---------------- Units ----------------

  @Get("infra/units")
  @Permissions(PERM.INFRA_UNIT_READ)
  async listUnits(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("departmentId") departmentId?: string,
    @Query("unitTypeId") unitTypeId?: string,
    @Query("q") q?: string,
    @Query("includeInactive") includeInactive?: string,
  ) {
    return this.svc.listUnits(this.principal(req), { branchId, departmentId, unitTypeId, q, includeInactive: includeInactive === "true" });
  }

  @Post("infra/units")
  @Permissions(PERM.INFRA_UNIT_CREATE)
  async createUnit(@Req() req: any, @Body() dto: CreateUnitDto) {
    return this.svc.createUnit(this.principal(req), dto);
  }

  @Patch("infra/units/:id")
  @Permissions(PERM.INFRA_UNIT_UPDATE)
  async updateUnit(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateUnitDto) {
    return this.svc.updateUnit(this.principal(req), id, dto);
  }

  // ---------------- Rooms ----------------

  @Get("infra/rooms")
  @Permissions(PERM.INFRA_ROOM_READ)
  async listRooms(@Req() req: any, @Query("unitId") unitId: string) {
    return this.svc.listRooms(this.principal(req), unitId);
  }

  @Post("infra/rooms")
  @Permissions(PERM.INFRA_ROOM_CREATE)
  async createRoom(@Req() req: any, @Body() dto: CreateUnitRoomDto) {
    return this.svc.createRoom(this.principal(req), dto);
  }

  @Patch("infra/rooms/:id")
  @Permissions(PERM.INFRA_ROOM_UPDATE)
  async updateRoom(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateUnitRoomDto) {
    return this.svc.updateRoom(this.principal(req), id, dto);
  }

  // ---------------- Resources ----------------

  @Get("infra/resources")
  @Permissions(PERM.INFRA_RESOURCE_READ)
  async listResources(@Req() req: any, @Query("unitId") unitId: string, @Query("roomId") roomId?: string) {
    return this.svc.listResources(this.principal(req), { unitId, roomId: roomId ?? null });
  }

  @Post("infra/resources")
  @Permissions(PERM.INFRA_RESOURCE_CREATE)
  async createResource(@Req() req: any, @Body() dto: CreateUnitResourceDto) {
    return this.svc.createResource(this.principal(req), dto);
  }

  @Patch("infra/resources/:id")
  @Permissions(PERM.INFRA_RESOURCE_UPDATE)
  async updateResource(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateUnitResourceDto) {
    return this.svc.updateResource(this.principal(req), id, dto);
  }

  @Put("infra/resources/:id/state")
  @Permissions(PERM.INFRA_RESOURCE_STATE_UPDATE)
  async setResourceState(@Req() req: any, @Param("id") id: string, @Body() dto: SetResourceStateDto) {
    return this.svc.setResourceState(this.principal(req), id, dto.state);
  }

  // ---------------- Equipment ----------------

  @Get("infra/equipment")
  @Permissions(PERM.INFRA_EQUIPMENT_READ)
  async listEquipment(@Req() req: any, @Query("branchId") branchId?: string, @Query("q") q?: string) {
    return this.svc.listEquipment(this.principal(req), { branchId, q });
  }

  @Post("infra/equipment")
  @Permissions(PERM.INFRA_EQUIPMENT_CREATE)
  async createEquipment(@Req() req: any, @Body() dto: CreateEquipmentAssetDto) {
    return this.svc.createEquipment(this.principal(req), dto);
  }

  @Patch("infra/equipment/:id")
  @Permissions(PERM.INFRA_EQUIPMENT_UPDATE)
  async updateEquipment(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateEquipmentAssetDto) {
    return this.svc.updateEquipment(this.principal(req), id, dto);
  }

  @Post("infra/equipment/downtime")
  @Permissions(PERM.INFRA_EQUIPMENT_UPDATE)
  async openDowntime(@Req() req: any, @Body() dto: CreateDowntimeDto) {
    return this.svc.openDowntime(this.principal(req), dto);
  }

  @Post("infra/equipment/downtime/close")
  @Permissions(PERM.INFRA_EQUIPMENT_UPDATE)
  async closeDowntime(@Req() req: any, @Body() dto: CloseDowntimeDto) {
    return this.svc.closeDowntime(this.principal(req), dto);
  }

  // ---------------- Charge Master + Service Items + Fix-It ----------------

  @Post("infra/charge-master")
  @Permissions(PERM.INFRA_CHARGE_MASTER_CREATE)
  async createChargeMaster(@Req() req: any, @Body() dto: CreateChargeMasterItemDto) {
    return this.svc.createChargeMasterItem(this.principal(req), dto);
  }

  @Get("infra/charge-master")
  @Permissions(PERM.INFRA_CHARGE_MASTER_READ)
  async listChargeMaster(@Req() req: any, @Query("q") q?: string) {
    return this.svc.listChargeMasterItems(this.principal(req), { q });
  }

  @Post("infra/services")
  @Permissions(PERM.INFRA_SERVICE_CREATE)
  async createService(@Req() req: any, @Body() dto: CreateServiceItemDto) {
    return this.svc.createServiceItem(this.principal(req), dto);
  }

  @Get("infra/services")
  @Permissions(PERM.INFRA_SERVICE_READ)
  async listServices(@Req() req: any, @Query("q") q?: string, @Query("includeInactive") includeInactive?: string) {
    return this.svc.listServiceItems(this.principal(req), { q, includeInactive: includeInactive === "true" });
  }

  @Patch("infra/services/:id")
  @Permissions(PERM.INFRA_SERVICE_UPDATE)
  async updateService(@Req() req: any, @Param("id") id: string, @Body() dto: Partial<CreateServiceItemDto>) {
    return this.svc.updateServiceItem(this.principal(req), id, dto);
  }

  @Post("infra/services/mapping")
  @Permissions(PERM.INFRA_SERVICE_MAPPING_UPDATE)
  async upsertMapping(@Req() req: any, @Body() dto: UpsertServiceChargeMappingDto) {
    return this.svc.upsertServiceChargeMapping(this.principal(req), dto);
  }

  @Get("infra/fixit")
  @Permissions(PERM.INFRA_FIXIT_READ)
  async listFixIts(@Req() req: any, @Query("status") status?: string) {
    return this.svc.listFixIts(this.principal(req), { status });
  }

  @Patch("infra/fixit/:id")
  @Permissions(PERM.INFRA_FIXIT_UPDATE)
  async updateFixIt(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateFixItDto) {
    return this.svc.updateFixIt(this.principal(req), id, dto);
  }

  // ---------------- Scheduling (strict at scheduling time) ----------------

  @Get("infra/bookings")
  @Permissions(PERM.INFRA_SCHED_READ)
  async listBookings(
    @Req() req: any,
    @Query("unitId") unitId?: string,
    @Query("resourceId") resourceId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.svc.listBookings(this.principal(req), { unitId, resourceId, from, to });
  }

  @Post("infra/bookings")
  @Permissions(PERM.INFRA_SCHED_CREATE)
  async createBooking(@Req() req: any, @Body() dto: CreateProcedureBookingDto) {
    return this.svc.createBooking(this.principal(req), dto);
  }

  @Post("infra/bookings/:id/cancel")
  @Permissions(PERM.INFRA_SCHED_CANCEL)
  async cancelBooking(@Req() req: any, @Param("id") id: string, @Body() dto: CancelProcedureBookingDto) {
    return this.svc.cancelBooking(this.principal(req), id, dto.reason);
  }

  // ---------------- Imports ----------------

  @Post("infra/import/validate")
  @Permissions(PERM.INFRA_IMPORT_VALIDATE)
  async validateImport(@Req() req: any, @Body() dto: ValidateImportDto) {
    return this.svc.validateImport(this.principal(req), dto);
  }

  @Post("infra/import/commit")
  @Permissions(PERM.INFRA_IMPORT_COMMIT)
  async commitImport(@Req() req: any, @Body() dto: CommitImportDto) {
    return this.svc.commitImport(this.principal(req), dto.jobId);
  }

  // ---------------- Go-Live Validator ----------------

  @Get("infra/branch/go-live")
  @Permissions(PERM.INFRA_GOLIVE_READ)
  async goLivePreview(@Req() req: any) {
    return this.svc.runGoLive(this.principal(req), { persist: false });
  }

  @Post("infra/branch/go-live")
  @Permissions(PERM.INFRA_GOLIVE_RUN)
  async goLiveRun(@Req() req: any, @Body() dto: RunGoLiveDto) {
    return this.svc.runGoLive(this.principal(req), dto);
  }
}
