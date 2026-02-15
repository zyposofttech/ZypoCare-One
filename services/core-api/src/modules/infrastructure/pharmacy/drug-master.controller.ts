import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { BulkSetAntibioticStewardshipDto, BulkSetHighAlertDto, CreateDrugDto, UpdateDrugDto } from "./dto";
import { DrugMasterService } from "./drug-master.service";

@ApiTags("infrastructure/pharmacy/drugs")
@Controller(["infrastructure", "infra"])
export class DrugMasterController {
  constructor(private readonly svc: DrugMasterService) {}

  private principal(req: any) {
    return req.principal;
  }

  @Get("pharmacy/drugs")
  @Permissions(PERM.INFRA_PHARMACY_DRUG_READ)
  async listDrugs(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("q") q?: string,
    @Query("category") category?: string,
    @Query("route") route?: string,
    @Query("scheduleClass") scheduleClass?: string,
    @Query("formularyStatus") formularyStatus?: string,
    @Query("status") status?: string,
    @Query("isNarcotic") isNarcotic?: string,
    @Query("isHighAlert") isHighAlert?: string,
    @Query("isLasa") isLasa?: string,
    @Query("isAntibiotic") isAntibiotic?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.svc.listDrugs(this.principal(req), {
      branchId,
      q,
      category,
      route,
      scheduleClass,
      formularyStatus,
      status,
      isNarcotic: isNarcotic === "true" ? true : undefined,
      isHighAlert: isHighAlert === "true" ? true : undefined,
      isLasa: isLasa === "true" ? true : undefined,
      isAntibiotic: isAntibiotic === "true" ? true : undefined,
      page,
      pageSize,
    });
  }

  @Get("pharmacy/drugs/summary")
  @Permissions(PERM.INFRA_PHARMACY_DRUG_READ)
  async drugSummary(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.drugSummary(this.principal(req), branchId);
  }

  @Get("pharmacy/drugs/:id")
  @Permissions(PERM.INFRA_PHARMACY_DRUG_READ)
  async getDrug(@Req() req: any, @Param("id") id: string) {
    return this.svc.getDrug(this.principal(req), id);
  }

  @Post("pharmacy/drugs")
  @Permissions(PERM.INFRA_PHARMACY_DRUG_CREATE)
  async createDrug(
    @Req() req: any,
    @Body() dto: CreateDrugDto,
    @Query("branchId") branchId?: string,
  ) {
    return this.svc.createDrug(this.principal(req), dto, branchId ?? null);
  }

  @Patch("pharmacy/drugs/:id")
  @Permissions(PERM.INFRA_PHARMACY_DRUG_UPDATE)
  async updateDrug(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateDrugDto) {
    return this.svc.updateDrug(this.principal(req), id, dto);
  }

  @Post("pharmacy/drugs/bulk-import")
  @Permissions(PERM.INFRA_PHARMACY_DRUG_CREATE)
  async bulkImportDrugs(
    @Req() req: any,
    @Body() body: { rows: any[] },
    @Query("branchId") branchId?: string,
  ) {
    return this.svc.bulkImportDrugs(this.principal(req), body.rows ?? [], branchId ?? null);
  }

  // --- Epic 3 add-ons (US-PH-023, US-PH-021 readiness) ---

  @Post("pharmacy/drugs/high-alert/bulk-set")
  @Permissions(PERM.INFRA_PHARMACY_DRUG_UPDATE)
  async bulkSetHighAlert(
    @Req() req: any,
    @Body() dto: BulkSetHighAlertDto,
    @Query("branchId") branchId?: string,
  ) {
    return this.svc.bulkSetHighAlert(this.principal(req), dto, branchId ?? null);
  }

  @Post("pharmacy/drugs/antibiotic-stewardship/bulk-set")
  @Permissions(PERM.INFRA_PHARMACY_DRUG_UPDATE)
  async bulkSetAntibioticStewardship(
    @Req() req: any,
    @Body() dto: BulkSetAntibioticStewardshipDto,
    @Query("branchId") branchId?: string,
  ) {
    return this.svc.bulkSetAntibioticStewardship(this.principal(req), dto, branchId ?? null);
  }
}
