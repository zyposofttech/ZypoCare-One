import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrincipalGuard } from "../auth/principal.guard";
import { Permissions } from "../auth/permissions.decorator";
import { PERM } from "../iam/iam.constants";
import { InfrastructureService } from "./infrastructure.service";
import {
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
  SetResourceStateDto,
  UpdateEquipmentAssetDto,
  UpdateFixItDto,
  UpdateLocationNodeDto,
  UpdateUnitDto,
  UpdateUnitResourceDto,
  UpdateUnitRoomDto,
  UpsertServiceChargeMappingDto,
  ValidateImportDto,
  CancelProcedureBookingDto,
  SetBranchUnitTypesDto,
  UpdateBranchInfraConfigDto,
} from "./infrastructure.dto";

@ApiTags("infrastructure")
@Controller(["infrastructure", "infra"])
@UseGuards(PrincipalGuard)
export class InfrastructureController {
  constructor(private readonly svc: InfrastructureService) {}

  private principal(req: any) {
    return req.principal;
  }

  // ---------------- Locations ----------------

  @Get("locations")
  @Permissions(PERM.INFRA_LOCATION_READ)
  async listLocations(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("kind") kind?: string,
    @Query("at") at?: string,
  ) {
    return this.svc.listLocations(this.principal(req), { branchId, kind, at });
  }

  @Get("locations/tree")
  @Permissions(PERM.INFRA_LOCATION_READ)
  async locationTree(
    @Req() req: any,
    @Query("branchId") branchId: string,
    @Query("at") at?: string,
  ) {
    const roots: any[] = await this.svc.getLocationTree(this.principal(req), branchId, at);

    // Adapt service shape (kind + children[]) -> UI shape (type + buildings/floors/zones)
    const mapNode = (n: any): any => {
      const type = n.type ?? n.kind;
      const base: any = {
        id: n.id,
        branchId,
        type,
        parentId: n.parentId ?? null,
        code: n.code,
        name: n.name,
        isActive: n.isActive,
        effectiveFrom: n.effectiveFrom,
        effectiveTo: n.effectiveTo,
      };

      const kids: any[] = Array.isArray(n.children) ? n.children : [];
      if (type === "CAMPUS") base.buildings = kids.filter((x) => (x.kind ?? x.type) === "BUILDING").map(mapNode);
      if (type === "BUILDING") base.floors = kids.filter((x) => (x.kind ?? x.type) === "FLOOR").map(mapNode);
      if (type === "FLOOR") base.zones = kids.filter((x) => (x.kind ?? x.type) === "ZONE").map(mapNode);

      return base;
    };

    const campuses = roots.filter((r) => (r.kind ?? r.type) === "CAMPUS").map(mapNode);
    return { campuses };
  }

  // UI compatibility endpoints expected by your page.tsx
  // - UI sends branchId in BODY and kind is implied by endpoint

  @Post("locations/campuses")
  @Permissions(PERM.INFRA_LOCATION_CREATE)
  async createCampus(@Req() req: any, @Body() body: any) {
    const { branchId, ...rest } = body || {};
    return this.svc.createLocation(this.principal(req), { ...rest, kind: "CAMPUS" } as any, branchId);
  }

  @Post("locations/buildings")
  @Permissions(PERM.INFRA_LOCATION_CREATE)
  async createBuilding(@Req() req: any, @Body() body: any) {
    const { branchId, ...rest } = body || {};
    return this.svc.createLocation(this.principal(req), { ...rest, kind: "BUILDING" } as any, branchId);
  }

  @Post("locations/floors")
  @Permissions(PERM.INFRA_LOCATION_CREATE)
  async createFloor(@Req() req: any, @Body() body: any) {
    const { branchId, ...rest } = body || {};
    return this.svc.createLocation(this.principal(req), { ...rest, kind: "FLOOR" } as any, branchId);
  }

  @Post("locations/zones")
  @Permissions(PERM.INFRA_LOCATION_CREATE)
  async createZone(@Req() req: any, @Body() body: any) {
    const { branchId, ...rest } = body || {};
    return this.svc.createLocation(this.principal(req), { ...rest, kind: "ZONE" } as any, branchId);
  }

