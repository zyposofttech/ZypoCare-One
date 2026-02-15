import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { LookbackService } from "./lookback.service";
import { CreateLookbackDto, UpdateLookbackDto } from "./dto";

@ApiTags("blood-bank/lookback")
@Controller("blood-bank")
export class LookbackController {
  constructor(private readonly svc: LookbackService) {}
  private principal(req: any) {
    return req.principal;
  }

  @Get("lookback")
  @Permissions(PERM.BB_LOOKBACK_READ)
  list(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("status") status?: string,
    @Query("take") take?: string,
  ) {
    return this.svc.list(this.principal(req), { branchId: branchId ?? null, status, take: take ? Number(take) : undefined });
  }

  @Get("lookback/:id")
  @Permissions(PERM.BB_LOOKBACK_READ)
  get(@Req() req: any, @Param("id") id: string) {
    return this.svc.get(this.principal(req), id);
  }

  @Post("lookback")
  @Permissions(PERM.BB_LOOKBACK_CREATE)
  create(@Req() req: any, @Body() dto: CreateLookbackDto) {
    return this.svc.create(this.principal(req), dto);
  }

  @Patch("lookback/:id")
  @Permissions(PERM.BB_LOOKBACK_UPDATE)
  update(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateLookbackDto) {
    return this.svc.update(this.principal(req), id, dto);
  }

  @Post("lookback/:id/refresh")
  @Permissions(PERM.BB_LOOKBACK_UPDATE)
  refresh(@Req() req: any, @Param("id") id: string) {
    return this.svc.refresh(this.principal(req), id);
  }

  @Post("lookback/:id/close")
  @Permissions(PERM.BB_LOOKBACK_UPDATE)
  close(@Req() req: any, @Param("id") id: string) {
    return this.svc.close(this.principal(req), id);
  }
}
