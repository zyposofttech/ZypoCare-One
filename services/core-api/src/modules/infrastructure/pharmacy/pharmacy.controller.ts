import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { CreatePharmacyStoreDto, UpdatePharmacyStoreDto } from "./dto";
import { PharmacyService } from "./pharmacy.service";

@ApiTags("infrastructure/pharmacy")
@Controller(["infrastructure", "infra"])
export class PharmacyController {
  constructor(private readonly svc: PharmacyService) {}

  private principal(req: any) {
    return req.principal;
  }

  @Get("pharmacy/stores")
  @Permissions(PERM.INFRA_PHARMACY_STORE_READ)
  async listStores(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("storeType") storeType?: string,
    @Query("status") status?: string,
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.svc.listStores(this.principal(req), { branchId, storeType, status, q, page, pageSize });
  }

  @Get("pharmacy/stores/hierarchy")
  @Permissions(PERM.INFRA_PHARMACY_STORE_READ)
  async storeHierarchy(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.getStoreHierarchy(this.principal(req), branchId);
  }

  @Get("pharmacy/stores/summary")
  @Permissions(PERM.INFRA_PHARMACY_STORE_READ)
  async storeSummary(@Req() req: any, @Query("branchId") branchId?: string) {
    return this.svc.storeSummary(this.principal(req), branchId);
  }

  @Get("pharmacy/stores/:id")
  @Permissions(PERM.INFRA_PHARMACY_STORE_READ)
  async getStore(@Req() req: any, @Param("id") id: string) {
    return this.svc.getStore(this.principal(req), id);
  }

  @Post("pharmacy/stores")
  @Permissions(PERM.INFRA_PHARMACY_STORE_CREATE)
  async createStore(
    @Req() req: any,
    @Body() dto: CreatePharmacyStoreDto,
    @Query("branchId") branchId?: string,
  ) {
    return this.svc.createStore(this.principal(req), dto, branchId ?? null);
  }

  @Patch("pharmacy/stores/:id")
  @Permissions(PERM.INFRA_PHARMACY_STORE_UPDATE)
  async updateStore(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: UpdatePharmacyStoreDto,
  ) {
    return this.svc.updateStore(this.principal(req), id, dto);
  }

  @Patch("pharmacy/stores/:id/status")
  @Permissions(PERM.INFRA_PHARMACY_STORE_UPDATE)
  async updateStoreStatus(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: { status: string },
  ) {
    return this.svc.updateStoreStatus(this.principal(req), id, body.status);
  }

  @Get("pharmacy/stores/:id/license-history")
  @Permissions(PERM.INFRA_PHARMACY_STORE_READ)
  async listLicenseHistory(
    @Req() req: any,
    @Param("id") id: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.svc.listLicenseHistory(this.principal(req), id, { page, pageSize });
  }

  @Post("pharmacy/stores/:id/license-history")
  @Permissions(PERM.INFRA_PHARMACY_STORE_UPDATE)
  async addLicenseHistory(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: { licenseNumber: string; validFrom: string; validTo: string; documentUrl?: string },
  ) {
    return this.svc.addLicenseHistory(this.principal(req), id, body);
  }
}
