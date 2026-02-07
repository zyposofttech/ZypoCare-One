import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { parseBool } from "../../../common/http.util";

// IMPORTANT: runtime imports (NOT `import type`)
import { CreateUnitRoomDto } from "./dto/create-unit-room.dto";
import { UpdateUnitRoomDto } from "./dto/update-unit-room.dto";

import { RoomsService } from "./rooms.service";

@ApiTags("infrastructure/rooms")
@Controller(["infrastructure", "infra"])
export class RoomsController {
  constructor(private readonly svc: RoomsService) {}

  private principal(req: any) {
    return req.principal;
  }

  @Get("rooms")
  @Permissions(PERM.INFRA_ROOM_READ)
  async listRooms(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("unitId") unitId?: string,
    @Query("includeInactive") includeInactive?: string,
  ) {
    return this.svc.listRooms(this.principal(req), {
      branchId: branchId ?? null,
      unitId: unitId ?? null,
      includeInactive: includeInactive === "true",
    });
  }

  @Get("rooms/:id")
  @Permissions(PERM.INFRA_ROOM_READ)
  getRoom(@Req() req: any, @Param("id") id: string) {
    return this.svc.getRoom(this.principal(req), id);
  }

  @Post("rooms")
  @Permissions(PERM.INFRA_ROOM_CREATE)
  async createRoom(@Req() req: any, @Body() dto: CreateUnitRoomDto) {
    return this.svc.createRoom(this.principal(req), dto);
  }

  @Patch("rooms/:id")
  @Permissions(PERM.INFRA_ROOM_UPDATE)
  async updateRoom(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateUnitRoomDto) {
    return this.svc.updateRoom(this.principal(req), id, dto);
  }

  /**
   * ✅ Preferred endpoint for UI
   * POST /infra/rooms/:id/deactivate
   * body: { cascade?: boolean; reason: string; hard?: boolean }
   */
  @Post("rooms/:id/deactivate")
  @Permissions(PERM.INFRA_ROOM_UPDATE)
  async deactivateRoom(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: { cascade?: boolean; reason?: string; hard?: boolean },
  ) {
    const hard = body?.hard === true;
    const cascade = body?.cascade !== false; // default true

    if (!hard) {
      const reason = String(body?.reason ?? "").trim();
      if (!reason) throw new BadRequestException("Deactivation reason is required.");
      return this.svc.deactivateRoom(this.principal(req), id, { hard: false, cascade, reason });
    }

    return this.svc.deactivateRoom(this.principal(req), id, { hard: true, cascade });
  }

  /**
   * ✅ Backward compatible endpoint
   * DELETE /infra/rooms/:id?hard=false&cascade=true&reason=...
   * Note: reason REQUIRED when hard=false.
   */
  @Delete("rooms/:id")
  @Permissions(PERM.INFRA_ROOM_UPDATE)
  async deleteRoom(
    @Req() req: any,
    @Param("id") id: string,
    @Query("hard") hard?: string,
    @Query("cascade") cascade?: string,
    @Query("reason") reason?: string,
  ) {
    const hardParsed = parseBool(hard);
    const hardBool = hardParsed === true;

    const cascadeParsed = parseBool(cascade);
    const cascadeBool = cascade == null ? true : (cascadeParsed ?? true);

    if (!hardBool) {
      const r = String(reason ?? "").trim();
      if (!r) throw new BadRequestException("Deactivation reason is required.");
      return this.svc.deactivateRoom(this.principal(req), id, { hard: false, cascade: cascadeBool, reason: r });
    }

    return this.svc.deactivateRoom(this.principal(req), id, { hard: true, cascade: cascadeBool });
  }
}
