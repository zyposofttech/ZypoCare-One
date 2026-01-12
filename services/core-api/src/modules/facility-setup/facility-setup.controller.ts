import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrincipalGuard } from "../auth/principal.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Permissions } from "../auth/permissions.decorator";
import type { Principal } from "../auth/access-policy.service";
import { PERM } from "../iam/iam.constants";
import { FacilitySetupService } from "./facility-setup.service";
import {
  CreateDepartmentDto,
  SetBranchFacilitiesDto,
  UpdateDepartmentAssignmentsDto,
  UpdateDepartmentDto,
  CreateFacilityDto,
  CreateSpecialtyDto,
  UpdateSpecialtyDto,
  SetDepartmentSpecialtiesDto,
} from "./facility-setup.dto";

@ApiTags("facility-setup")
@Controller()
@UseGuards(PrincipalGuard, PermissionsGuard)
export class FacilitySetupController {
  constructor(private svc: FacilitySetupService) {}

  private principal(req: any): Principal {
    return req.principal as Principal;
  }

  // -------------------- Facility catalog + branch selection --------------------

  @Get("facilities/master")
  @Permissions(PERM.FACILITY_CATALOG_READ)
  async facilityCatalog(
    @Query("category") category: string | undefined,
    @Query("includeInactive") includeInactive: string | undefined,
    @Req() req: any,
  ) {
    return this.svc.listFacilityCatalog(this.principal(req), {
      category,
      includeInactive: includeInactive === "true",
    });
  }

  @Post("facilities/master")
  @Permissions(PERM.FACILITY_CATALOG_CREATE)
  async createFacility(@Body() dto: CreateFacilityDto, @Req() req: any) {
    return this.svc.createFacility(this.principal(req), dto);
  }

  /**
   * Convenience endpoints for BRANCH-scoped users.
   * GLOBAL users should use /branches/:branchId variants.
   */
  @Get("branch/facilities")
  @Permissions(PERM.BRANCH_FACILITY_READ)
  async myBranchFacilities(@Req() req: any) {
    return this.svc.getBranchFacilities(this.principal(req));
  }

  @Get("branches/:branchId/facilities")
  @Permissions(PERM.BRANCH_FACILITY_READ)
  async branchFacilities(@Param("branchId") branchId: string, @Req() req: any) {
    return this.svc.getBranchFacilities(this.principal(req), branchId);
  }

  @Put("branch/facilities")
  @Permissions(PERM.BRANCH_FACILITY_UPDATE)
  async setMyBranchFacilities(@Body() dto: SetBranchFacilitiesDto, @Req() req: any) {
    // branch scoped => resolve from principal
    return this.svc.setBranchFacilities(this.principal(req), dto.facilityIds);
  }

  @Put("branches/:branchId/facilities")
  @Permissions(PERM.BRANCH_FACILITY_UPDATE)
  async setBranchFacilities(@Param("branchId") branchId: string, @Body() dto: SetBranchFacilitiesDto, @Req() req: any) {
    // global scope => explicit branchId
    return this.svc.setBranchFacilities(this.principal(req), dto.facilityIds, branchId);
  }

  // -------------------- Readiness summary --------------------

  @Get("branch/readiness")
  @Permissions(PERM.BRANCH_FACILITY_READ)
  async myBranchReadiness(@Req() req: any) {
    return this.svc.getBranchReadiness(this.principal(req));
  }

  @Get("branches/:branchId/readiness")
  @Permissions(PERM.BRANCH_FACILITY_READ)
  async branchReadiness(@Param("branchId") branchId: string, @Req() req: any) {
    return this.svc.getBranchReadiness(this.principal(req), branchId);
  }

  // -------------------- Departments --------------------

  @Get("departments")
  @Permissions(PERM.DEPARTMENT_READ)
  async listDepartments(
    @Query("branchId") branchId: string | undefined,
    @Query("facilityId") facilityId: string | undefined,
    @Query("includeInactive") includeInactive: string | undefined,
    @Query("q") q: string | undefined,
    @Req() req: any,
  ) {
    return this.svc.listDepartments(this.principal(req), {
      branchId,
      facilityId,
      includeInactive: includeInactive === "true",
      q,
    });
  }

  @Post("departments")
  @Permissions(PERM.DEPARTMENT_CREATE)
  async createDepartment(@Body() dto: CreateDepartmentDto, @Req() req: any) {
    return this.svc.createDepartment(this.principal(req), dto);
  }

  @Patch("departments/:id")
  @Permissions(PERM.DEPARTMENT_UPDATE)
  async updateDepartment(@Param("id") id: string, @Body() dto: UpdateDepartmentDto, @Req() req: any) {
    return this.svc.updateDepartment(this.principal(req), id, dto);
  }

  @Put("departments/:id/doctors")
  @Permissions(PERM.DEPARTMENT_ASSIGN_DOCTORS)
  async updateAssignments(@Param("id") id: string, @Body() dto: UpdateDepartmentAssignmentsDto, @Req() req: any) {
    return this.svc.updateDepartmentAssignments(this.principal(req), id, dto);
  }

  

  // -------------------- Department ↔ Specialty mapping --------------------

  @Get("departments/:id/specialties")
  @Permissions(PERM.DEPARTMENT_SPECIALTY_READ)
  async listDepartmentSpecialties(@Param("id") id: string, @Req() req: any) {
    return this.svc.listDepartmentSpecialties(this.principal(req), id);
  }

  @Put("departments/:id/specialties")
  @Permissions(PERM.DEPARTMENT_SPECIALTY_UPDATE)
  async setDepartmentSpecialties(@Param("id") id: string, @Body() dto: SetDepartmentSpecialtiesDto, @Req() req: any) {
    return this.svc.setDepartmentSpecialties(this.principal(req), id, dto);
  }
// -------------------- Specialties --------------------

  @Get("specialties")
  @Permissions(PERM.SPECIALTY_READ)
  async listSpecialties(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("includeInactive") includeInactive?: string,
    @Query("q") q?: string,
  ) {
    return this.svc.listSpecialties(this.principal(req), {
      branchId,
      includeInactive: includeInactive === "true",
      q,
    });
  }

  @Post("specialties")
  @Permissions(PERM.SPECIALTY_CREATE)
  async createSpecialty(@Body() dto: CreateSpecialtyDto, @Req() req: any) {
    return this.svc.createSpecialty(this.principal(req), dto);
  }

  @Patch("specialties/:id")

  @Permissions(PERM.SPECIALTY_UPDATE)
  async updateSpecialty(@Param("id") id: string, @Body() dto: UpdateSpecialtyDto, @Req() req: any) {
    return this.svc.updateSpecialty(this.principal(req), id, dto);
  }

  // -------------------- Staff helper (doctors) --------------------

  @Get("staff/doctors")
  @Permissions(PERM.STAFF_READ)
  async listDoctors(
    @Query("branchId") branchId: string | undefined,
    @Query("q") q: string | undefined,
    @Req() req: any,
  ) {
    return this.svc.listDoctors(this.principal(req), { branchId, q });
  }
}
