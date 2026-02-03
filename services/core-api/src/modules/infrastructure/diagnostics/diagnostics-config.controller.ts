import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from "@nestjs/common";

import { AccessPolicyService } from "../../auth/access-policy.service";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";

import { DiagnosticsConfigService } from "./diagnostics-config.service";
import type { Principal } from "./diagnostics.principal";
import {
  CreateSectionDto,
  UpdateSectionDto,
  ListSectionsQuery,
  CreateCategoryDto,
  UpdateCategoryDto,
  ListCategoriesQuery,
  CreateSpecimenDto,
  UpdateSpecimenDto,
  ListSpecimensQuery,
  CreateDiagnosticItemDto,
  UpdateDiagnosticItemDto,
  ListItemsQuery,
  ReplacePanelItemsDto,
  CreateParameterDto,
  UpdateParameterDto,
  CreateReferenceRangeDto,
  UpdateReferenceRangeDto,
  CreateTemplateDto,
  UpdateTemplateDto,
} from "./dto";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("infrastructure/diagnostics")
@Controller("infrastructure/diagnostics")
export class DiagnosticsConfigController {
  constructor(
    private readonly svc: DiagnosticsConfigService,
    private readonly access: AccessPolicyService,
  ) {}

  private principalFrom(req: any): Principal {
    return (req?.principal ?? {}) as Principal;
  }

  private branchIdFrom(principal: Principal, branchId: string | null | undefined) {
    // Branch principals are hard-scoped (client branchId is ignored)
    return this.access.resolveBranchId(principal as any, branchId, { require: true }) as string;
  }

  // ---------------------- Sections ----------------------
  @Get("sections")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  listSections(@Req() req: any, @Query() q: ListSectionsQuery) {
    return this.svc.listSections(this.principalFrom(req), q);
  }

  @Post("sections")
  @Permissions(PERM.INFRA_DIAGNOSTICS_CREATE)
  createSection(@Req() req: any, @Body() dto: CreateSectionDto) {
    return this.svc.createSection(this.principalFrom(req), dto);
  }

  @Put("sections/:id")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  updateSection(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateSectionDto) {
    return this.svc.updateSection(this.principalFrom(req), id, dto);
  }

  @Delete("sections/:id")
  @Permissions(PERM.INFRA_DIAGNOSTICS_DELETE)
  deleteSection(@Req() req: any, @Param("id") id: string) {
    return this.svc.deleteSection(this.principalFrom(req), id);
  }

  // ---------------------- Categories ----------------------
  @Get("categories")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  listCategories(@Req() req: any, @Query() q: ListCategoriesQuery) {
    return this.svc.listCategories(this.principalFrom(req), q);
  }

  @Post("categories")
  @Permissions(PERM.INFRA_DIAGNOSTICS_CREATE)
  createCategory(@Req() req: any, @Body() dto: CreateCategoryDto) {
    return this.svc.createCategory(this.principalFrom(req), dto);
  }

  @Put("categories/:id")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  updateCategory(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return this.svc.updateCategory(this.principalFrom(req), id, dto);
  }

  @Delete("categories/:id")
  @Permissions(PERM.INFRA_DIAGNOSTICS_DELETE)
  deleteCategory(@Req() req: any, @Param("id") id: string) {
    return this.svc.deleteCategory(this.principalFrom(req), id);
  }

  // ---------------------- Specimens ----------------------
  @Get("specimens")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  listSpecimens(@Req() req: any, @Query() q: ListSpecimensQuery) {
    return this.svc.listSpecimens(this.principalFrom(req), q);
  }

  @Post("specimens")
  @Permissions(PERM.INFRA_DIAGNOSTICS_CREATE)
  createSpecimen(@Req() req: any, @Body() dto: CreateSpecimenDto) {
    return this.svc.createSpecimen(this.principalFrom(req), dto);
  }

  @Put("specimens/:id")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  updateSpecimen(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateSpecimenDto) {
    return this.svc.updateSpecimen(this.principalFrom(req), id, dto);
  }

  @Delete("specimens/:id")
  @Permissions(PERM.INFRA_DIAGNOSTICS_DELETE)
  deleteSpecimen(@Req() req: any, @Param("id") id: string) {
    return this.svc.deleteSpecimen(this.principalFrom(req), id);
  }

