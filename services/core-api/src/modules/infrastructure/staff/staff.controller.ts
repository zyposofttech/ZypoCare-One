import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import {
  StaffMergeDto,
  StaffMergePreviewDto,
  StaffOffboardDto,
  StaffOnboardDto,
  StaffProvisionUserDto,
  StaffProvisionUserPreviewDto,
  StaffSuspendDto,
  CreateStaffCredentialDto,
  UpdateStaffCredentialDto,
  StaffAssignmentInputDto,
  UpdateStaffAssignmentDto,
  EndStaffAssignmentDto,
  StaffIdentifierInputDto,
  UpdateStaffDto,
  StaffLinkUserDto,
  StaffUnlinkUserDto,
  StaffUsgAuthorizationDto,
  StaffCreateMasterDto,
  CreateStaffDocumentDto,
  UpdateStaffDocumentDto,
  VerifyStaffDocumentDto,
  AddStaffCredentialEvidenceDto,
  CreateStaffPrivilegeGrantDto,
  UpdateStaffPrivilegeGrantDto,
  UpsertStaffProviderProfileDto,
} from "./dto";
import { StaffService } from "./staff.service";

@ApiTags("infrastructure/staff")
// NOTE: We support multiple route prefixes for backward compatibility:
// - /infrastructure/staff/* (current)
// - /infrastructure/human-resource/staff/* (legacy UI path)
// - /infrastructure/hr/staff/* (short alias)
// - /infra/* (short alias)
@Controller(["infrastructure", "infra", "infrastructure/human-resource", "infra/human-resource", "infrastructure/hr", "infra/hr"])
export class StaffController {
  constructor(private readonly svc: StaffService) { }

  private principal(req: any) {
    return req.principal;
  }

  @Get("staff")
  @Permissions(PERM.STAFF_READ)
  async list(
    @Req() req: any,
    @Query("q") q?: string,
    @Query("branchId") branchId?: string,
    @Query("status") status?: string,
    @Query("category") category?: string,
    @Query("engagementType") engagementType?: string,
    @Query("departmentId") departmentId?: string,
    @Query("designation") designation?: string,
    @Query("credentialStatus") credentialStatus?: string,
    @Query("onboarding") onboarding?: string,              // ✅ ADD THIS
    @Query("cursor") cursor?: string,
    @Query("take") take?: string,
  ) {
    return this.svc.listStaff(this.principal(req), {
      q,
      branchId: branchId ?? null,
      status: status ?? null,
      category: category ?? null,
      engagementType: engagementType ?? null,
      departmentId: departmentId ?? null,
      designation: designation ?? null,
      credentialStatus: credentialStatus ?? null,
      onboarding: onboarding ?? null,                      // ✅ ADD THIS
      cursor: cursor ?? null,
      take: take ? Number(take) : undefined,
    });
  }


  // ✅ Staff Master creation using the provided (nested) onboarding schema
  // This creates the enterprise Staff record + DPDP-safe identifier + (optional) initial credential.
  // Assignments, user provisioning, and RBAC bindings remain as existing endpoints.
  @Post("staff")
  @Permissions(PERM.STAFF_CREATE)
  async createMaster(@Req() req: any, @Body() dto: StaffCreateMasterDto) {
    return this.svc.createStaffMaster(this.principal(req), dto);
  }
  @Post("staff/drafts")
  @Permissions(PERM.STAFF_CREATE)
  async createDraft(@Req() req: any) {
    return this.svc.createStaffDraft(this.principal(req));
  }

  @Get("staff/:staffId")
  @Permissions(PERM.STAFF_READ)
  async get(@Req() req: any, @Param("staffId") staffId: string) {
    return this.svc.getStaffProfile(this.principal(req), staffId);
  }

  @Patch("staff/:staffId")
  @Permissions(PERM.STAFF_UPDATE)
  async update(@Req() req: any, @Param("staffId") staffId: string, @Body() dto: UpdateStaffDto) {
    return this.svc.updateStaff(this.principal(req), staffId, dto);
  }

  // Legacy migration: move structured JSON stored in notes -> JSON columns
  @Post("staff/:staffId/migrate-notes-json")
  @Permissions(PERM.STAFF_UPDATE)
  async migrateNotes(@Req() req: any, @Param("staffId") staffId: string) {
    return this.svc.migrateNotesToProfile(this.principal(req), staffId);
  }


  // ✅ Phase-1 Onboarding (staff master + required assignments)
  @Post("staff/onboard")
  @Permissions(PERM.STAFF_CREATE)
  async onboard(@Req() req: any, @Body() dto: StaffOnboardDto) {
    return this.svc.onboardStaff(this.principal(req), dto);
  }

