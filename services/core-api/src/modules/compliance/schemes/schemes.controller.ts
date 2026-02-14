import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { ApiTags } from "@nestjs/swagger";
import * as fs from "fs";
import * as path from "path";
import type { Principal } from "../../auth/access-policy.service";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { SchemesService } from "./schemes.service";
import { SchemeSyncService } from "./scheme-sync.service";
import {
  CreateEmpanelmentDto,
  UpdateEmpanelmentDto,
  CreateRateCardDto,
  UpdateRateCardDto,
  UpdateRateCardItemDto,
  CreateMappingDto,
  UpdateMappingDto,
} from "./dto/schemes.dto";

const BULK_UPLOAD_DIR = path.join(process.cwd(), "uploads", "compliance", "scheme-bulk");

@ApiTags("compliance/schemes")
@Controller("compliance/schemes")
export class SchemesController {
  constructor(
    private readonly svc: SchemesService,
    private readonly syncSvc: SchemeSyncService,
  ) {}

  private principal(req: any): Principal {
    return req.principal as Principal;
  }

  // ============================================================ Summary

  @Get("summary")
  @Permissions(PERM.COMPLIANCE_SCHEME_EMPANEL)
  async getSummary(
    @Req() req: any,
    @Query("workspaceId") workspaceId: string,
  ) {
    return this.svc.getSummary(workspaceId);
  }

  // ============================================================ Empanelments

