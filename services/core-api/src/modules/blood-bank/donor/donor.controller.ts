import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { DonorService } from "./donor.service";
import { CreateDonorDto, UpdateDonorDto, SubmitScreeningDto, DeferDonorDto, RecordConsentDto } from "./dto";

@ApiTags("blood-bank/donors")
@Controller("blood-bank")
export class DonorController {
  constructor(private readonly svc: DonorService) {}

  private principal(req: any) { return req.principal; }

  @Get("donors")
  @Permissions(PERM.BB_DONOR_READ)
  list(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("q") q?: string,
    @Query("bloodGroup") bloodGroup?: string,
    @Query("status") status?: string,
    @Query("take") take?: string,
  ) {
    return this.svc.list(this.principal(req), { branchId: branchId ?? null, q, bloodGroup, status, take: take ? Number(take) : undefined });
  }

  @Get("donors/:id")
  @Permissions(PERM.BB_DONOR_READ)
  get(@Req() req: any, @Param("id") id: string) {
    return this.svc.get(this.principal(req), id);
  }

  @Post("donors")
  @Permissions(PERM.BB_DONOR_CREATE)
  create(@Req() req: any, @Body() dto: CreateDonorDto) {
    return this.svc.create(this.principal(req), dto);
  }

  @Patch("donors/:id")
  @Permissions(PERM.BB_DONOR_UPDATE)
  update(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateDonorDto) {
    return this.svc.update(this.principal(req), id, dto);
  }

  @Post("donors/:id/screening")
  @Permissions(PERM.BB_DONOR_UPDATE)
  screening(@Req() req: any, @Param("id") id: string, @Body() dto: SubmitScreeningDto) {
    return this.svc.submitScreening(this.principal(req), id, dto);
  }

  @Post("donors/:id/defer")
  @Permissions(PERM.BB_DONOR_DEFER)
  defer(@Req() req: any, @Param("id") id: string, @Body() dto: DeferDonorDto) {
    return this.svc.deferDonor(this.principal(req), id, dto);
  }

  @Get("donors/:id/deferrals")
  @Permissions(PERM.BB_DONOR_READ)
  deferrals(@Req() req: any, @Param("id") id: string) {
    return this.svc.getDeferrals(this.principal(req), id);
  }

  @Post("donors/:id/consent")
  @Permissions(PERM.BB_DONOR_UPDATE)
  consent(@Req() req: any, @Param("id") id: string, @Body() dto: RecordConsentDto) {
    return this.svc.recordConsent(this.principal(req), id, dto);
  }
}