  // ---------------- Assignments lifecycle ----------------

  @Post("staff/:staffId/assignments")
  @Permissions(PERM.STAFF_ASSIGNMENT_CREATE)
  async createAssignment(@Req() req: any, @Param("staffId") staffId: string, @Body() dto: StaffAssignmentInputDto) {
    return this.svc.createAssignment(this.principal(req), staffId, dto);
  }

  @Patch("staff/assignments/:assignmentId")
  @Permissions(PERM.STAFF_ASSIGNMENT_UPDATE)
  async updateAssignment(@Req() req: any, @Param("assignmentId") assignmentId: string, @Body() dto: UpdateStaffAssignmentDto) {
    return this.svc.updateAssignment(this.principal(req), assignmentId, dto);
  }

  @Post("staff/assignments/:assignmentId/end")
  @Permissions(PERM.STAFF_ASSIGNMENT_END)
  async endAssignment(@Req() req: any, @Param("assignmentId") assignmentId: string, @Body() dto: EndStaffAssignmentDto) {
    return this.svc.endAssignment(this.principal(req), assignmentId, dto);
  }

  // ---------------- Provisioning ----------------

  @Post("staff/:staffId/provision-user/preview")
  @Permissions(PERM.STAFF_PROVISION_USER_PREVIEW)
  async provisionPreview(@Req() req: any, @Param("staffId") staffId: string, @Body() dto: StaffProvisionUserPreviewDto) {
    return this.svc.provisionUserPreview(this.principal(req), staffId, dto);
  }

  @Post("staff/:staffId/provision-user")
  @Permissions(PERM.STAFF_PROVISION_USER)
  async provision(@Req() req: any, @Param("staffId") staffId: string, @Body() dto: StaffProvisionUserDto) {
    return this.svc.provisionUser(this.principal(req), staffId, dto);
  }

  // Link/unlink existing IAM user (strict audit)
  @Post("staff/:staffId/link-user")
  @Permissions(PERM.STAFF_PROVISION_USER)
  async linkUser(@Req() req: any, @Param("staffId") staffId: string, @Body() dto: StaffLinkUserDto) {
    return this.svc.linkExistingUser(this.principal(req), staffId, dto);
  }

  @Post("staff/:staffId/unlink-user")
  @Permissions(PERM.STAFF_PROVISION_USER)
  async unlinkUser(@Req() req: any, @Param("staffId") staffId: string, @Body() dto: StaffUnlinkUserDto) {
    return this.svc.unlinkUser(this.principal(req), staffId, dto);
  }

  // PCPNDT-sensitive flag (Phase-1 compliance marker)
  @Patch("staff/:staffId/usg-authorization")
  @Permissions(PERM.STAFF_UPDATE)
  async usgAuthorization(@Req() req: any, @Param("staffId") staffId: string, @Body() dto: StaffUsgAuthorizationDto) {
    return this.svc.setUsgAuthorization(this.principal(req), staffId, dto);
  }

  // Credentials
  @Post("staff/:staffId/credentials")
  @Permissions(PERM.STAFF_CREDENTIAL_CREATE)
  async addCredential(@Req() req: any, @Param("staffId") staffId: string, @Body() dto: CreateStaffCredentialDto) {
    return this.svc.addCredential(this.principal(req), staffId, dto);
  }

  @Post("staff/credentials/:credentialId")
  @Permissions(PERM.STAFF_CREDENTIAL_UPDATE)
  async updateCredential(@Req() req: any, @Param("credentialId") credentialId: string, @Body() dto: UpdateStaffCredentialDto) {
    return this.svc.updateCredential(this.principal(req), credentialId, dto);
  }

  @Get("staff/credentials/expiry-due")
  @Permissions(PERM.STAFF_READ)
  async expiryDue(
    @Req() req: any,
    @Query("days") days?: string,
    @Query("branchId") branchId?: string,
    @Query("includeExpired") includeExpired?: string,
  ) {
    return this.svc.listCredentialExpiryDue(this.principal(req), {
      days: days ? Number(days) : 60,
      branchId: branchId ?? null,
      includeExpired: includeExpired === "true",
    });
  }



  // ---------------- Documents (vault) ----------------