  @Post("locations/:id/revise")
  @Permissions(PERM.INFRA_LOCATION_UPDATE)
  async reviseLocation(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    return this.svc.updateLocation(this.principal(req), id, body);
  }

  @Post("locations/:id/retire")
  @Permissions(PERM.INFRA_LOCATION_UPDATE)
  async retireLocation(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    const effectiveTo = body?.effectiveTo;
    return this.svc.updateLocation(this.principal(req), id, {
      isActive: false,
      effectiveFrom: effectiveTo,
      effectiveTo: null,
    } as any);
  }

  @Post("locations")
  @Permissions(PERM.INFRA_LOCATION_CREATE)
  async createLocation(
    @Req() req: any,
    @Query("branchId") branchId: string,
    @Body() dto: CreateLocationNodeDto,
  ) {
    return this.svc.createLocation(this.principal(req), dto, branchId);
  }

  @Patch("locations/:id")
  @Permissions(PERM.INFRA_LOCATION_UPDATE)
  async updateLocation(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateLocationNodeDto) {
    return this.svc.updateLocation(this.principal(req), id, dto);
  }

  // ---------------- Unit Types ----------------

  @Get("unit-types/catalog")
  @Permissions(PERM.INFRA_UNITTYPE_READ)
  async unitTypeCatalog(@Req() req: any) {
    return this.svc.listUnitTypeCatalog(this.principal(req));
  }

  @Get("branches/:branchId/unit-types")
  @Permissions(PERM.INFRA_UNITTYPE_READ)
  async getBranchUnitTypes(@Req() req: any, @Param("branchId") branchId: string) {
    return this.svc.getBranchUnitTypes(this.principal(req), branchId);
  }

  @Put("branches/:branchId/unit-types")
  @Permissions(PERM.INFRA_UNITTYPE_UPDATE)
  async setBranchUnitTypes(
    @Req() req: any,
    @Param("branchId") branchId: string,
    @Body() dto: SetBranchUnitTypesDto,
  ) {
    return this.svc.setBranchUnitTypes(this.principal(req), dto.unitTypeIds, branchId);
  }

  // ---------------- Units ----------------

  @Get("units")
  @Permissions(PERM.INFRA_UNIT_READ)
  async listUnits(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("departmentId") departmentId?: string,
    @Query("unitTypeId") unitTypeId?: string,
    @Query("locationNodeId") locationNodeId?: string,
    @Query("q") q?: string,
    @Query("includeInactive") includeInactive?: string,
  ) {
    return this.svc.listUnits(this.principal(req), {
      branchId,
      departmentId,
      unitTypeId,
      locationNodeId,
      q,
      includeInactive: includeInactive === "true",
    });
  }

  @Get("units/:id")
  @Permissions(PERM.INFRA_UNIT_READ)
  async getUnit(@Req() req: any, @Param("id") id: string) {
    return this.svc.getUnit(this.principal(req), id);
  }

  @Post("units")
@Permissions(PERM.INFRA_UNIT_CREATE)
async createUnit(@Req() req: any, @Query("branchId") branchId: string, @Body() dto: CreateUnitDto) {
  return this.svc.createUnit(this.principal(req), dto, branchId);
}


  @Get("departments")
  @Permissions(PERM.INFRA_UNIT_READ)
  async listDepartments(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.listDepartments(this.principal(req), branchId ?? null);
  }

  @Patch("units/:id")
  @Permissions(PERM.INFRA_UNIT_UPDATE)
  async updateUnit(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateUnitDto) {
    return this.svc.updateUnit(this.principal(req), id, dto);
  }

  // ---------------- Rooms ----------------

  @Get("rooms")
  @Permissions(PERM.INFRA_ROOM_READ)
  async listRooms(
    @Req() req: any,
    @Query("unitId") unitId?: string,
    @Query("branchId") branchId?: string,
    @Query("includeInactive") includeInactive?: string,
  ) {
    return this.svc.listRooms(this.principal(req), {
      unitId: unitId ?? null,
      branchId: branchId ?? null,
      includeInactive: includeInactive === "true",
    });
  }

  @Post("rooms")
  @Permissions(PERM.INFRA_ROOM_CREATE)
  async createRoom(@Req() req: any, @Body() dto: CreateUnitRoomDto) {
    return this.svc.createRoom(this.principal(req), dto);
  }

