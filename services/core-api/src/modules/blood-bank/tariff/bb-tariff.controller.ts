import { Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { BBTariffService } from "./bb-tariff.service";
import { UpsertTariffDto } from "./dto";

@ApiTags("blood-bank/tariff")
@Controller("blood-bank")
export class BBTariffController {
  constructor(private readonly svc: BBTariffService) {}

  private principal(req: any) { return req.principal; }

  @Get("tariff")
  @Permissions(PERM.BB_TARIFF_READ)
  list(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.list(this.principal(req), branchId ?? null);
  }

  @Post("tariff")
  @Permissions(PERM.BB_TARIFF_UPDATE)
  upsert(@Req() req: any, @Body() dto: UpsertTariffDto) {
    return this.svc.upsert(this.principal(req), dto);
  }
}
