import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { CampService } from "./camp.service";
import { CreateCampDto, UpdateCampDto } from "./dto";

@ApiTags("blood-bank/camps")
@Controller("blood-bank")
export class CampController {
  constructor(private readonly svc: CampService) {}

  private principal(req: any) { return req.principal; }

  @Get("camps")
  @Permissions(PERM.BB_CAMP_READ)
  list(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.list(this.principal(req), branchId ?? null);
  }

  @Post("camps")
  @Permissions(PERM.BB_CAMP_CREATE)
  create(@Req() req: any, @Body() dto: CreateCampDto) {
    return this.svc.create(this.principal(req), dto);
  }

  @Patch("camps/:id")
  @Permissions(PERM.BB_CAMP_UPDATE)
  update(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateCampDto) {
    return this.svc.update(this.principal(req), id, dto);
  }

  @Get("camps/:id/checklist")
  @Permissions(PERM.BB_CAMP_READ)
  checklist(@Req() req: any, @Param("id") id: string) {
    return this.svc.getChecklist(this.principal(req), id);
  }

  @Post("camps/:id/sync")
  @Permissions(PERM.BB_CAMP_UPDATE)
  sync(@Req() req: any, @Param("id") id: string) {
    return this.svc.syncCamp(this.principal(req), id);
  }
}
