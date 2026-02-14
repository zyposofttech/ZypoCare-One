// ---------------------------------------------------------------------------
// Claims Gateway Controller — manual status refresh endpoints
// ---------------------------------------------------------------------------
import { Controller, Param, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { ClaimsGatewayService } from "./claims-gateway.service";

@ApiTags("billing/claims-gateway")
@Controller("billing/claims-gateway")
export class ClaimsGatewayController {
  constructor(private readonly gateway: ClaimsGatewayService) {}

  private principal(req: any) {
    return req.principal;
  }

  /**
   * Manually refresh a preauth's status from the payer/gateway.
   * Polls the adapter, updates PreauthRequest status + financials in DB.
   */
  @Post("preauth/:preauthId/refresh-status")
  @Permissions(PERM.BILLING_PREAUTH_UPDATE)
  async refreshPreauthStatus(
    @Req() req: any,
    @Param("preauthId") preauthId: string,
  ) {
    return this.gateway.refreshPreauthStatus(this.principal(req), preauthId);
  }

  /**
   * Manually refresh a claim's status from the payer/gateway.
   * Polls the adapter, updates Claim status + financials in DB.
   */
  @Post("claims/:claimId/refresh-status")
  @Permissions(PERM.BILLING_CLAIM_UPDATE)
  async refreshClaimStatus(
    @Req() req: any,
    @Param("claimId") claimId: string,
  ) {
    return this.gateway.refreshClaimStatus(this.principal(req), claimId);
  }
}
