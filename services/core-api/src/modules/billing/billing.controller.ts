import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../auth/permissions.decorator";
import type { Principal } from "../auth/access-policy.service";
import { PERM } from "../iam/iam.constants";
import { BillingService } from "./billing.service";
import {
  ActivateTariffPlanDto,
  CreateTariffPlanDto,
  UpdateTariffPlanDto,
  UpsertTariffRateDto,
  UpdateTariffRateDto,
  CreateTaxCodeDto,
  UpdateTaxCodeDto,
  SetDefaultTariffPlanDto,
} from "./dto";

@ApiTags("billing")
@Controller("billing")
export class BillingController {
  constructor(private readonly svc: BillingService) {}

  private principal(req: any): Principal {
    return req.principal;
  }

  // ---------------- Tariff Plans ----------------

  @Get("tariff-plans")
  @Permissions(PERM.INFRA_TARIFF_PLAN_READ)
  listPlans(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("kind") kind?: string,
    @Query("status") status?: string,
    @Query("q") q?: string,
    @Query("includeInactive") includeInactive?: string,
    @Query("includeRefs") includeRefs?: string,
    @Query("take") take?: string,
  ) {
    return this.svc.listTariffPlans(this.principal(req), {
      branchId: branchId ?? null,
      kind,
      status,
      q,
      includeInactive: includeInactive === "true",
      includeRefs: includeRefs === "true",
      take: take ? Number(take) : undefined,
    });
  }

  @Get("tariff-plans/:id")
  @Permissions(PERM.INFRA_TARIFF_PLAN_READ)
  getPlan(@Req() req: any, @Param("id") id: string) {
    return this.svc.getTariffPlan(this.principal(req), id);
  }

  @Post("tariff-plans")
  @Permissions(PERM.INFRA_TARIFF_PLAN_CREATE)
  createPlan(@Req() req: any, @Body() dto: CreateTariffPlanDto) {
    return this.svc.createTariffPlan(this.principal(req), dto);
  }

  @Patch("tariff-plans/:id")
  @Permissions(PERM.INFRA_TARIFF_PLAN_UPDATE)
  updatePlan(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateTariffPlanDto) {
    return this.svc.updateTariffPlan(this.principal(req), id, dto);
  }

  @Post("tariff-plans/:id/activate")
  @Permissions(PERM.INFRA_TARIFF_PLAN_UPDATE)
  activate(@Req() req: any, @Param("id") id: string, @Body() dto: ActivateTariffPlanDto) {
    return this.svc.activateTariffPlan(this.principal(req), id, dto);
  }

  @Post("tariff-plans/:id/retire")
  @Permissions(PERM.INFRA_TARIFF_PLAN_UPDATE)
  retire(@Req() req: any, @Param("id") id: string) {
    return this.svc.retireTariffPlan(this.principal(req), id);
  }

  @Post("tariff-plans/:id/default")
  @Permissions(PERM.INFRA_TARIFF_PLAN_UPDATE)
  setDefaultPlan(@Req() req: any, @Param("id") id: string, @Body() dto: SetDefaultTariffPlanDto) {
    return this.svc.setTariffPlanDefault(this.principal(req), id, dto);
  }

  // ---------------- Tariff Rates ----------------

  @Get("tariff-plans/:tariffPlanId/rates")
  @Permissions(PERM.INFRA_TARIFF_RATE_READ)
  listRates(
    @Req() req: any,
    @Param("tariffPlanId") tariffPlanId: string,
    @Query("chargeMasterItemId") chargeMasterItemId?: string,
    @Query("includeHistory") includeHistory?: string,
  ) {
    return this.svc.listTariffRates(this.principal(req), tariffPlanId, {
      chargeMasterItemId,
      includeHistory: includeHistory === "true",
    });
  }

  @Post("tariff-plans/:tariffPlanId/rates")
  @Permissions(PERM.INFRA_TARIFF_RATE_UPDATE)
  upsertRate(@Req() req: any, @Param("tariffPlanId") tariffPlanId: string, @Body() dto: UpsertTariffRateDto) {
    return this.svc.upsertTariffRate(this.principal(req), dto, tariffPlanId);
  }

