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
} from "./infrastructure.dto";

@ApiTags("infrastructure")
@Controller()
@UseGuards(PrincipalGuard)
export class InfrastructureController {
  constructor(private readonly svc: InfrastructureService) {}

  private principal(req: any) {
    return req.principal;
  }

  // ---------------- Locations ----------------

  @Get(["infrastructure/locations", "infra/locations"])
  @Permissions(PERM.INFRA_LOCATION_READ)
  async listLocations(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("kind") kind?: string,
    @Query("at") at?: string,
  ) {
    return this.svc.listLocations(this.principal(req), { branchId, kind, at });
  }
  @Get(["infrastructure/locations/tree", "infra/locations/tree"])
  @Permissions(PERM.INFRA_LOCATION_READ)
  async locationTree(
    @Req() req: any,
    @Query("branchId") branchId: string,
    @Query("at") at?: string,
  ) {
    const roots: any[] = await this.svc.getLocationTree(this.principal(req), branchId, at);

    // Adapt service shape (kind + children[]) -> UI shape (type + buildings/floors/zones)
    const mapNode = (n: any): any => {
      const type = n.type ?? n.kind; // service uses kind
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

    const campuses = roots
      .filter((r) => (r.kind ?? r.type) === "CAMPUS")
      .map(mapNode);

    return { campuses };
  }

  /**
   * UI compatibility endpoints expected by your page.tsx
   * - UI sends branchId in BODY (not query) and does not send kind (it is implied by the endpoint)
   */

  @Post(["infrastructure/locations/campuses", "infra/locations/campuses"])
  @Permissions(PERM.INFRA_LOCATION_CREATE)
  async createCampus(@Req() req: any, @Body() body: any) {
    const { branchId, ...rest } = body || {};
    return this.svc.createLocation(this.principal(req), { ...rest, kind: "CAMPUS" } as any, branchId);
  }

  @Post(["infrastructure/locations/buildings", "infra/locations/buildings"])
  @Permissions(PERM.INFRA_LOCATION_CREATE)
  async createBuilding(@Req() req: any, @Body() body: any) {
    const { branchId, ...rest } = body || {};
    return this.svc.createLocation(this.principal(req), { ...rest, kind: "BUILDING" } as any, branchId);
  }

  @Post(["infrastructure/locations/floors", "infra/locations/floors"])
  @Permissions(PERM.INFRA_LOCATION_CREATE)
  async createFloor(@Req() req: any, @Body() body: any) {
    const { branchId, ...rest } = body || {};
    return this.svc.createLocation(this.principal(req), { ...rest, kind: "FLOOR" } as any, branchId);
  }

  @Post(["infrastructure/locations/zones", "infra/locations/zones"])
  @Permissions(PERM.INFRA_LOCATION_CREATE)
  async createZone(@Req() req: any, @Body() body: any) {
    const { branchId, ...rest } = body || {};
    return this.svc.createLocation(this.principal(req), { ...rest, kind: "ZONE" } as any, branchId);
  }

  @Post(["infrastructure/locations/:id/revise", "infra/locations/:id/revise"])
  @Permissions(PERM.INFRA_LOCATION_UPDATE)
  async reviseLocation(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    // UI sends: { code, name, effectiveFrom }
    return this.svc.updateLocation(this.principal(req), id, body);
  }

  @Post(["infrastructure/locations/:id/retire", "infra/locations/:id/retire"])
  @Permissions(PERM.INFRA_LOCATION_UPDATE)
  async retireLocation(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    // UI sends: { effectiveTo }
    // We interpret "retire effective at X" as: create a new revision starting at X with isActive=false.
    const effectiveTo = body?.effectiveTo;
    return this.svc.updateLocation(this.principal(req), id, {
      isActive: false,
      effectiveFrom: effectiveTo,
      effectiveTo: null,
    } as any);
  }

  @Post(["infrastructure/locations", "infra/locations"])
  @Permissions(PERM.INFRA_LOCATION_CREATE)
  async createLocation(
    @Req() req: any,
    @Query("branchId") branchId: string,
    @Body() dto: CreateLocationNodeDto,
  ) {
    return this.svc.createLocation(this.principal(req), dto, branchId);
  }

  @Patch(["infrastructure/locations/:id", "infra/locations/:id"])
  @Permissions(PERM.INFRA_LOCATION_UPDATE)
  async updateLocation(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateLocationNodeDto) {
    return this.svc.updateLocation(this.principal(req), id, dto);
  }

  // ---------------- Unit Types ----------------

  @Get(["infrastructure/unit-types/catalog", "infra/unit-types/catalog"])
  @Permissions(PERM.INFRA_UNITTYPE_READ)
  async unitTypeCatalog(@Req() req: any) {
    return this.svc.listUnitTypeCatalog(this.principal(req));
  }

  @Get(["infrastructure/branches/:branchId/unit-types", "infra/branches/:branchId/unit-types"])
  @Permissions(PERM.INFRA_UNITTYPE_READ)
  async getBranchUnitTypes(@Req() req: any, @Param("branchId") branchId: string) {
    return this.svc.getBranchUnitTypes(this.principal(req), branchId);
  }

  @Put(["infrastructure/branches/:branchId/unit-types", "infra/branches/:branchId/unit-types"])
  @Permissions(PERM.INFRA_UNITTYPE_UPDATE)
  async setBranchUnitTypes(@Req() req: any, @Param("branchId") branchId: string, @Body() dto: SetBranchUnitTypesDto) {
    return this.svc.setBranchUnitTypes(this.principal(req), dto.unitTypeIds, branchId);
  }

  // ---------------- Units ----------------

  @Get(["infrastructure/units", "infra/units"])
  @Permissions(PERM.INFRA_UNIT_READ)
  async listUnits(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("departmentId") departmentId?: string,
    @Query("unitTypeId") unitTypeId?: string,
    @Query("q") q?: string,
    @Query("includeInactive") includeInactive?: string,
  ) {
    return this.svc.listUnits(this.principal(req), {
      branchId,
      departmentId,
      unitTypeId,
      q,
      includeInactive: includeInactive === "true",
    });
  }

  @Post(["infrastructure/units", "infra/units"])
  @Permissions(PERM.INFRA_UNIT_CREATE)
  async createUnit(@Req() req: any, @Body() dto: CreateUnitDto) {
    return this.svc.createUnit(this.principal(req), dto);
  }

  @Patch(["infrastructure/units/:id", "infra/units/:id"])
  @Permissions(PERM.INFRA_UNIT_UPDATE)
  async updateUnit(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateUnitDto) {
    return this.svc.updateUnit(this.principal(req), id, dto);
  }

  // ---------------- Rooms ----------------

  @Get(["infrastructure/rooms", "infra/rooms"])
  @Permissions(PERM.INFRA_ROOM_READ)
  async listRooms(@Req() req: any, @Query("unitId") unitId: string) {
    return this.svc.listRooms(this.principal(req), unitId);
  }

  @Post(["infrastructure/rooms", "infra/rooms"])
  @Permissions(PERM.INFRA_ROOM_CREATE)
  async createRoom(@Req() req: any, @Body() dto: CreateUnitRoomDto) {
    return this.svc.createRoom(this.principal(req), dto);
  }

  @Patch(["infrastructure/rooms/:id", "infra/rooms/:id"])
  @Permissions(PERM.INFRA_ROOM_UPDATE)
  async updateRoom(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateUnitRoomDto) {
    return this.svc.updateRoom(this.principal(req), id, dto);
  }

  // ---------------- Resources ----------------

  @Get(["infrastructure/resources", "infra/resources"])
  @Permissions(PERM.INFRA_RESOURCE_READ)
  async listResources(@Req() req: any, @Query("unitId") unitId: string, @Query("roomId") roomId?: string) {
    return this.svc.listResources(this.principal(req), { unitId, roomId: roomId ?? null });
  }

  @Post(["infrastructure/resources", "infra/resources"])
  @Permissions(PERM.INFRA_RESOURCE_CREATE)
  async createResource(@Req() req: any, @Body() dto: CreateUnitResourceDto) {
    return this.svc.createResource(this.principal(req), dto);
  }

  @Patch(["infrastructure/resources/:id", "infra/resources/:id"])
  @Permissions(PERM.INFRA_RESOURCE_UPDATE)
  async updateResource(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateUnitResourceDto) {
    return this.svc.updateResource(this.principal(req), id, dto);
  }

  @Put(["infrastructure/resources/:id/state", "infra/resources/:id/state"])
  @Permissions(PERM.INFRA_RESOURCE_STATE_UPDATE)
  async setResourceState(@Req() req: any, @Param("id") id: string, @Body() dto: SetResourceStateDto) {
    return this.svc.setResourceState(this.principal(req), id, dto.state);
  }

  // ---------------- Equipment ----------------

  @Get(["infrastructure/equipment", "infra/equipment"])
  @Permissions(PERM.INFRA_EQUIPMENT_READ)
  async listEquipment(@Req() req: any, @Query("branchId") branchId?: string, @Query("q") q?: string) {
    return this.svc.listEquipment(this.principal(req), { branchId, q });
  }

  @Post(["infrastructure/equipment", "infra/equipment"])
  @Permissions(PERM.INFRA_EQUIPMENT_CREATE)
  async createEquipment(@Req() req: any, @Query("branchId") branchId: string, @Body() dto: CreateEquipmentAssetDto) {
    return this.svc.createEquipment(this.principal(req), dto, branchId);
  }

  @Patch(["infrastructure/equipment/:id", "infra/equipment/:id"])
  @Permissions(PERM.INFRA_EQUIPMENT_UPDATE)
  async updateEquipment(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateEquipmentAssetDto) {
    return this.svc.updateEquipment(this.principal(req), id, dto);
  }

  @Post(["infrastructure/equipment/downtime", "infra/equipment/downtime"])
  @Permissions(PERM.INFRA_EQUIPMENT_UPDATE)
  async openDowntime(@Req() req: any, @Body() dto: CreateDowntimeDto) {
    return this.svc.openDowntime(this.principal(req), dto);
  }

  // ---------------- Charge Master + Services + Fix-It ----------------

  @Post(["infrastructure/charge-master", "infra/charge-master"])
  @Permissions(PERM.INFRA_CHARGE_MASTER_CREATE)
  async createChargeMaster(@Req() req: any, @Query("branchId") branchId: string, @Body() dto: CreateChargeMasterItemDto) {
    return this.svc.createChargeMasterItem(this.principal(req), dto, branchId);
  }

  @Get(["infrastructure/charge-master", "infra/charge-master"])
  @Permissions(PERM.INFRA_CHARGE_MASTER_READ)
  async listChargeMaster(@Req() req: any, @Query("branchId") branchId: string, @Query("q") q?: string) {
    return this.svc.listChargeMasterItems(this.principal(req), { branchId, q });
  }

  @Post(["infrastructure/services", "infra/services"])
  @Permissions(PERM.INFRA_SERVICE_CREATE)
  async createService(@Req() req: any, @Query("branchId") branchId: string, @Body() dto: CreateServiceItemDto) {
    return this.svc.createServiceItem(this.principal(req), dto, branchId);
  }

  @Get(["infrastructure/services", "infra/services"])
  @Permissions(PERM.INFRA_SERVICE_READ)
  async listServices(
    @Req() req: any,
    @Query("branchId") branchId: string,
    @Query("q") q?: string,
    @Query("includeInactive") includeInactive?: string,
  ) {
    return this.svc.listServiceItems(this.principal(req), { branchId, q, includeInactive: includeInactive === "true" });
  }

  @Patch(["infrastructure/services/:id", "infra/services/:id"])
  @Permissions(PERM.INFRA_SERVICE_UPDATE)
  async updateService(@Req() req: any, @Param("id") id: string, @Body() dto: Partial<CreateServiceItemDto>) {
    return this.svc.updateServiceItem(this.principal(req), id, dto);
  }

  @Post(["infrastructure/services/mapping", "infra/services/mapping"])
  @Permissions(PERM.INFRA_SERVICE_MAPPING_UPDATE)
  async upsertMapping(@Req() req: any, @Body() dto: UpsertServiceChargeMappingDto) {
    return this.svc.upsertServiceChargeMapping(this.principal(req), dto);
  }

  @Get(["infrastructure/fixit", "infra/fixit"])
  @Permissions(PERM.INFRA_FIXIT_READ)
  async listFixIts(@Req() req: any, @Query("branchId") branchId: string, @Query("status") status?: string) {
    return this.svc.listFixIts(this.principal(req), { branchId, status });
  }

  @Patch(["infrastructure/fixit/:id", "infra/fixit/:id"])
  @Permissions(PERM.INFRA_FIXIT_UPDATE)
  async updateFixIt(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateFixItDto) {
    return this.svc.updateFixIt(this.principal(req), id, dto);
  }

  // ---------------- Scheduling ----------------

  @Get(["infrastructure/bookings", "infra/bookings"])
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

  @Post(["infrastructure/bookings", "infra/bookings"])
  @Permissions(PERM.INFRA_SCHED_CREATE)
  async createBooking(@Req() req: any, @Body() dto: CreateProcedureBookingDto) {
    return this.svc.createBooking(this.principal(req), dto);
  }

  @Post(["infrastructure/bookings/:id/cancel", "infra/bookings/:id/cancel"])
  @Permissions(PERM.INFRA_SCHED_CANCEL)
  async cancelBooking(@Req() req: any, @Param("id") id: string, @Body() dto: CancelProcedureBookingDto) {
    return this.svc.cancelBooking(this.principal(req), id, dto.reason);
  }

  // ---------------- Imports ----------------

  @Post(["infrastructure/import/validate", "infra/import/validate"])
  @Permissions(PERM.INFRA_IMPORT_VALIDATE)
  async validateImport(@Req() req: any, @Query("branchId") branchId: string, @Body() dto: ValidateImportDto) {
    return this.svc.validateImport(this.principal(req), dto, branchId);
  }

  @Post(["infrastructure/import/commit", "infra/import/commit"])
  @Permissions(PERM.INFRA_IMPORT_COMMIT)
  async commitImport(@Req() req: any, @Body() dto: CommitImportDto) {
    return this.svc.commitImport(this.principal(req), dto.jobId);
  }

  // ---------------- Go-Live Validator ----------------

  @Get(["infrastructure/branch/go-live", "infra/branch/go-live"])
  @Permissions(PERM.INFRA_GOLIVE_READ)
  async goLivePreview(@Req() req: any, @Query("branchId") branchId: string) {
    return this.svc.runGoLive(this.principal(req), { persist: false }, branchId);
  }

  @Post(["infrastructure/branch/go-live", "infra/branch/go-live"])
  @Permissions(PERM.INFRA_GOLIVE_RUN)
  async goLiveRun(@Req() req: any, @Query("branchId") branchId: string, @Body() dto: RunGoLiveDto) {
    return this.svc.runGoLive(this.principal(req), dto, branchId);
  }
}
