import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { ApiTags } from "@nestjs/swagger";
import { PrincipalGuard } from "../auth/principal.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Permissions } from "../auth/permissions.decorator";
import { PERM } from "../iam/iam.constants";
import {
  CreateBedDto,
  CreateDepartmentDto,
  CreateFacilityDto,
  CreateRoomDto,
  CreateSpecialtyDto,
  CreateWardDto,
  UpdateBedDto,
  UpdateDepartmentDto,
  UpdateFacilityDto,
  UpdateRoomDto,
  UpdateSpecialtyDto,
  UpdateWardDto,
} from "./facility.dto";
import { FacilityService } from "./facility.service";

@ApiTags("masters")
@UseGuards(PrincipalGuard, PermissionsGuard)
@Controller()
export class FacilityController {
  constructor(private svc: FacilityService) {}

  private principal(req: Request) {
    return (req as any).principal;
  }

  // ------------------------ Facilities ------------------------

  @Get("facilities")
  @Permissions(PERM.FACILITY_READ)
  async listFacilities(@Req() req: Request, @Query("branchId") branchId?: string) {
    return this.svc.listFacilities(this.principal(req), branchId);
  }

  @Get("facilities/:id")
  @Permissions(PERM.FACILITY_READ)
  async getFacility(@Req() req: Request, @Param("id") id: string) {
    return this.svc.getFacility(this.principal(req), id);
  }

  @Post("facilities")
  @Permissions(PERM.FACILITY_CREATE)
  async createFacility(@Req() req: Request, @Body() dto: CreateFacilityDto) {
    return this.svc.createFacility(this.principal(req), dto);
  }

  @Patch("facilities/:id")
  @Permissions(PERM.FACILITY_UPDATE)
  async updateFacility(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateFacilityDto) {
    return this.svc.updateFacility(this.principal(req), id, dto);
  }

  // ------------------------ Departments ------------------------

  @Get("departments")
  @Permissions(PERM.DEPARTMENT_READ)
  async listDepartments(@Req() req: Request, @Query("branchId") branchId?: string) {
    return this.svc.listDepartments(this.principal(req), branchId);
  }

  @Post("departments")
  @Permissions(PERM.DEPARTMENT_CREATE)
  async createDepartment(@Req() req: Request, @Body() dto: CreateDepartmentDto) {
    return this.svc.createDepartment(this.principal(req), dto);
  }

  @Patch("departments/:id")
  @Permissions(PERM.DEPARTMENT_UPDATE)
  async updateDepartment(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateDepartmentDto) {
    return this.svc.updateDepartment(this.principal(req), id, dto);
  }

  // ------------------------ Specialties ------------------------

  @Get("specialties")
  @Permissions(PERM.SPECIALTY_READ)
  async listSpecialties(@Req() req: Request, @Query("branchId") branchId?: string) {
    return this.svc.listSpecialties(this.principal(req), branchId);
  }

  @Post("specialties")
  @Permissions(PERM.SPECIALTY_CREATE)
  async createSpecialty(@Req() req: Request, @Body() dto: CreateSpecialtyDto) {
    return this.svc.createSpecialty(this.principal(req), dto);
  }

  @Patch("specialties/:id")
  @Permissions(PERM.SPECIALTY_UPDATE)
  async updateSpecialty(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateSpecialtyDto) {
    return this.svc.updateSpecialty(this.principal(req), id, dto);
  }

  // ------------------------ Wards ------------------------

  @Get("wards")
  @Permissions(PERM.WARD_READ)
  async listWards(@Req() req: Request, @Query("branchId") branchId?: string) {
    return this.svc.listWards(this.principal(req), branchId);
  }

  @Post("wards")
  @Permissions(PERM.WARD_CREATE)
  async createWard(@Req() req: Request, @Body() dto: CreateWardDto) {
    return this.svc.createWard(this.principal(req), dto);
  }

  @Patch("wards/:id")
  @Permissions(PERM.WARD_UPDATE)
  async updateWard(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateWardDto) {
    return this.svc.updateWard(this.principal(req), id, dto);
  }

  // ------------------------ Rooms ------------------------

  @Get("wards/:id/rooms")
  @Permissions(PERM.ROOM_READ)
  async listRooms(@Req() req: Request, @Param("id") wardId: string) {
    return this.svc.listRooms(this.principal(req), wardId);
  }

  @Post("wards/:id/rooms")
  @Permissions(PERM.ROOM_CREATE)
  async createRoom(@Req() req: Request, @Param("id") wardId: string, @Body() dto: CreateRoomDto) {
    return this.svc.createRoom(this.principal(req), wardId, dto);
  }

  @Patch("rooms/:id")
  @Permissions(PERM.ROOM_UPDATE)
  async updateRoom(@Req() req: Request, @Param("id") roomId: string, @Body() dto: UpdateRoomDto) {
    return this.svc.updateRoom(this.principal(req), roomId, dto);
  }

  // ------------------------ Beds ------------------------

  // Legacy convenience: list all beds under a ward (across rooms)
  @Get("wards/:id/beds")
  @Permissions(PERM.BED_READ)
  async listBedsForWard(@Req() req: Request, @Param("id") wardId: string) {
    return this.svc.listBedsForWard(this.principal(req), wardId);
  }

  @Get("rooms/:id/beds")
  @Permissions(PERM.BED_READ)
  async listBedsForRoom(@Req() req: Request, @Param("id") roomId: string) {
    return this.svc.listBedsForRoom(this.principal(req), roomId);
  }

  @Post("rooms/:id/beds")
  @Permissions(PERM.BED_CREATE)
  async createBed(@Req() req: Request, @Param("id") roomId: string, @Body() dto: CreateBedDto) {
    return this.svc.createBed(this.principal(req), roomId, dto);
  }

  @Patch("beds/:id")
  @Permissions(PERM.BED_UPDATE)
  async updateBed(@Req() req: Request, @Param("id") bedId: string, @Body() dto: UpdateBedDto) {
    return this.svc.updateBed(this.principal(req), bedId, dto);
  }
}
