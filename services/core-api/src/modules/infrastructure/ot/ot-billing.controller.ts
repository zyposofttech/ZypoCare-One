import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { PrincipalGuard } from "../../auth/principal.guard";
import { PermissionsGuard } from "../../auth/permissions.guard";
import { Permissions } from "../../auth/permissions.decorator";
import type { Principal } from "../../auth/access-policy.service";
import { PERM } from "../../iam/iam.constants";

import { OtBillingService } from "./ot-billing.service";
import {
  CreateChargeComponentDto,
  CreateServiceLinkDto,
  UpdateChargeComponentDto,
} from "./ot-billing.dto";

@ApiTags("infrastructure/ot/billing")
@Controller("infrastructure/ot/billing")
@UseGuards(PrincipalGuard, PermissionsGuard)
export class OtBillingController {
  constructor(private readonly svc: OtBillingService) {}

  private principal(req: any): Principal {
    return req.principal as Principal;
  }

  // ---- Service Links (OTS-047) ----

  @Get("suites/:suiteId/service-links")
  @Permissions(PERM.OT_BILLING_READ)
  listServiceLinks(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.listServiceLinks(this.principal(req), suiteId);
  }

  @Post("suites/:suiteId/service-links")
  @Permissions(PERM.OT_BILLING_CREATE)
  createServiceLink(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateServiceLinkDto) {
    return this.svc.createServiceLink(this.principal(req), suiteId, dto);
  }

  @Delete("service-links/:id")
  @Permissions(PERM.OT_BILLING_DELETE)
  deleteServiceLink(@Req() req: any, @Param("id") id: string) {
    return this.svc.deleteServiceLink(this.principal(req), id);
  }

  // ---- Charge Components (OTS-048) ----

  @Get("suites/:suiteId/charge-components")
  @Permissions(PERM.OT_BILLING_READ)
  listChargeComponents(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.listChargeComponents(this.principal(req), suiteId);
  }

  @Post("suites/:suiteId/charge-components")
  @Permissions(PERM.OT_BILLING_CREATE)
  upsertChargeComponent(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateChargeComponentDto) {
    return this.svc.upsertChargeComponent(this.principal(req), suiteId, dto);
  }

  @Patch("charge-components/:id")
  @Permissions(PERM.OT_BILLING_UPDATE)
  updateChargeComponent(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateChargeComponentDto) {
    return this.svc.updateChargeComponent(this.principal(req), id, dto);
  }

  // ---- Billing Completeness (OTS-051) ----

  @Get("suites/:suiteId/billing-completeness")
  @Permissions(PERM.OT_BILLING_READ)
  getBillingCompleteness(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.getBillingCompleteness(this.principal(req), suiteId);
  }
}
