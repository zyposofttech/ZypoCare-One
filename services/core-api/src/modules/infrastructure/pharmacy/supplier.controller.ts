import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { BulkImportSuppliersDto, CreateSupplierDto, UpdateSupplierDto, UpsertDrugMappingsDto } from "./dto";
import { SupplierService } from "./supplier.service";

@ApiTags("infrastructure/pharmacy/suppliers")
@Controller(["infrastructure", "infra"])
export class SupplierController {
  constructor(private readonly svc: SupplierService) {}

  private principal(req: any) {
    return req.principal;
  }

  @Get("pharmacy/suppliers")
  @Permissions(PERM.INFRA_PHARMACY_SUPPLIER_READ)
  async listSuppliers(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("status") status?: string,
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.svc.listSuppliers(this.principal(req), { branchId, status, q, page, pageSize });
  }

  @Get("pharmacy/suppliers/:id")
  @Permissions(PERM.INFRA_PHARMACY_SUPPLIER_READ)
  async getSupplier(@Req() req: any, @Param("id") id: string) {
    return this.svc.getSupplier(this.principal(req), id);
  }

  @Post("pharmacy/suppliers")
  @Permissions(PERM.INFRA_PHARMACY_SUPPLIER_CREATE)
  async createSupplier(
    @Req() req: any,
    @Body() dto: CreateSupplierDto,
    @Query("branchId") branchId?: string,
  ) {
    return this.svc.createSupplier(this.principal(req), dto, branchId ?? null);
  }

  @Patch("pharmacy/suppliers/:id")
  @Permissions(PERM.INFRA_PHARMACY_SUPPLIER_UPDATE)
  async updateSupplier(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.svc.updateSupplier(this.principal(req), id, dto);
  }

  @Post("pharmacy/suppliers/:id/store-mappings")
  @Permissions(PERM.INFRA_PHARMACY_SUPPLIER_UPDATE)
  async mapSupplierToStores(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: { storeIds: string[] },
  ) {
    return this.svc.mapSupplierToStores(this.principal(req), id, body.storeIds ?? []);
  }

  // ---- Drug mapping endpoints ----

  @Get("pharmacy/suppliers/:id/drugs")
  @Permissions(PERM.INFRA_PHARMACY_SUPPLIER_READ)
  async listSupplierDrugs(@Req() req: any, @Param("id") id: string) {
    return this.svc.listSupplierDrugs(this.principal(req), id);
  }

  @Post("pharmacy/suppliers/:id/drug-mappings")
  @Permissions(PERM.INFRA_PHARMACY_SUPPLIER_UPDATE)
  async upsertDrugMappings(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: UpsertDrugMappingsDto,
  ) {
    return this.svc.upsertDrugMappings(this.principal(req), id, dto.mappings);
  }

  @Delete("pharmacy/suppliers/:id/drug-mappings/:mappingId")
  @Permissions(PERM.INFRA_PHARMACY_SUPPLIER_UPDATE)
  async removeDrugMapping(
    @Req() req: any,
    @Param("id") id: string,
    @Param("mappingId") mappingId: string,
  ) {
    return this.svc.removeDrugMapping(this.principal(req), id, mappingId);
  }

  // ---- Bulk import ----

  @Post("pharmacy/suppliers/bulk-import")
  @Permissions(PERM.INFRA_PHARMACY_SUPPLIER_CREATE)
  async bulkImportSuppliers(
    @Req() req: any,
    @Body() dto: BulkImportSuppliersDto,
  ) {
    return this.svc.bulkImportSuppliers(this.principal(req), dto);
  }
}