  @Get("staff/:staffId/documents")
  @Permissions(PERM.STAFF_READ)
  async listDocuments(
    @Req() req: any,
    @Param("staffId") staffId: string,
    @Query("type") type?: string,
    @Query("branchId") branchId?: string,
    @Query("includeInactive") includeInactive?: string,
  ) {
    return this.svc.listStaffDocuments(this.principal(req), staffId, {
      type: type ?? null,
      branchId: branchId ?? null,
      includeInactive: includeInactive === "true",
    });
  }

  @Post("staff/:staffId/documents")
  @Permissions(PERM.STAFF_UPDATE)
  async addDocument(@Req() req: any, @Param("staffId") staffId: string, @Body() dto: CreateStaffDocumentDto) {
    return this.svc.addStaffDocument(this.principal(req), staffId, dto);
  }

  @Patch("staff/documents/:documentId")
  @Permissions(PERM.STAFF_UPDATE)
  async updateDocument(@Req() req: any, @Param("documentId") documentId: string, @Body() dto: UpdateStaffDocumentDto) {
    return this.svc.updateStaffDocument(this.principal(req), documentId, dto);
  }

  @Post("staff/documents/:documentId/verify")
  @Permissions(PERM.STAFF_UPDATE)
  async verifyDocument(@Req() req: any, @Param("documentId") documentId: string, @Body() dto: VerifyStaffDocumentDto) {
    return this.svc.verifyStaffDocument(this.principal(req), documentId, dto);
  }

  @Delete("staff/documents/:documentId")
  @Permissions(PERM.STAFF_UPDATE)
  async deleteDocument(@Req() req: any, @Param("documentId") documentId: string) {
    return this.svc.deactivateStaffDocument(this.principal(req), documentId);
  }

  @Get("staff/documents/expiry-due")
  @Permissions(PERM.STAFF_READ)
  async documentExpiryDue(
    @Req() req: any,
    @Query("days") days?: string,
    @Query("branchId") branchId?: string,
    @Query("includeExpired") includeExpired?: string,
  ) {
    return this.svc.listDocumentExpiryDue(this.principal(req), {
      days: days ? Number(days) : 60,
      branchId: branchId ?? null,
      includeExpired: includeExpired === "true",
    });
  }

  @Get("staff/expiry/summary")
  @Permissions(PERM.STAFF_READ)
  async expirySummary(@Req() req: any, @Query("days") days?: string, @Query("branchId") branchId?: string) {
    return this.svc.getExpirySummary(this.principal(req), { days: days ? Number(days) : 60, branchId: branchId ?? null });
  }

  // ---------------- Credential evidence (multi-document) ----------------

  @Post("staff/credentials/:credentialId/evidence")
  @Permissions(PERM.STAFF_CREDENTIAL_UPDATE)
  async addCredentialEvidence(
    @Req() req: any,
    @Param("credentialId") credentialId: string,
    @Body() dto: AddStaffCredentialEvidenceDto,
  ) {
    return this.svc.addCredentialEvidence(this.principal(req), credentialId, dto);
  }

  @Delete("staff/credentials/:credentialId/evidence/:evidenceId")
  @Permissions(PERM.STAFF_CREDENTIAL_UPDATE)
  async removeCredentialEvidence(@Req() req: any, @Param("evidenceId") evidenceId: string) {
    return this.svc.removeCredentialEvidence(this.principal(req), evidenceId);
  }

  // ---------------- Privileges (Phase C) ----------------

  @Get("staff/:staffId/privileges")
  @Permissions(PERM.STAFF_READ)
  async listPrivileges(@Req() req: any, @Param("staffId") staffId: string, @Query("branchId") branchId?: string) {
    return this.svc.listPrivilegeGrants(this.principal(req), staffId, { branchId: branchId ?? null });
  }

  @Post("staff/:staffId/privileges")
  @Permissions(PERM.STAFF_UPDATE)
  async addPrivilege(@Req() req: any, @Param("staffId") staffId: string, @Body() dto: CreateStaffPrivilegeGrantDto) {
    return this.svc.addPrivilegeGrant(this.principal(req), staffId, dto);
  }

  @Patch("staff/privileges/:grantId")
  @Permissions(PERM.STAFF_UPDATE)
  async updatePrivilege(@Req() req: any, @Param("grantId") grantId: string, @Body() dto: UpdateStaffPrivilegeGrantDto) {
    return this.svc.updatePrivilegeGrant(this.principal(req), grantId, dto);
  }

  @Post("staff/privileges/:grantId/revoke")
  @Permissions(PERM.STAFF_UPDATE)
  async revokePrivilege(@Req() req: any, @Param("grantId") grantId: string) {
    return this.svc.revokePrivilegeGrant(this.principal(req), grantId);
  }

