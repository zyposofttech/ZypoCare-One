import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { ReagentService } from "./reagent.service";
import { CreateReagentDto, UpdateReagentDto } from "./dto";

@ApiTags("blood-bank/reagents")
@Controller("blood-bank")
export class ReagentController {
  constructor(private readonly svc: ReagentService) {}

  private principal(req: any) { return req.principal; }

  @Get("reagents")
  @Permissions(PERM.BB_REAGENT_READ)
  list(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.list(this.principal(req), branchId ?? null);
  }

  @Post("reagents")
  @Permissions(PERM.BB_REAGENT_CREATE)
  create(@Req() req: any, @Body() dto: CreateReagentDto) {
    return this.svc.create(this.principal(req), dto);
  }

  @Patch("reagents/:id")
  @Permissions(PERM.BB_REAGENT_UPDATE)
  update(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateReagentDto) {
    return this.svc.update(this.principal(req), id, dto);
  }
}
