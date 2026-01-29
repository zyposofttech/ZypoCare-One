import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { CreateServiceItemDto } from "./dto";
import { ServiceItemsService } from "./service-items.service";

@ApiTags("infrastructure/services")
@Controller(["infrastructure", "infra"])
export class ServiceItemsController {
  constructor(private readonly svc: ServiceItemsService) {}

  private principal(req: any) {
    return req.principal;
  }

  @Post("services")
  @Permissions(PERM.INFRA_SERVICE_CREATE)
  async createService(@Req() req: any, @Body() dto: CreateServiceItemDto, @Query("branchId") branchId?: string) {
    return this.svc.createServiceItem(this.principal(req), dto, branchId ?? null);
  }

  @Get("services")
  @Permissions(PERM.INFRA_SERVICE_READ)
  async listServices(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("q") q?: string,
    @Query("includeInactive") includeInactive?: string,
  ) {
    return this.svc.listServiceItems(this.principal(req), {
      branchId: branchId ?? null,
      q,
      includeInactive: includeInactive === "true",
    });
  }

  @Patch("services/:id")
  @Permissions(PERM.INFRA_SERVICE_UPDATE)
  async updateService(@Req() req: any, @Param("id") id: string, @Body() dto: Partial<CreateServiceItemDto>) {
    return this.svc.updateServiceItem(this.principal(req), id, dto);
  }
}