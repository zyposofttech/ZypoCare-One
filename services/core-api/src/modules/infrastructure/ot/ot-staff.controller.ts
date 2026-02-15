import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { PrincipalGuard } from "../../auth/principal.guard";
import { PermissionsGuard } from "../../auth/permissions.guard";
import { Permissions } from "../../auth/permissions.decorator";
import type { Principal } from "../../auth/access-policy.service";
import { PERM } from "../../iam/iam.constants";

import { OtStaffService } from "./ot-staff.service";
import {
  CreateAnesthetistPrivilegeDto,
  CreateMinStaffingRuleDto,
  CreateStaffAssignmentDto,
  CreateSurgeonPrivilegeDto,
  CreateZoneAccessRuleDto,
  UpdateStaffAssignmentDto,
} from "./ot-staff.dto";

@ApiTags("infrastructure/ot/staff")
@Controller("infrastructure/ot/staff")
@UseGuards(PrincipalGuard, PermissionsGuard)
export class OtStaffController {
  constructor(private readonly svc: OtStaffService) {}

  private principal(req: any): Principal {
    return req.principal as Principal;
  }

  // ---- Staff Assignments (OTS-027) ----

  @Get("suites/:suiteId/assignments")
  @Permissions(PERM.OT_STAFF_READ)
  listAssignments(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.listAssignments(this.principal(req), suiteId);
  }

  @Post("suites/:suiteId/assignments")
  @Permissions(PERM.OT_STAFF_CREATE)
  createAssignment(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateStaffAssignmentDto) {
    return this.svc.createAssignment(this.principal(req), suiteId, dto);
  }

  @Patch("assignments/:id")
  @Permissions(PERM.OT_STAFF_UPDATE)
  updateAssignment(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateStaffAssignmentDto) {
    return this.svc.updateAssignment(this.principal(req), id, dto);
  }

  @Delete("assignments/:id")
  @Permissions(PERM.OT_STAFF_DELETE)
  deleteAssignment(@Req() req: any, @Param("id") id: string) {
    return this.svc.deleteAssignment(this.principal(req), id);
  }

  // ---- Surgeon Privileges (OTS-028) ----

  @Get("suites/:suiteId/surgeon-privileges")
  @Permissions(PERM.OT_STAFF_READ)
  listSurgeonPrivileges(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.listSurgeonPrivileges(this.principal(req), suiteId);
  }

  @Post("suites/:suiteId/surgeon-privileges")
  @Permissions(PERM.OT_STAFF_CREATE)
  createSurgeonPrivilege(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateSurgeonPrivilegeDto) {
    return this.svc.createSurgeonPrivilege(this.principal(req), suiteId, dto);
  }

  @Delete("surgeon-privileges/:id")
  @Permissions(PERM.OT_STAFF_DELETE)
  deleteSurgeonPrivilege(@Req() req: any, @Param("id") id: string) {
    return this.svc.deleteSurgeonPrivilege(this.principal(req), id);
  }

  // ---- Anesthetist Privileges (OTS-029) ----

  @Get("suites/:suiteId/anesthetist-privileges")
  @Permissions(PERM.OT_STAFF_READ)
  listAnesthetistPrivileges(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.listAnesthetistPrivileges(this.principal(req), suiteId);
  }

  @Post("suites/:suiteId/anesthetist-privileges")
  @Permissions(PERM.OT_STAFF_CREATE)
  createAnesthetistPrivilege(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateAnesthetistPrivilegeDto) {
    return this.svc.createAnesthetistPrivilege(this.principal(req), suiteId, dto);
  }

  @Delete("anesthetist-privileges/:id")
  @Permissions(PERM.OT_STAFF_DELETE)
  deleteAnesthetistPrivilege(@Req() req: any, @Param("id") id: string) {
    return this.svc.deleteAnesthetistPrivilege(this.principal(req), id);
  }

  // ---- Zone Access (OTS-030) ----

  @Get("suites/:suiteId/zone-access")
  @Permissions(PERM.OT_STAFF_READ)
  listZoneAccess(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.listZoneAccess(this.principal(req), suiteId);
  }

  @Post("suites/:suiteId/zone-access")
  @Permissions(PERM.OT_STAFF_CREATE)
  upsertZoneAccess(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateZoneAccessRuleDto) {
    return this.svc.upsertZoneAccess(this.principal(req), suiteId, dto);
  }

  // ---- Min Staffing Rules (OTS-031) ----

  @Get("suites/:suiteId/min-staffing-rules")
  @Permissions(PERM.OT_STAFF_READ)
  listMinStaffingRules(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.listMinStaffingRules(this.principal(req), suiteId);
  }

  @Post("suites/:suiteId/min-staffing-rules")
  @Permissions(PERM.OT_STAFF_CREATE)
  upsertMinStaffingRule(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateMinStaffingRuleDto) {
    return this.svc.upsertMinStaffingRule(this.principal(req), suiteId, dto);
  }

  // ---- Privilege Gaps (OTS-032) ----

  @Get("suites/:suiteId/privilege-gaps")
  @Permissions(PERM.OT_STAFF_READ)
  getPrivilegeGaps(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.getPrivilegeGaps(this.principal(req), suiteId);
  }

  // ---- Contact Directory (OTS-033) ----

  @Get("suites/:suiteId/contact-directory")
  @Permissions(PERM.OT_STAFF_READ)
  getContactDirectory(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.getContactDirectory(this.principal(req), suiteId);
  }
}
