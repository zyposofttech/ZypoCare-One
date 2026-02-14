import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { FacilityService } from "./facility.service";
import { UpsertFacilityDto, UpsertMSBOSDto } from "./dto";

@ApiTags("blood-bank/facility")
@Controller("blood-bank")
export class FacilityController {
  constructor(private readonly svc: FacilityService) {}

  private principal(req: any) {
    return req.principal;
  }

  @Get("facility")
  @Permissions(PERM.BB_FACILITY_READ)
  get(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.get(this.principal(req), branchId ?? null);
  }

  @Post("facility")
  @Permissions(PERM.BB_FACILITY_UPDATE)
  upsert(@Req() req: any, @Body() dto: UpsertFacilityDto) {
    return this.svc.upsert(this.principal(req), dto);
  }

  @Get("msbos")
  @Permissions(PERM.BB_MSBOS_READ)
  listMSBOS(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.listMSBOS(this.principal(req), branchId ?? null);
  }

  @Post("msbos")
  @Permissions(PERM.BB_MSBOS_UPDATE)
  upsertMSBOS(@Req() req: any, @Body() dto: UpsertMSBOSDto) {
    return this.svc.upsertMSBOS(this.principal(req), dto);
  }
}
