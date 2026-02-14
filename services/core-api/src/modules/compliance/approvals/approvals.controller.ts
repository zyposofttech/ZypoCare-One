import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Principal } from "../../auth/access-policy.service";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { ApprovalsService } from "./approvals.service";
import { CreateApprovalDto, DecideApprovalDto } from "./dto/approvals.dto";

@ApiTags("compliance/approvals")
@Controller("compliance/approvals")
export class ApprovalsController {
  constructor(private readonly svc: ApprovalsService) {}

  private principal(req: any): Principal {
    return req.principal as Principal;
  }

  @Get()
  @Permissions(PERM.COMPLIANCE_APPROVAL_READ)
  async list(
    @Req() req: any,
    @Query("workspaceId") workspaceId?: string,
    @Query("status") status?: string,
    @Query("cursor") cursor?: string,
    @Query("take") take?: string,
  ) {
    return this.svc.list(this.principal(req), {
      workspaceId,
      status,
      cursor,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Post()
  @Permissions(PERM.COMPLIANCE_APPROVAL_SUBMIT)
  async create(@Req() req: any, @Body() dto: CreateApprovalDto) {
    return this.svc.create(this.principal(req), dto);
  }

  @Post(":approvalId/submit")
  @Permissions(PERM.COMPLIANCE_APPROVAL_SUBMIT)
  async submit(@Req() req: any, @Param("approvalId") approvalId: string) {
    return this.svc.submit(this.principal(req), approvalId);
  }

  @Post(":approvalId/decide")
  @Permissions(PERM.COMPLIANCE_APPROVAL_DECIDE)
  async decide(
    @Req() req: any,
    @Param("approvalId") approvalId: string,
    @Body() dto: DecideApprovalDto,
  ) {
    return this.svc.decide(this.principal(req), approvalId, dto);
  }
}
