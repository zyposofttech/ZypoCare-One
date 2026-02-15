import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { PrincipalGuard } from "../../auth/principal.guard";
import { PermissionsGuard } from "../../auth/permissions.guard";
import { Permissions } from "../../auth/permissions.decorator";
import type { Principal } from "../../auth/access-policy.service";
import { PERM } from "../../iam/iam.constants";

import { OtSchedulingService } from "./ot-scheduling.service";
import {
  CreateBookingApprovalConfigDto,
  CreateCancellationPolicyDto,
  CreateEmergencyPolicyDto,
  CreateNotificationRuleDto,
  CreateRecoveryProtocolDto,
  CreateSchedulingRuleDto,
  CreateSurgeryTypeDefaultDto,
  CreateUtilizationTargetDto,
  UpdateSchedulingRuleDto,
} from "./ot-scheduling.dto";

@ApiTags("infrastructure/ot/scheduling")
@Controller("infrastructure/ot/scheduling")
@UseGuards(PrincipalGuard, PermissionsGuard)
export class OtSchedulingController {
  constructor(private readonly svc: OtSchedulingService) {}

  private principal(req: any): Principal {
    return req.principal as Principal;
  }

  // ---- Operating Hours (OTS-017) ----

  @Get("suites/:suiteId/operating-hours")
  @Permissions(PERM.OT_SCHEDULING_READ)
  listOperatingHours(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.listOperatingHours(this.principal(req), suiteId);
  }

  @Post("suites/:suiteId/operating-hours")
  @Permissions(PERM.OT_SCHEDULING_CREATE)
  createOperatingHours(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateSchedulingRuleDto) {
    return this.svc.createOperatingHours(this.principal(req), suiteId, dto);
  }

  @Patch("operating-hours/:id")
  @Permissions(PERM.OT_SCHEDULING_UPDATE)
  updateOperatingHours(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateSchedulingRuleDto) {
    return this.svc.updateOperatingHours(this.principal(req), id, dto);
  }

  @Delete("operating-hours/:id")
  @Permissions(PERM.OT_SCHEDULING_DELETE)
  deleteOperatingHours(@Req() req: any, @Param("id") id: string) {
    return this.svc.deleteOperatingHours(this.principal(req), id);
  }

  // ---- Emergency Policy (OTS-019) ----

  @Get("suites/:suiteId/emergency-policy")
  @Permissions(PERM.OT_SCHEDULING_READ)
  getEmergencyPolicy(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.getEmergencyPolicy(this.principal(req), suiteId);
  }

  @Post("suites/:suiteId/emergency-policy")
  @Permissions(PERM.OT_SCHEDULING_CREATE)
  upsertEmergencyPolicy(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateEmergencyPolicyDto) {
    return this.svc.upsertEmergencyPolicy(this.principal(req), suiteId, dto);
  }

  // ---- Surgery Type Defaults (OTS-039) ----

  @Get("suites/:suiteId/surgery-defaults")
  @Permissions(PERM.OT_SCHEDULING_READ)
  listSurgeryDefaults(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.listSurgeryDefaults(this.principal(req), suiteId);
  }

  @Post("suites/:suiteId/surgery-defaults")
  @Permissions(PERM.OT_SCHEDULING_CREATE)
  upsertSurgeryDefault(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateSurgeryTypeDefaultDto) {
    return this.svc.upsertSurgeryDefault(this.principal(req), suiteId, dto);
  }

  // ---- Cancellation Policy (OTS-041) ----

  @Get("suites/:suiteId/cancellation-policy")
  @Permissions(PERM.OT_SCHEDULING_READ)
  getCancellationPolicy(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.getCancellationPolicy(this.principal(req), suiteId);
  }

  @Post("suites/:suiteId/cancellation-policy")
  @Permissions(PERM.OT_SCHEDULING_CREATE)
  upsertCancellationPolicy(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateCancellationPolicyDto) {
    return this.svc.upsertCancellationPolicy(this.principal(req), suiteId, dto);
  }

  // ---- Booking Approval (OTS-042) ----

  @Get("suites/:suiteId/booking-approval")
  @Permissions(PERM.OT_SCHEDULING_READ)
  getBookingApproval(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.getBookingApproval(this.principal(req), suiteId);
  }

  @Post("suites/:suiteId/booking-approval")
  @Permissions(PERM.OT_SCHEDULING_CREATE)
  upsertBookingApproval(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateBookingApprovalConfigDto) {
    return this.svc.upsertBookingApproval(this.principal(req), suiteId, dto);
  }

  // ---- Utilization Targets (OTS-043) ----

  @Get("suites/:suiteId/utilization-targets")
  @Permissions(PERM.OT_SCHEDULING_READ)
  listUtilizationTargets(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.listUtilizationTargets(this.principal(req), suiteId);
  }

  @Post("suites/:suiteId/utilization-targets")
  @Permissions(PERM.OT_SCHEDULING_CREATE)
  upsertUtilizationTarget(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateUtilizationTargetDto) {
    return this.svc.upsertUtilizationTarget(this.principal(req), suiteId, dto);
  }

  // ---- Recovery Protocols (OTS-044) ----

  @Get("suites/:suiteId/recovery-protocols")
  @Permissions(PERM.OT_SCHEDULING_READ)
  listRecoveryProtocols(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.listRecoveryProtocols(this.principal(req), suiteId);
  }

  @Post("suites/:suiteId/recovery-protocols")
  @Permissions(PERM.OT_SCHEDULING_CREATE)
  upsertRecoveryProtocol(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateRecoveryProtocolDto) {
    return this.svc.upsertRecoveryProtocol(this.principal(req), suiteId, dto);
  }

  // ---- Notification Rules (OTS-046) ----

  @Get("suites/:suiteId/notification-rules")
  @Permissions(PERM.OT_SCHEDULING_READ)
  listNotificationRules(@Req() req: any, @Param("suiteId") suiteId: string) {
    return this.svc.listNotificationRules(this.principal(req), suiteId);
  }

  @Post("suites/:suiteId/notification-rules")
  @Permissions(PERM.OT_SCHEDULING_CREATE)
  upsertNotificationRule(@Req() req: any, @Param("suiteId") suiteId: string, @Body() dto: CreateNotificationRuleDto) {
    return this.svc.upsertNotificationRule(this.principal(req), suiteId, dto);
  }
}
