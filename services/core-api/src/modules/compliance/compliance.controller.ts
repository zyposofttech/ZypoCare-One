import { Controller, Get, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Principal } from "../auth/access-policy.service";
import { Permissions } from "../auth/permissions.decorator";
import { PERM } from "../iam/iam.constants";
import { ComplianceService } from "./compliance.service";

@ApiTags("compliance")
@Controller("compliance")
export class ComplianceController {
  constructor(private readonly svc: ComplianceService) {}

  private principal(req: any): Principal {
    return req.principal as Principal;
  }

  @Get("dashboard")
  @Permissions(PERM.COMPLIANCE_DASHBOARD_READ)
  async dashboard(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.getDashboard(this.principal(req), branchId);
  }

  @Get("audit-logs")
  @Permissions(PERM.COMPLIANCE_AUDIT_LOG_READ)
  async auditLogs(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("workspaceId") workspaceId?: string,
    @Query("entityType") entityType?: string,
    @Query("entityId") entityId?: string,
    @Query("action") action?: string,
    @Query("from") from?: string,
    @Query("to") to?: string,
    @Query("cursor") cursor?: string,
    @Query("take") take?: string,
  ) {
    return this.svc.getAuditLogs(this.principal(req), {
      branchId,
      workspaceId,
      entityType,
      entityId,
      action,
      from,
      to,
      cursor,
      take: take ? parseInt(take, 10) : undefined,
    });
  }
}
