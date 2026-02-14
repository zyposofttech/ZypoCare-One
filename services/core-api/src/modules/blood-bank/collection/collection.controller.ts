import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { CollectionService } from "./collection.service";
import { StartCollectionDto, EndCollectionDto, RecordAdverseEventDto, RecordPilotTubesDto, RecordSeparationDto } from "./dto";

@ApiTags("blood-bank/collection")
@Controller("blood-bank")
export class CollectionController {
  constructor(private readonly svc: CollectionService) {}

  private principal(req: any) { return req.principal; }

  @Get("collection/worklist")
  @Permissions(PERM.BB_COLLECTION_READ)
  worklist(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.worklist(this.principal(req), branchId ?? null);
  }

  @Post("collection/start")
  @Permissions(PERM.BB_COLLECTION_CREATE)
  start(@Req() req: any, @Body() dto: StartCollectionDto) {
    return this.svc.startCollection(this.principal(req), dto);
  }

  @Post("collection/:unitId/end")
  @Permissions(PERM.BB_COLLECTION_UPDATE)
  end(@Req() req: any, @Param("unitId") unitId: string, @Body() dto: EndCollectionDto) {
    return this.svc.endCollection(this.principal(req), unitId, dto);
  }

  @Post("collection/:unitId/adverse-event")
  @Permissions(PERM.BB_COLLECTION_UPDATE)
  adverseEvent(@Req() req: any, @Param("unitId") unitId: string, @Body() dto: RecordAdverseEventDto) {
    return this.svc.recordAdverseEvent(this.principal(req), unitId, dto);
  }

  @Post("collection/:unitId/pilot-tubes")
  @Permissions(PERM.BB_COLLECTION_UPDATE)
  pilotTubes(@Req() req: any, @Param("unitId") unitId: string, @Body() dto: RecordPilotTubesDto) {
    return this.svc.recordPilotTubes(this.principal(req), unitId, dto);
  }

  @Get("separation/worklist")
  @Permissions(PERM.BB_COLLECTION_READ)
  separationWorklist(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.separationWorklist(this.principal(req), branchId ?? null);
  }

  @Post("separation")
  @Permissions(PERM.BB_COLLECTION_CREATE)
  separate(@Req() req: any, @Body() dto: RecordSeparationDto) {
    return this.svc.recordSeparation(this.principal(req), dto);
  }

  @Get("separation/alerts")
  @Permissions(PERM.BB_COLLECTION_READ)
  separationAlerts(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.separationAlerts(this.principal(req), branchId ?? null);
  }
}
