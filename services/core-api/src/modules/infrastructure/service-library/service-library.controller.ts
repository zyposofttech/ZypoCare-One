import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";

import { CreateCodeSetDto, CreateServiceCodeMappingDto, UpdateCodeSetDto, UpsertCodeEntryDto } from "./dto";
import { ServiceLibraryService } from "./service-library.service";

@ApiTags("infrastructure/service-library")
@Controller("infrastructure/service-library")
export class ServiceLibraryController {
  constructor(private readonly svc: ServiceLibraryService) {}

  private principal(req: any) {
    return req.principal;
  }

  // ---- Mappings (define before :id routes)
  @Get("mappings")
  @Permissions(PERM.INFRA_CODE_SET_READ)
  async listMappings(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("serviceItemId") serviceItemId?: string,
    @Query("codeSetId") codeSetId?: string,
    @Query("q") q?: string,
  ) {
    return this.svc.listMappings(this.principal(req), {
      branchId: branchId ?? null,
      serviceItemId: serviceItemId ?? null,
      codeSetId: codeSetId ?? null,
      q,
    });
  }

  @Post("mappings")
  @Permissions(PERM.INFRA_CODE_SET_UPDATE)
  async createMapping(@Req() req: any, @Body() dto: CreateServiceCodeMappingDto, @Query("branchId") branchId?: string) {
    return this.svc.createMapping(this.principal(req), dto, branchId ?? null);
  }

  @Delete("mappings/:id")
  @Permissions(PERM.INFRA_CODE_SET_UPDATE)
  async deleteMapping(@Req() req: any, @Param("id") id: string, @Query("branchId") branchId?: string) {
    return this.svc.deleteMapping(this.principal(req), id, branchId ?? null);
  }

  // ---- Code Sets
  @Post("code-sets")
  @Permissions(PERM.INFRA_CODE_SET_CREATE)
  async createCodeSet(@Req() req: any, @Body() dto: CreateCodeSetDto, @Query("branchId") branchId?: string) {
    return this.svc.createCodeSet(this.principal(req), dto, branchId ?? null);
  }

  @Get("code-sets")
  @Permissions(PERM.INFRA_CODE_SET_READ)
  async listCodeSets(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("q") q?: string,
    @Query("includeInactive") includeInactive?: string,
  ) {
    return this.svc.listCodeSets(this.principal(req), {
      branchId: branchId ?? null,
      q,
      includeInactive: includeInactive === "true",
    });
  }

  @Get("code-sets/:id")
  @Permissions(PERM.INFRA_CODE_SET_READ)
  async getCodeSet(@Req() req: any, @Param("id") id: string) {
    return this.svc.getCodeSet(this.principal(req), id);
  }

  @Patch("code-sets/:id")
  @Permissions(PERM.INFRA_CODE_SET_UPDATE)
  async updateCodeSet(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateCodeSetDto) {
    return this.svc.updateCodeSet(this.principal(req), id, dto);
  }

  // ---- Entries
  @Get("code-sets/:id/entries")
  @Permissions(PERM.INFRA_CODE_SET_READ)
  async listEntries(@Req() req: any, @Param("id") id: string, @Query("q") q?: string) {
    return this.svc.listEntries(this.principal(req), id, q);
  }

  @Post("code-sets/:id/entries")
  @Permissions(PERM.INFRA_CODE_SET_UPDATE)
  async upsertEntry(@Req() req: any, @Param("id") id: string, @Body() dto: UpsertCodeEntryDto) {
    return this.svc.upsertEntry(this.principal(req), id, dto);
  }

  @Delete("code-sets/:id/entries/:code")
  @Permissions(PERM.INFRA_CODE_SET_UPDATE)
  async deleteEntry(@Req() req: any, @Param("id") id: string, @Param("code") code: string) {
    return this.svc.deleteEntry(this.principal(req), id, code);
  }
}
