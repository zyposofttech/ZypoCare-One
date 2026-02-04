import { Body, Controller, Param, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { ProvisionUserDto, StaffOnboardDto } from "./staff.dto";
import { StaffService } from "./staff.service";

@ApiTags("infrastructure/staff")
@Controller(["infrastructure", "infra"])
export class StaffController {
  constructor(private readonly svc: StaffService) {}

  private principal(req: any) {
    return req.principal;
  }

  /**
   * Staff onboarding (enterprise-safe): create Staff + one or more branch assignments.
   */
  @Post("staff/onboard")
  @Permissions(PERM.STAFF_CREATE)
  async onboard(@Req() req: any, @Body() dto: StaffOnboardDto) {
    return this.svc.onboard(this.principal(req), dto);
  }

  /**
   * Preview provisioning (does NOT create a user).
   */
  @Post("staff/:staffId/provision-user/preview")
  @Permissions(PERM.STAFF_PROVISION_USER_PREVIEW)
  async provisionPreview(@Req() req: any, @Param("staffId") staffId: string, @Body() dto: ProvisionUserDto) {
    return this.svc.provisionUserPreview(this.principal(req), staffId, dto);
  }

  /**
   * Provision login for staff later (creates User + RoleBindings anchored to active branch assignments).
   */
  @Post("staff/:staffId/provision-user")
  @Permissions(PERM.STAFF_PROVISION_USER)
  async provision(@Req() req: any, @Param("staffId") staffId: string, @Body() dto: ProvisionUserDto) {
    return this.svc.provisionUser(this.principal(req), staffId, dto);
  }
}
