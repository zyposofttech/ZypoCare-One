import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Principal } from "../../auth/access-policy.service";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { NabhService } from "./nabh.service";
import { NabhSeedService } from "./nabh-seed.service";
import {
  CreateNabhTemplateDto,
  CreateNabhTemplateItemDto,
  UpdateNabhItemDto,
  CreateAuditCycleDto,
  UpdateAuditCycleDto,
  CreateFindingDto,
  UpdateFindingDto,
  CreateCapaDto,
  UpdateCapaDto,
} from "./dto/nabh.dto";

@ApiTags("compliance/nabh")
@Controller("compliance/nabh")
export class NabhController {
  constructor(
    private readonly svc: NabhService,
    private readonly seedSvc: NabhSeedService,
  ) {}

  private principal(req: any): Principal {
    return req.principal as Principal;
  }

  // ────────────────────────────── Seed ──────────────────────────────

  @Post("seed")
  @Permissions(PERM.COMPLIANCE_NABH_TEMPLATE)
  async seedTemplate(@Req() req: any, @Body("orgId") orgId: string) {
    if (!orgId) {
      // Resolve orgId from principal's branch
      const p = this.principal(req);
      const branch = await (this.svc as any).ctx.prisma.branch.findUnique({
        where: { id: p.branchId ?? undefined },
        select: { organizationId: true },
      });
      orgId = branch?.organizationId ?? "DEFAULT";
    }
    return this.seedSvc.seed(orgId);
  }

  // ────────────────────────────── Seed Preview ──────────────────────────────

  @Get("seed/preview")
  @Permissions(PERM.COMPLIANCE_NABH_TEMPLATE)
  async seedPreview() {
    return this.seedSvc.getItemDefinitions();
  }

  // ────────────────────────────── Templates ──────────────────────────────

