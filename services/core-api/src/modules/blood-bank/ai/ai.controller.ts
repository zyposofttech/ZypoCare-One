import { Controller, Get, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { AiService } from "./ai.service";

@ApiTags("blood-bank/ai")
@Controller("blood-bank")
export class AiController {
  constructor(private readonly svc: AiService) {}

  private principal(req: any) {
    return req.principal;
  }

  @Get("ai/insights")
  @Permissions(PERM.BB_AI_READ)
  insights(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.insights(this.principal(req), branchId ?? null);
  }
}
