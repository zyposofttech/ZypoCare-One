import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { parseBool } from "../../common/http.util";
import { Permissions } from "../auth/permissions.decorator";
import type { Principal } from "../auth/access-policy.service";
import { PERM } from "../iam/iam.constants";
import {
  CreateDepartmentDto,
  CreateFacilityDto,
  CreateSpecialtyDto,
  SetBranchFacilitiesDto,
  SetDepartmentSpecialtiesDto,
  UpdateDepartmentAssignmentsDto,
  UpdateDepartmentDto,
  UpdateSpecialtyDto,
} from "./facility-setup.dto";
import { FacilitySetupService } from "./facility-setup.service";

@ApiTags("facility-setup")
@Controller()
export class FacilitySetupController {
  constructor(private readonly svc: FacilitySetupService) {}

  private principal(req: any): Principal {
    return req.principal as Principal;
  }

  

  // ---------------------------------------------------------------------------
  // Branch Facilities selection (optional; keep if you still store per branch)
  // ---------------------------------------------------------------------------

  @Get("branch/facilities")
  @Permissions(PERM.BRANCH_FACILITY_READ)
  async getMyBranchFacilities(@Req() req: any) {
    return this.svc.getBranchFacilities(this.principal(req));
  }

  @Get("branches/:branchId/facilities")
  @Permissions(PERM.BRANCH_FACILITY_READ)
  async getBranchFacilities(@Req() req: any, @Param("branchId") branchId: string) {
    return this.svc.getBranchFacilities(this.principal(req), branchId);
  }

  @Put("branch/facilities")
  @Permissions(PERM.BRANCH_FACILITY_UPDATE)
  async setMyBranchFacilities(@Req() req: any, @Body() dto: SetBranchFacilitiesDto) {
    return this.svc.setBranchFacilities(this.principal(req), dto.facilityIds);
  }

  @Put("branches/:branchId/facilities")
  @Permissions(PERM.BRANCH_FACILITY_UPDATE)
  async setBranchFacilities(@Req() req: any, @Param("branchId") branchId: string, @Body() dto: SetBranchFacilitiesDto) {
    return this.svc.setBranchFacilities(this.principal(req), dto.facilityIds, branchId);
  }

  // ---------------------------------------------------------------------------
  // Departments
  // ---------------------------------------------------------------------------

  @Get("departments")
  @Permissions(PERM.DEPARTMENT_READ)
  async listDepartments(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("facilityId") facilityId?: string,
    @Query("includeInactive") includeInactive?: string,
    @Query("q") q?: string,
  ) {
    return this.svc.listDepartments(this.principal(req), {
      branchId,
      facilityId,
      includeInactive: parseBool(includeInactive, false),
      q,
    });
  }

  // Convenience for details page: pull from list + match id
  @Get("departments/:id")
  @Permissions(PERM.DEPARTMENT_READ)
  async getDepartment(
    @Req() req: any,
    @Param("id") id: string,
    @Query("branchId") branchId?: string,
  ) {
    const rows = await this.svc.listDepartments(this.principal(req), {
      branchId,
      includeInactive: true,
    });
    return (rows as any[]).find((x) => x.id === id) ?? null;
  }

  @Post("departments")
  @Permissions(PERM.DEPARTMENT_CREATE)
  async createDepartment(@Req() req: any, @Body() dto: CreateDepartmentDto) {
    return this.svc.createDepartment(this.principal(req), dto);
  }

  @Put("departments/:id")
  @Permissions(PERM.DEPARTMENT_UPDATE)
  async updateDepartmentPut(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateDepartmentDto) {
    return this.svc.updateDepartment(this.principal(req), id, dto);
  }

  @Patch("departments/:id")
  @Permissions(PERM.DEPARTMENT_UPDATE)
  async updateDepartmentPatch(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateDepartmentDto) {
    return this.svc.updateDepartment(this.principal(req), id, dto);
  }

