import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Principal } from "../auth/access-policy.service";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Permissions } from "../auth/permissions.decorator";
import { PERM } from "../iam/iam.constants";
import { ApprovePolicyVersionDto, RejectPolicyVersionDto, UpdatePolicyDraftDto, CreatePolicyDefinitionDto } from "./governance.dto";
import { GovernanceService } from "./governance.service";
import { PrincipalGuard } from "../auth/principal.guard";

@ApiTags("governance")
@Controller("governance")
@UseGuards(PrincipalGuard, PermissionsGuard) 
export class GovernanceController {
  constructor(private governance: GovernanceService) {}

  private principal(req: any): Principal {
    return req.principal as Principal;
  }

  @Get("summary")
  @Permissions(PERM.GOV_POLICY_READ)
  async summary(@Req() req: any) {
    return this.governance.getSummary(this.principal(req));
  }

  /**
   * Branch list used by Governance UIs.
   * - Super Admin: sees all branches
   * - Non-super: sees only their branch
   */
  @Get("branches")
  @Permissions(PERM.GOV_POLICY_READ)
  async branches(@Req() req: any) {
    return this.governance.listBranches(this.principal(req));
  }
  
  @Post("policies")
  @Permissions(PERM.GOV_POLICY_GLOBAL_DRAFT)
  async createPolicy(@Body() dto: CreatePolicyDefinitionDto, @Req() req: any) {
    return this.governance.createPolicyDefinition(this.principal(req), dto);
  }
  
  @Get("policies")
  @Permissions(PERM.GOV_POLICY_GLOBAL_DRAFT)
  async listPolicies(@Req() req: any) {
    return this.governance.listPolicies(this.principal(req));
  }

  /**
   * Policy details by PolicyDefinition.id.
   *
   * NOTE: We keep this separate from the :code route to avoid ambiguity.
   */
  @Get("policies/id/:id")
  @Permissions(PERM.GOV_POLICY_READ)
  async policyDetailById(@Param("id") id: string, @Req() req: any) {
    return this.governance.getPolicyDetailGlobalById(this.principal(req), id);
  }

  @Get("policies/:code")
  @Permissions(PERM.GOV_POLICY_READ)
  async policyDetail(@Param("code") code: string, @Req() req: any) {
    return this.governance.getPolicyDetailGlobal(this.principal(req), code);
  }

  /**
   * Effective policy for a branch (GLOBAL baseline merged with BRANCH_OVERRIDE).
   *
   * - Super Admin: may pass any branchId (or omit to view the global-only default).
   * - Branch roles: strictly limited to own branch (branchId parameter is ignored/validated).
   */
  @Get("policies/:code/effective")
  @Permissions(PERM.GOV_POLICY_READ)
  async effectivePolicy(
    @Param("code") code: string,
    @Query("branchId") branchId: string | undefined,
    @Req() req: any,
  ) {
    return this.governance.getEffectivePolicy(this.principal(req), code, branchId ?? null);
  }

  /**
   * Effective policy snapshot (all codes) for a branch.
   */
  @Get("effective-policies")
  @Permissions(PERM.GOV_POLICY_READ)
  async effectivePolicies(
    @Query("branchId") branchId: string | undefined,
    @Req() req: any,
  ) {
    return this.governance.listEffectivePolicies(this.principal(req), branchId ?? null);
  }

  @Post("policies/:code/drafts")
  @Permissions(PERM.GOV_POLICY_GLOBAL_DRAFT)
  async createGlobalDraft(
    @Param("code") code: string,
    @Req() req: any,
  ) {
    return this.governance.createGlobalDraft(this.principal(req), code);
  }

  @Get("approvals")
  @Permissions(PERM.GOV_POLICY_APPROVE)
  async approvals(@Req() req: any) {
    return this.governance.listApprovals(this.principal(req));
  }

  @Post("policy-versions/:id/approve")
  @Permissions(PERM.GOV_POLICY_APPROVE)
  async approve(@Param("id") id: string, @Body() dto: ApprovePolicyVersionDto, @Req() req: any) {
    return this.governance.approve(this.principal(req), id, dto?.note ?? null);
  }

  @Post("policy-versions/:id/reject")
  @Permissions(PERM.GOV_POLICY_APPROVE)
  async reject(@Param("id") id: string, @Body() dto: RejectPolicyVersionDto, @Req() req: any) {
    return this.governance.reject(this.principal(req), id, dto.reason);
  }

  @Get("audit")
  @Permissions(PERM.GOV_POLICY_AUDIT_READ)
  async audit(@Req() req: any) {
    return this.governance.listPolicyAudit(this.principal(req));
  }

  // -----------------
  // Branch Admin views
  // -----------------

  @Get("branch-policies")
  @Permissions(PERM.GOV_POLICY_READ)
  async branchPolicies(@Req() req: any) {
    return this.governance.listBranchPolicies(this.principal(req));
  }

  @Get("branch-policies/:code")
  @Permissions(PERM.GOV_POLICY_READ)
  async branchPolicyDetail(@Param("code") code: string, @Req() req: any) {
    return this.governance.getBranchPolicyDetail(this.principal(req), code);
  }

  @Post("branch-policies/:code/override-drafts")
  @Permissions(PERM.GOV_POLICY_BRANCH_OVERRIDE_DRAFT)
  async createBranchOverrideDraft(
    @Param("code") code: string,
    @Req() req: any,
  ) {
    return this.governance.createBranchOverrideDraft(this.principal(req), code);
  }

  // Shared draft lifecycle endpoints (both GLOBAL and BRANCH_OVERRIDE)

  @Patch("policy-versions/:id")
  @Permissions(PERM.GOV_POLICY_SUBMIT)
  async updateDraft(@Param("id") id: string, @Body() dto: UpdatePolicyDraftDto, @Req() req: any) {
    return this.governance.updateDraft(this.principal(req), id, dto);
  }

  @Post("policy-versions/:id/submit")
  @Permissions(PERM.GOV_POLICY_SUBMIT)
  async submitDraft(@Param("id") id: string, @Req() req: any) {
    return this.governance.submitDraft(this.principal(req), id);
  }
}