  @Get("templates")
  @Permissions(PERM.COMPLIANCE_NABH_TEMPLATE)
  async listTemplates(
    @Req() req: any,
    @Query("orgId") orgId?: string,
    @Query("active") active?: string,
    @Query("cursor") cursor?: string,
    @Query("take") take?: string,
  ) {
    return this.svc.listTemplates(this.principal(req), {
      orgId,
      active: active !== undefined ? active === "true" : undefined,
      cursor,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Post("templates")
  @Permissions(PERM.COMPLIANCE_NABH_TEMPLATE)
  async createTemplate(@Req() req: any, @Body() dto: CreateNabhTemplateDto) {
    return this.svc.createTemplate(this.principal(req), dto);
  }

  @Post("templates/:templateId/items")
  @Permissions(PERM.COMPLIANCE_NABH_TEMPLATE)
  async addTemplateItem(
    @Req() req: any,
    @Param("templateId") templateId: string,
    @Body() dto: CreateNabhTemplateItemDto,
  ) {
    dto.templateId = templateId;
    return this.svc.addTemplateItem(this.principal(req), dto);
  }

  @Post("templates/:templateId/clone-to-workspace")
  @Permissions(PERM.COMPLIANCE_NABH_TEMPLATE)
  async cloneToWorkspace(
    @Req() req: any,
    @Param("templateId") templateId: string,
    @Body("workspaceId") workspaceId: string,
  ) {
    return this.svc.cloneTemplateToWorkspace(this.principal(req), templateId, workspaceId);
  }

  // ────────────────────────────── Initialize (Seed + Clone) ──────────────────────────────

  @Post("initialize")
  @Permissions(PERM.COMPLIANCE_NABH_TEMPLATE)
  async initializeChecklist(
    @Req() req: any,
    @Body("workspaceId") workspaceId: string,
  ) {
    if (!workspaceId) throw new BadRequestException("workspaceId is required");
    return this.svc.initializeChecklist(this.principal(req), workspaceId, this.seedSvc);
  }

  // ────────────────────────────── Workspace Items ──────────────────────────────

  @Get("items")
  @Permissions(PERM.COMPLIANCE_NABH_ITEM_UPDATE)
  async listItems(
    @Req() req: any,
    @Query("workspaceId") workspaceId?: string,
    @Query("branchId") branchId?: string,
    @Query("chapter") chapter?: string,
    @Query("status") status?: string,
    @Query("ownerStaffId") ownerStaffId?: string,
    @Query("cursor") cursor?: string,
    @Query("take") take?: string,
  ) {
    return this.svc.listItems(this.principal(req), {
      workspaceId,
      branchId,
      chapter,
      status,
      ownerStaffId,
      cursor,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  // ────────────────────────────── Chapter Summary ──────────────────────────────
  // IMPORTANT: Static routes like "items/chapter-summary" MUST be defined
  // BEFORE parameterized routes like "items/:itemId", otherwise NestJS will
  // match "chapter-summary" as an :itemId parameter.

  @Get("chapters/summary")
  @Permissions(PERM.COMPLIANCE_NABH_ITEM_UPDATE)
  async chapterSummary(
    @Req() req: any,
    @Query("workspaceId") workspaceId: string,
  ) {
    return this.svc.getChapterSummary(this.principal(req), workspaceId);
  }

  @Get("items/chapter-summary")
  @Permissions(PERM.COMPLIANCE_NABH_ITEM_UPDATE)
  async chapterSummaryAlias(
    @Req() req: any,
    @Query("workspaceId") workspaceId: string,
  ) {
    return this.svc.getChapterSummary(this.principal(req), workspaceId);
  }

  // ────────────────────────────── Item by ID (parameterized — must come after static routes) ──

  @Get("items/:itemId")
  @Permissions(PERM.COMPLIANCE_NABH_ITEM_UPDATE)
  async getItem(@Req() req: any, @Param("itemId") itemId: string) {
    return this.svc.getItem(this.principal(req), itemId);
  }

  @Patch("items/:itemId")
  @Permissions(PERM.COMPLIANCE_NABH_ITEM_UPDATE)
  async updateItem(
    @Req() req: any,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateNabhItemDto,
  ) {
    return this.svc.updateItem(this.principal(req), itemId, dto);
  }

  @Post("items/:itemId/verify")
  @Permissions(PERM.COMPLIANCE_NABH_ITEM_VERIFY)
  async verifyItem(@Req() req: any, @Param("itemId") itemId: string) {
    return this.svc.verifyItem(this.principal(req), itemId);
  }

  // ────────────────────────────── Audit Cycles ──────────────────────────────

  @Get("audits")
  @Permissions(PERM.COMPLIANCE_NABH_AUDIT)
  async listAuditCycles(
    @Req() req: any,
    @Query("workspaceId") workspaceId?: string,
    @Query("status") status?: string,
    @Query("cursor") cursor?: string,
    @Query("take") take?: string,
  ) {
    return this.svc.listAuditCycles(this.principal(req), {
      workspaceId,
      status,
      cursor,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get("audits/:auditId")
  @Permissions(PERM.COMPLIANCE_NABH_AUDIT)
  async getAuditCycle(@Param("auditId") auditId: string, @Req() req: any) {
    return this.svc.getAuditCycle(this.principal(req), auditId);
  }

  @Post("audits")
  @Permissions(PERM.COMPLIANCE_NABH_AUDIT)
  async createAuditCycle(@Req() req: any, @Body() dto: CreateAuditCycleDto) {
    return this.svc.createAuditCycle(this.principal(req), dto);
  }

  @Patch("audits/:auditId")
  @Permissions(PERM.COMPLIANCE_NABH_AUDIT)
  async updateAuditCycle(
    @Req() req: any,
    @Param("auditId") auditId: string,
    @Body() dto: UpdateAuditCycleDto,
  ) {
    return this.svc.updateAuditCycle(this.principal(req), auditId, dto);
  }

  // ────────────────────────────── Findings ──────────────────────────────

  @Post("audits/:auditId/findings")
  @Permissions(PERM.COMPLIANCE_NABH_FINDING)
  async createFinding(
    @Req() req: any,
    @Param("auditId") auditId: string,
    @Body() dto: CreateFindingDto,
  ) {
    dto.auditId = auditId;
    return this.svc.createFinding(this.principal(req), dto);
  }

  @Get("findings/:findingId")
  @Permissions(PERM.COMPLIANCE_NABH_FINDING)
  async getFinding(@Param("findingId") findingId: string, @Req() req: any) {
    return this.svc.getFinding(this.principal(req), findingId);
  }

  @Patch("findings/:findingId")
  @Permissions(PERM.COMPLIANCE_NABH_FINDING)
  async updateFinding(
    @Req() req: any,
    @Param("findingId") findingId: string,
    @Body() dto: UpdateFindingDto,
  ) {
    return this.svc.updateFinding(this.principal(req), findingId, dto);
  }

  // ────────────────────────────── CAPA ──────────────────────────────

  @Post("findings/:findingId/capa")
  @Permissions(PERM.COMPLIANCE_NABH_CAPA)
  async createCapa(
    @Req() req: any,
    @Param("findingId") findingId: string,
    @Body() dto: CreateCapaDto,
  ) {
    dto.findingId = findingId;
    return this.svc.createCapa(this.principal(req), dto);
  }

  @Get("capa/:capaId")
  @Permissions(PERM.COMPLIANCE_NABH_CAPA)
  async getCapa(@Param("capaId") capaId: string, @Req() req: any) {
    return this.svc.getCapa(this.principal(req), capaId);
  }

  @Patch("capa/:capaId")
  @Permissions(PERM.COMPLIANCE_NABH_CAPA)
  async updateCapa(
    @Req() req: any,
    @Param("capaId") capaId: string,
    @Body() dto: UpdateCapaDto,
  ) {
    return this.svc.updateCapa(this.principal(req), capaId, dto);
  }
}