  @Post("tariff-plans/:tariffPlanId/rates/close")
  @Permissions(PERM.INFRA_TARIFF_RATE_UPDATE)
  closeCurrentRate(
    @Req() req: any,
    @Param("tariffPlanId") tariffPlanId: string,
    @Query("chargeMasterItemId") chargeMasterItemId: string,
    @Query("effectiveTo") effectiveTo: string,
  ) {
    return this.svc.closeCurrentTariffRate(this.principal(req), tariffPlanId, chargeMasterItemId, effectiveTo);
  }

  @Get("tariff-rates")
  @Permissions(PERM.INFRA_TARIFF_RATE_READ)
  listRatesDirect(
    @Req() req: any,
    @Query("tariffPlanId") tariffPlanId: string,
    @Query("chargeMasterItemId") chargeMasterItemId?: string,
    @Query("includeHistory") includeHistory?: string,
    @Query("includeRefs") includeRefs?: string,
  ) {
    return this.svc.listTariffRates(this.principal(req), tariffPlanId, {
      chargeMasterItemId,
      includeHistory: includeHistory === "true",
      includeRefs: includeRefs === "true",
    });
  }

  @Post("tariff-rates")
  @Permissions(PERM.INFRA_TARIFF_RATE_UPDATE)
  upsertRateDirect(@Req() req: any, @Body() dto: UpsertTariffRateDto) {
    return this.svc.upsertTariffRate(this.principal(req), dto, dto.tariffPlanId);
  }

  @Patch("tariff-rates/:id")
  @Permissions(PERM.INFRA_TARIFF_RATE_UPDATE)
  updateRateById(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateTariffRateDto) {
    return this.svc.updateTariffRateById(this.principal(req), id, dto);
  }

  @Post("tariff-rates/:id/close")
  @Permissions(PERM.INFRA_TARIFF_RATE_UPDATE)
  closeRateById(@Req() req: any, @Param("id") id: string, @Query("effectiveTo") effectiveTo: string) {
    return this.svc.closeTariffRateById(this.principal(req), id, effectiveTo);
  }

  @Delete("tariff-rates/:id")
  @Permissions(PERM.INFRA_TARIFF_RATE_UPDATE)
  deactivateRateById(@Req() req: any, @Param("id") id: string) {
    return this.svc.deactivateTariffRateById(this.principal(req), id);
  }

  // -------- Legacy aliases (keeps older UI endpoints working)

  @Get("tariffs")
  @Permissions(PERM.INFRA_TARIFF_PLAN_READ)
  listPlansAlias(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.listTariffPlans(this.principal(req), { branchId: branchId ?? null });
  }

  @Post("tariffs")
  @Permissions(PERM.INFRA_TARIFF_PLAN_CREATE)
  createPlanAlias(@Req() req: any, @Body() dto: CreateTariffPlanDto) {
    return this.svc.createTariffPlan(this.principal(req), dto);
  }

  @Post("tariffs/rates")
  @Permissions(PERM.INFRA_TARIFF_RATE_UPDATE)
  upsertRateAlias(@Req() req: any, @Body() dto: UpsertTariffRateDto) {
    return this.svc.upsertTariffRate(this.principal(req), dto);
  }

  // ---------------- Tax Codes ----------------

  @Get("tax-codes")
  @Permissions(PERM.INFRA_TAX_CODE_READ)
  listTaxCodes(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("q") q?: string,
    @Query("includeInactive") includeInactive?: string,
    @Query("take") take?: string,
  ) {
    return this.svc.listTaxCodes(this.principal(req), {
      branchId: branchId ?? null,
      q,
      includeInactive: includeInactive === "true",
      take: take ? Number(take) : undefined,
    });
  }

  @Post("tax-codes")
  @Permissions(PERM.INFRA_TAX_CODE_CREATE)
  createTaxCode(@Req() req: any, @Body() dto: CreateTaxCodeDto, @Query("branchId") branchId?: string) {
    // UI sometimes sends branchId in body; allow both
    return this.svc.createTaxCode(this.principal(req), dto, branchId ?? null);
  }

  @Patch("tax-codes/:id")
  @Permissions(PERM.INFRA_TAX_CODE_UPDATE)
  updateTaxCode(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateTaxCodeDto) {
    return this.svc.updateTaxCode(this.principal(req), id, dto);
  }

  @Delete("tax-codes/:id")
  @Permissions(PERM.INFRA_TAX_CODE_UPDATE)
  deactivateTaxCode(@Req() req: any, @Param("id") id: string) {
    return this.svc.deactivateTaxCode(this.principal(req), id);
  }
}
