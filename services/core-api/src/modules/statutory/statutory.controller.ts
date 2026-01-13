import { Body, Controller, Get, Post, Query, Inject } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { IsIn, IsString } from "class-validator";
import type { PrismaClient } from "@zypocare/db";
import { AuditService } from "../audit/audit.service";
import { Roles } from "../auth/roles.decorator";

class CreateCaseDto {
  @IsString() branchId!: string;
  @IsString() patientId!: string;
  @IsIn(["NIKSHAY", "IDSP", "IHIP"]) program!: "NIKSHAY" | "IDSP" | "IHIP";
  @IsString() disease!: string;
}

@ApiTags("statutory")
@Controller("statutory")
export class StatutoryController {
  constructor(@Inject("PRISMA") private prisma: PrismaClient, private audit: AuditService) {}

  @Roles("SURVEILLANCE_OFFICER", "SUPER_ADMIN", "BRANCH_ADMIN")
  @Get("cases")
  async list(@Query("program") program?: string) {
    return this.prisma.statutoryCase.findMany({
      where: program ? { program } : {},
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
  }

  @Roles("DOCTOR", "DIAGNOSTICS", "SURVEILLANCE_OFFICER", "SUPER_ADMIN", "BRANCH_ADMIN")
  @Post("cases")
  async create(@Body() dto: CreateCaseDto) {
    const row = await this.prisma.statutoryCase.create({
      data: { branchId: dto.branchId, patientId: dto.patientId, program: dto.program, disease: dto.disease, status: "DRAFT" },
    });
    await this.audit.log({ action: "STATUTORY_CASE_CREATE", entity: "StatutoryCase", entityId: row.id, meta: dto });
    return row;
  }
}