  @Delete("departments/:id")
  @Permissions(PERM.DEPARTMENT_UPDATE) // no DEPARTMENT_DELETE in your PERM
  async deleteDepartment(
    @Req() req: any,
    @Param("id") id: string,
    @Query("hard") hard?: string,
    @Query("cascade") cascade?: string,
    @Query("reason") reason?: string,
  ) {
    const hardBool = parseBool(hard, false);
    const cascadeBool = cascade == null ? true : parseBool(cascade, true);

    if (!hardBool) {
      const r = String(reason ?? "").trim();
      if (!r) throw new BadRequestException("Deactivation reason is required.");
      // ✅ Default: cascade=true (Department → Units → Rooms → Resources)
      return this.svc.deactivateDepartment(this.principal(req), id, { hard: false, cascade: cascadeBool, reason: r });
    }

    return this.svc.deactivateDepartment(this.principal(req), id, { hard: true });
  }

  /**
   * ✅ Preferred endpoint for UI
   * POST /departments/:id/deactivate
   * body: { cascade?: boolean; reason: string; hard?: boolean }
   */
  @Post("departments/:id/deactivate")
  @Permissions(PERM.DEPARTMENT_UPDATE)
  async deactivateDepartment(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: { cascade?: boolean; reason?: string; hard?: boolean },
  ) {
    const hard = body?.hard === true;
    const cascade = body?.cascade !== false; // default true

    if (!hard) {
      const r = String(body?.reason ?? "").trim();
      if (!r) throw new BadRequestException("Deactivation reason is required.");
      return this.svc.deactivateDepartment(this.principal(req), id, { hard: false, cascade, reason: r });
    }

    return this.svc.deactivateDepartment(this.principal(req), id, { hard: true });
  }

  // Dept ↔ Specialties mapping
  @Get("departments/:id/specialties")
  @Permissions(PERM.DEPARTMENT_SPECIALTY_READ)
  async listDepartmentSpecialties(@Req() req: any, @Param("id") id: string) {
    return this.svc.listDepartmentSpecialties(this.principal(req), id);
  }

  @Put("departments/:id/specialties")
  @Permissions(PERM.DEPARTMENT_SPECIALTY_UPDATE)
  async setDepartmentSpecialties(@Req() req: any, @Param("id") id: string, @Body() dto: SetDepartmentSpecialtiesDto) {
    return this.svc.setDepartmentSpecialties(this.principal(req), id, dto);
  }

  // Doctors & HOD assignment
  @Get("staff/doctors")
  @Permissions(PERM.STAFF_READ)
  async listDoctors(@Req() req: any, @Query("branchId") branchId?: string, @Query("q") q?: string) {
    return this.svc.listDoctors(this.principal(req), { branchId, q });
  }

  @Put("departments/:id/doctors")
  @Permissions(PERM.DEPARTMENT_ASSIGN_DOCTORS)
  async setDepartmentDoctors(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateDepartmentAssignmentsDto,
  ) {
    return this.svc.updateDepartmentAssignments(this.principal(req), id, dto);
  }

  // ---------------------------------------------------------------------------
  // Specialties
  // ---------------------------------------------------------------------------

  @Get("specialties")
  @Permissions(PERM.SPECIALTY_READ)
  async listSpecialties(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("includeInactive") includeInactive?: string,
    @Query("includeMappings") includeMappings?: string,
    @Query("q") q?: string,
  ) {
    return this.svc.listSpecialties(this.principal(req), {
      branchId,
      includeInactive: parseBool(includeInactive, false),
      includeMappings: parseBool(includeMappings, false),
      q,
    });
  }

  @Post("specialties")
  @Permissions(PERM.SPECIALTY_CREATE)
  async createSpecialty(@Req() req: any, @Body() dto: CreateSpecialtyDto) {
    return this.svc.createSpecialty(this.principal(req), dto);
  }

  @Patch("specialties/:id")
  @Permissions(PERM.SPECIALTY_UPDATE)
  async updateSpecialty(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateSpecialtyDto) {
    return this.svc.updateSpecialty(this.principal(req), id, dto);
  }

  @Delete("specialties/:id")
  @Permissions(PERM.SPECIALTY_UPDATE) // no SPECIALTY_DELETE in your PERM
  async deleteSpecialty(@Req() req: any, @Param("id") id: string, @Query("hard") hard?: string) {
    return this.svc.deactivateSpecialty(this.principal(req), id, { hard: parseBool(hard, false) });
  }
}
