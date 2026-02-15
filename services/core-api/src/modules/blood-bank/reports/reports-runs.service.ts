import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { NotificationsService } from "../../notifications/notifications.service";
import { BBContextService } from "../shared/bb-context.service";
import { CreateReportRunDto, RejectReportRunDto } from "./dto";

type ExportFormat = "json" | "csv" | "xlsx" | "pdf";

function normalize(v: any) {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function escCsv(s: string) {
  const needs = /[\n\r,\"]/g.test(s);
  const out = s.replace(/\"/g, '""');
  return needs ? `"${out}"` : out;
}

function jsonToCsv(data: any) {
  const table: any[] = Array.isArray(data) ? data : [data];
  const cols = Array.from(
    new Set(
      table
        .flatMap((r) => (r && typeof r === "object" ? Object.keys(r) : []))
        .filter((k): k is string => typeof k === "string" && k.length > 0),
    ),
  );

  const header = cols.map((c) => escCsv(c)).join(",");
  const rows = table
    .map((r) => cols.map((c) => escCsv(normalize((r as any)?.[c]))).join(","))
    .join("\n");
  return `${header}\n${rows}`;
}

async function jsonToXlsxBuffer(data: any) {
  // Avoid static imports so TS doesn't require exceljs installed.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ExcelJS: any = require("exceljs");
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Report");

  const table: any[] = Array.isArray(data) ? data : [data];
  const cols = Array.from(
    new Set(
      table
        .flatMap((r) => (r && typeof r === "object" ? Object.keys(r) : []))
        .filter((k): k is string => typeof k === "string" && k.length > 0),
    ),
  );

  ws.addRow(cols);
  for (const r of table) {
    ws.addRow(cols.map((c) => normalize((r as any)?.[c])));
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
}

async function jsonToPdfBuffer(data: any, title: string) {
  // Avoid static imports so TS doesn't require pdfkit installed.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const PDFDocument: any = require("pdfkit");
  const doc = new PDFDocument({ size: "A4", margin: 36 });
  const chunks: Buffer[] = [];
  doc.on("data", (c: any) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));

  doc.fontSize(16).text(title);
  doc.moveDown();
  doc.fontSize(10).text(JSON.stringify(data, null, 2));
  doc.end();

  await new Promise<void>((resolve) => doc.on("end", () => resolve()));
  return Buffer.concat(chunks);
}

@Injectable()
export class ReportsRunsService {
  constructor(
    private readonly ctx: BBContextService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(
    principal: Principal,
    opts: { branchId?: string | null; reportType?: string | null; status?: string | null; take?: number },
  ) {
    const branchId = this.ctx.resolveBranchId(principal, opts.branchId);
    return this.ctx.prisma.bBReportRun.findMany({
      where: {
        branchId,
        ...(opts.reportType ? { type: opts.reportType as any } : {}),
        ...(opts.status ? { status: opts.status as any } : {}),
      },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
        submittedByUser: { select: { id: true, name: true, email: true } },
        approvedByUser: { select: { id: true, name: true, email: true } },
        rejectedByUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(opts.take ?? 200, 1), 500),
    });
  }

  async get(principal: Principal, id: string) {
    const run = await this.ctx.prisma.bBReportRun.findUnique({
      where: { id },
      include: {
        createdByUser: { select: { id: true, name: true, email: true } },
        submittedByUser: { select: { id: true, name: true, email: true } },
        approvedByUser: { select: { id: true, name: true, email: true } },
        rejectedByUser: { select: { id: true, name: true, email: true } },
      },
    });
    if (!run) throw new NotFoundException("Report run not found");
    this.ctx.resolveBranchId(principal, run.branchId);
    return run;
  }

  async create(principal: Principal, dto: CreateReportRunDto) {
    const branchId = this.ctx.resolveBranchId(principal, dto.branchId);
    const reportType = dto.reportType as any; // mapped to DB enum BBReportType

    const run = await this.ctx.prisma.bBReportRun.create({
      data: {
        branchId,
        type: reportType,
        status: "DRAFT" as any,
        createdByUserId: principal.userId,
        params: dto.parameters ?? {},
      },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "BB_REPORT_DRAFT_CREATED",
      entity: "BBReportRun",
      entityId: run.id,
      meta: { type: reportType },
    });

    return this.get(principal, run.id);
  }

  /**
   * For now, we generate the report data on-demand in-memory.
   * In the future, add a background job + persistence.
   */
  private async generateData(principal: Principal, runId: string) {
    const run = await this.get(principal, runId);

    // Minimal placeholder data – extend per report type.
    // IMPORTANT: keep it deterministic and branch-scoped.
    const now = new Date();
    return {
      type: run.type,
      branchId: run.branchId,
      generatedAt: now.toISOString(),
      params: run.params,
      // Example metrics (replace with real queries)
      metrics: {
        donors: await this.ctx.prisma.donor.count({ where: { branchId: run.branchId } }),
        units: await this.ctx.prisma.bloodUnit.count({ where: { branchId: run.branchId } }),
      },
    };
  }

  async submit(principal: Principal, id: string) {
    const run = await this.get(principal, id);
    if (run.status !== "DRAFT") throw new BadRequestException(`Only DRAFT can be submitted. Current: ${run.status}`);

    const updated = await this.ctx.prisma.bBReportRun.update({
      where: { id },
      data: {
        status: "SUBMITTED" as any,
        submittedAt: new Date(),
        submittedByUserId: principal.userId,
      },
    });

    await this.notifications.create(principal, {
      branchId: run.branchId,
      title: `Blood Bank report submitted (${run.type})`,
      message: `Report run ${id} submitted for approval.`,
      severity: "INFO",
      source: "blood-bank",
      entity: "BBReportRun",
      entityId: id,
      tags: ["blood-bank", "report"],
    });

    return updated;
  }

  async approve(principal: Principal, id: string) {
    const run = await this.get(principal, id);
    if (run.status !== "SUBMITTED") throw new BadRequestException(`Only SUBMITTED can be approved. Current: ${run.status}`);

    const updated = await this.ctx.prisma.bBReportRun.update({
      where: { id },
      data: {
        status: "APPROVED" as any,
        approvedAt: new Date(),
        approvedByUserId: principal.userId,
        // clear rejection
        rejectedAt: null,
        rejectedByUserId: null,
        rejectReason: null,
      },
    });

    await this.notifications.create(principal, {
      branchId: run.branchId,
      title: `Blood Bank report approved (${run.type})`,
      message: `Report run ${id} approved.`,
      severity: "INFO",
      source: "blood-bank",
      entity: "BBReportRun",
      entityId: id,
      tags: ["blood-bank", "report"],
    });

    return updated;
  }

  async reject(principal: Principal, id: string, dto: RejectReportRunDto) {
    const run = await this.get(principal, id);
    if (run.status !== "SUBMITTED") throw new BadRequestException(`Only SUBMITTED can be rejected. Current: ${run.status}`);
    const reason = dto.reason?.trim() || "Rejected";

    const updated = await this.ctx.prisma.bBReportRun.update({
      where: { id },
      data: {
        status: "REJECTED" as any,
        rejectedAt: new Date(),
        rejectedByUserId: principal.userId,
        rejectReason: reason,
      },
    });

    await this.notifications.create(principal, {
      branchId: run.branchId,
      title: `Blood Bank report rejected (${run.type})`,
      message: `Report run ${id} rejected. Reason: ${reason}`,
      severity: "WARNING",
      source: "blood-bank",
      entity: "BBReportRun",
      entityId: id,
      tags: ["blood-bank", "report"],
      meta: { reason },
    });

    return updated;
  }

  async export(principal: Principal, id: string, format: ExportFormat) {
    const run = await this.get(principal, id);
    const data = await this.generateData(principal, id);
    const baseName = `${run.type}_${id}`;

    if (format === "json") {
      const buf = Buffer.from(JSON.stringify({ type: run.type, params: run.params, data }, null, 2));
      return { filename: `${baseName}.json`, mime: "application/json", buffer: buf };
    }

    if (format === "csv") {
      const csv = jsonToCsv(data);
      return { filename: `${baseName}.csv`, mime: "text/csv", buffer: Buffer.from(csv) };
    }

    if (format === "xlsx") {
      try {
        const buf = await jsonToXlsxBuffer(data);
        return { filename: `${baseName}.xlsx`, mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: buf };
      } catch (e: any) {
        throw new BadRequestException(`XLSX export not available. Install exceljs. ${e?.message || ""}`.trim());
      }
    }

    if (format === "pdf") {
      try {
        const buf = await jsonToPdfBuffer(data, `Blood Bank Report: ${run.type}`);
        return { filename: `${baseName}.pdf`, mime: "application/pdf", buffer: buf };
      } catch (e: any) {
        throw new BadRequestException(`PDF export not available. Install pdfkit. ${e?.message || ""}`.trim());
      }
    }

    throw new BadRequestException("Unsupported format");
  }
}
