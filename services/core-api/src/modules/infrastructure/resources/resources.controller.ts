import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { parseBool } from "../../../common/http.util";
import { CreateUnitResourceDto, SetResourceStateDto, UpdateUnitResourceDto } from "./dto";
import { ResourcesService } from "./resources.service";

@ApiTags("infrastructure/resources")
@Controller(["infrastructure", "infra"])
export class ResourcesController {
  constructor(private readonly svc: ResourcesService) {}

  private principal(req: any) {
    return req.principal;
  }

  @Get("resources")
  @Permissions(PERM.INFRA_RESOURCE_READ)
  async listResources(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("unitId") unitId?: string,
    @Query("roomId") roomId?: string,
    @Query("resourceType") resourceType?: string,
    @Query("state") state?: string,
    @Query("q") q?: string,
    @Query("includeInactive") includeInactive?: string,
  ) {
    return this.svc.listResources(this.principal(req), {
      branchId: branchId ?? null,
      unitId: unitId ?? null,
      roomId: roomId ?? null,
      resourceType: resourceType ?? null,
      state: state ?? null,
      q: q ?? null,
      includeInactive: includeInactive === "true",
    });
  }

  @Post("resources")
  @Permissions(PERM.INFRA_RESOURCE_CREATE)
  async createResource(@Req() req: any, @Body() dto: CreateUnitResourceDto) {
    return this.svc.createResource(this.principal(req), dto);
  }

  @Patch("resources/:id")
  @Permissions(PERM.INFRA_RESOURCE_UPDATE)
  async updateResource(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateUnitResourceDto) {
    return this.svc.updateResource(this.principal(req), id, dto);
  }

  /**
   * State transition endpoint (UI)
   * POST /infra/resources/:id/state
   * body: { state: "...", reason?: "..." }
   */
  @Post("resources/:id/state")
  @Permissions(PERM.INFRA_RESOURCE_STATE_UPDATE)
  async setState(@Req() req: any, @Param("id") id: string, @Body() dto: SetResourceStateDto) {
    return this.svc.setResourceState(this.principal(req), id, dto.state, dto.reason);
  }

  /**
   * Preferred endpoint
   * POST /infra/resources/:id/deactivate
   * body: { reason: string; hard?: boolean }
   */
  @Post("resources/:id/deactivate")
  @Permissions(PERM.INFRA_RESOURCE_UPDATE)
  async deactivateResource(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: { reason?: string; hard?: boolean },
  ) {
    const hard = body?.hard === true;

    if (!hard) {
      const reason = String(body?.reason ?? "").trim();
      if (!reason) throw new BadRequestException("Deactivation reason is required.");
      return this.svc.deactivateResource(this.principal(req), id, { hard: false, reason });
    }

    return this.svc.deactivateResource(this.principal(req), id, { hard: true });
  }
  @Get("resources/:id")
  @Permissions(PERM.INFRA_RESOURCE_READ)
  async getResource(@Req() req: any, @Param("id") id: string) {
    return this.svc.getResource(this.principal(req), id);
  }

  /**
   * Backward compatible endpoint
   * DELETE /infra/resources/:id?hard=false&reason=...
   * reason REQUIRED when hard=false.
   */
  @Delete("resources/:id")
  @Permissions(PERM.INFRA_RESOURCE_UPDATE)
  async deleteResource(
    @Req() req: any,
    @Param("id") id: string,
    @Query("hard") hard?: string,
    @Query("reason") reason?: string,
  ) {
    const hardBool = parseBool(hard) === true;

    if (!hardBool) {
      const r = String(reason ?? "").trim();
      if (!r) throw new BadRequestException("Deactivation reason is required.");
      return this.svc.deactivateResource(this.principal(req), id, { hard: false, reason: r });
    }

    return this.svc.deactivateResource(this.principal(req), id, { hard: true });
  }
}
