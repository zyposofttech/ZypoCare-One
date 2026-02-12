import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  DefaultValuePipe,
  ParseIntPipe,
} from "@nestjs/common";
import { TherapeuticSubstitutionService } from "./therapeutic-substitution.service";
import { CreateTherapeuticSubstitutionDto, UpdateTherapeuticSubstitutionDto } from "./dto/create-therapeutic-substitution.dto";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";

@Controller(["infrastructure/pharmacy", "infra/pharmacy"])
export class TherapeuticSubstitutionController {
  constructor(private readonly service: TherapeuticSubstitutionService) {}

  private principal(req: any) {
    return req.principal;
  }

  @Get("substitutions")
  @Permissions(PERM.INFRA_PHARMACY_FORMULARY_READ)
  async listSubstitutions(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("sourceDrugId") sourceDrugId?: string,
    @Query("isActive", new DefaultValuePipe(undefined)) isActive?: string,
    @Query("q") q?: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query("pageSize", new DefaultValuePipe(50), ParseIntPipe) pageSize?: number
  ) {
    const isActiveBool = isActive !== undefined ? isActive === "true" : undefined;

    return this.service.listSubstitutions(this.principal(req), {
      branchId,
      sourceDrugId,
      isActive: isActiveBool,
      q,
      page,
      pageSize,
    });
  }

  @Get("substitutions/alternatives")
  @Permissions(PERM.INFRA_PHARMACY_FORMULARY_READ)
  async getAlternatives(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("drugId") drugId?: string
  ) {
    if (!drugId) {
      throw new Error("drugId query parameter is required");
    }

    return this.service.getAlternatives(this.principal(req), {
      branchId,
      drugId,
    });
  }

  @Post("substitutions")
  @Permissions(PERM.INFRA_PHARMACY_FORMULARY_UPDATE)
  async createSubstitution(
    @Req() req: any,
    @Body() dto: CreateTherapeuticSubstitutionDto,
    @Query("branchId") branchId?: string
  ) {
    return this.service.createSubstitution(this.principal(req), dto, branchId);
  }

  @Patch("substitutions/:id")
  @Permissions(PERM.INFRA_PHARMACY_FORMULARY_UPDATE)
  async updateSubstitution(
    @Req() req: any,
    @Param("id") id: string,
    @Body() dto: UpdateTherapeuticSubstitutionDto
  ) {
    return this.service.updateSubstitution(this.principal(req), id, dto);
  }

  @Delete("substitutions/:id")
  @Permissions(PERM.INFRA_PHARMACY_FORMULARY_UPDATE)
  async deleteSubstitution(@Req() req: any, @Param("id") id: string) {
    return this.service.deleteSubstitution(this.principal(req), id);
  }
}
