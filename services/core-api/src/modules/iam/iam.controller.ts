import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Principal } from "../auth/access-policy.service";
import { Permissions } from "../auth/permissions.decorator";
import { IamService } from "./iam.service";
import {
  CreatePermissionDto,
  CreateRoleDto,
  CreateUserDto,
  UpdatePermissionDto,
  UpdateRoleDto,
  UpdateUserDto,
} from "./iam.dto";
import { PERM } from "./iam.constants";

@ApiTags("iam")
@Controller("iam")
export class IamController {
  constructor(private readonly iam: IamService) {}

  private principal(req: any): Principal {
    const p = req?.principal as Principal | undefined;
    if (!p) throw new UnauthorizedException("Missing principal on request");
    return p;
  }

  // ---------------- Principal ----------------

  @Get("me")
  async me(@Req() req: any) {
    // No permission required: returns only caller's principal.
    return { principal: this.principal(req) };
  }

  // ---------------- Roles ----------------

  @Get("roles")
  @Permissions(PERM.IAM_ROLE_READ)
  async roles(@Req() req: any) {
    return this.iam.listRoles(this.principal(req));
  }

  @Post("roles")
  @Permissions(PERM.IAM_ROLE_CREATE)
  async createRole(@Body() dto: CreateRoleDto, @Req() req: any) {
    return this.iam.createRole(this.principal(req), dto);
  }

  @Patch("roles/:code")
  @Permissions(PERM.IAM_ROLE_UPDATE)
  async updateRole(
    @Param("code") code: string,
    @Body() dto: UpdateRoleDto,
    @Req() req: any,
  ) {
    return this.iam.updateRole(this.principal(req), code, dto);
  }

  // ---------------- Permission Catalog ----------------

  @Get("permissions")
  @Permissions(PERM.IAM_PERMISSION_READ)
  async permissions(@Req() req: any) {
    return this.iam.listPermissions(this.principal(req));
  }

  @Post("permissions/sync")
  @Permissions(PERM.IAM_PERMISSION_MANAGE)
  async syncPermissions(@Req() req: any) {
    return this.iam.syncPermissionCatalog(this.principal(req));
  }

  @Patch("permissions/:code")
  @Permissions(PERM.IAM_PERMISSION_MANAGE)
  async updatePermission(
    @Param("code") code: string,
    @Body() dto: UpdatePermissionDto,
    @Req() req: any,
  ) {
    return this.iam.updatePermissionMetadata(this.principal(req), code, dto);
  }

  // Optional: ad-hoc permission creation (controlled by env in service)
  @Post("permissions")
  @Permissions(PERM.IAM_PERMISSION_MANAGE)
  async createPermission(@Body() dto: CreatePermissionDto, @Req() req: any) {
    return this.iam.createPermission(this.principal(req), dto);
  }

  // ---------------- Branch lookup (used by BranchSelector / admin workflows) ----------------
  // Enterprise rule: fetching branch registry must be permission-gated.

  @Get("branches")
  @Permissions(PERM.BRANCH_READ)
  async branches(@Req() req: any) {
    return this.iam.listBranches(this.principal(req));
  }

  @Get("branches/:id")
  @Permissions(PERM.BRANCH_READ)
  async branch(@Param("id") id: string, @Req() req: any) {
    return this.iam.getBranch(this.principal(req), id);
  }

  // ---------------- Users ----------------

  @Get("users")
  @Permissions(PERM.IAM_USER_READ)
  async users(
    @Query("q") q: string | undefined,
    @Query("branchId") branchId: string | undefined,
    @Query("includeStaff") includeStaff: string | undefined,
    @Req() req: any,
  ) {
    return this.iam.listUsers(this.principal(req), q, branchId, includeStaff === "true");
  }

  @Get("users/:id")
  @Permissions(PERM.IAM_USER_READ)
  async user(@Param("id") id: string, @Req() req: any) {
    return this.iam.getUser(this.principal(req), id);
  }

  @Post("users")
  @Permissions(PERM.IAM_USER_CREATE)
  async create(@Body() dto: CreateUserDto, @Req() req: any) {
    return this.iam.createUser(this.principal(req), dto);
  }

  @Patch("users/:id")
  @Permissions(PERM.IAM_USER_UPDATE)
  async update(@Param("id") id: string, @Body() dto: UpdateUserDto, @Req() req: any) {
    return this.iam.updateUser(this.principal(req), id, dto);
  }

  @Post("users/:id/reset-password")
  @Permissions(PERM.IAM_USER_RESET_PASSWORD)
  async reset(@Param("id") id: string, @Req() req: any) {
    return this.iam.resetPassword(this.principal(req), id);
  }

  // ---------------- Audit ----------------

  @Get("audit")
  @Permissions(PERM.IAM_AUDIT_READ)
  async audit(
    @Query("entity") entity: string | undefined,
    @Query("entityId") entityId: string | undefined,
    @Query("actorUserId") actorUserId: string | undefined,
    @Query("action") action: string | undefined,
    @Query("branchId") branchId: string | undefined,
    @Query("take") take: string | undefined,
    @Req() req: any,
  ) {
    const nTake = take ? Number(take) : undefined;
    return this.iam.listAudit(this.principal(req), {
      entity,
      entityId,
      actorUserId,
      action,
      branchId,
      take: nTake && Number.isFinite(nTake) ? nTake : undefined,
    });
  }
}
