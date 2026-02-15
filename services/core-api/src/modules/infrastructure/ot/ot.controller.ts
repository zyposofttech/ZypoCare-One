import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { PrincipalGuard } from "../../auth/principal.guard";
import { PermissionsGuard } from "../../auth/permissions.guard";
import { Permissions } from "../../auth/permissions.decorator";
import type { Principal } from "../../auth/access-policy.service";

import { PERM } from "../../iam/iam.constants";

import { OtService } from "./ot.service";
import {
  CreateOtEquipmentDto,
  CreateOtSpaceDto,
  CreateOtSuiteDto,
  CreateOtTableDto,
  OtSpaceType,
  UpdateOtEquipmentDto,
  UpdateOtSpaceDto,
  UpdateOtSuiteDto,
  UpdateOtTableDto,
} from "./ot.dto";

@ApiTags("infrastructure/ot")
@Controller("infrastructure/ot")
@UseGuards(PrincipalGuard, PermissionsGuard)
export class OtController {
  constructor(private readonly svc: OtService) {}

  private principal(req: any): Principal {
    return req.principal as Principal;
  }

  // -------------------- Suites --------------------

  @Get("suites")
  @Permissions(PERM.OT_SUITE_READ)
  listSuites(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.listSuites(this.principal(req), branchId);
  }

  @Get("suites/suggest-code")
  @Permissions(PERM.OT_SUITE_CREATE)
  suggestSuiteCode(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.suggestSuiteCode(this.principal(req), branchId);
  }

  @Get("suites/:id")
  @Permissions(PERM.OT_SUITE_READ)
  getSuite(@Req() req: any, @Param("id") id: string) {
    return this.svc.getSuite(this.principal(req), id);
  }

  @Post("suites")
  @Permissions(PERM.OT_SUITE_CREATE)
  createSuite(@Req() req: any, @Body() dto: CreateOtSuiteDto) {
    return this.svc.createSuite(this.principal(req), dto);
  }

  @Patch("suites/:id")
  @Permissions(PERM.OT_SUITE_UPDATE)
  updateSuite(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateOtSuiteDto) {
    return this.svc.updateSuite(this.principal(req), id, dto);
  }

  @Delete("suites/:id")
  @Permissions(PERM.OT_SUITE_DELETE)
  deleteSuite(@Req() req: any, @Param("id") id: string) {
    return this.svc.deleteSuite(this.principal(req), id);
  }

  // -------------------- Spaces --------------------

  @Get("suites/:suiteId/spaces")
  @Permissions(PERM.OT_SUITE_READ)
  listSpaces(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.listSpaces(this.principal(req), suiteId);
  }

  @Get("suites/:suiteId/spaces/suggest-code")
  @Permissions(PERM.OT_SPACE_CREATE)
  suggestSpaceCode(@Req() req: any, @Param("suiteId") suiteId: string, @Query("type") type: OtSpaceType) {
    return this.svc.suggestSpaceCode(this.principal(req), suiteId, type);
  }

  @Post("suites/:suiteId/spaces")
  @Permissions(PERM.OT_SPACE_CREATE)
  createSpace(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateOtSpaceDto) {
    return this.svc.createSpace(this.principal(req), suiteId, dto);
  }

  @Patch("spaces/:spaceId")
  @Permissions(PERM.OT_SPACE_UPDATE)
  updateSpace(@Req() req: any, @Param("spaceId") spaceId: string, @Body() dto: UpdateOtSpaceDto) {
    return this.svc.updateSpace(this.principal(req), spaceId, dto);
  }

  @Delete("spaces/:spaceId")
  @Permissions(PERM.OT_SPACE_DELETE)
  deleteSpace(@Req() req: any, @Param("spaceId") spaceId: string) {
    return this.svc.deleteSpace(this.principal(req), spaceId);
  }

  // -------------------- Tables --------------------

  @Post("theatres/:theatreId/tables")
  @Permissions(PERM.OT_TABLE_CREATE)
  createTable(@Req() req: any, @Param("theatreId") theatreId: string, @Body() dto: CreateOtTableDto) {
    return this.svc.createTable(this.principal(req), theatreId, dto);
  }

  @Patch("tables/:tableId")
  @Permissions(PERM.OT_TABLE_UPDATE)
  updateTable(@Req() req: any, @Param("tableId") tableId: string, @Body() dto: UpdateOtTableDto) {
    return this.svc.updateTable(this.principal(req), tableId, dto);
  }

  @Delete("tables/:tableId")
  @Permissions(PERM.OT_TABLE_DELETE)
  deleteTable(@Req() req: any, @Param("tableId") tableId: string) {
    return this.svc.deleteTable(this.principal(req), tableId);
  }

  // -------------------- Equipment --------------------

  @Get("suites/:suiteId/equipment")
  @Permissions(PERM.OT_SUITE_READ)
  listEquipment(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.listEquipment(this.principal(req), suiteId);
  }

  @Post("suites/:suiteId/equipment")
  @Permissions(PERM.OT_EQUIPMENT_CREATE)
  createEquipment(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateOtEquipmentDto) {
    return this.svc.createEquipment(this.principal(req), suiteId, dto);
  }

  @Patch("equipment/:id")
  @Permissions(PERM.OT_EQUIPMENT_UPDATE)
  updateEquipment(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateOtEquipmentDto) {
    return this.svc.updateEquipment(this.principal(req), id, dto);
  }

  @Delete("equipment/:id")
  @Permissions(PERM.OT_EQUIPMENT_DELETE)
  deleteEquipment(@Req() req: any, @Param("id") id: string) {
    return this.svc.deleteEquipment(this.principal(req), id);
  }

  // -------------------- Readiness --------------------

  @Get("suites/:id/readiness")
  @Permissions(PERM.OT_SUITE_READ)
  readiness(@Req() req: any, @Param("id") id: string) {
    return this.svc.readiness(this.principal(req), id);
  }
}
