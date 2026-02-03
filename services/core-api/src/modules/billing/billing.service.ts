import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma, PrismaClient } from "@zypocare/db";
import type { Principal } from "../auth/access-policy.service";
import { resolveBranchId as resolveBranchIdCommon } from "../../common/branch-scope.util";
import { AuditService } from "../audit/audit.service";
import { canonicalizeCode } from "../../common/naming.util";
import type {
  ActivateTariffPlanDto,
  CreateTariffPlanDto,
  CreateTaxCodeDto,
  SetDefaultTariffPlanDto,
  UpdateTariffPlanDto,
  UpdateTariffRateDto,
  UpdateTaxCodeDto,
  UpsertTariffRateDto,
} from "./dto";

@Injectable()
export class BillingService {
  constructor(
    @Inject("PRISMA") private readonly prisma: PrismaClient,
    private readonly audit: AuditService,
  ) {}

  private resolveBranchId(principal: Principal, requestedBranchId?: string | null) {
    // Billing operations are branch-scoped. GLOBAL principals must specify branchId.
    return resolveBranchIdCommon(principal, requestedBranchId ?? null, { requiredForGlobal: true });
  }

  private static readonly mappedServiceChargeSelect = {
    serviceItemId: true,
    serviceItem: { select: { id: true, code: true, name: true, chargeUnit: true } },
  } satisfies Prisma.ServiceChargeMappingSelect;

  // ---------------- Tax Codes ----------------

