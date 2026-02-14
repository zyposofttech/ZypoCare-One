import { Body, Controller, Get, Post, Query, Req, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import type { Principal } from "../../auth/access-policy.service";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { ValidatorService } from "./validator.service";
import { RunValidatorDto, ExportPackDto } from "./dto/validator.dto";

@ApiTags("compliance/validator")
@Controller("compliance/validator")
export class ValidatorController {
  constructor(private readonly svc: ValidatorService) {}

  private principal(req: any): Principal {
    return req.principal as Principal;
  }

  @Post("run")
  @Permissions(PERM.COMPLIANCE_VALIDATOR_RUN)
  async run(@Req() req: any, @Body() dto: RunValidatorDto) {
    return this.svc.runValidator(this.principal(req), dto.workspaceId);
  }

  @Get("dashboard")
  @Permissions(PERM.COMPLIANCE_DASHBOARD_READ)
  async dashboard(@Req() req: any, @Query("workspaceId") workspaceId: string) {
    return this.svc.getDashboardData(this.principal(req), workspaceId);
  }

  @Get("export")
  @Permissions(PERM.COMPLIANCE_EXPORT)
  async exportPack(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
    @Query("workspaceId") workspaceId: string,
    @Query("format") format?: string,
  ) {
    const fmt = format ?? "json";
    const result = await this.svc.exportPack(this.principal(req), workspaceId, fmt);
    if (fmt === "csv") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="compliance-export-${workspaceId}.json"`);
    }
    return result;
  }

  /** Alias so the frontend path `/validator/export-pack` also resolves */
  @Get("export-pack")
  @Permissions(PERM.COMPLIANCE_EXPORT)
  async exportPackAlias(
    @Req() req: any,
    @Res({ passthrough: true }) res: Response,
    @Query("workspaceId") workspaceId: string,
    @Query("format") format?: string,
  ) {
    const fmt = format ?? "json";
    const result = await this.svc.exportPack(this.principal(req), workspaceId, fmt);
    if (fmt === "csv") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="compliance-export-${workspaceId}.json"`);
    }
    return result;
  }
}
