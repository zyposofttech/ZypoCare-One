import { Body, Controller, Get, Post, Query, Inject, Req, UnauthorizedException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsIn, IsOptional, IsString } from "class-validator";
import type { PrismaClient } from "@zypocare/db";
import { AuditService } from "../audit/audit.service";
import { Roles } from "../auth/roles.decorator";
import { PrincipalGuard } from "../auth/principal.guard";
import type { Principal } from "../auth/access-policy.service";
import { resolveBranchId, actorUserIdFromReq } from "../../common/branch-scope.util";

class CreateCaseDto {
  /** Required only for GLOBAL principals; BRANCH principals derive from token. */
  @IsOptional() @IsString() branchId?: string;

  @IsString() patientId!: string;
  @IsIn(["NIKSHAY", "IDSP", "IHIP"]) program!: "NIKSHAY" | "IDSP" | "IHIP";
  @IsString() disease!: string;
}

@ApiTags("statutory")
@Controller("statutory")
export class StatutoryController {
  constructor(@Inject("PRISMA") private prisma: PrismaClient, private audit: AuditService) {}

  private principal(req: any): Principal {
    const p = req?.principal as Principal | undefined;
    if (!p) throw new UnauthorizedException("Missing principal");
    return p;
  }

  /**
   * ✅ Standardized:
   * - Branch users: always filtered to their branch
   * - Super admin: may pass branchId to filter; if omitted -> returns all branches
   */
  @Roles("SURVEILLANCE_OFFICER", "SUPER_ADMIN", "BRANCH_ADMIN")
  @Get("cases")
  async list(
    @Req() req: any,
    @Query("program") program?: string,
    @Query("branchId") branchId?: string,
  ) {
    const p = this.principal(req);
    const scopedBranchId = resolveBranchId(p, branchId ?? null, { requiredForGlobal: false });

    if (p.roleScope === "GLOBAL" && !scopedBranchId) {
      await this.audit.log({
        branchId: null,
        actorUserId: actorUserIdFromReq(req),
        action: "STATUTORY_CASE_READ_ALL_BRANCHES",
        entity: "StatutoryCase",
        entityId: null,
        meta: { requestedBranchId: branchId ?? null, program: program ?? null },
      });
    }

    return this.prisma.statutoryCase.findMany({
      where: {
        ...(program ? { program } : {}),
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
  }

  /**
   * ✅ Standardized:
   * - Branch users: branch derived from principal
   * - Super admin: dto.branchId required
   */
  @Roles("DOCTOR", "DIAGNOSTICS", "SURVEILLANCE_OFFICER", "SUPER_ADMIN", "BRANCH_ADMIN")
  @Post("cases")
  async create(@Body() dto: CreateCaseDto, @Req() req: any) {
    const p = this.principal(req);
    const branchId = resolveBranchId(p, dto.branchId ?? null, { requiredForGlobal: true });
    if (!branchId) throw new Error("Unreachable: branchId required");

    const row = await this.prisma.statutoryCase.create({
      data: { branchId, patientId: dto.patientId, program: dto.program, disease: dto.disease, status: "DRAFT" },
    });

    await this.audit.log({
      branchId,
      actorUserId: actorUserIdFromReq(req),
      action: "STATUTORY_CASE_CREATE",
      entity: "StatutoryCase",
      entityId: row.id,
      meta: dto,
    });

    return row;
  }
}