  async listTaxCodes(
    principal: Principal,
    opts: { branchId?: string | null; q?: string; includeInactive?: boolean; take?: number },
  ) {
    const branchId = this.resolveBranchId(principal, opts.branchId ?? null);

    const where: any = { branchId };
    if (!opts.includeInactive) where.isActive = true;

    const query = (opts.q ?? "").trim();
    if (query) {
      where.OR = [
        { code: { contains: query, mode: "insensitive" } },
        { name: { contains: query, mode: "insensitive" } },
        { hsnSac: { contains: query, mode: "insensitive" } },
      ];
    }

    return this.prisma.taxCode.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { code: "asc" }],
      take: opts.take ? Math.min(Math.max(opts.take, 1), 500) : 200,
    });
  }

  async createTaxCode(principal: Principal, dto: CreateTaxCodeDto, branchIdParam?: string | null) {
    const requested = branchIdParam ?? dto.branchId ?? null;
    const branchId = this.resolveBranchId(principal, requested);

    const code = String(dto.code ?? "").trim().toUpperCase();
    const name = String(dto.name ?? "").trim();
    if (!code || !name) throw new BadRequestException("code and name are required");

    const hsnSac =
      dto.hsnSac === undefined
        ? undefined
        : dto.hsnSac === null || String(dto.hsnSac).trim() === ""
          ? null
          : String(dto.hsnSac).trim();

    try {
      const created = await this.prisma.taxCode.create({
        data: {
          branchId,
          code,
          name,
          taxType: (dto.taxType as any) ?? "GST",
          ratePercent: dto.ratePercent as any,
          components: dto.components ?? undefined,
          hsnSac,
          isActive: dto.isActive ?? true,
        },
      });

      await this.audit.log({
        branchId,
        actorUserId: principal.userId,
        action: "BILLING_TAX_CODE_CREATE",
        entity: "TaxCode",
        entityId: created.id,
        meta: dto,
      });

      return created;
    } catch (e: any) {
      if (String(e?.code) === "P2002") throw new ConflictException("Tax code already exists for this branch");
      throw e;
    }
  }

  async updateTaxCode(principal: Principal, id: string, dto: UpdateTaxCodeDto) {
    const existing = await this.prisma.taxCode.findUnique({
      where: { id },
      select: { id: true, branchId: true, code: true },
    });
    if (!existing) throw new NotFoundException("Tax code not found");

    this.resolveBranchId(principal, existing.branchId);

    const nextCode = dto.code ? String(dto.code).trim().toUpperCase() : undefined;
    if (nextCode && nextCode !== existing.code) {
      const dup = await this.prisma.taxCode.findFirst({
        where: { branchId: existing.branchId, code: nextCode },
        select: { id: true },
      });
      if (dup) throw new ConflictException("Tax code already exists for this branch");
    }

    const hsnSac =
      dto.hsnSac === undefined
        ? undefined
        : dto.hsnSac === null || String(dto.hsnSac).trim() === ""
          ? null
          : String(dto.hsnSac).trim();

    const updated = await this.prisma.taxCode.update({
      where: { id },
      data: {
        code: nextCode,
        name: dto.name?.trim(),
        taxType: dto.taxType as any,
        ratePercent: dto.ratePercent === undefined ? undefined : (dto.ratePercent as any),
        components: dto.components === undefined ? undefined : (dto.components as any),
        hsnSac,
        isActive: dto.isActive === undefined ? undefined : dto.isActive,
      },
    });

    await this.audit.log({
      branchId: existing.branchId,
      actorUserId: principal.userId,
      action: "BILLING_TAX_CODE_UPDATE",
      entity: "TaxCode",
      entityId: id,
      meta: dto,
    });

    return updated;
  }

  async deactivateTaxCode(principal: Principal, id: string) {
    const existing = await this.prisma.taxCode.findUnique({
      where: { id },
      select: { id: true, branchId: true, isActive: true },
    });
    if (!existing) throw new NotFoundException("Tax code not found");

    this.resolveBranchId(principal, existing.branchId);

    if (!existing.isActive) return existing as any;

    const updated = await this.prisma.taxCode.update({
      where: { id },
      data: { isActive: false },
    });

    await this.audit.log({
      branchId: existing.branchId,
      actorUserId: principal.userId,
      action: "BILLING_TAX_CODE_DEACTIVATE",
      entity: "TaxCode",
      entityId: id,
      meta: {},
    });

    return updated;
  }

  // ---------------- Tariff Plans ----------------

  async listTariffPlans(
    principal: Principal,
    q: {
      branchId?: string | null;
      kind?: string;
      status?: string;
      q?: string;
      includeInactive?: boolean;
      includeRefs?: boolean;
      take?: number;
    },
  ) {
    const branchId = this.resolveBranchId(principal, q.branchId ?? null);

    const where: any = { branchId };

    if (q.kind) where.kind = q.kind as any;
    if (q.status) where.status = q.status as any;

    const search = (q.q ?? "").trim();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    if (!q.includeInactive) {
      // Hide retired by default
      where.status = where.status ?? { not: "RETIRED" as any };
    }

    return this.prisma.tariffPlan.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      take: q.take ? Math.min(Math.max(q.take, 1), 500) : 200,
      include: q.includeRefs ? { payer: true, contract: true } : undefined,
    });
  }

  async getTariffPlan(principal: Principal, id: string) {
    const plan = await this.prisma.tariffPlan.findUnique({
      where: { id },
      include: { payer: true, contract: true },
    });
    if (!plan) throw new NotFoundException("TariffPlan not found");
    this.resolveBranchId(principal, plan.branchId);
    return plan;
  }

  async createTariffPlan(principal: Principal, dto: CreateTariffPlanDto) {
    const branchId = this.resolveBranchId(principal, dto.branchId ?? null);

    const kind = (dto.kind ?? "PRICE_LIST") as any;
    const code = dto.code ? canonicalizeCode(dto.code) : `TPL-${Date.now()}`;
    const name = String(dto.name ?? "").trim();
    if (!name) throw new BadRequestException("name is required");

    // Uniqueness (user-provided code)
    if (dto.code) {
      const dup = await this.prisma.tariffPlan.findFirst({ where: { branchId, code }, select: { id: true } });
      if (dup) throw new ConflictException("Tariff plan code already exists for this branch");
    }

    if (kind === "PAYER_CONTRACT") {
      if (!dto.contractId) throw new BadRequestException("contractId is required for PAYER_CONTRACT plan");
      if (dto.payerId) {
        const payer = await this.prisma.payer.findFirst({
          where: { id: dto.payerId, branchId },
          select: { id: true },
        });
        if (!payer) throw new BadRequestException("Invalid payerId for this branch");
      }
      const contract = await this.prisma.payerContract.findFirst({
        where: { id: dto.contractId, branchId },
        select: { id: true },
      });
      if (!contract) throw new BadRequestException("Invalid contractId for this branch");
    }

    const created = await this.prisma.tariffPlan.create({
      data: {
        branchId,
        code,
        name,
        kind,
        payerId: dto.payerId ?? null,
        contractId: dto.contractId ?? null,
        currency: (dto.currency ?? "INR").toUpperCase(),
        isTaxInclusive: dto.isTaxInclusive ?? false,
        status: "DRAFT" as any,
      },
    });

    await this.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "BILLING_TARIFF_PLAN_CREATE",
      entity: "TariffPlan",
      entityId: created.id,
      meta: dto,
    });

    return created;
  }

  async updateTariffPlan(principal: Principal, id: string, dto: UpdateTariffPlanDto) {
    const plan = await this.prisma.tariffPlan.findUnique({
      where: { id },
      select: { id: true, branchId: true, status: true },
    });
    if (!plan) throw new NotFoundException("TariffPlan not found");
    this.resolveBranchId(principal, plan.branchId);

    if (plan.status !== ("DRAFT" as any)) {
      throw new BadRequestException("Only DRAFT plans can be updated");
    }

    const updated = await this.prisma.tariffPlan.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        currency: dto.currency ? dto.currency.toUpperCase() : undefined,
        isTaxInclusive: dto.isTaxInclusive ?? undefined,
      },
    });

    await this.audit.log({
      branchId: plan.branchId,
      actorUserId: principal.userId,
      action: "BILLING_TARIFF_PLAN_UPDATE",
      entity: "TariffPlan",
      entityId: id,
      meta: dto,
    });

    return updated;
  }

  /**
   * Activates a plan and closes any existing ACTIVE plan in the same scope:
   * - PRICE_LIST: closes other ACTIVE PRICE_LIST in the branch
   * - PAYER_CONTRACT: closes other ACTIVE plans for same contractId
   */
  async activateTariffPlan(principal: Principal, id: string, dto: ActivateTariffPlanDto) {
    const plan = await this.prisma.tariffPlan.findUnique({
      where: { id },
      select: { id: true, branchId: true, status: true, kind: true, contractId: true },
    });
    if (!plan) throw new NotFoundException("TariffPlan not found");
    this.resolveBranchId(principal, plan.branchId);

    if (plan.status === ("RETIRED" as any)) throw new BadRequestException("Cannot activate a RETIRED plan");

    const effFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();
    if (Number.isNaN(effFrom.getTime())) throw new BadRequestException("Invalid effectiveFrom");

    const scopeWhere: any =
      plan.kind === ("PRICE_LIST" as any)
        ? { branchId: plan.branchId, kind: "PRICE_LIST", status: "ACTIVE" as any }
        : { branchId: plan.branchId, kind: "PAYER_CONTRACT" as any, contractId: plan.contractId, status: "ACTIVE" as any };

    await this.prisma.tariffPlan.updateMany({
      where: { ...scopeWhere, id: { not: plan.id } },
      data: { status: "RETIRED" as any, effectiveTo: effFrom, isDefault: false },
    });

    const activated = await this.prisma.tariffPlan.update({
      where: { id: plan.id },
      data: { status: "ACTIVE" as any, effectiveFrom: effFrom, effectiveTo: null },
    });

    await this.audit.log({
      branchId: plan.branchId,
      actorUserId: principal.userId,
      action: "BILLING_TARIFF_PLAN_ACTIVATE",
      entity: "TariffPlan",
      entityId: plan.id,
      meta: { ...dto, effectiveFrom: effFrom.toISOString() },
    });

    return activated;
  }

  async retireTariffPlan(principal: Principal, id: string) {
    const plan = await this.prisma.tariffPlan.findUnique({
      where: { id },
      select: { id: true, branchId: true },
    });
    if (!plan) throw new NotFoundException("TariffPlan not found");
    this.resolveBranchId(principal, plan.branchId);

    const now = new Date();
    const retired = await this.prisma.tariffPlan.update({
      where: { id },
      data: { status: "RETIRED" as any, effectiveTo: now, isDefault: false },
    });

    await this.audit.log({
      branchId: plan.branchId,
      actorUserId: principal.userId,
      action: "BILLING_TARIFF_PLAN_RETIRE",
      entity: "TariffPlan",
      entityId: id,
      meta: { effectiveTo: now.toISOString() },
    });

    return retired;
  }

  async setTariffPlanDefault(principal: Principal, id: string, dto: SetDefaultTariffPlanDto) {
    const plan = await this.prisma.tariffPlan.findUnique({
      where: { id },
      select: { id: true, branchId: true, kind: true, contractId: true, status: true, isDefault: true },
    });
    if (!plan) throw new NotFoundException("TariffPlan not found");

    this.resolveBranchId(principal, plan.branchId);

    if (plan.status === ("RETIRED" as any)) {
      throw new BadRequestException("Cannot set default on a RETIRED plan");
    }

    const next = Boolean(dto?.isDefault);

    if (next === Boolean(plan.isDefault)) return plan as any;

    if (!next) {
      const updated = await this.prisma.tariffPlan.update({ where: { id }, data: { isDefault: false } });

      await this.audit.log({
        branchId: plan.branchId,
        actorUserId: principal.userId,
        action: "BILLING_TARIFF_PLAN_CLEAR_DEFAULT",
        entity: "TariffPlan",
        entityId: id,
        meta: { isDefault: false },
      });

      return updated;
    }

    const scopeWhere: any =
      plan.kind === ("PRICE_LIST" as any)
        ? { branchId: plan.branchId, kind: "PRICE_LIST" as any }
        : { branchId: plan.branchId, kind: "PAYER_CONTRACT" as any, contractId: plan.contractId };

    const [, updated] = await this.prisma.$transaction([
      this.prisma.tariffPlan.updateMany({
        where: { ...scopeWhere, id: { not: plan.id }, status: { not: "RETIRED" as any } },
        data: { isDefault: false },
      }),
      this.prisma.tariffPlan.update({ where: { id: plan.id }, data: { isDefault: true } }),
    ]);

    await this.audit.log({
      branchId: plan.branchId,
      actorUserId: principal.userId,
      action: "BILLING_TARIFF_PLAN_SET_DEFAULT",
      entity: "TariffPlan",
      entityId: id,
      meta: { isDefault: true },
    });

    return updated;
  }

  // ---------------- Tariff Rates ----------------

  async listTariffRates(
    principal: Principal,
    tariffPlanId: string,
    q: { chargeMasterItemId?: string; includeHistory?: boolean; includeRefs?: boolean },
  ) {
    const plan = await this.prisma.tariffPlan.findUnique({
      where: { id: tariffPlanId },
      select: { id: true, branchId: true },
    });
    if (!plan) throw new NotFoundException("TariffPlan not found");
    this.resolveBranchId(principal, plan.branchId);

    const where: any = { tariffPlanId };
    if (q.chargeMasterItemId) where.chargeMasterItemId = q.chargeMasterItemId;

    if (!q.includeHistory) {
      where.effectiveTo = null;
      where.isActive = true;
    }

    return this.prisma.tariffRate.findMany({
      where,
      orderBy: [{ chargeMasterItemId: "asc" }, { version: "desc" }],
      include: q.includeRefs ? { chargeMasterItem: true, taxCode: true } : undefined,
    });
  }

  private async openFixIt(
    branchId: string,
    input: {
      type: any;
      entityType?: any;
      entityId?: string | null;
      title: string;
      details?: any;
      severity?: any;
    },
  ) {
    const exists = await this.prisma.fixItTask.findFirst({
      where: {
        branchId,
        type: input.type,
        status: { in: ["OPEN", "IN_PROGRESS"] as any },
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
      },
      select: { id: true },
    });

    if (exists) return;

    await this.prisma.fixItTask.create({
      data: {
        branchId,
        type: input.type,
        status: "OPEN" as any,
        severity: (input.severity ?? "BLOCKER") as any,
        entityType: (input.entityType ?? null) as any,
        entityId: input.entityId ?? null,
        title: input.title,
        details: input.details ?? undefined,
      },
    });
  }

  private async resolveFixIts(branchId: string, where: any) {
    await this.prisma.fixItTask.updateMany({
      where: {
        branchId,
        status: { in: ["OPEN", "IN_PROGRESS"] as any },
        ...where,
      },
      data: { status: "RESOLVED" as any, resolvedAt: new Date() },
    });
  }

  async upsertTariffRate(principal: Principal, dto: UpsertTariffRateDto, tariffPlanIdParam?: string) {
    const tariffPlanId = tariffPlanIdParam ?? dto.tariffPlanId;
    if (!tariffPlanId) throw new BadRequestException("tariffPlanId is required");
    if (!dto.chargeMasterItemId) throw new BadRequestException("chargeMasterItemId is required");

    const plan = await this.prisma.tariffPlan.findUnique({
      where: { id: tariffPlanId },
      select: { id: true, branchId: true, status: true, currency: true },
    });
    if (!plan) throw new NotFoundException("TariffPlan not found");
    this.resolveBranchId(principal, plan.branchId);

    if (plan.status === ("RETIRED" as any)) throw new BadRequestException("Cannot modify rates on a RETIRED plan");

    const cm = await this.prisma.chargeMasterItem.findFirst({
      where: { id: dto.chargeMasterItemId, branchId: plan.branchId },
      select: { id: true, code: true, name: true, taxCodeId: true, chargeUnit: true },
    });
    if (!cm) throw new BadRequestException("Invalid chargeMasterItemId for this branch");

    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();
    if (Number.isNaN(effectiveFrom.getTime())) throw new BadRequestException("Invalid effectiveFrom");

    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;
    if (effectiveTo && Number.isNaN(effectiveTo.getTime())) throw new BadRequestException("Invalid effectiveTo");
    if (effectiveTo && effectiveTo <= effectiveFrom) throw new BadRequestException("effectiveTo must be after effectiveFrom");

    if (dto.taxCodeId) {
      const tx = await this.prisma.taxCode.findFirst({
        where: { id: dto.taxCodeId, branchId: plan.branchId, isActive: true },
        select: { id: true },
      });
      if (!tx) throw new BadRequestException("taxCodeId must refer to an ACTIVE TaxCode for this branch");
    }

    const rateAmount = (dto as any).rateAmount ?? (dto as any).amount;
    if (rateAmount === undefined || rateAmount === null) throw new BadRequestException("rateAmount is required");

    // Determine version
    let version = dto.version ?? null;
    if (!version) {
      const last = await this.prisma.tariffRate.findFirst({
        where: { tariffPlanId, chargeMasterItemId: cm.id },
        orderBy: [{ version: "desc" }],
        select: { version: true },
      });
      version = (last?.version ?? 0) + 1;
    }

    const existing = await this.prisma.tariffRate.findUnique({
      where: {
        tariffPlanId_chargeMasterItemId_version: {
          tariffPlanId,
          chargeMasterItemId: cm.id,
          version,
        } as any,
      },
      select: { id: true },
    });

    // If updating an existing version -> only allowed in DRAFT
    if (existing && plan.status !== ("DRAFT" as any)) {
      throw new BadRequestException(
        "Cannot edit an existing tariff version unless the plan is DRAFT (create a new version instead).",
      );
    }

    // Insert new version overlap rules + close previous open rates atomically
    if (!existing) {
      const overlapEnd = effectiveTo ?? new Date("9999-12-31T00:00:00.000Z");

      const overlaps = await this.prisma.tariffRate.findMany({
        where: {
          tariffPlanId,
          chargeMasterItemId: cm.id,
          effectiveFrom: { lt: overlapEnd },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: effectiveFrom } }],
        },
        select: { id: true, effectiveFrom: true, effectiveTo: true },
        orderBy: [{ effectiveFrom: "asc" }],
      });

      const invalidFuture = overlaps.some((r) => r.effectiveFrom >= effectiveFrom);
      if (invalidFuture) {
        throw new BadRequestException(
          "A future tariff rate already exists. Close/retire it before inserting an earlier effectiveFrom.",
        );
      }

      const toClose = overlaps.filter((r) => !r.effectiveTo || r.effectiveTo > effectiveFrom);
      if (toClose.length > 0) {
        await this.prisma.tariffRate.updateMany({
          where: { id: { in: toClose.map((x) => x.id) } },
          data: { effectiveTo: effectiveFrom },
        });
      }
    }

    const currency = ((dto as any).currency ?? plan.currency ?? "INR").toUpperCase();

    const saved = await this.prisma.tariffRate.upsert({
      where: {
        tariffPlanId_chargeMasterItemId_version: {
          tariffPlanId,
          chargeMasterItemId: cm.id,
          version,
        } as any,
      },
      update: {
        rateAmount: rateAmount as any,
        currency,
        isTaxInclusive: dto.isTaxInclusive ?? undefined,
        effectiveFrom,
        effectiveTo,
        taxCodeId: dto.taxCodeId ?? null,
        rules: (dto as any).rules ?? undefined,
        notes: (dto as any).notes ?? undefined,
        isActive: dto.effectiveTo ? false : true,
      },
      create: {
        tariffPlanId,
        chargeMasterItemId: cm.id,
        serviceCode: (dto as any).serviceCode ?? null,
        rateAmount: rateAmount as any,
        currency,
        version,
        isTaxInclusive: dto.isTaxInclusive ?? false,
        effectiveFrom,
        effectiveTo,
        taxCodeId: dto.taxCodeId ?? null,
        rules: (dto as any).rules ?? undefined,
        notes: (dto as any).notes ?? undefined,
        isActive: dto.effectiveTo ? false : true,
        createdByUserId: principal.userId,
      },
    });

    // -------- FixIt: charge unit mismatch (batch)
    const mappings = (await this.prisma.serviceChargeMapping.findMany({
      where: {
        branchId: plan.branchId,
        chargeMasterItemId: cm.id,
        effectiveTo: null,
      },
      select: BillingService.mappedServiceChargeSelect,
      take: 50000,
    })) as unknown as Array<
      Prisma.ServiceChargeMappingGetPayload<{ select: typeof BillingService.mappedServiceChargeSelect }>
    >;

    const mismatchSvcIds: string[] = [];
    const okSvcIds: string[] = [];

    for (const m of mappings) {
      const svc = m.serviceItem;
      if (!svc) continue;
      (svc.chargeUnit !== cm.chargeUnit ? mismatchSvcIds : okSvcIds).push(svc.id);
    }

    // Resolve all previously open mismatch tasks for OK services
    if (okSvcIds.length > 0) {
      await this.prisma.fixItTask.updateMany({
        where: {
          branchId: plan.branchId,
          type: "CHARGE_UNIT_MISMATCH" as any,
          status: { in: ["OPEN", "IN_PROGRESS"] as any },
          entityType: "SERVICE_ITEM" as any,
          entityId: { in: okSvcIds },
        } as any,
        data: { status: "RESOLVED" as any, resolvedAt: new Date() } as any,
      });
    }

    // Create missing mismatch tasks (avoid N+1 by checking existing in one query)
    if (mismatchSvcIds.length > 0) {
      const existingOpen = await this.prisma.fixItTask.findMany({
        where: {
          branchId: plan.branchId,
          type: "CHARGE_UNIT_MISMATCH" as any,
          status: { in: ["OPEN", "IN_PROGRESS"] as any },
          entityType: "SERVICE_ITEM" as any,
          entityId: { in: mismatchSvcIds },
        } as any,
        select: { entityId: true },
      });

      const existingSet = new Set(existingOpen.map((x: any) => x.entityId).filter(Boolean));
      const missing = mismatchSvcIds.filter((id) => !existingSet.has(id));

      if (missing.length > 0) {
        const byId = new Map<string, { code: string; name: string; chargeUnit: any }>();
        for (const m of mappings) {
          if (m.serviceItem?.id && missing.includes(m.serviceItem.id)) {
            byId.set(m.serviceItem.id, {
              code: m.serviceItem.code,
              name: m.serviceItem.name,
              chargeUnit: m.serviceItem.chargeUnit,
            });
          }
        }

        // createMany is fine here; if you have no unique constraint, duplicates are still prevented by existingSet.
        await this.prisma.fixItTask.createMany({
          data: missing.map((svcId) => {
            const svc = byId.get(svcId)!;
            return {
              branchId: plan.branchId,
              type: "CHARGE_UNIT_MISMATCH" as any,
              status: "OPEN" as any,
              severity: "BLOCKER" as any,
              entityType: "SERVICE_ITEM" as any,
              entityId: svcId,
              serviceItemId: svcId,
              title: `Charge unit mismatch for ${svc.code}`,
              details: {
                serviceItemId: svcId,
                serviceChargeUnit: svc.chargeUnit,
                chargeMasterItemId: cm.id,
                chargeMasterChargeUnit: cm.chargeUnit,
                tariffPlanId,
              },
            } as any;
          }),
        });
      }
    }

    // -------- FixIt: resolve missing tariff for this charge master item
    await this.resolveFixIts(plan.branchId, {
      type: "TARIFF_RATE_MISSING" as any,
      entityType: "CHARGE_MASTER_ITEM" as any,
      entityId: cm.id,
    });

    // -------- FixIt: tax code missing/inactive
    const effectiveTaxCodeId = (dto.taxCodeId ?? cm.taxCodeId) ?? null;

    if (!effectiveTaxCodeId) {
      await this.openFixIt(plan.branchId, {
        type: "TAX_CODE_MISSING" as any,
        entityType: "CHARGE_MASTER_ITEM" as any,
        entityId: cm.id,
        title: `Tax code missing for charge item ${cm.code}`,
        details: { chargeMasterItemId: cm.id, chargeMasterCode: cm.code, tariffPlanId },
        severity: "BLOCKER",
      });
    } else {
      const tx = await this.prisma.taxCode.findFirst({
        where: { id: effectiveTaxCodeId, branchId: plan.branchId },
        select: { id: true, code: true, isActive: true },
      });

      if (!tx || tx.isActive === false) {
        await this.openFixIt(plan.branchId, {
          type: "TAX_CODE_INACTIVE" as any,
          entityType: "TAX_CODE" as any,
          entityId: effectiveTaxCodeId,
          title: `Tax code inactive (${tx?.code ?? effectiveTaxCodeId})`,
          details: { chargeMasterItemId: cm.id, tariffPlanId, reason: "Used by tariff/charge master but inactive" },
          severity: "BLOCKER",
        });
      } else {
        await this.resolveFixIts(plan.branchId, {
          type: "TAX_CODE_MISSING" as any,
          entityType: "CHARGE_MASTER_ITEM" as any,
          entityId: cm.id,
        });
        await this.resolveFixIts(plan.branchId, {
          type: "TAX_CODE_INACTIVE" as any,
          entityType: "TAX_CODE" as any,
          entityId: effectiveTaxCodeId,
        });
      }
    }

    await this.audit.log({
      branchId: plan.branchId,
      actorUserId: principal.userId,
      action: "BILLING_TARIFF_RATE_UPSERT",
      entity: "TariffRate",
      entityId: saved.id,
      meta: { ...dto, tariffPlanId, version },
    });

    return saved;
  }

  async closeCurrentTariffRate(
    principal: Principal,
    tariffPlanId: string,
    chargeMasterItemId: string,
    effectiveToIso: string,
  ) {
    const plan = await this.prisma.tariffPlan.findUnique({
      where: { id: tariffPlanId },
      select: { id: true, branchId: true },
    });
    if (!plan) throw new NotFoundException("TariffPlan not found");
    this.resolveBranchId(principal, plan.branchId);

    const active = await this.prisma.tariffRate.findFirst({
      where: { tariffPlanId, chargeMasterItemId, effectiveTo: null },
      orderBy: [{ effectiveFrom: "desc" }],
      select: { id: true, effectiveFrom: true },
    });
    if (!active) throw new BadRequestException("No active tariff rate to close");

    const effectiveTo = new Date(effectiveToIso);
    if (Number.isNaN(effectiveTo.getTime())) throw new BadRequestException("Invalid effectiveTo");
    if (effectiveTo < active.effectiveFrom) throw new BadRequestException("effectiveTo cannot be before effectiveFrom");

    const updated = await this.prisma.tariffRate.update({
      where: { id: active.id },
      data: { effectiveTo, isActive: false },
    });

    await this.audit.log({
      branchId: plan.branchId,
      actorUserId: principal.userId,
      action: "BILLING_TARIFF_RATE_CLOSE",
      entity: "TariffRate",
      entityId: updated.id,
      meta: { tariffPlanId, chargeMasterItemId, effectiveTo: effectiveTo.toISOString() },
    });

    return updated;
  }

  async updateTariffRateById(principal: Principal, id: string, dto: UpdateTariffRateDto) {
    const rate = await this.prisma.tariffRate.findUnique({
      where: { id },
      select: { id: true, tariffPlanId: true, chargeMasterItemId: true },
    });
    if (!rate) throw new NotFoundException("TariffRate not found");

    const plan = await this.prisma.tariffPlan.findUnique({
      where: { id: rate.tariffPlanId },
      select: { id: true, branchId: true, status: true, currency: true },
    });
    if (!plan) throw new NotFoundException("TariffPlan not found");
    this.resolveBranchId(principal, plan.branchId);

    if (plan.status !== ("DRAFT" as any)) {
      throw new BadRequestException("Only DRAFT plans can edit an existing rate. Create a new version instead.");
    }

    const rateAmount = (dto as any).rateAmount ?? (dto as any).amount;
    const currency = ((dto as any).currency ?? plan.currency ?? "INR").toUpperCase();

    if ((dto as any).taxCodeId) {
      const tx = await this.prisma.taxCode.findFirst({
        where: { id: (dto as any).taxCodeId, branchId: plan.branchId, isActive: true },
        select: { id: true },
      });
      if (!tx) throw new BadRequestException("taxCodeId must be ACTIVE and belong to this branch");
    }

    const effFrom = (dto as any).effectiveFrom ? new Date((dto as any).effectiveFrom) : undefined;
    if (effFrom && Number.isNaN(effFrom.getTime())) throw new BadRequestException("Invalid effectiveFrom");

    const effTo =
      (dto as any).effectiveTo ? new Date((dto as any).effectiveTo) : (dto as any).effectiveTo === null ? null : undefined;
    if (effTo && Number.isNaN(effTo.getTime())) throw new BadRequestException("Invalid effectiveTo");

    const updated = await this.prisma.tariffRate.update({
      where: { id },
      data: {
        rateAmount: rateAmount === undefined ? undefined : (rateAmount as any),
        currency: (dto as any).currency === undefined ? undefined : currency,
        taxCodeId: (dto as any).taxCodeId === undefined ? undefined : ((dto as any).taxCodeId ?? null),
        isTaxInclusive: (dto as any).isTaxInclusive === undefined ? undefined : (dto as any).isTaxInclusive,
        effectiveFrom: effFrom,
        effectiveTo: effTo,
        rules: (dto as any).rules === undefined ? undefined : ((dto as any).rules as any),
        notes: (dto as any).notes === undefined ? undefined : (dto as any).notes,
        isActive: effTo === null ? true : effTo ? false : undefined,
      },
      include: { chargeMasterItem: true, taxCode: true },
    });

    await this.audit.log({
      branchId: plan.branchId,
      actorUserId: principal.userId,
      action: "BILLING_TARIFF_RATE_UPDATE",
      entity: "TariffRate",
      entityId: id,
      meta: dto,
    });

    return updated;
  }

  async closeTariffRateById(principal: Principal, id: string, effectiveToIso: string) {
    const rate = await this.prisma.tariffRate.findUnique({
      where: { id },
      select: { id: true, tariffPlanId: true, effectiveFrom: true, effectiveTo: true },
    });
    if (!rate) throw new NotFoundException("TariffRate not found");

    const plan = await this.prisma.tariffPlan.findUnique({
      where: { id: rate.tariffPlanId },
      select: { id: true, branchId: true },
    });
    if (!plan) throw new NotFoundException("TariffPlan not found");
    this.resolveBranchId(principal, plan.branchId);

    if (rate.effectiveTo) return rate as any;

    const effectiveTo = new Date(effectiveToIso);
    if (Number.isNaN(effectiveTo.getTime())) throw new BadRequestException("Invalid effectiveTo");
    if (effectiveTo < rate.effectiveFrom) throw new BadRequestException("effectiveTo cannot be before effectiveFrom");

    const updated = await this.prisma.tariffRate.update({
      where: { id },
      data: { effectiveTo, isActive: false },
    });

    await this.audit.log({
      branchId: plan.branchId,
      actorUserId: principal.userId,
      action: "BILLING_TARIFF_RATE_CLOSE",
      entity: "TariffRate",
      entityId: id,
      meta: { effectiveTo: effectiveTo.toISOString() },
    });

    return updated;
  }

  async deactivateTariffRateById(principal: Principal, id: string) {
    const rate = await this.prisma.tariffRate.findUnique({
      where: { id },
      select: { id: true, tariffPlanId: true, effectiveTo: true },
    });
    if (!rate) throw new NotFoundException("TariffRate not found");

    const plan = await this.prisma.tariffPlan.findUnique({
      where: { id: rate.tariffPlanId },
      select: { id: true, branchId: true },
    });
    if (!plan) throw new NotFoundException("TariffPlan not found");
    this.resolveBranchId(principal, plan.branchId);

    const updated = await this.prisma.tariffRate.update({
      where: { id },
      data: { isActive: false, effectiveTo: rate.effectiveTo ?? new Date() },
    });

    await this.audit.log({
      branchId: plan.branchId,
      actorUserId: principal.userId,
      action: "BILLING_TARIFF_RATE_DEACTIVATE",
      entity: "TariffRate",
      entityId: id,
      meta: {},
    });

    return updated;
  }
}
