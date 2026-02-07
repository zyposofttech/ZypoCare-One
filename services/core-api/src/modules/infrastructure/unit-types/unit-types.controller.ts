import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { SetBranchUnitTypesDto } from "./dto";
import { UnitTypesService } from "./unit-types.service";

@ApiTags("infrastructure/unit-types")
@Controller(["infrastructure", "infra"])
export class UnitTypesController {
  constructor(private readonly svc: UnitTypesService) {}

  private principal(req: any) {
    return req.principal;
  }

  @Get("unit-types/catalog")
  @Permissions(PERM.INFRA_UNITTYPE_READ)
  async unitTypeCatalog(@Req() req: any, @Query("includeInactive") includeInactive?: any) {
    const flag =
      includeInactive === true ||
      includeInactive === "true" ||
      includeInactive === "1" ||
      includeInactive === "yes";

    return this.svc.listUnitTypeCatalog(this.principal(req), flag);
  }

  @Post("unit-types/catalog")
  @Permissions(PERM.INFRA_UNITTYPE_UPDATE)
  async createUnitTypeCatalog(@Req() req: any, @Body() body: any) {
    return this.svc.createUnitTypeCatalog(this.principal(req), body);
  }

  @Patch("unit-types/catalog/:id")
  @Permissions(PERM.INFRA_UNITTYPE_UPDATE)
  async updateUnitTypeCatalog(@Req() req: any, @Param("id") id: string, @Body() body: any) {
    return this.svc.updateUnitTypeCatalog(this.principal(req), id, body);
  }

  @Get("branches/:branchId/unit-types")
  @Permissions(PERM.INFRA_UNITTYPE_READ)
  async getBranchUnitTypes(@Req() req: any, @Param("branchId") branchId: string) {
    return this.svc.getBranchUnitTypes(this.principal(req), branchId);
  }

  @Patch("branches/:branchId/unit-types")
  @Permissions(PERM.INFRA_UNITTYPE_UPDATE)
  async setBranchUnitTypes(@Req() req: any, @Param("branchId") branchId: string, @Body() dto: SetBranchUnitTypesDto) {
    return this.svc.setBranchUnitTypes(this.principal(req), dto.unitTypeIds, branchId);
  }
}