  @Patch("rooms/:id")
  @Permissions(PERM.INFRA_ROOM_UPDATE)
  async updateRoom(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateUnitRoomDto) {
    return this.svc.updateRoom(this.principal(req), id, dto);
  }

  // ---------------- Resources ----------------

  @Get("resources")
  @Permissions(PERM.INFRA_RESOURCE_READ)
  async listResources(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("unitId") unitId?: string,
    @Query("roomId") roomId?: string,
    @Query("resourceType") resourceType?: string,
    @Query("state") state?: string,
    @Query("q") q?: string,
    @Query("includeInactive") includeInactive?: string,
  ) {
    return this.svc.listResources(this.principal(req), {
      branchId: branchId ?? null,
      unitId: unitId ?? null,
      roomId: roomId ?? null,
      resourceType,
      state,
      q,
      includeInactive: includeInactive === "true",
    });
  }

  @Post("resources")
  @Permissions(PERM.INFRA_RESOURCE_CREATE)
  async createResource(@Req() req: any, @Body() dto: CreateUnitResourceDto) {
    return this.svc.createResource(this.principal(req), dto);
  }

  @Patch("resources/:id")
  @Permissions(PERM.INFRA_RESOURCE_UPDATE)
  async updateResource(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateUnitResourceDto) {
    return this.svc.updateResource(this.principal(req), id, dto);
  }

  @Put("resources/:id/state")
  @Permissions(PERM.INFRA_RESOURCE_STATE_UPDATE)
  async setResourceState(@Req() req: any, @Param("id") id: string, @Body() dto: SetResourceStateDto) {
    return this.svc.setResourceState(this.principal(req), id, dto.state);
  }

  // ---------------- Bed State + Housekeeping Gate (Setup) ----------------

  @Get("branches/:branchId/infra-config")
  @Permissions(PERM.INFRA_GOLIVE_READ)
  async getBranchInfraConfig(@Req() req: any, @Param("branchId") branchId: string) {
    return this.svc.getBranchInfraConfig(this.principal(req), branchId);
  }

  @Put("branches/:branchId/infra-config")
  @Permissions(PERM.INFRA_GOLIVE_RUN)
  async updateBranchInfraConfig(
    @Req() req: any,
    @Param("branchId") branchId: string,
    @Body() dto: UpdateBranchInfraConfigDto,
  ) {
    return this.svc.updateBranchInfraConfig(this.principal(req), branchId, dto);
  }

  // ---------------- Equipment ----------------

  @Get("equipment")
  @Permissions(PERM.INFRA_EQUIPMENT_READ)
  async listEquipment(@Req() req: any, @Query("branchId") branchId?: string, @Query("q") q?: string) {
    return this.svc.listEquipment(this.principal(req), { branchId, q });
  }

  @Post("equipment")
  @Permissions(PERM.INFRA_EQUIPMENT_CREATE)
  async createEquipment(
    @Req() req: any,
    @Query("branchId") branchId: string,
    @Body() dto: CreateEquipmentAssetDto,
  ) {
    return this.svc.createEquipment(this.principal(req), dto, branchId);
  }

  @Patch("equipment/:id")
  @Permissions(PERM.INFRA_EQUIPMENT_UPDATE)
  async updateEquipment(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateEquipmentAssetDto) {
    return this.svc.updateEquipment(this.principal(req), id, dto);
  }

  @Post("equipment/downtime")
  @Permissions(PERM.INFRA_EQUIPMENT_UPDATE)
  async openDowntime(@Req() req: any, @Body() dto: CreateDowntimeDto) {
    return this.svc.openDowntime(this.principal(req), dto);
  }

  // ---------------- Charge Master + Services + Fix-It ----------------

  @Post("charge-master")
  @Permissions(PERM.INFRA_CHARGE_MASTER_CREATE)
  async createChargeMaster(
    @Req() req: any,
    @Query("branchId") branchId: string,
    @Body() dto: CreateChargeMasterItemDto,
  ) {
    return this.svc.createChargeMasterItem(this.principal(req), dto, branchId);
  }

