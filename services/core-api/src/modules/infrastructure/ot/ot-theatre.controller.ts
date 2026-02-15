import { Body, Controller, Get, Param, Patch, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { PrincipalGuard } from "../../auth/principal.guard";
import { PermissionsGuard } from "../../auth/permissions.guard";
import { Permissions } from "../../auth/permissions.decorator";
import type { Principal } from "../../auth/access-policy.service";
import { PERM } from "../../iam/iam.constants";

import { OtTheatreService } from "./ot-theatre.service";
import {
  UpdateTheatreEngineeringDto,
  UpdateTheatreSchedulingParamsDto,
  UpdateTheatreSpecialtiesDto,
} from "./ot-theatre.dto";

@ApiTags("infrastructure/ot/theatres")
@Controller("infrastructure/ot/theatres")
@UseGuards(PrincipalGuard, PermissionsGuard)
export class OtTheatreController {
  constructor(private readonly svc: OtTheatreService) {}

  private principal(req: any): Principal {
    return req.principal as Principal;
  }

  @Patch(":id/engineering-specs")
  @Permissions(PERM.OT_THEATRE_UPDATE)
  updateEngineeringSpecs(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateTheatreEngineeringDto) {
    return this.svc.updateEngineeringSpecs(this.principal(req), id, dto);
  }

  @Patch(":id/specialties")
  @Permissions(PERM.OT_THEATRE_UPDATE)
  updateSpecialties(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateTheatreSpecialtiesDto) {
    return this.svc.updateSpecialties(this.principal(req), id, dto);
  }

  @Patch(":id/scheduling-params")
  @Permissions(PERM.OT_THEATRE_UPDATE)
  updateSchedulingParams(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateTheatreSchedulingParamsDto) {
    return this.svc.updateSchedulingParams(this.principal(req), id, dto);
  }

  @Get(":id/version-history")
  @Permissions(PERM.OT_THEATRE_READ)
  getVersionHistory(@Req() req: any, @Param("id") id: string) {
    return this.svc.getVersionHistory(this.principal(req), id);
  }
}
