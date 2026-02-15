import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { TransfersService } from "./transfers.service";
import { CreateTransferDto, DispatchTransferDto } from "./dto";

@ApiTags("blood-bank/transfers")
@Controller("blood-bank")
export class TransfersController {
  constructor(private readonly svc: TransfersService) {}
  private principal(req: any) {
    return req.principal;
  }

  @Get("transfers")
  @Permissions(PERM.BB_TRANSFER_READ)
  list(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("dir") dir?: string,
    @Query("status") status?: string,
    @Query("take") take?: string,
  ) {
    const d = (dir ?? "all").toLowerCase();
    const dirNorm = d === "in" || d === "out" ? (d as any) : "all";
    return this.svc.list(this.principal(req), {
      branchId: branchId ?? null,
      dir: dirNorm,
      status,
      take: take ? Number(take) : undefined,
    });
  }

  @Get("transfers/:id")
  @Permissions(PERM.BB_TRANSFER_READ)
  get(@Req() req: any, @Param("id") id: string) {
    return this.svc.get(this.principal(req), id);
  }

  @Post("transfers")
  @Permissions(PERM.BB_TRANSFER_CREATE)
  create(@Req() req: any, @Body() dto: CreateTransferDto) {
    return this.svc.create(this.principal(req), dto);
  }

  @Post("transfers/:id/dispatch")
  @Permissions(PERM.BB_TRANSFER_DISPATCH)
  dispatch(@Req() req: any, @Param("id") id: string, @Body() dto: DispatchTransferDto) {
    return this.svc.dispatch(this.principal(req), id, dto);
  }

  @Post("transfers/:id/receive")
  @Permissions(PERM.BB_TRANSFER_RECEIVE)
  receive(@Req() req: any, @Param("id") id: string) {
    return this.svc.receive(this.principal(req), id);
  }

  @Post("transfers/:id/cancel")
  @Permissions(PERM.BB_TRANSFER_CREATE)
  cancel(@Req() req: any, @Param("id") id: string) {
    return this.svc.cancel(this.principal(req), id);
  }
}
