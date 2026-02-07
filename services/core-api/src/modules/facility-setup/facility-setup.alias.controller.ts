import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { Principal } from "../auth/public.decorator";
import type {
  CreateDepartmentDto,
  CreateFacilityDto,
  CreateSpecialtyDto,
  SetBranchFacilitiesDto,
  SetDepartmentSpecialtiesDto,
  UpdateDepartmentDto,
  UpdateSpecialtyDto,
} from "./facility-setup.dto";
import { FacilitySetupService } from "./facility-setup.service";

/**
 * Legacy/root route aliases for facility setup endpoints used by the web app.
 * Keeps /api/departments, /api/specialties, /api/facilities/master, etc. working.
 */
@Controller()
export class FacilitySetupAliasController {
  constructor(private svc: FacilitySetupService) {}

  // ---------------------------------------------------------------------------
  // Facilities (master catalog)
  // ---------------------------------------------------------------------------

  @Get("facilities/master")
  async listFacilityCatalog(
    @Principal() principal: any,
    @Query("category") category?: string,
    @Query("includeInactive") includeInactive?: string,
  ) {
    return this.svc.listFacilityCatalog(principal, {
      category,
      includeInactive: includeInactive === "true",
    });
  }

  @Post("facilities/master")
  async createFacility(@Principal() principal: any, @Body() dto: CreateFacilityDto) {
    return this.svc.createFacility(principal, dto);
  }

  // ---------------------------------------------------------------------------
  // Branch → Facilities mapping
  // ---------------------------------------------------------------------------

  @Get("branches/:id/facilities")
  async getBranchFacilities(@Principal() principal: any, @Param("id") branchId: string) {
    return this.svc.getBranchFacilities(principal, branchId);
  }

  @Put("branches/:id/facilities")
  async setBranchFacilities(
    @Principal() principal: any,
    @Param("id") branchId: string,
    @Body() dto: SetBranchFacilitiesDto,
  ) {
    return this.svc.setBranchFacilities(principal, dto.facilityIds, branchId);
  }

  // ---------------------------------------------------------------------------
  // Departments
  // ---------------------------------------------------------------------------

  @Get("departments")
  async listDepartments(
    @Principal() principal: any,
    @Query("branchId") branchId?: string,
    // legacy support
    @Query("facilityId") facilityId?: string,
    // new preferred filter
    @Query("facilityType") facilityType?: string,
    @Query("includeInactive") includeInactive?: string,
    @Query("q") q?: string,
  ) {
    return this.svc.listDepartments(principal, {
      branchId,
      facilityId,
      facilityType,
      includeInactive: includeInactive === "true",
      q,
    });
  }

  @Post("departments")
  async createDepartment(@Principal() principal: any, @Body() dto: CreateDepartmentDto) {
    return this.svc.createDepartment(principal, dto);
  }

  @Patch("departments/:id")
  async updateDepartment(
    @Principal() principal: any,
    @Param("id") id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.svc.updateDepartment(principal, id, dto);
  }

  @Put("departments/:id")
  async replaceDepartment(
    @Principal() principal: any,
    @Param("id") id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.svc.updateDepartment(principal, id, dto);
  }

  @Delete("departments/:id")
  async deactivateDepartment(
    @Principal() principal: any,
    @Param("id") id: string,
    @Query("hard") hard?: string,
  ) {
    return this.svc.deactivateDepartment(principal, id, { hard: hard === "true" });
  }

  // Department ↔ Specialty mapping
  @Get("departments/:id/specialties")
  async listDepartmentSpecialties(@Principal() principal: any, @Param("id") id: string) {
    return this.svc.listDepartmentSpecialties(principal, id);
  }

  @Put("departments/:id/specialties")
  async setDepartmentSpecialties(
    @Principal() principal: any,
    @Param("id") id: string,
    @Body() dto: SetDepartmentSpecialtiesDto,
  ) {
    return this.svc.setDepartmentSpecialties(principal, id, dto);
  }

  // ---------------------------------------------------------------------------
  // Specialties
  // ---------------------------------------------------------------------------

  @Get("specialties")
  async listSpecialties(
    @Principal() principal: any,
    @Query("branchId") branchId?: string,
    @Query("includeInactive") includeInactive?: string,
    @Query("includeMappings") includeMappings?: string,
    @Query("q") q?: string,
  ) {
    return this.svc.listSpecialties(principal, {
      branchId,
      includeInactive: includeInactive === "true",
      includeMappings: includeMappings === "true",
      q,
    });
  }

  @Post("specialties")
  async createSpecialty(@Principal() principal: any, @Body() dto: CreateSpecialtyDto) {
    return this.svc.createSpecialty(principal, dto);
  }

  @Patch("specialties/:id")
  async updateSpecialty(@Principal() principal: any, @Param("id") id: string, @Body() dto: UpdateSpecialtyDto) {
    return this.svc.updateSpecialty(principal, id, dto);
  }

  @Put("specialties/:id")
  async replaceSpecialty(@Principal() principal: any, @Param("id") id: string, @Body() dto: UpdateSpecialtyDto) {
    return this.svc.updateSpecialty(principal, id, dto);
  }

  @Delete("specialties/:id")
  async deactivateSpecialty(
    @Principal() principal: any,
    @Param("id") id: string,
    @Query("hard") hard?: string,
  ) {
    return this.svc.deactivateSpecialty(principal, id, { hard: hard === "true" });
  }
}