  @Get("charge-master")
  @Permissions(PERM.INFRA_CHARGE_MASTER_READ)
  async listChargeMaster(@Req() req: any, @Query("branchId") branchId: string, @Query("q") q?: string) {
    return this.svc.listChargeMasterItems(this.principal(req), { branchId, q });
  }

  @Post("services")
  @Permissions(PERM.INFRA_SERVICE_CREATE)
  async createService(@Req() req: any, @Query("branchId") branchId: string, @Body() dto: CreateServiceItemDto) {
    return this.svc.createServiceItem(this.principal(req), dto, branchId);
  }

  @Get("services")
  @Permissions(PERM.INFRA_SERVICE_READ)
  async listServices(
    @Req() req: any,
    @Query("branchId") branchId: string,
    @Query("q") q?: string,
    @Query("includeInactive") includeInactive?: string,
  ) {
    return this.svc.listServiceItems(this.principal(req), {
      branchId,
      q,
      includeInactive: includeInactive === "true",
    });
  }

  @Patch("services/:id")
  @Permissions(PERM.INFRA_SERVICE_UPDATE)
  async updateService(@Req() req: any, @Param("id") id: string, @Body() dto: Partial<CreateServiceItemDto>) {
    return this.svc.updateServiceItem(this.principal(req), id, dto);
  }

  @Post("services/mapping")
  @Permissions(PERM.INFRA_SERVICE_MAPPING_UPDATE)
  async upsertMapping(@Req() req: any, @Body() dto: UpsertServiceChargeMappingDto) {
    return this.svc.upsertServiceChargeMapping(this.principal(req), dto);
  }

  @Get("fixit")
  @Permissions(PERM.INFRA_FIXIT_READ)
  async listFixIts(@Req() req: any, @Query("branchId") branchId: string, @Query("status") status?: string) {
    return this.svc.listFixIts(this.principal(req), { branchId, status });
  }

  @Patch("fixit/:id")
  @Permissions(PERM.INFRA_FIXIT_UPDATE)
  async updateFixIt(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateFixItDto) {
    return this.svc.updateFixIt(this.principal(req), id, dto);
  }

  // ---------------- Scheduling ----------------

  @Get("bookings")
  @Permissions(PERM.INFRA_SCHED_READ)
  async listBookings(
    @Req() req: any,
    @Query("branchId") branchId: string,
    @Query("unitId") unitId?: string,
    @Query("resourceId") resourceId?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.svc.listBookings(this.principal(req), { branchId, unitId, resourceId, from, to });
  }

  @Post("bookings")
  @Permissions(PERM.INFRA_SCHED_CREATE)
  async createBooking(@Req() req: any, @Body() dto: CreateProcedureBookingDto) {
    return this.svc.createBooking(this.principal(req), dto);
  }

  @Post("bookings/:id/cancel")
  @Permissions(PERM.INFRA_SCHED_CANCEL)
  async cancelBooking(@Req() req: any, @Param("id") id: string, @Body() dto: CancelProcedureBookingDto) {
    return this.svc.cancelBooking(this.principal(req), id, dto.reason);
  }

  // ---------------- Imports ----------------

  @Post("import/validate")
  @Permissions(PERM.INFRA_IMPORT_VALIDATE)
  async validateImport(@Req() req: any, @Query("branchId") branchId: string, @Body() dto: ValidateImportDto) {
    return this.svc.validateImport(this.principal(req), dto, branchId);
  }

  @Post("import/commit")
  @Permissions(PERM.INFRA_IMPORT_COMMIT)
  async commitImport(@Req() req: any, @Body() dto: CommitImportDto) {
    return this.svc.commitImport(this.principal(req), dto.jobId);
  }

  // ---------------- Go-Live Validator ----------------

  @Get("branch/go-live")
  @Permissions(PERM.INFRA_GOLIVE_READ)
  async goLivePreview(@Req() req: any, @Query("branchId") branchId: string) {
    return this.svc.runGoLive(this.principal(req), { persist: false }, branchId);
  }

  @Post("branch/go-live")
  @Permissions(PERM.INFRA_GOLIVE_RUN)
  async goLiveRun(@Req() req: any, @Query("branchId") branchId: string, @Body() dto: RunGoLiveDto) {
    return this.svc.runGoLive(this.principal(req), dto, branchId);
  }
}
