import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { InfraContextService } from "../shared/infra-context.service";
import type { CreateFormularyDto, FormularyItemDto } from "./dto";

@Injectable()
export class FormularyService {
  constructor(private readonly ctx: InfraContextService) {}

  async listFormularies(principal: Principal, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId ?? null);

    return this.ctx.prisma.formulary.findMany({
      where: { branchId: bid },
      orderBy: [{ version: "desc" }],
      include: {
        _count: { select: { items: true } },
        publishedByUser: { select: { id: true, name: true } },
      },
    });
  }

  async getFormulary(principal: Principal, id: string) {
    const formulary = await this.ctx.prisma.formulary.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            drugMaster: { select: { id: true, drugCode: true, genericName: true, brandName: true, therapeuticClass: true } },
          },
          orderBy: [{ createdAt: "asc" }],
        },
        _count: { select: { items: true } },
        publishedByUser: { select: { id: true, name: true } },
      },
    });
    if (!formulary) throw new NotFoundException("Formulary not found");
    this.ctx.resolveBranchId(principal, formulary.branchId);
    return formulary;
  }

  /**
   * Active formulary = latest PUBLISHED whose effectiveDate <= {at} (or now).
   */
  async getActiveFormulary(principal: Principal, branchId?: string | null, at?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId ?? null);
    const atDate = at ? new Date(at) : new Date();
    if (Number.isNaN(atDate.getTime())) throw new BadRequestException("Invalid 'at' date");

    const active = await this.ctx.prisma.formulary.findFirst({
      where: {
        branchId: bid,
        status: "PUBLISHED" as any,
        OR: [{ effectiveDate: null }, { effectiveDate: { lte: atDate } }],
      },
      orderBy: [{ version: "desc" }],
      include: {
        items: {
          include: {
            drugMaster: { select: { id: true, drugCode: true, genericName: true, brandName: true, therapeuticClass: true } },
          },
          orderBy: [{ createdAt: "asc" }],
        },
        _count: { select: { items: true } },
        publishedByUser: { select: { id: true, name: true } },
      },
    });

    return active ?? null;
  }

  async createFormulary(principal: Principal, dto: CreateFormularyDto, branchId?: string | null) {
    const bid = this.ctx.resolveBranchId(principal, branchId ?? null);

    const latest = await this.ctx.prisma.formulary.findFirst({
      where: { branchId: bid },
      orderBy: [{ version: "desc" }],
      select: { version: true },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const effectiveDate = dto.effectiveDate ? new Date(dto.effectiveDate) : null;
    if (effectiveDate && Number.isNaN(effectiveDate.getTime())) {
      throw new BadRequestException("Invalid effectiveDate");
    }

    const defaultTier = (dto.defaultTier ?? "APPROVED") as any;

    const created = await this.ctx.prisma.$transaction(async (tx) => {
      const f = await tx.formulary.create({
        data: {
          branchId: bid,
          version: nextVersion,
          status: "DRAFT" as any,
          effectiveDate,
          notes: dto.notes?.trim() || null,
        },
      });

      // Clone from an existing formulary version if requested
      if (dto.cloneFromFormularyId) {
        const src = await tx.formulary.findUnique({
          where: { id: dto.cloneFromFormularyId },
          select: { id: true, branchId: true },
        });
        if (!src) throw new BadRequestException("cloneFromFormularyId not found");
        if (src.branchId !== bid) throw new BadRequestException("cloneFromFormularyId must be within same branch");

        const srcItems = await tx.formularyItem.findMany({
          where: { formularyId: src.id },
          select: { drugMasterId: true, tier: true, notes: true },
        });

        if (srcItems.length) {
          await tx.formularyItem.createMany({
            data: srcItems.map((it) => ({
              formularyId: f.id,
              drugMasterId: it.drugMasterId,
              tier: it.tier as any,
              notes: it.notes ?? null,
            })),
            skipDuplicates: true,
          });
        }
      }

      // Include all ACTIVE drugs if requested (bulk assign)
      if (dto.includeAllActiveDrugs) {
        const drugs = await tx.drugMaster.findMany({
          where: { branchId: bid, status: "ACTIVE" as any },
          select: { id: true },
        });
        if (drugs.length) {
          await tx.formularyItem.createMany({
            data: drugs.map((d) => ({
              formularyId: f.id,
              drugMasterId: d.id,
              tier: defaultTier,
              notes: null,
            })),
            skipDuplicates: true,
          });
        }
      }

      // If explicit items provided, upsert them (takes precedence for those drugs)
      if (dto.items?.length) {
        await this.upsertItems(tx as any, f.id, dto.items);
      }

      return tx.formulary.findUniqueOrThrow({
        where: { id: f.id },
        include: {
          items: {
            include: {
              drugMaster: { select: { id: true, drugCode: true, genericName: true, brandName: true } },
            },
            orderBy: [{ createdAt: "asc" }],
          },
          _count: { select: { items: true } },
        },
      });
    });

    await this.ctx.audit.log({
      branchId: bid,
      actorUserId: principal.userId,
      action: "PHARMACY_FORMULARY_CREATE",
      entity: "Formulary",
      entityId: created.id,
      meta: {
        version: nextVersion,
        includeAllActiveDrugs: !!dto.includeAllActiveDrugs,
        defaultTier: dto.defaultTier ?? "APPROVED",
        clonedFrom: dto.cloneFromFormularyId ?? null,
        explicitItemCount: dto.items?.length ?? 0,
      },
    });

    return created;
  }

  async addFormularyItems(principal: Principal, formularyId: string, items: FormularyItemDto[]) {
    const formulary = await this.ctx.prisma.formulary.findUnique({
      where: { id: formularyId },
      select: { id: true, branchId: true, status: true, version: true },
    });
    if (!formulary) throw new NotFoundException("Formulary not found");

    this.ctx.resolveBranchId(principal, formulary.branchId);

    if (String(formulary.status) !== "DRAFT") {
      throw new BadRequestException("Cannot modify items on a non-DRAFT formulary.");
    }
    if (!items?.length) throw new BadRequestException("At least one item is required");

    const result = await this.ctx.prisma.$transaction(async (tx) => {
      await this.upsertItems(tx as any, formularyId, items);

      return tx.formulary.findUniqueOrThrow({
        where: { id: formularyId },
        include: {
          items: {
            include: {
              drugMaster: { select: { id: true, drugCode: true, genericName: true, brandName: true } },
            },
            orderBy: [{ createdAt: "asc" }],
          },
          _count: { select: { items: true } },
        },
      });
    });

    await this.ctx.audit.log({
      branchId: formulary.branchId,
      actorUserId: principal.userId,
      action: "PHARMACY_FORMULARY_ITEMS_UPSERT",
      entity: "Formulary",
      entityId: formularyId,
      meta: { version: formulary.version, upsertedCount: items.length },
    });

    return result;
  }

  /**
   * Diff current formulary vs compareToId.
   * If compareToId is null -> compare with immediate previous version (if exists).
   */
  async diffFormulary(principal: Principal, id: string, compareToId?: string | null) {
    const current = await this.ctx.prisma.formulary.findUnique({
      where: { id },
      select: { id: true, branchId: true, version: true },
    });
    if (!current) throw new NotFoundException("Formulary not found");
    this.ctx.resolveBranchId(principal, current.branchId);

    let baseId = compareToId ?? null;

    if (!baseId) {
      const prev = await this.ctx.prisma.formulary.findFirst({
        where: { branchId: current.branchId, version: { lt: current.version }, id: { not: current.id } },
        orderBy: [{ version: "desc" }],
        select: { id: true },
      });
      baseId = prev?.id ?? null;
    }

    const [aItems, bItems] = await Promise.all([
      this.ctx.prisma.formularyItem.findMany({
        where: { formularyId: current.id },
        include: { drugMaster: { select: { id: true, drugCode: true, genericName: true, brandName: true } } },
      }),
      baseId
        ? this.ctx.prisma.formularyItem.findMany({
            where: { formularyId: baseId },
            include: { drugMaster: { select: { id: true, drugCode: true, genericName: true, brandName: true } } },
          })
        : Promise.resolve([] as any[]),
    ]);

    const aMap = new Map(aItems.map((x) => [x.drugMasterId, x]));
    const bMap = new Map(bItems.map((x) => [x.drugMasterId, x]));

    const added: any[] = [];
    const removed: any[] = [];
    const changed: any[] = [];

    for (const [drugId, a] of aMap.entries()) {
      const b = bMap.get(drugId);
      if (!b) {
        added.push({
          drug: a.drugMaster,
          fromTier: null,
          toTier: a.tier,
          notes: a.notes ?? null,
        });
      } else if (String(a.tier) !== String(b.tier)) {
        changed.push({
          drug: a.drugMaster,
          fromTier: b.tier,
          toTier: a.tier,
          fromNotes: b.notes ?? null,
          toNotes: a.notes ?? null,
        });
      }
    }

    for (const [drugId, b] of bMap.entries()) {
      if (!aMap.has(drugId)) {
        removed.push({
          drug: b.drugMaster,
          fromTier: b.tier,
          toTier: null,
          notes: b.notes ?? null,
        });
      }
    }

    return {
      currentId: current.id,
      compareToId: baseId,
      summary: { added: added.length, removed: removed.length, changed: changed.length },
      added,
      removed,
      changed,
    };
  }

  async publishFormulary(principal: Principal, formularyId: string) {
    const formulary = await this.ctx.prisma.formulary.findUnique({
      where: { id: formularyId },
      select: { id: true, branchId: true, status: true, version: true, effectiveDate: true },
    });
    if (!formulary) throw new NotFoundException("Formulary not found");
    this.ctx.resolveBranchId(principal, formulary.branchId);

    if (String(formulary.status) !== "DRAFT") {
      throw new BadRequestException("Only DRAFT formularies can be published.");
    }

    const itemCount = await this.ctx.prisma.formularyItem.count({ where: { formularyId } });
    if (itemCount === 0) throw new BadRequestException("Cannot publish a formulary with zero items.");

    const now = new Date();
    const effectiveDate = formulary.effectiveDate ?? now; // enforce acceptance criteria without blocking

    const diff = await this.diffFormulary(principal, formularyId, null);

    const published = await this.ctx.prisma.$transaction(async (tx) => {
      await tx.formulary.updateMany({
        where: { branchId: formulary.branchId, status: "PUBLISHED" as any, id: { not: formularyId } },
        data: { status: "ARCHIVED" as any },
      });

      const upd = await tx.formulary.update({
        where: { id: formularyId },
        data: {
          status: "PUBLISHED" as any,
          publishedAt: now,
          publishedByUserId: principal.userId,
          effectiveDate,
        },
        include: {
          _count: { select: { items: true } },
          publishedByUser: { select: { id: true, name: true } },
        },
      });

      // Publish notification (branch-wide)
      await tx.notification.create({
        data: {
          branchId: formulary.branchId,
          title: `Formulary v${formulary.version} published`,
          message: `Effective: ${effectiveDate.toISOString().slice(0, 10)}. Added: ${diff.summary.added}, Removed: ${diff.summary.removed}, Changed: ${diff.summary.changed}.`,
          source: "PHARMACY",
          entity: "Formulary",
          entityId: formularyId,
          meta: {
            version: formulary.version,
            effectiveDate: effectiveDate.toISOString(),
            diff: diff.summary,
          },
          tags: ["PHARMACY", "FORMULARY"],
          dedupeKey: `PHARMACY_FORMULARY_PUBLISH:${formulary.branchId}:v${formulary.version}`,
        },
      });

      return upd;
    });

    await this.ctx.audit.log({
      branchId: formulary.branchId,
      actorUserId: principal.userId,
      action: "PHARMACY_FORMULARY_PUBLISH",
      entity: "Formulary",
      entityId: formularyId,
      meta: { version: formulary.version, itemCount, publishedAt: now.toISOString(), effectiveDate: effectiveDate.toISOString(), diff: diff.summary },
    });

    return published;
  }

  private async upsertItems(tx: any, formularyId: string, items: FormularyItemDto[]) {
    for (const item of items) {
      if (!item.drugMasterId?.trim()) throw new BadRequestException("drugMasterId is required for every formulary item");

      const drug = await tx.drugMaster.findUnique({ where: { id: item.drugMasterId }, select: { id: true } });
      if (!drug) throw new BadRequestException(`Drug master not found: ${item.drugMasterId}`);

      await tx.formularyItem.upsert({
        where: { formularyId_drugMasterId: { formularyId, drugMasterId: item.drugMasterId } },
        create: {
          formularyId,
          drugMasterId: item.drugMasterId,
          tier: (item.tier ?? "APPROVED") as any,
          notes: item.notes?.trim() || null,
        },
        update: {
          tier: (item.tier ?? "APPROVED") as any,
          notes: item.notes?.trim() || null,
        },
      });
    }
  }
}