  // ---------------------- Items ----------------------
  @Get("items")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  listItems(@Req() req: any, @Query() q: ListItemsQuery) {
    return this.svc.listItems(this.principalFrom(req), q);
  }

  @Post("items")
  @Permissions(PERM.INFRA_DIAGNOSTICS_CREATE)
  createItem(@Req() req: any, @Body() dto: CreateDiagnosticItemDto) {
    return this.svc.createItem(this.principalFrom(req), dto);
  }

  @Put("items/:id")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  updateItem(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateDiagnosticItemDto) {
    return this.svc.updateItem(this.principalFrom(req), id, dto);
  }

  @Delete("items/:id")
  @Permissions(PERM.INFRA_DIAGNOSTICS_DELETE)
  deleteItem(@Req() req: any, @Param("id") id: string) {
    return this.svc.deleteItem(this.principalFrom(req), id);
  }

  // ---------------------- Panels ----------------------
  @Get("items/:id/panel-items")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  getPanelItems(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.getPanelItems(p, id, b);
  }

  @Put("items/:id/panel-items")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  replacePanelItems(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string, @Body() dto: ReplacePanelItemsDto) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.replacePanelItems(p, id, b, dto);
  }

  // ---------------------- Parameters (Lab) ----------------------
  @Get("items/:id/parameters")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  listParameters(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string, @Query("includeInactive") includeInactive?: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.listParameters(p, id, b, includeInactive === "true");
  }

  @Post("items/:id/parameters")
  @Permissions(PERM.INFRA_DIAGNOSTICS_CREATE)
  createParameter(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string, @Body() dto: CreateParameterDto) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.createParameter(p, id, dto, b);
  }

  @Put("parameters/:id")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  updateParameter(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateParameterDto) {
    return this.svc.updateParameter(this.principalFrom(req), id, dto);
  }

  @Delete("parameters/:id")
  @Permissions(PERM.INFRA_DIAGNOSTICS_DELETE)
  deleteParameter(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.deleteParameter(p, id, b);
  }

  // ---------------------- Reference ranges ----------------------
  @Get("parameters/:id/ranges")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  listRanges(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string, @Query("includeInactive") includeInactive?: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.listRanges(p, id, b, includeInactive === "true");
  }

  @Post("parameters/:id/ranges")
  @Permissions(PERM.INFRA_DIAGNOSTICS_CREATE)
  createRange(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string, @Body() dto: CreateReferenceRangeDto) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.createRange(p, id, dto, b);
  }

  @Put("ranges/:id")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  updateRange(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateReferenceRangeDto) {
    return this.svc.updateRange(this.principalFrom(req), id, dto);
  }

  @Delete("ranges/:id")
  @Permissions(PERM.INFRA_DIAGNOSTICS_DELETE)
  deleteRange(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.deleteRange(p, id, b);
  }

  // ---------------------- Templates (Imaging) ----------------------
  @Get("items/:id/templates")
  @Permissions(PERM.INFRA_DIAGNOSTICS_READ)
  listTemplates(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string, @Query("includeInactive") includeInactive?: string) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.listTemplates(p, id, b, includeInactive === "true");
  }

  @Post("items/:id/templates")
  @Permissions(PERM.INFRA_DIAGNOSTICS_CREATE)
  createTemplate(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId: string, @Body() dto: CreateTemplateDto) {
    const p = this.principalFrom(req);
    const b = this.branchIdFrom(p, branchId);
    return this.svc.createTemplate(p, id, dto, b);
  }

  @Put("templates/:id")
  @Permissions(PERM.INFRA_DIAGNOSTICS_UPDATE)
  updateTemplate(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateTemplateDto) {
    return this.svc.updateTemplate(this.principalFrom(req), id, dto);
  }

  @Delete("templates/:id")
  @Permissions(PERM.INFRA_DIAGNOSTICS_DELETE)
  deleteTemplate(@Req() req: any, @Param("id") id: string) {
    return this.svc.deleteTemplate(this.principalFrom(req), id);
  }

}
