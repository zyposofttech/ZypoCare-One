import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { ComponentMasterService } from "./component-master.service";
import { CreateComponentDto, UpdateComponentDto } from "./dto";

@ApiTags("blood-bank/components")
@Controller("blood-bank")
export class ComponentMasterController {
  constructor(private readonly svc: ComponentMasterService) {}

  private principal(req: any) {
    return req.principal;
  }

  @Get("components")
  @Permissions(PERM.BB_COMPONENT_READ)
  list(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.list(this.principal(req), branchId ?? null);
  }

  @Post("components")
  @Permissions(PERM.BB_COMPONENT_CREATE)
  create(@Req() req: any, @Body() dto: CreateComponentDto) {
    return this.svc.create(this.principal(req), dto);
  }

  @Patch("components/:id")
  @Permissions(PERM.BB_COMPONENT_UPDATE)
  update(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateComponentDto) {
    return this.svc.update(this.principal(req), id, dto);
  }
}
