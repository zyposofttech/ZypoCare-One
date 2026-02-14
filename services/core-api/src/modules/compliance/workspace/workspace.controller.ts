import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Principal } from "../../auth/access-policy.service";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { WorkspaceService } from "./workspace.service";
import { CreateWorkspaceDto, UpdateWorkspaceDto, CloneWorkspaceDto } from "./dto/create-workspace.dto";

@ApiTags("compliance/workspaces")
@Controller("compliance/workspaces")
export class WorkspaceController {
  constructor(private readonly svc: WorkspaceService) {}

  private principal(req: any): Principal {
    return req.principal as Principal;
  }

  @Get()
  @Permissions(PERM.COMPLIANCE_WORKSPACE_READ)
  async list(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("orgId") orgId?: string,
    @Query("type") type?: string,
    @Query("status") status?: string,
    @Query("cursor") cursor?: string,
    @Query("take") take?: string,
  ) {
    return this.svc.list(this.principal(req), {
      branchId,
      orgId,
      type,
      status,
      cursor,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Post()
  @Permissions(PERM.COMPLIANCE_WORKSPACE_CREATE)
  async create(@Req() req: any, @Body() dto: CreateWorkspaceDto) {
    return this.svc.create(this.principal(req), dto);
  }

  @Get(":workspaceId")
  @Permissions(PERM.COMPLIANCE_WORKSPACE_READ)
  async get(@Req() req: any, @Param("workspaceId") workspaceId: string) {
    return this.svc.get(this.principal(req), workspaceId);
  }

  @Patch(":workspaceId")
  @Permissions(PERM.COMPLIANCE_WORKSPACE_UPDATE)
  async update(
    @Req() req: any,
    @Param("workspaceId") workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.svc.update(this.principal(req), workspaceId, dto);
  }

  @Post(":workspaceId/activate")
  @Permissions(PERM.COMPLIANCE_WORKSPACE_ACTIVATE)
  async activate(@Req() req: any, @Param("workspaceId") workspaceId: string) {
    return this.svc.update(this.principal(req), workspaceId, { status: "ACTIVE" });
  }

  @Post(":workspaceId/clone-to-branch")
  @Permissions(PERM.COMPLIANCE_WORKSPACE_CREATE)
  async clone(
    @Req() req: any,
    @Param("workspaceId") workspaceId: string,
    @Body() dto: CloneWorkspaceDto,
  ) {
    return this.svc.cloneToBranch(this.principal(req), workspaceId, dto);
  }
}
