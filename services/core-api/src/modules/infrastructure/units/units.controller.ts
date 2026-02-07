import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { parseBool } from "../../../common/http.util";
import { CreateUnitDto, UpdateUnitDto } from "./dto";
import { UnitsService } from "./units.service";

@ApiTags("infrastructure/units")
@Controller(["infrastructure", "infra"])
export class UnitsController {
  constructor(private readonly svc: UnitsService) {}

  private principal(req: any) {
    return req.principal;
  }

  // ✅ Updated: supports either branchId OR unitId (so Unit Details screen can load without branch picker)
  @Get("departments")
  @Permissions(PERM.INFRA_UNIT_READ)
  async listDepartments(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("unitId") unitId?: string,
  ) {
    return this.svc.listDepartments(this.principal(req), { branchId: branchId ?? null, unitId: unitId ?? null });
  }

  @Get("units")
  @Permissions(PERM.INFRA_UNIT_READ)
  async listUnits(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("departmentId") departmentId?: string,
    @Query("unitTypeId") unitTypeId?: string,
    @Query("locationNodeId") locationNodeId?: string,
    @Query("q") q?: string,
    @Query("includeInactive") includeInactive?: string,
  ) {
    return this.svc.listUnits(this.principal(req), {
      branchId,
      departmentId,
      unitTypeId,
      locationNodeId,
      q,
      includeInactive: includeInactive === "true",
    });
  }

  @Get("units/:id")
  @Permissions(PERM.INFRA_UNIT_READ)
  async getUnit(@Req() req: any, @Param("id") id: string) {
    return this.svc.getUnit(this.principal(req), id);
  }

  @Post("units")
  @Permissions(PERM.INFRA_UNIT_CREATE)
  async createUnit(@Req() req: any, @Body() dto: CreateUnitDto, @Query("branchId") branchId?: string) {
    return this.svc.createUnit(this.principal(req), dto, branchId ?? null);
  }

  @Patch("units/:id")
  @Permissions(PERM.INFRA_UNIT_UPDATE)
  async updateUnit(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateUnitDto) {
    return this.svc.updateUnit(this.principal(req), id, dto);
  }

  /**
   * ✅ Preferred endpoint for UI (reason in body; easier than querystring)
   * POST /infra/units/:id/deactivate
   * body: { cascade?: boolean; reason: string; hard?: boolean }
   */
  @Post("units/:id/deactivate")
  @Permissions(PERM.INFRA_UNIT_UPDATE)
  async deactivateUnit(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: { cascade?: boolean; reason?: string; hard?: boolean },
  ) {
    const hard = body?.hard === true;
    const cascade = body?.cascade !== false; // default true

    if (!hard) {
      const reason = String(body?.reason ?? "").trim();
      if (!reason) throw new BadRequestException("Deactivation reason is required.");
      return this.svc.deactivateUnit(this.principal(req), id, { hard: false, cascade, reason });
    }

    return this.svc.deactivateUnit(this.principal(req), id, { hard: true, cascade });
  }

  /**
   * ✅ Backward compatible endpoint
   * DELETE /infra/units/:id?hard=false&cascade=true&reason=...
   * Note: reason REQUIRED when hard=false.
   */
  @Delete("units/:id")
  @Permissions(PERM.INFRA_UNIT_UPDATE)
  async deleteUnit(
    @Req() req: any,
    @Param("id") id: string,
    @Query("hard") hard?: string,
    @Query("cascade") cascade?: string,
    @Query("reason") reason?: string,
  ) {
    const hardParsed = parseBool(hard);
    const hardBool = hardParsed === true;

    const cascadeParsed = parseBool(cascade);
    const cascadeBool = cascade == null ? true : (cascadeParsed ?? true);

    if (!hardBool) {
      const r = String(reason ?? "").trim();
      if (!r) throw new BadRequestException("Deactivation reason is required.");
      return this.svc.deactivateUnit(this.principal(req), id, { hard: false, cascade: cascadeBool, reason: r });
    }

    return this.svc.deactivateUnit(this.principal(req), id, { hard: true, cascade: cascadeBool });
  }
}
