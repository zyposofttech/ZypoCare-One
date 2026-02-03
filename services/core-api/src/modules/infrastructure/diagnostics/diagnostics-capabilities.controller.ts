import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AccessPolicyService } from "../../auth/access-policy.service";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import type { Principal } from "./diagnostics.principal";
import { DiagnosticsCapabilitiesService } from "./diagnostics-capabilities.service";
import {
  AddCapabilityEquipmentDto,
  AddCapabilityResourceDto,
  AddCapabilityRoomDto,
  CreateCapabilityDto,
  ListCapabilitiesQuery,
  UpdateCapabilityDto,
} from "./dto";

@ApiTags("infrastructure/diagnostics")
@Controller("infrastructure/diagnostics")
export class DiagnosticsCapabilitiesController {
  constructor(
    private readonly svc: DiagnosticsCapabilitiesService,
    private readonly access: AccessPolicyService,
  ) {}

  private principalFrom(req: any): Principal {
    return (req?.principal ?? {}) as Principal;
  }

  private branchIdFrom(principal: Principal, branchId: string | null | undefined) {
    return this.access.resolveBranchId(principal as any, branchId, { require: true }) as string;
  }

  // ---------- CRUD ----------
  @Get("capabilities")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  list(@Req() req: any, @Query() q: ListCapabilitiesQuery) {
    return this.svc.list(this.principalFrom(req), q);
  }

  @Post("capabilities")
  @Permissions(PERM.INFRA_DIAGNOSTICS_CREATE)
  create(@Req() req: any, @Body() dto: CreateCapabilityDto) {
    return this.svc.create(this.principalFrom(req), dto);
  }

  @Get("capabilities/:id")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  get(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.get(p, { id, branchId: b });
  }

  @Put("capabilities/:id")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  update(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateCapabilityDto) {
    return this.svc.update(this.principalFrom(req), id, dto);
  }

  @Delete("capabilities/:id")
  @Permissions(PERM.INFRA_DIAGNOSTICS_DELETE)
  delete(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.softDelete(p, { id, branchId: b });
  }

  // ---------- Allowed Rooms ----------
  @Get("capabilities/:id/rooms")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  listRooms(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.listAllowedRooms(p, { capabilityId: id, branchId: b });
  }

  @Post("capabilities/:id/rooms")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  addRoom(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string, @Body() dto: AddCapabilityRoomDto) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.addAllowedRoom(p, { capabilityId: id, branchId: b }, dto);
  }

  @Delete("capabilities/:id/rooms/:linkId")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  removeRoom(@Req() req: any, @Param("id") id: string, @Param("linkId") linkId: string, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.removeAllowedRoom(p, { capabilityId: id, linkId, branchId: b });
  }

  // ---------- Allowed Resources ----------
  @Get("capabilities/:id/resources")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  listResources(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.listAllowedResources(p, { capabilityId: id, branchId: b });
  }

  @Post("capabilities/:id/resources")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  addResource(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string, @Body() dto: AddCapabilityResourceDto) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.addAllowedResource(p, { capabilityId: id, branchId: b }, dto);
  }

  @Delete("capabilities/:id/resources/:linkId")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  removeResource(@Req() req: any, @Param("id") id: string, @Param("linkId") linkId: string, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.removeAllowedResource(p, { capabilityId: id, linkId, branchId: b });
  }

  // ---------- Allowed Equipment ----------
  @Get("capabilities/:id/equipment")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  listEquipment(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.listAllowedEquipment(p, { capabilityId: id, branchId: b });
  }

  @Post("capabilities/:id/equipment")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  addEquipment(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string, @Body() dto: AddCapabilityEquipmentDto) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.addAllowedEquipment(p, { capabilityId: id, branchId: b }, dto);
  }

  @Delete("capabilities/:id/equipment/:linkId")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  removeEquipment(@Req() req: any, @Param("id") id: string, @Param("linkId") linkId: string, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.removeAllowedEquipment(p, { capabilityId: id, linkId, branchId: b });
  }
}
