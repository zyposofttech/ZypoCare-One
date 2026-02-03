import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AccessPolicyService } from "../../auth/access-policy.service";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { DiagnosticsFacilitiesService } from "./diagnostics-facilities.service";
import {
  AddEquipmentToServicePointDto,
  AddResourceToServicePointDto,
  AddRoomToServicePointDto,
  CreateServicePointDto,
  ListServicePointsQuery,
  UpdateServicePointDto,
} from "./dto";
import type { Principal } from "./diagnostics.principal";

@ApiTags("infrastructure/diagnostics")
@Controller("infrastructure/diagnostics")
export class DiagnosticsFacilitiesController {
  constructor(
    private readonly svc: DiagnosticsFacilitiesService,
    private readonly access: AccessPolicyService,
  ) {}

  private principalFrom(req: any): Principal {
    return (req?.principal ?? {}) as Principal;
  }

  private branchIdFrom(principal: Principal, branchId: string | null | undefined) {
    return this.access.resolveBranchId(principal as any, branchId, { require: true }) as string;
  }

  // -------- Service Points (Diagnostic Units) --------
  @Get("service-points")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  listServicePoints(@Req() req: any, @Query() q: ListServicePointsQuery) {
    return this.svc.listServicePoints(this.principalFrom(req), q);
  }

  @Post("service-points")
  @Permissions(PERM.INFRA_DIAGNOSTICS_CREATE)
  createServicePoint(@Req() req: any, @Body() dto: CreateServicePointDto) {
    return this.svc.createServicePoint(this.principalFrom(req), dto);
  }

  @Get("service-points/:id")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  getServicePoint(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.getServicePoint(p, { id, branchId: b });
  }

  @Put("service-points/:id")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  updateServicePoint(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateServicePointDto) {
    return this.svc.updateServicePoint(this.principalFrom(req), id, dto);
  }

  @Delete("service-points/:id")
  @Permissions(PERM.INFRA_DIAGNOSTICS_DELETE)
  deleteServicePoint(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.deleteServicePoint(p, { id, branchId: b });
  }

  // -------- Rooms --------
  @Get("service-points/:id/rooms")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  listRooms(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.listRooms(p, { servicePointId: id, branchId: b });
  }

  @Post("service-points/:id/rooms")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  addRoom(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string, @Body() dto: AddRoomToServicePointDto) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.addRoom(p, { servicePointId: id, branchId: b }, dto);
  }

  @Delete("service-points/:id/rooms/:linkId")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  removeRoom(@Req() req: any, @Param("id") id: string, @Param("linkId") linkId: string, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.removeRoom(p, { servicePointId: id, linkId, branchId: b });
  }

  // -------- Resources --------
  @Get("service-points/:id/resources")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  listResources(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.listResources(p, { servicePointId: id, branchId: b });
  }

  @Post("service-points/:id/resources")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  addResource(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string, @Body() dto: AddResourceToServicePointDto) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.addResource(p, { servicePointId: id, branchId: b }, dto);
  }

  @Delete("service-points/:id/resources/:linkId")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  removeResource(@Req() req: any, @Param("id") id: string, @Param("linkId") linkId: string, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.removeResource(p, { servicePointId: id, linkId, branchId: b });
  }

  // -------- Equipment --------
  @Get("service-points/:id/equipment")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  listEquipment(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.listEquipment(p, { servicePointId: id, branchId: b });
  }

  @Post("service-points/:id/equipment")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  addEquipment(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string, @Body() dto: AddEquipmentToServicePointDto) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.addEquipment(p, { servicePointId: id, branchId: b }, dto);
  }

  @Delete("service-points/:id/equipment/:linkId")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  removeEquipment(@Req() req: any, @Param("id") id: string, @Param("linkId") linkId: string, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.removeEquipment(p, { servicePointId: id, linkId, branchId: b });
  }
}
