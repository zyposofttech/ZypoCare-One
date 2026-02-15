import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { InfraContextService } from "../shared/infra-context.service";
import type { BulkSetAntibioticStewardshipDto, BulkSetHighAlertDto, CreateDrugDto, UpdateDrugDto } from "./dto";

@Injectable()
export class DrugMasterService {
  constructor(private readonly ctx: InfraContextService) {}

  async listDrugs(
    principal: Principal,
    query: {
      branchId?: string | null;
      q?: string | null;
      category?: string | null;
      route?: string | null;
      scheduleClass?: string | null;
      formularyStatus?: string | null;
      status?: string | null;
      isNarcotic?: boolean;
      isHighAlert?: boolean;
      isLasa?: boolean;
      isAntibiotic?: boolean;
      page?: string | number | null;
      pageSize?: string | number | null;
    },
  ) {
    const branchId = this.ctx.resolveBranchId(principal, query.branchId ?? null);
    const where: any = { branchId };

    if (query.q) {
      const q = String(query.q).trim();
      where.OR = [
        { genericName: { contains: q, mode: "insensitive" } },
        { brandName: { contains: q, mode: "insensitive" } },
        { drugCode: { contains: q, mode: "insensitive" } },
        { manufacturer: { contains: q, mode: "insensitive" } },
        { therapeuticClass: { contains: q, mode: "insensitive" } },
      ];
    }

    if (query.category) where.category = query.category;
    if (query.route) where.route = query.route;
    if (query.scheduleClass) where.scheduleClass = query.scheduleClass;
    if (query.formularyStatus) where.formularyStatus = query.formularyStatus;
    if (query.status) where.status = query.status;
    if (query.isNarcotic !== undefined) where.isNarcotic = query.isNarcotic;
    if (query.isHighAlert !== undefined) where.isHighAlert = query.isHighAlert;
    if (query.isLasa !== undefined) where.isLasa = query.isLasa;
    if (query.isAntibiotic !== undefined) where.isAntibiotic = query.isAntibiotic;

    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(query.pageSize ?? 50)));
    const skip = (page - 1) * pageSize;

    const [rows, total] = await this.ctx.prisma.$transaction([
      this.ctx.prisma.drugMaster.findMany({
        where,
        orderBy: [{ drugCode: "asc" }],
        skip,
        take: pageSize,
      }),
      this.ctx.prisma.drugMaster.count({ where }),
    ]);

    return { page, pageSize, total, rows };
  }

  async getDrug(principal: Principal, id: string) {
    const drug = await this.ctx.prisma.drugMaster.findUnique({
      where: { id },
      include: {
        interactionsA: { include: { drugB: { select: { id: true, drugCode: true, genericName: true } } }, take: 50 },
        interactionsB: { include: { drugA: { select: { id: true, drugCode: true, genericName: true } } }, take: 50 },
      },
    });
    if (!drug) throw new NotFoundException("Drug not found");
    this.ctx.resolveBranchId(principal, drug.branchId);

    const { interactionsA, interactionsB, ...rest } = drug as any;
    return { ...rest, interactionsAsA: interactionsA ?? [], interactionsAsB: interactionsB ?? [] };
  }

  async createDrug(principal: Principal, dto: CreateDrugDto, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId ?? null);

    let drugCode = dto.drugCode?.toUpperCase().trim();
    if (!drugCode) drugCode = await this.generateDrugCode(bid);

    const existing = await this.ctx.prisma.drugMaster.findFirst({
      where: { branchId: bid, drugCode },
      select: { id: true },
    });
    if (existing) throw new BadRequestException(`Drug code '${drugCode}' already exists in this branch`);

    const scheduleClass = dto.scheduleClass ?? "GENERAL";
    const isNarcotic = dto.isNarcotic ?? (scheduleClass === "X");
    const isControlled = dto.isControlled ?? (scheduleClass === "X" || scheduleClass === "H1");

    const drug = await this.ctx.prisma.drugMaster.create({
      data: {
        branchId: bid,
        drugCode,
        genericName: dto.genericName.trim(),
        brandName: dto.brandName?.trim() ?? null,
        manufacturer: dto.manufacturer?.trim() ?? null,
        category: (dto.category ?? "OTHER") as any,
        dosageForm: dto.dosageForm?.trim() ?? null,
        strength: dto.strength?.trim() ?? null,
        route: dto.route ? (dto.route as any) : null,
        therapeuticClass: dto.therapeuticClass?.trim() ?? null,
        pharmacologicalClass: dto.pharmacologicalClass?.trim() ?? null,
        scheduleClass: scheduleClass as any,
        isNarcotic,
        isPsychotropic: dto.isPsychotropic ?? false,
        isControlled,
        isAntibiotic: dto.isAntibiotic ?? false,
        antibioticStewardshipLevel: "UNRESTRICTED" as any,
        isHighAlert: dto.isHighAlert ?? false,
        isLasa: dto.isLasa ?? false,
        mrp: dto.mrp ?? null,
        purchasePrice: dto.purchasePrice ?? null,
        hsnCode: dto.hsnCode?.trim() ?? null,
        gstRate: dto.gstRate ?? null,
        packSize: dto.packSize ?? null,
        defaultDosage: dto.defaultDosage?.trim() ?? null,
        maxDailyDose: dto.maxDailyDose?.trim() ?? null,
        contraindications: dto.contraindications ?? undefined,
        // Epic 3 expectation: default formulary status should NOT block prescribing on day-1 setup
        formularyStatus: (dto.formularyStatus ?? "APPROVED") as any,
        status: "ACTIVE" as any,
      },
    });

    await this.ctx.audit.log({
      branchId: bid,
      actorUserId: principal.userId,
      action: "PHARMACY_DRUG_CREATE",
      entity: "DrugMaster",
      entityId: drug.id,
      meta: { drugCode },
    });

    return drug;
  }

  async updateDrug(principal: Principal, id: string, dto: UpdateDrugDto) {
    const current = await this.ctx.prisma.drugMaster.findUnique({
      where: { id },
      select: { id: true, branchId: true, drugCode: true, isAntibiotic: true },
    });
    if (!current) throw new NotFoundException("Drug not found");
    this.ctx.resolveBranchId(principal, current.branchId);

    const data: any = {};
    if (dto.genericName !== undefined) data.genericName = dto.genericName.trim();
    if (dto.brandName !== undefined) data.brandName = dto.brandName?.trim() ?? null;
    if (dto.manufacturer !== undefined) data.manufacturer = dto.manufacturer?.trim() ?? null;
    if (dto.category !== undefined) data.category = dto.category as any;
    if (dto.dosageForm !== undefined) data.dosageForm = dto.dosageForm?.trim() ?? null;
    if (dto.strength !== undefined) data.strength = dto.strength?.trim() ?? null;
    if (dto.route !== undefined) data.route = dto.route ? (dto.route as any) : null;
    if (dto.therapeuticClass !== undefined) data.therapeuticClass = dto.therapeuticClass?.trim() ?? null;
    if (dto.pharmacologicalClass !== undefined) data.pharmacologicalClass = dto.pharmacologicalClass?.trim() ?? null;
    if (dto.scheduleClass !== undefined) data.scheduleClass = dto.scheduleClass as any;
    if (dto.isNarcotic !== undefined) data.isNarcotic = dto.isNarcotic;
    if (dto.isPsychotropic !== undefined) data.isPsychotropic = dto.isPsychotropic;
    if (dto.isControlled !== undefined) data.isControlled = dto.isControlled;
    if (dto.isAntibiotic !== undefined) data.isAntibiotic = dto.isAntibiotic;

    if (dto.antibioticStewardshipLevel !== undefined) {
      data.antibioticStewardshipLevel = dto.antibioticStewardshipLevel as any;
      data.isAntibiotic = true; // if stewardship is set, enforce antibiotic flag
    }

    if (dto.isHighAlert !== undefined) data.isHighAlert = dto.isHighAlert;
    if (dto.isLasa !== undefined) data.isLasa = dto.isLasa;
    if (dto.mrp !== undefined) data.mrp = dto.mrp;
    if (dto.purchasePrice !== undefined) data.purchasePrice = dto.purchasePrice;
    if (dto.hsnCode !== undefined) data.hsnCode = dto.hsnCode?.trim() ?? null;
    if (dto.gstRate !== undefined) data.gstRate = dto.gstRate;
    if (dto.packSize !== undefined) data.packSize = dto.packSize;
    if (dto.defaultDosage !== undefined) data.defaultDosage = dto.defaultDosage?.trim() ?? null;
    if (dto.maxDailyDose !== undefined) data.maxDailyDose = dto.maxDailyDose?.trim() ?? null;
    if (dto.contraindications !== undefined) data.contraindications = dto.contraindications;
    if (dto.formularyStatus !== undefined) data.formularyStatus = dto.formularyStatus as any;
    if (dto.status !== undefined) data.status = dto.status as any;

    const updated = await this.ctx.prisma.drugMaster.update({ where: { id }, data });

    await this.ctx.audit.log({
      branchId: current.branchId,
      actorUserId: principal.userId,
      action: "PHARMACY_DRUG_UPDATE",
      entity: "DrugMaster",
      entityId: id,
      meta: { drugCode: current.drugCode, changes: dto },
    });

    return updated;
  }

  async bulkImportDrugs(principal: Principal, rows: any[], branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId ?? null);

    if (!rows?.length) throw new BadRequestException("No rows provided for import");
    if (rows.length > 5000) throw new BadRequestException("Maximum 5000 rows per bulk import");

    const results: { row: number; drugCode: string; status: "created" | "skipped"; error?: string }[] = [];
    let created = 0;
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const genericName = row.genericName?.trim();
        if (!genericName) {
          results.push({ row: i + 1, drugCode: row.drugCode ?? "", status: "skipped", error: "genericName is required" });
          skipped++;
          continue;
        }

        const category = row.category ?? "OTHER";
        let drugCode = row.drugCode?.toUpperCase().trim();
        if (!drugCode) drugCode = await this.generateDrugCode(bid);

        const existing = await this.ctx.prisma.drugMaster.findFirst({
          where: { branchId: bid, drugCode },
          select: { id: true },
        });
        if (existing) {
          results.push({ row: i + 1, drugCode, status: "skipped", error: "Duplicate drugCode" });
          skipped++;
          continue;
        }

        const scheduleClass = row.scheduleClass ?? "GENERAL";
        const isAntibiotic = row.isAntibiotic ?? false;

        await this.ctx.prisma.drugMaster.create({
          data: {
            branchId: bid,
            drugCode,
            genericName,
            brandName: row.brandName?.trim() ?? null,
            manufacturer: row.manufacturer?.trim() ?? null,
            category: category as any,
            dosageForm: row.dosageForm?.trim() ?? null,
            strength: row.strength?.trim() ?? null,
            route: row.route ? (row.route as any) : null,
            therapeuticClass: row.therapeuticClass?.trim() ?? null,
            pharmacologicalClass: row.pharmacologicalClass?.trim() ?? null,
            scheduleClass: scheduleClass as any,
            isNarcotic: row.isNarcotic ?? (scheduleClass === "X"),
            isPsychotropic: row.isPsychotropic ?? false,
            isControlled: row.isControlled ?? (scheduleClass === "X" || scheduleClass === "H1"),
            isAntibiotic,
            antibioticStewardshipLevel: (row.antibioticStewardshipLevel ?? "UNRESTRICTED") as any,
            isHighAlert: row.isHighAlert ?? false,
            isLasa: row.isLasa ?? false,
            mrp: row.mrp != null ? Number(row.mrp) : null,
            purchasePrice: row.purchasePrice != null ? Number(row.purchasePrice) : null,
            hsnCode: row.hsnCode?.trim() ?? null,
            gstRate: row.gstRate != null ? Number(row.gstRate) : null,
            packSize: row.packSize != null ? Number(row.packSize) : null,
            defaultDosage: row.defaultDosage?.trim() ?? null,
            maxDailyDose: row.maxDailyDose?.trim() ?? null,
            contraindications: row.contraindications ?? undefined,
            // ✅ Epic requirement: default tier APPROVED on import
            formularyStatus: (row.formularyStatus ?? "APPROVED") as any,
            status: "ACTIVE" as any,
          },
        });

        results.push({ row: i + 1, drugCode, status: "created" });
        created++;
      } catch (err: any) {
        results.push({ row: i + 1, drugCode: row.drugCode ?? "", status: "skipped", error: err.message ?? String(err) });
        skipped++;
      }
    }

    await this.ctx.audit.log({
      branchId: bid,
      actorUserId: principal.userId,
      action: "PHARMACY_DRUG_BULK_IMPORT",
      entity: "DrugMaster",
      entityId: null,
      meta: { totalRows: rows.length, created, skipped },
    });

    return { totalRows: rows.length, created, skipped, results };
  }

  async drugSummary(principal: Principal, branchId?: string) {
    const bid = this.ctx.resolveBranchId(principal, branchId ?? null);

    const [byCategory, bySchedule, byStatus, total, narcoticsCount, highAlertCount] = await this.ctx.prisma.$transaction([
      this.ctx.prisma.drugMaster.groupBy({
        by: ["category"],
        where: { branchId: bid },
        orderBy: { category: "asc" },
        _count: { _all: true },
      }),
      this.ctx.prisma.drugMaster.groupBy({
        by: ["scheduleClass"],
        where: { branchId: bid },
        orderBy: { scheduleClass: "asc" },
        _count: { _all: true },
      }),
      this.ctx.prisma.drugMaster.groupBy({
        by: ["status"],
        where: { branchId: bid },
        orderBy: { status: "asc" },
        _count: { _all: true },
      }),
      this.ctx.prisma.drugMaster.count({ where: { branchId: bid } }),
      this.ctx.prisma.drugMaster.count({ where: { branchId: bid, isNarcotic: true } }),
      this.ctx.prisma.drugMaster.count({ where: { branchId: bid, isHighAlert: true } }),
    ]);

    return { branchId: bid, total, narcoticsCount, highAlertCount, byCategory, bySchedule, byStatus };
  }

  async bulkSetHighAlert(principal: Principal, dto: BulkSetHighAlertDto, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId ?? null);

    const count = await this.ctx.prisma.drugMaster.updateMany({
      where: { branchId: bid, id: { in: dto.drugIds } },
      data: { isHighAlert: dto.isHighAlert },
    });

    await this.ctx.audit.log({
      branchId: bid,
      actorUserId: principal.userId,
      action: "PHARMACY_DRUG_BULK_SET_HIGH_ALERT",
      entity: "DrugMaster",
      entityId: null,
      meta: { isHighAlert: dto.isHighAlert, updatedCount: count.count },
    });

    return { updatedCount: count.count };
  }

  async bulkSetAntibioticStewardship(principal: Principal, dto: BulkSetAntibioticStewardshipDto, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId ?? null);

    const count = await this.ctx.prisma.drugMaster.updateMany({
      where: { branchId: bid, id: { in: dto.drugIds } },
      data: { isAntibiotic: true, antibioticStewardshipLevel: dto.level as any },
    });

    await this.ctx.audit.log({
      branchId: bid,
      actorUserId: principal.userId,
      action: "PHARMACY_DRUG_BULK_SET_ANTIBIOTIC_STEWARDSHIP",
      entity: "DrugMaster",
      entityId: null,
      meta: { level: dto.level, updatedCount: count.count },
    });

    return { updatedCount: count.count };
  }

  private async generateDrugCode(branchId: string): Promise<string> {
    const latest = await this.ctx.prisma.drugMaster.findFirst({
      where: { branchId, drugCode: { startsWith: "DRG-" } },
      orderBy: [{ drugCode: "desc" }],
      select: { drugCode: true },
    });

    let nextNum = 1;
    if (latest?.drugCode) {
      const match = latest.drugCode.match(/^DRG-(\d+)$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }

    return `DRG-${String(nextNum).padStart(5, "0")}`;
  }
}
