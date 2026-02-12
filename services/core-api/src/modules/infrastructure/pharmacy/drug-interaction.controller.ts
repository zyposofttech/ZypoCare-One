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
import { DrugInteractionService } from "./drug-interaction.service";
import {
  CreateDrugInteractionDto,
  UpdateDrugInteractionDto,
} from "./dto/create-drug-interaction.dto";

@Controller(["infrastructure/pharmacy", "infra/pharmacy"])
export class DrugInteractionController {
  constructor(private readonly service: DrugInteractionService) {}

  private principal(req: any) {
    return req.principal;
  }

  @Get("interactions")
  @Permissions(PERM.INFRA_PHARMACY_DRUG_READ)
  async listInteractions(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("drugId") drugId?: string,
    @Query("severity") severity?: string,
    @Query("source") source?: string,
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    return this.service.listInteractions(this.principal(req), {
      branchId,
      drugId,
      severity,
      source,
      q,
      page: page ? parseInt(page, 10) : undefined,
      pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get("interactions/:id")
  @Permissions(PERM.INFRA_PHARMACY_DRUG_READ)
  async getInteraction(@Req() req: any, @Param("id") id: string) {
    return this.service.getInteraction(this.principal(req), id);
  }

  @Post("interactions")
  @Permissions(PERM.INFRA_PHARMACY_DRUG_UPDATE)
  async createInteraction(
    @Req() req: any,
    @Body() dto: CreateDrugInteractionDto,
    @Query("branchId") branchId?: string
  ) {
    return this.service.createInteraction(this.principal(req), dto, branchId);
  }

  @Patch("interactions/:id")
  @Permissions(PERM.INFRA_PHARMACY_DRUG_UPDATE)
  async updateInteraction(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateDrugInteractionDto
  ) {
    return this.service.updateInteraction(this.principal(req), id, dto);
  }

  @Delete("interactions/:id")
  @Permissions(PERM.INFRA_PHARMACY_DRUG_UPDATE)
  async deleteInteraction(@Req() req: any, @Param("id") id: string) {
    return this.service.deleteInteraction(this.principal(req), id);
  }

  @Post("interactions/bulk-import")
  @Permissions(PERM.INFRA_PHARMACY_DRUG_UPDATE)
  async bulkImportInteractions(
    @Req() req: any,
    @Body("items") items: CreateDrugInteractionDto[],
    @Query("branchId") branchId?: string
  ) {
    return this.service.bulkImportInteractions(this.principal(req), items, branchId);
  }
}
