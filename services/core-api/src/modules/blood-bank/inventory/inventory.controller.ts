import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { InventoryService } from "./inventory.service";
import { DiscardUnitDto, TransferUnitDto } from "./dto";

@ApiTags("blood-bank/inventory")
@Controller("blood-bank")
export class InventoryController {
  constructor(private readonly svc: InventoryService) {}

  private principal(req: any) { return req.principal; }

  @Get("inventory/dashboard")
  @Permissions(PERM.BB_INVENTORY_READ)
  dashboard(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.dashboard(this.principal(req), branchId ?? null);
  }

  @Get("inventory/units")
  @Permissions(PERM.BB_INVENTORY_READ)
  listUnits(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("status") status?: string,
    @Query("bloodGroup") bloodGroup?: string,
    @Query("componentType") componentType?: string,
    @Query("take") take?: string,
  ) {
    return this.svc.listUnits(this.principal(req), {
      branchId: branchId ?? null, status, bloodGroup, componentType,
      take: take ? Number(take) : undefined,
    });
  }

  @Get("inventory/units/:id")
  @Permissions(PERM.BB_INVENTORY_READ)
  unitDetail(@Req() req: any, @Param("id") id: string) {
    return this.svc.unitDetail(this.principal(req), id);
  }

  @Get("inventory/expiring")
  @Permissions(PERM.BB_INVENTORY_READ)
  expiring(@Req() req: any, @Query("branchId") branchId?: string, @Query("days") days?: string) {
    return this.svc.expiringUnits(this.principal(req), branchId ?? null, days ? Number(days) : 3);
  }

  @Post("inventory/discard")
  @Permissions(PERM.BB_INVENTORY_DISCARD)
  discard(@Req() req: any, @Body() dto: DiscardUnitDto) {
    return this.svc.discardUnit(this.principal(req), dto);
  }

  @Post("inventory/transfer")
  @Permissions(PERM.BB_INVENTORY_TRANSFER)
  transfer(@Req() req: any, @Body() dto: TransferUnitDto) {
    return this.svc.transferUnit(this.principal(req), dto);
  }

  @Get("inventory/stock-levels")
  @Permissions(PERM.BB_INVENTORY_READ)
  stockLevels(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.stockLevels(this.principal(req), branchId ?? null);
  }

  @Get("inventory/storage-map")
  @Permissions(PERM.BB_INVENTORY_READ)
  storageMap(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.storageMap(this.principal(req), branchId ?? null);
  }
}
