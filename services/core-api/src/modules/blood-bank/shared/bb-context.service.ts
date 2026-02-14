import { Inject, Injectable } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import type { Principal } from "../../auth/access-policy.service";
import { resolveBranchId as resolveBranchIdCommon } from "../../../common/branch-scope.util";
import { AuditService } from "../../audit/audit.service";

@Injectable()
export class BBContextService {
  constructor(
    @Inject("PRISMA") public prisma: PrismaClient,
    public audit: AuditService,
  ) {}

  resolveBranchId(principal: Principal, requestedBranchId?: string | null): string {
    return resolveBranchIdCommon(principal, requestedBranchId ?? null, { requiredForGlobal: true });
  }
}
