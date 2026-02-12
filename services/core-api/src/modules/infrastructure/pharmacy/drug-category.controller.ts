import {
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
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { DrugCategoryService } from "./drug-category.service";
import {
  CreateDrugCategoryDto,
  UpdateDrugCategoryDto,
} from "./dto/create-drug-category.dto";

@Controller(["infrastructure/pharmacy", "infra/pharmacy"])
export class DrugCategoryController {
  constructor(private readonly drugCategoryService: DrugCategoryService) {}

  private principal(req: any) {
    return req.principal;
  }

  @Get("drug-categories")
  @Permissions(PERM.INFRA_PHARMACY_DRUG_READ)
  async listCategories(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("parentId") parentId?: string,
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    return this.drugCategoryService.listCategories(this.principal(req), {
      branchId,
      parentId,
      q,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get("drug-categories/tree")
  @Permissions(PERM.INFRA_PHARMACY_DRUG_READ)
  async getCategoryTree(
    @Req() req: any,
    @Query("branchId") branchId?: string
  ) {
    return this.drugCategoryService.getCategoryTree(this.principal(req), {
      branchId,
    });
  }

  @Post("drug-categories")
  @Permissions(PERM.INFRA_PHARMACY_DRUG_UPDATE)
  async createCategory(
    @Req() req: any,
    @Body() dto: CreateDrugCategoryDto,
    @Query("branchId") branchId?: string
  ) {
    return this.drugCategoryService.createCategory(
      this.principal(req),
      dto,
      branchId
    );
  }

  @Patch("drug-categories/:id")
  @Permissions(PERM.INFRA_PHARMACY_DRUG_UPDATE)
  async updateCategory(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateDrugCategoryDto
  ) {
    return this.drugCategoryService.updateCategory(this.principal(req), id, dto);
  }

  @Delete("drug-categories/:id")
  @Permissions(PERM.INFRA_PHARMACY_DRUG_UPDATE)
  async deleteCategory(@Req() req: any, @Param("id") id: string) {
    return this.drugCategoryService.deleteCategory(this.principal(req), id);
  }
}