  // ---------------- Provider profile hooks (Phase C) ----------------

  @Get("staff/:staffId/provider-profiles")
  @Permissions(PERM.STAFF_READ)
  async listProviderProfiles(@Req() req: any, @Param("staffId") staffId: string) {
    return this.svc.listProviderProfiles(this.principal(req), staffId);
  }

  @Post("staff/:staffId/provider-profiles")
  @Permissions(PERM.STAFF_UPDATE)
  async upsertProviderProfile(@Req() req: any, @Param("staffId") staffId: string, @Body() dto: UpsertStaffProviderProfileDto) {
    return this.svc.upsertProviderProfile(this.principal(req), staffId, dto);
  }
  // Dedupe preview
  @Post("staff/dedupe/preview")
  @Permissions(PERM.STAFF_DEDUPE_PREVIEW)
  async dedupePreview(@Req() req: any, @Body() dto: StaffOnboardDto) {
    return this.svc.dedupePreview(this.principal(req), dto);
  }

  // Merge
  @Post("staff/merge/preview")
  @Permissions(PERM.STAFF_MERGE_PREVIEW)
  async mergePreview(@Req() req: any, @Body() dto: StaffMergePreviewDto) {
    return this.svc.mergePreview(this.principal(req), dto);
  }

  @Post("staff/merge")
  @Permissions(PERM.STAFF_MERGE)
  async merge(@Req() req: any, @Body() dto: StaffMergeDto) {
    return this.svc.mergeStaff(this.principal(req), dto);
  }

  // Suspend / Reactivate / Offboard
  @Post("staff/:staffId/suspend")
  @Permissions(PERM.STAFF_SUSPEND)
  async suspend(@Req() req: any, @Param("staffId") staffId: string, @Body() dto: StaffSuspendDto) {
    return this.svc.suspendStaff(this.principal(req), staffId, dto);
  }

  @Post("staff/:staffId/reactivate")
  @Permissions(PERM.STAFF_REACTIVATE)
  async reactivate(@Req() req: any, @Param("staffId") staffId: string) {
    return this.svc.reactivateStaff(this.principal(req), staffId);
  }

  @Post("staff/:staffId/offboard")
  @Permissions(PERM.STAFF_OFFBOARD)
  async offboard(@Req() req: any, @Param("staffId") staffId: string, @Body() dto: StaffOffboardDto) {
    return this.svc.offboardStaff(this.principal(req), staffId, dto);
  }

  // ---------------- Identifier-based dedupe & compliance ----------------

  @Post("staff/:staffId/identifiers")
  @Permissions(PERM.STAFF_IDENTIFIER_CREATE)
  async addIdentifier(@Req() req: any, @Param("staffId") staffId: string, @Body() dto: StaffIdentifierInputDto) {
    return this.svc.addIdentifier(this.principal(req), staffId, dto);
  }

  @Delete("staff/identifiers/:identifierId")
  @Permissions(PERM.STAFF_IDENTIFIER_DELETE)
  async removeIdentifier(@Req() req: any, @Param("identifierId") identifierId: string) {
    return this.svc.removeIdentifier(this.principal(req), identifierId);
  }

  // ---------------- Audit trail ----------------

  @Get("staff/:staffId/audit")
  @Permissions(PERM.STAFF_AUDIT_READ)
  async auditTrail(@Req() req: any, @Param("staffId") staffId: string, @Query("take") take?: string) {
    return this.svc.getStaffAuditTrail(this.principal(req), staffId, { take: take ? Number(take) : 100 });
  }

  // ---------------- Reports ----------------

  @Get("staff/reports/headcount")
  @Permissions(PERM.STAFF_REPORTS_READ)
  async reportHeadcount(
    @Req() req: any,
    @Query("groupBy") groupBy?: string,
    @Query("branchId") branchId?: string,
  ) {
    return this.svc.reportHeadcount(this.principal(req), {
      groupBy: (groupBy as any) ?? "branch",
      branchId: branchId ?? null,
    });
  }

  @Get("staff/reports/active-users-vs-staff")
  @Permissions(PERM.STAFF_REPORTS_READ)
  async reportActiveUsersVsStaff(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.reportActiveUsersVsStaff(this.principal(req), { branchId: branchId ?? null });
  }

  @Get("staff/reports/cross-branch-shared")
  @Permissions(PERM.STAFF_REPORTS_READ)
  async reportSharedStaff(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.reportCrossBranchSharedStaff(this.principal(req), { branchId: branchId ?? null });
  }
}
