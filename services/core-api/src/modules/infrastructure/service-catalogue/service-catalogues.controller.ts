import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";

import {
  CreateServiceCatalogueDto,
  UpdateServiceCatalogueDto,
  UpsertServiceCatalogueItemDto,
  WorkflowNoteDto,
} from "./dto";
import { ServiceCataloguesService } from "./service-catalogues.service";

@ApiTags("infrastructure/service-catalogues")
@Controller("infrastructure/service-catalogues")
export class ServiceCataloguesController {
  constructor(private readonly svc: ServiceCataloguesService) {}

  private principal(req: any) {
    return req.principal;
  }

  @Post()
  @Permissions(PERM.INFRA_SERVICE_CATALOGUE_CREATE)
  async create(
    @Req() req: any,
    @Body() dto: CreateServiceCatalogueDto,
    @Query("branchId") branchId?: string,
  ) {
    return this.svc.create(this.principal(req), dto, branchId ?? null);
  }

  @Get()
  @Permissions(PERM.INFRA_SERVICE_CATALOGUE_READ)
  async list(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("q") q?: string,
    @Query("status") status?: string,
    @Query("includeInactive") includeInactive?: string,
  ) {
    return this.svc.list(this.principal(req), {
      branchId: branchId ?? null,
      q,
      status: status ?? null,
      includeInactive: includeInactive === "true",
    });
  }

  @Get(":id")
  @Permissions(PERM.INFRA_SERVICE_CATALOGUE_READ)
  async get(@Req() req: any, @Param("id") id: string) {
    return this.svc.get(this.principal(req), id);
  }

  @Patch(":id")
  @Permissions(PERM.INFRA_SERVICE_CATALOGUE_UPDATE)
  async update(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateServiceCatalogueDto) {
    return this.svc.update(this.principal(req), id, dto);
  }

  @Post(":id/items")
  @Permissions(PERM.INFRA_SERVICE_CATALOGUE_UPDATE)
  async upsertItem(@Req() req: any, @Param("id") id: string, @Body() dto: UpsertServiceCatalogueItemDto) {
    return this.svc.upsertItem(this.principal(req), id, dto);
  }

  @Delete(":id/items/:serviceItemId")
  @Permissions(PERM.INFRA_SERVICE_CATALOGUE_UPDATE)
  async removeItem(@Req() req: any, @Param("id") id: string, @Param("serviceItemId") serviceItemId: string) {
    return this.svc.removeItem(this.principal(req), id, serviceItemId);
  }

  // -------- Workflow
  @Post(":id/workflow/submit")
  @Permissions(PERM.INFRA_SERVICE_CATALOGUE_PUBLISH)
  async submit(@Req() req: any, @Param("id") id: string, @Body() dto: WorkflowNoteDto) {
    return this.svc.submit(this.principal(req), id, dto?.note);
  }

  @Post(":id/workflow/approve")
  @Permissions(PERM.INFRA_SERVICE_CATALOGUE_PUBLISH)
  async approve(@Req() req: any, @Param("id") id: string, @Body() dto: WorkflowNoteDto) {
    return this.svc.approve(this.principal(req), id, dto?.note);
  }

  @Post(":id/workflow/publish")
  @Permissions(PERM.INFRA_SERVICE_CATALOGUE_PUBLISH)
  async publish(@Req() req: any, @Param("id") id: string, @Body() dto: WorkflowNoteDto) {
    return this.svc.publish(this.principal(req), id, dto?.note);
  }

  @Post(":id/workflow/retire")
  @Permissions(PERM.INFRA_SERVICE_CATALOGUE_PUBLISH)
  async retire(@Req() req: any, @Param("id") id: string, @Body() dto: WorkflowNoteDto) {
    return this.svc.retire(this.principal(req), id, dto?.note);
  }

  @Get(":id/versions")
  @Permissions(PERM.INFRA_SERVICE_CATALOGUE_READ)
  async versions(@Req() req: any, @Param("id") id: string) {
    return this.svc.versions(this.principal(req), id);
  }
}
