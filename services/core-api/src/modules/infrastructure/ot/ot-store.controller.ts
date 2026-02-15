import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { PrincipalGuard } from "../../auth/principal.guard";
import { PermissionsGuard } from "../../auth/permissions.guard";
import { Permissions } from "../../auth/permissions.decorator";
import type { Principal } from "../../auth/access-policy.service";
import { PERM } from "../../iam/iam.constants";

import { OtStoreService } from "./ot-store.service";
import {
  CreateConsumableTemplateDto,
  CreateImplantTrackingRuleDto,
  CreateParLevelDto,
  CreateStoreLinkDto,
  UpdateConsumableTemplateDto,
  UpdateParLevelDto,
} from "./ot-store.dto";

@ApiTags("infrastructure/ot/store")
@Controller("infrastructure/ot/store")
@UseGuards(PrincipalGuard, PermissionsGuard)
export class OtStoreController {
  constructor(private readonly svc: OtStoreService) {}

  private principal(req: any): Principal {
    return req.principal as Principal;
  }

  // ---- Store Links (OTS-034, OTS-038) ----

  @Get("suites/:suiteId/store-links")
  @Permissions(PERM.OT_STORE_READ)
  listStoreLinks(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.listStoreLinks(this.principal(req), suiteId);
  }

  @Post("suites/:suiteId/store-links")
  @Permissions(PERM.OT_STORE_CREATE)
  createStoreLink(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateStoreLinkDto) {
    return this.svc.createStoreLink(this.principal(req), suiteId, dto);
  }

  @Delete("store-links/:id")
  @Permissions(PERM.OT_STORE_DELETE)
  deleteStoreLink(@Req() req: any, @Param("id") id: string) {
    return this.svc.deleteStoreLink(this.principal(req), id);
  }

  // ---- Consumable Templates (OTS-035) ----

  @Get("suites/:suiteId/consumable-templates")
  @Permissions(PERM.OT_STORE_READ)
  listConsumableTemplates(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.listConsumableTemplates(this.principal(req), suiteId);
  }

  @Post("suites/:suiteId/consumable-templates")
  @Permissions(PERM.OT_STORE_CREATE)
  createConsumableTemplate(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateConsumableTemplateDto) {
    return this.svc.createConsumableTemplate(this.principal(req), suiteId, dto);
  }

  @Patch("consumable-templates/:id")
  @Permissions(PERM.OT_STORE_UPDATE)
  updateConsumableTemplate(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateConsumableTemplateDto) {
    return this.svc.updateConsumableTemplate(this.principal(req), id, dto);
  }

  @Delete("consumable-templates/:id")
  @Permissions(PERM.OT_STORE_DELETE)
  deleteConsumableTemplate(@Req() req: any, @Param("id") id: string) {
    return this.svc.deleteConsumableTemplate(this.principal(req), id);
  }

  // ---- Implant Tracking Rules (OTS-036) ----

  @Get("suites/:suiteId/implant-rules")
  @Permissions(PERM.OT_STORE_READ)
  listImplantRules(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.listImplantRules(this.principal(req), suiteId);
  }

  @Post("suites/:suiteId/implant-rules")
  @Permissions(PERM.OT_STORE_CREATE)
  upsertImplantRule(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateImplantTrackingRuleDto) {
    return this.svc.upsertImplantRule(this.principal(req), suiteId, dto);
  }

  // ---- Par Levels (OTS-037) ----

  @Get("suites/:suiteId/par-levels")
  @Permissions(PERM.OT_STORE_READ)
  listParLevels(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.listParLevels(this.principal(req), suiteId);
  }

  @Post("suites/:suiteId/par-levels")
  @Permissions(PERM.OT_STORE_CREATE)
  createParLevel(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateParLevelDto) {
    return this.svc.createParLevel(this.principal(req), suiteId, dto);
  }

  @Patch("par-levels/:id")
  @Permissions(PERM.OT_STORE_UPDATE)
  updateParLevel(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateParLevelDto) {
    return this.svc.updateParLevel(this.principal(req), id, dto);
  }
}
