import { Controller, Get, Patch, Post, Body, Param, Query, Req, UseGuards, UnauthorizedException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrincipalGuard } from "../auth/principal.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { Permissions } from "../auth/permissions.decorator";
import type { Principal } from "../auth/access-policy.service";
import { IamService } from "./iam.service";
import { CreateUserDto, UpdateUserDto, CreateRoleDto, UpdateRoleDto, CreatePermissionDto } from "./iam.dto";
import { PERM } from "./iam.constants";

@ApiTags("iam")
@Controller("iam")
@UseGuards(PrincipalGuard, PermissionsGuard)
export class IamController {
  constructor(private readonly iam: IamService) {}

  private principal(req: any): Principal {
    const p = req?.principal as Principal | undefined;
    if (!p) throw new UnauthorizedException("Missing principal on request");
    return p;
  }

  @Get("roles")
  @Permissions(PERM.IAM_ROLE_READ)
  async roles(@Req() req: any) {
    return this.iam.listRoles(this.principal(req));
  }

  @Get("permissions")
  @Permissions(PERM.IAM_PERMISSION_READ)
  async permissions(@Req() req: any) {
    return this.iam.listPermissions(this.principal(req));
  }

  @Get("branches")
  async branches(@Req() req: any) {
    return this.iam.listBranches(this.principal(req));
  }

  @Get("branches/:id")
  async branch(@Param("id") id: string, @Req() req: any) {
    return this.iam.getBranch(this.principal(req), id);
  }
  
  @Get("users")
  @Permissions(PERM.IAM_USER_READ)
  async users(@Query("q") q: string | undefined, @Req() req: any) {
    return this.iam.listUsers(this.principal(req), q);
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

  @Get("audit")
  @Permissions(PERM.IAM_AUDIT_READ)
  async audit(
    @Query("entity") entity: string | undefined,
    @Query("entityId") entityId: string | undefined,
    @Query("actorUserId") actorUserId: string | undefined,
    @Query("action") action: string | undefined,
    @Query("take") take: string | undefined,
    @Req() req: any,
  ) {
    return this.iam.listAudit(this.principal(req), {
      entity,
      entityId,
      actorUserId,
      action,
      take: take ? Number(take) : undefined,
    });
  }

  @Post("roles")
  // @Permissions(PERM.IAM_ROLE_CREATE) <--- Ensure this constant exists in iam.constants.ts
  async createRole(@Body() dto: CreateRoleDto, @Req() req: any) {
    return this.iam.createRole(this.principal(req), dto);
  }

  @Patch("roles/:code")
  // @Permissions(PERM.IAM_ROLE_UPDATE) <--- Ensure this constant exists
  async updateRole(@Param("code") code: string, @Body() dto: UpdateRoleDto, @Req() req: any) {
    return this.iam.updateRole(this.principal(req), code, dto);
  }
  @Post("permissions")
  @Permissions(PERM.IAM_PERMISSION_CREATE)
  async createPermission(@Body() dto: CreatePermissionDto, @Req() req: any) {
    return this.iam.createPermission(this.principal(req), dto);
  }
}
