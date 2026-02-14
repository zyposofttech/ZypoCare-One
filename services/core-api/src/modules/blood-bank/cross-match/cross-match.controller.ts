import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { CrossMatchService } from "./cross-match.service";
import { CreateRequestDto, RegisterSampleDto, RecordCrossMatchDto, ElectronicXMDto } from "./dto";

@ApiTags("blood-bank/requests")
@Controller("blood-bank")
export class CrossMatchController {
  constructor(private readonly svc: CrossMatchService) {}

  private principal(req: any) { return req.principal; }

  @Get("requests")
  @Permissions(PERM.BB_REQUEST_READ)
  listRequests(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("status") status?: string,
    @Query("urgency") urgency?: string,
  ) {
    return this.svc.listRequests(this.principal(req), { branchId: branchId ?? null, status, urgency });
  }

  @Get("requests/:id")
  @Permissions(PERM.BB_REQUEST_READ)
  getRequest(@Req() req: any, @Param("id") id: string) {
    return this.svc.getRequest(this.principal(req), id);
  }

  @Post("requests")
  @Permissions(PERM.BB_REQUEST_CREATE)
  createRequest(@Req() req: any, @Body() dto: CreateRequestDto) {
    return this.svc.createRequest(this.principal(req), dto);
  }

  @Post("requests/:id/sample")
  @Permissions(PERM.BB_CROSSMATCH_CREATE)
  registerSample(@Req() req: any, @Param("id") requestId: string, @Body() dto: RegisterSampleDto) {
    return this.svc.registerSample(this.principal(req), requestId, dto);
  }

  @Post("requests/:id/grouping")
  @Permissions(PERM.BB_CROSSMATCH_CREATE)
  patientGrouping(@Req() req: any, @Param("id") requestId: string, @Body() dto: any) {
    return this.svc.patientGrouping(this.principal(req), requestId, dto);
  }

  @Post("requests/:id/cross-match")
  @Permissions(PERM.BB_CROSSMATCH_CREATE)
  crossMatch(@Req() req: any, @Param("id") requestId: string, @Body() dto: RecordCrossMatchDto) {
    return this.svc.recordCrossMatch(this.principal(req), requestId, dto);
  }

  @Post("requests/:id/electronic-xm")
  @Permissions(PERM.BB_CROSSMATCH_CREATE)
  electronicXM(@Req() req: any, @Param("id") requestId: string, @Body() dto: ElectronicXMDto) {
    return this.svc.electronicCrossMatch(this.principal(req), requestId, dto);
  }

  @Get("requests/:id/certificate")
  @Permissions(PERM.BB_CROSSMATCH_READ)
  certificate(@Req() req: any, @Param("id") requestId: string) {
    return this.svc.getCertificate(this.principal(req), requestId);
  }

  @Get("requests/suggestions/:id")
  @Permissions(PERM.BB_CROSSMATCH_READ)
  suggestions(@Req() req: any, @Param("id") requestId: string) {
    return this.svc.suggestCompatibleUnits(this.principal(req), requestId);
  }
}