  @Get("empanelments")
  @Permissions(PERM.COMPLIANCE_SCHEME_EMPANEL)
  async listEmpanelments(
    @Req() req: any,
    @Query("workspaceId") workspaceId?: string,
    @Query("branchId") branchId?: string,
    @Query("scheme") scheme?: string,
    @Query("cursor") cursor?: string,
    @Query("take") take?: string,
  ) {
    // Auto-resolve workspace from branch if branchId is provided
    let resolvedWorkspaceId = workspaceId;
    if (!resolvedWorkspaceId && branchId) {
      const ws = await this.syncSvc["ctx"].prisma.complianceWorkspace.findFirst({
        where: { branchId },
        select: { id: true },
      });
      if (ws) resolvedWorkspaceId = ws.id;
    }
    return this.svc.listEmpanelments(this.principal(req), {
      workspaceId: resolvedWorkspaceId,
      scheme,
      cursor,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Post("empanelments")
  @Permissions(PERM.COMPLIANCE_SCHEME_EMPANEL)
  async createEmpanelment(@Req() req: any, @Body() dto: CreateEmpanelmentDto) {
    return this.svc.createEmpanelment(this.principal(req), dto);
  }

  @Patch("empanelments/:empanelmentId")
  @Permissions(PERM.COMPLIANCE_SCHEME_EMPANEL)
  async updateEmpanelment(
    @Req() req: any,
    @Param("empanelmentId") empanelmentId: string,
    @Body() dto: UpdateEmpanelmentDto,
  ) {
    return this.svc.updateEmpanelment(this.principal(req), empanelmentId, dto);
  }

  // ============================================================ Rate Cards

  @Get("rate-cards")
  @Permissions(PERM.COMPLIANCE_SCHEME_RATECARD_CREATE)
  async listRateCards(
    @Req() req: any,
    @Query("workspaceId") workspaceId?: string,
    @Query("branchId") branchId?: string,
    @Query("scheme") scheme?: string,
    @Query("version") version?: string,
    @Query("activeOn") activeOn?: string,
    @Query("cursor") cursor?: string,
    @Query("take") take?: string,
  ) {
    let resolvedWorkspaceId = workspaceId;
    if (!resolvedWorkspaceId && branchId) {
      const ws = await this.syncSvc["ctx"].prisma.complianceWorkspace.findFirst({
        where: { branchId },
        select: { id: true },
      });
      if (ws) resolvedWorkspaceId = ws.id;
    }
    return this.svc.listRateCards(this.principal(req), {
      workspaceId: resolvedWorkspaceId,
      scheme,
      version,
      activeOn,
      cursor,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Post("rate-cards")
  @Permissions(PERM.COMPLIANCE_SCHEME_RATECARD_CREATE)
  async createRateCard(@Req() req: any, @Body() dto: CreateRateCardDto) {
    return this.svc.createRateCard(this.principal(req), dto);
  }

  @Get("rate-cards/:rateCardId")
  @Permissions(PERM.COMPLIANCE_SCHEME_RATECARD_CREATE)
  async getRateCard(@Req() req: any, @Param("rateCardId") rateCardId: string) {
    return this.svc.getRateCard(this.principal(req), rateCardId);
  }

  @Patch("rate-cards/:rateCardId")
  @Permissions(PERM.COMPLIANCE_SCHEME_RATECARD_CREATE)
  async updateRateCard(
    @Req() req: any,
    @Param("rateCardId") rateCardId: string,
    @Body() dto: UpdateRateCardDto,
  ) {
    return this.svc.updateRateCard(this.principal(req), rateCardId, dto);
  }

  @Post("rate-cards/:rateCardId/freeze")
  @Permissions(PERM.COMPLIANCE_SCHEME_RATECARD_FREEZE)
  async freezeRateCard(@Req() req: any, @Param("rateCardId") rateCardId: string) {
    return this.svc.freezeRateCard(this.principal(req), rateCardId);
  }

  // ======================================================= Rate Card Items

  @Get("rate-cards/:rateCardId/items")
  @Permissions(PERM.COMPLIANCE_SCHEME_RATECARD_CREATE)
  async listRateCardItems(
    @Req() req: any,
    @Param("rateCardId") rateCardId: string,
    @Query("search") search?: string,
    @Query("code") code?: string,
    @Query("cursor") cursor?: string,
    @Query("take") take?: string,
  ) {
    return this.svc.listRateCardItems(this.principal(req), rateCardId, {
      search,
      code,
      cursor,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Patch("rate-cards/:rateCardId/items/:itemId")
  @Permissions(PERM.COMPLIANCE_SCHEME_RATECARD_CREATE)
  async updateRateCardItem(
    @Req() req: any,
    @Param("rateCardId") _rateCardId: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateRateCardItemDto,
  ) {
    return this.svc.updateRateCardItem(this.principal(req), itemId, dto);
  }

  @Post("rate-cards/:rateCardId/items/bulk-upload")
  @Permissions(PERM.COMPLIANCE_SCHEME_RATECARD_CREATE)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          fs.mkdirSync(BULK_UPLOAD_DIR, { recursive: true });
          cb(null, BULK_UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
          const key = `${Date.now()}_${Math.random().toString(16).slice(2, 8)}_${safeName}`;
          cb(null, key);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const csvMimes = ["text/csv", "application/vnd.ms-excel", "text/plain"];
        const xlsxMimes = [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
        ];
        const isCsv = csvMimes.includes(file.mimetype) || file.originalname.endsWith(".csv");
        const isXlsx = xlsxMimes.includes(file.mimetype) || /\.xlsx?$/i.test(file.originalname);
        if (isCsv || isXlsx) {
          cb(null, true);
        } else {
          cb(new Error(`File type ${file.mimetype} not allowed. Only CSV and XLSX files are accepted.`), false);
        }
      },
    }),
  )
  async bulkUploadItems(
    @Req() req: any,
    @Param("rateCardId") rateCardId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("A CSV or XLSX file is required");

    const filePath = path.join(BULK_UPLOAD_DIR, file.filename);
    try {
      const isXlsx = /\.xlsx?$/i.test(file.originalname);
      let rows: { code: string; name: string; rate: number; inclusions?: string; exclusions?: string }[];

      if (isXlsx) {
        rows = parseXlsx(filePath);
      } else {
        const content = fs.readFileSync(filePath, "utf-8");
        rows = parseCsv(content);
      }

      return this.svc.bulkUploadItems(this.principal(req), rateCardId, rows);
    } finally {
      // Clean up the uploaded file after parsing
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore cleanup errors
      }
    }
  }

  // ============================================================ Mappings

  @Get("mappings")
  @Permissions(PERM.COMPLIANCE_SCHEME_MAPPING)
  async listMappings(
    @Req() req: any,
    @Query("workspaceId") workspaceId?: string,
    @Query("scheme") scheme?: string,
    @Query("unmappedOnly") unmappedOnly?: string,
    @Query("cursor") cursor?: string,
    @Query("take") take?: string,
  ) {
    return this.svc.listMappings(this.principal(req), {
      workspaceId,
      scheme,
      unmappedOnly: unmappedOnly === "true",
      cursor,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Post("mappings")
  @Permissions(PERM.COMPLIANCE_SCHEME_MAPPING)
  async createMapping(@Req() req: any, @Body() dto: CreateMappingDto) {
    return this.svc.createMapping(this.principal(req), dto);
  }

  @Patch("mappings/:mappingId")
  @Permissions(PERM.COMPLIANCE_SCHEME_MAPPING)
  async updateMapping(
    @Req() req: any,
    @Param("mappingId") mappingId: string,
    @Body() dto: UpdateMappingDto,
  ) {
    return this.svc.updateMapping(this.principal(req), mappingId, dto);
  }

  @Delete("mappings/:mappingId")
  @Permissions(PERM.COMPLIANCE_SCHEME_MAPPING)
  async deleteMapping(@Param("mappingId") mappingId: string, @Req() req: any) {
    return this.svc.deleteMapping(this.principal(req), mappingId);
  }

  @Post("mappings/auto-suggest")
  @Permissions(PERM.COMPLIANCE_SCHEME_MAPPING)
  async autoSuggestMappings(
    @Req() req: any,
    @Body("workspaceId") workspaceId: string,
    @Body("scheme") scheme: string,
  ) {
    if (!workspaceId || !scheme) {
      throw new BadRequestException("workspaceId and scheme are required");
    }
    return this.svc.autoSuggestMappings(this.principal(req), workspaceId, scheme);
  }

  // ========================================================= API Credentials

  @Get("api-credentials")
  @Permissions(PERM.COMPLIANCE_SCHEME_EMPANEL)
  async getApiCredential(
    @Query("workspaceId") workspaceId: string,
    @Query("scheme") scheme: string,
    @Query("environment") environment: string,
    @Req() req: any,
  ) {
    return this.svc.getApiCredential(workspaceId, scheme, environment ?? "SANDBOX");
  }

  @Post("api-credentials")
  @Permissions(PERM.COMPLIANCE_SCHEME_EMPANEL)
  async upsertApiCredential(@Body() dto: any, @Req() req: any) {
    return this.svc.upsertApiCredential(dto, req.user?.id ?? req.user?.sub);
  }

  @Post("api-credentials/:credentialId/test")
  @Permissions(PERM.COMPLIANCE_SCHEME_EMPANEL)
  async testApiCredential(@Param("credentialId") credentialId: string, @Req() req: any) {
    return this.svc.testApiCredential(credentialId, req.user?.id ?? req.user?.sub);
  }

  // ====================================================== Scheme Sync (Compliance ↔ Infrastructure)

  @Get("sync/status")
  @Permissions(PERM.COMPLIANCE_SCHEME_EMPANEL)
  async getSyncStatus(@Query("workspaceId") workspaceId: string) {
    if (!workspaceId) throw new BadRequestException("workspaceId is required");
    return this.syncSvc.getSyncStatus(workspaceId);
  }

  @Post("sync/push/:empanelmentId")
  @Permissions(PERM.COMPLIANCE_SCHEME_EMPANEL)
  async pushToInfra(@Req() req: any, @Param("empanelmentId") empanelmentId: string) {
    return this.syncSvc.pushToInfra(req.principal, empanelmentId);
  }

  @Post("sync/pull/:empanelmentId")
  @Permissions(PERM.COMPLIANCE_SCHEME_EMPANEL)
  async pullFromInfra(@Req() req: any, @Param("empanelmentId") empanelmentId: string) {
    return this.syncSvc.pullFromInfra(req.principal, empanelmentId);
  }

  @Post("sync/link/:empanelmentId")
  @Permissions(PERM.COMPLIANCE_SCHEME_EMPANEL)
  async linkManually(
    @Req() req: any,
    @Param("empanelmentId") empanelmentId: string,
    @Body("govSchemeConfigId") govSchemeConfigId: string,
  ) {
    if (!govSchemeConfigId) throw new BadRequestException("govSchemeConfigId is required");
    return this.syncSvc.linkManually(req.principal, empanelmentId, govSchemeConfigId);
  }

  @Post("sync/unlink/:empanelmentId")
  @Permissions(PERM.COMPLIANCE_SCHEME_EMPANEL)
  async unlink(@Req() req: any, @Param("empanelmentId") empanelmentId: string) {
    return this.syncSvc.unlink(req.principal, empanelmentId);
  }
}

// ============================================================ CSV Parser

/**
 * Simple line-by-line CSV parser.
 * Expects headers: code, name, rate, inclusions (optional), exclusions (optional)
 */
function parseCsv(
  content: string,
): { code: string; name: string; rate: number; inclusions?: string; exclusions?: string }[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new BadRequestException("CSV must have a header row and at least one data row");
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const codeIdx = headers.indexOf("code");
  const nameIdx = headers.indexOf("name");
  const rateIdx = headers.indexOf("rate");
  const inclusionsIdx = headers.indexOf("inclusions");
  const exclusionsIdx = headers.indexOf("exclusions");

  if (codeIdx === -1 || nameIdx === -1 || rateIdx === -1) {
    throw new BadRequestException('CSV must contain "code", "name", and "rate" columns');
  }

  const rows: { code: string; name: string; rate: number; inclusions?: string; exclusions?: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const code = cols[codeIdx];
    const name = cols[nameIdx];
    const rateStr = cols[rateIdx];

    if (!code || !name || !rateStr) continue; // skip incomplete rows

    const rate = parseFloat(rateStr);
    if (isNaN(rate) || rate < 0) {
      throw new BadRequestException(`Invalid rate "${rateStr}" at row ${i + 1}`);
    }

    rows.push({
      code,
      name,
      rate,
      ...(inclusionsIdx !== -1 && cols[inclusionsIdx] ? { inclusions: cols[inclusionsIdx] } : {}),
      ...(exclusionsIdx !== -1 && cols[exclusionsIdx] ? { exclusions: cols[exclusionsIdx] } : {}),
    });
  }

  if (!rows.length) throw new BadRequestException("CSV contains no valid data rows");

  return rows;
}

/**
 * Parse an XLSX/XLS file into rate-card rows.
 * Uses the `xlsx` npm package (SheetJS). Reads the first sheet and expects
 * the same headers as CSV: code, name, rate, inclusions (optional), exclusions (optional).
 */
function parseXlsx(
  filePath: string,
): { code: string; name: string; rate: number; inclusions?: string; exclusions?: string }[] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let XLSX: any;
  try {
    XLSX = require("xlsx");
  } catch {
    throw new BadRequestException(
      "XLSX parsing is not available. Please install the 'xlsx' package (npm i xlsx) or upload a CSV file instead.",
    );
  }

  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new BadRequestException("XLSX file contains no sheets");

  const sheet = workbook.Sheets[sheetName];
  const jsonRows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (!jsonRows.length) {
    throw new BadRequestException("XLSX sheet contains no data rows");
  }

  // Normalise header keys to lowercase
  const normalised = jsonRows.map((row) => {
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      out[key.trim().toLowerCase()] = value;
    }
    return out;
  });

  // Validate required columns exist
  const sampleKeys = Object.keys(normalised[0]);
  if (!sampleKeys.includes("code") || !sampleKeys.includes("name") || !sampleKeys.includes("rate")) {
    throw new BadRequestException('XLSX must contain "code", "name", and "rate" columns');
  }

  const rows: { code: string; name: string; rate: number; inclusions?: string; exclusions?: string }[] = [];

  for (let i = 0; i < normalised.length; i++) {
    const r = normalised[i];
    const code = String(r.code ?? "").trim();
    const name = String(r.name ?? "").trim();
    const rateStr = String(r.rate ?? "").trim();

    if (!code || !name || !rateStr) continue; // skip incomplete rows

    const rate = parseFloat(rateStr);
    if (isNaN(rate) || rate < 0) {
      throw new BadRequestException(`Invalid rate "${rateStr}" at row ${i + 2}`);
    }

    rows.push({
      code,
      name,
      rate,
      ...(r.inclusions ? { inclusions: String(r.inclusions).trim() } : {}),
      ...(r.exclusions ? { exclusions: String(r.exclusions).trim() } : {}),
    });
  }

  if (!rows.length) throw new BadRequestException("XLSX contains no valid data rows");

  return rows;
}
