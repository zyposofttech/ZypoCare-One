import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { InfraContextService } from "../shared/infra-context.service";
import type { CreatePharmacyStoreDto, UpdatePharmacyStoreDto } from "./dto";

@Injectable()
export class PharmacyService {
  constructor(private readonly ctx: InfraContextService) {}

  async listStores(
    principal: Principal,
    q: { branchId?: string; storeType?: string; status?: string; q?: string; page?: string; pageSize?: string },
  ) {
    const branchId = this.ctx.resolveBranchId(principal, q.branchId ?? null);
    const where: any = { branchId };
    if (q.storeType) where.storeType = q.storeType;
    if (q.status) where.status = q.status;
    if (q.q) {
      where.OR = [
        { storeName: { contains: q.q, mode: "insensitive" } },
        { storeCode: { contains: q.q, mode: "insensitive" } },
      ];
    }

    const page = Math.max(1, Number(q.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(q.pageSize ?? 50)));
    const skip = (page - 1) * pageSize;

    const [rows, total] = await this.ctx.prisma.$transaction([
      this.ctx.prisma.pharmacyStore.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip,
        take: pageSize,
        include: {
          parentStore: { select: { id: true, storeCode: true, storeName: true } },
          pharmacistInCharge: { select: { id: true, empCode: true, name: true } },
          locationNode: { select: { id: true } },
        },
      }),
      this.ctx.prisma.pharmacyStore.count({ where }),
    ]);

    return { page, pageSize, total, rows };
  }

  async getStoreHierarchy(principal: Principal, branchIdParam?: string) {
    const branchId = this.ctx.resolveBranchId(principal, branchIdParam ?? null);
    const stores = await this.ctx.prisma.pharmacyStore.findMany({
      where: { branchId },
      orderBy: [{ storeType: "asc" }, { createdAt: "asc" }],
      include: {
        pharmacistInCharge: { select: { id: true, name: true } },
      },
    });

    // Build tree
    const map = new Map<string, any>();
    const roots: any[] = [];
    for (const s of stores) {
      map.set(s.id, { ...s, children: [] });
    }
    for (const s of stores) {
      const node = map.get(s.id)!;
      if (s.parentStoreId && map.has(s.parentStoreId)) {
        map.get(s.parentStoreId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async getStore(principal: Principal, id: string) {
    const store = await this.ctx.prisma.pharmacyStore.findUnique({
      where: { id },
      include: {
        parentStore: { select: { id: true, storeCode: true, storeName: true } },
        pharmacistInCharge: { select: { id: true, empCode: true, name: true, designation: true } },
        childStores: { select: { id: true, storeCode: true, storeName: true, storeType: true, status: true } },
        drugLicenseHistory: { orderBy: [{ createdAt: "desc" }], take: 10 },
      },
    });
    if (!store) throw new NotFoundException("Pharmacy store not found");
    this.ctx.resolveBranchId(principal, store.branchId);
    return store;
  }

  async createStore(principal: Principal, dto: CreatePharmacyStoreDto, branchIdParam?: string | null) {
    const branchId = this.ctx.resolveBranchId(principal, branchIdParam ?? null);
    const storeCode = dto.storeCode.toUpperCase().trim();

    // BR-001: Only 1 MAIN store per branch
    if (dto.storeType === "MAIN") {
      const existingMain = await this.ctx.prisma.pharmacyStore.findFirst({
        where: { branchId, storeType: "MAIN" },
        select: { id: true },
      });
      if (existingMain) {
        throw new BadRequestException("Only one MAIN pharmacy store is allowed per branch");
      }
    }

    // BR-002: Sub-stores must have parent
    if (dto.storeType !== "MAIN" && !dto.parentStoreId) {
      throw new BadRequestException("Non-MAIN stores must have a parent store assigned");
    }

    // BR-004: Emergency must be 24x7
    if (dto.storeType === "EMERGENCY" && dto.is24x7 === false) {
      throw new BadRequestException("Emergency pharmacy must be flagged as 24x7");
    }

    // Validate parent store belongs to same branch
    if (dto.parentStoreId) {
      const parent = await this.ctx.prisma.pharmacyStore.findFirst({
        where: { id: dto.parentStoreId, branchId },
        select: { id: true },
      });
      if (!parent) throw new BadRequestException("Parent store not found in this branch");
    }

    // Validate pharmacist exists
    if (dto.pharmacistInChargeId) {
      const staff = await this.ctx.prisma.staff.findFirst({
        where: { id: dto.pharmacistInChargeId },
        select: { id: true },
      });
      if (!staff) throw new BadRequestException("Pharmacist staff not found");
    }

    const created = await this.ctx.prisma.pharmacyStore.create({
      data: {
        branchId,
        storeCode,
        storeName: dto.storeName.trim(),
        storeType: dto.storeType as any,
        parentStoreId: dto.parentStoreId ?? null,
        locationNodeId: dto.locationNodeId ?? null,
        pharmacistInChargeId: dto.pharmacistInChargeId ?? null,
        drugLicenseNumber: dto.drugLicenseNumber ?? null,
        drugLicenseExpiry: dto.drugLicenseExpiry ? new Date(dto.drugLicenseExpiry) : null,
        is24x7: dto.storeType === "EMERGENCY" ? true : (dto.is24x7 ?? false),
        canDispense: dto.canDispense ?? false,
        canIndent: dto.canIndent ?? true,
        canReceiveStock: dto.canReceiveStock ?? false,
        canReturnVendor: dto.canReturnVendor ?? false,
        operatingHours: dto.operatingHours ?? null,
        autoIndentEnabled: dto.autoIndentEnabled ?? false,
        status: "UNDER_SETUP" as any,
      },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_PHARMACY_STORE_CREATE",
      entity: "PharmacyStore",
      entityId: created.id,
      meta: dto,
    });

    return created;
  }

  async updateStore(principal: Principal, id: string, dto: UpdatePharmacyStoreDto) {
    const current = await this.ctx.prisma.pharmacyStore.findUnique({
      where: { id },
      select: { id: true, branchId: true, storeType: true },
    });
    if (!current) throw new NotFoundException("Pharmacy store not found");
    const branchId = this.ctx.resolveBranchId(principal, current.branchId);

    // Validate parent if changing
    if (dto.parentStoreId !== undefined && dto.parentStoreId) {
      if (dto.parentStoreId === id) throw new BadRequestException("Store cannot be its own parent");
      const parent = await this.ctx.prisma.pharmacyStore.findFirst({
        where: { id: dto.parentStoreId, branchId },
        select: { id: true },
      });
      if (!parent) throw new BadRequestException("Parent store not found in this branch");
    }

    const data: any = {};
    if (dto.storeName !== undefined) data.storeName = dto.storeName.trim();
    if (dto.parentStoreId !== undefined) data.parentStoreId = dto.parentStoreId;
    if (dto.locationNodeId !== undefined) data.locationNodeId = dto.locationNodeId;
    if (dto.pharmacistInChargeId !== undefined) data.pharmacistInChargeId = dto.pharmacistInChargeId;
    if (dto.drugLicenseNumber !== undefined) data.drugLicenseNumber = dto.drugLicenseNumber;
    if (dto.drugLicenseExpiry !== undefined) data.drugLicenseExpiry = dto.drugLicenseExpiry ? new Date(dto.drugLicenseExpiry) : null;
    if (dto.is24x7 !== undefined) data.is24x7 = dto.is24x7;
    if (dto.canDispense !== undefined) data.canDispense = dto.canDispense;
    if (dto.canIndent !== undefined) data.canIndent = dto.canIndent;
    if (dto.canReceiveStock !== undefined) data.canReceiveStock = dto.canReceiveStock;
    if (dto.canReturnVendor !== undefined) data.canReturnVendor = dto.canReturnVendor;
    if (dto.operatingHours !== undefined) data.operatingHours = dto.operatingHours;
    if (dto.autoIndentEnabled !== undefined) data.autoIndentEnabled = dto.autoIndentEnabled;

    const updated = await this.ctx.prisma.pharmacyStore.update({ where: { id }, data });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_PHARMACY_STORE_UPDATE",
      entity: "PharmacyStore",
      entityId: id,
      meta: dto,
    });

    return updated;
  }

  async updateStoreStatus(principal: Principal, id: string, status: string) {
    const store = await this.ctx.prisma.pharmacyStore.findUnique({
      where: { id },
      select: {
        id: true,
        branchId: true,
        storeType: true,
        drugLicenseNumber: true,
        pharmacistInChargeId: true,
        parentStoreId: true,
      },
    });
    if (!store) throw new NotFoundException("Pharmacy store not found");
    const branchId = this.ctx.resolveBranchId(principal, store.branchId);

    // BR-005: Activation validation
    if (status === "ACTIVE") {
      if (!store.drugLicenseNumber) {
        throw new BadRequestException("Cannot activate store without a valid drug license number");
      }
      if (!store.pharmacistInChargeId) {
        throw new BadRequestException("Cannot activate store without a pharmacist-in-charge assigned");
      }
      if (store.storeType !== "MAIN" && !store.parentStoreId) {
        throw new BadRequestException("Cannot activate sub-store without a parent store");
      }
    }

    const updated = await this.ctx.prisma.pharmacyStore.update({
      where: { id },
      data: { status: status as any },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_PHARMACY_STORE_STATUS_CHANGE",
      entity: "PharmacyStore",
      entityId: id,
      meta: { status },
    });

    return updated;
  }

  async listLicenseHistory(
    principal: Principal,
    storeId: string,
    q: { page?: string; pageSize?: string },
  ) {
    const store = await this.ctx.prisma.pharmacyStore.findUnique({
      where: { id: storeId },
      select: { id: true, branchId: true },
    });
    if (!store) throw new NotFoundException("Pharmacy store not found");
    this.ctx.resolveBranchId(principal, store.branchId);

    const page = Math.max(1, Number(q.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(q.pageSize ?? 50)));
    const skip = (page - 1) * pageSize;

    const [rows, total] = await this.ctx.prisma.$transaction([
      this.ctx.prisma.drugLicenseHistory.findMany({
        where: { pharmacyStoreId: storeId },
        orderBy: [{ validFrom: "desc" }],
        skip,
        take: pageSize,
        include: {
          uploadedByUser: { select: { id: true, name: true } },
        },
      }),
      this.ctx.prisma.drugLicenseHistory.count({
        where: { pharmacyStoreId: storeId },
      }),
    ]);

    return { page, pageSize, total, rows };
  }

  async addLicenseHistory(
    principal: Principal,
    storeId: string,
    dto: { licenseNumber: string; validFrom: string; validTo: string; documentUrl?: string },
  ) {
    const store = await this.ctx.prisma.pharmacyStore.findUnique({
      where: { id: storeId },
      select: { id: true, branchId: true, drugLicenseExpiry: true },
    });
    if (!store) throw new NotFoundException("Pharmacy store not found");
    const branchId = this.ctx.resolveBranchId(principal, store.branchId);

    const validFrom = new Date(dto.validFrom);
    const validTo = new Date(dto.validTo);

    if (isNaN(validFrom.getTime()) || isNaN(validTo.getTime())) {
      throw new BadRequestException("Invalid date format for validFrom or validTo");
    }
    if (validTo <= validFrom) {
      throw new BadRequestException("validTo must be after validFrom");
    }

    const record = await this.ctx.prisma.drugLicenseHistory.create({
      data: {
        pharmacyStoreId: storeId,
        licenseNumber: dto.licenseNumber.trim(),
        validFrom,
        validTo,
        documentUrl: dto.documentUrl ?? null,
        uploadedByUserId: principal.userId,
      },
    });

    // Update store license fields if new validTo is later than current expiry
    const shouldUpdate = !store.drugLicenseExpiry || validTo > store.drugLicenseExpiry;
    if (shouldUpdate) {
      await this.ctx.prisma.pharmacyStore.update({
        where: { id: storeId },
        data: {
          drugLicenseNumber: dto.licenseNumber.trim(),
          drugLicenseExpiry: validTo,
        },
      });
    }

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "PHARMACY_STORE_LICENSE_RENEW",
      entity: "DrugLicenseHistory",
      entityId: record.id,
      meta: { ...dto, pharmacyStoreId: storeId, storeUpdated: shouldUpdate },
    });

    return record;
  }

  async storeSummary(principal: Principal, branchIdParam?: string) {
    const branchId = this.ctx.resolveBranchId(principal, branchIdParam ?? null);

    const [byType, byStatus, total] = await this.ctx.prisma.$transaction([
      this.ctx.prisma.pharmacyStore.groupBy({
        by: ["storeType"],
        where: { branchId },
        orderBy: { storeType: "asc" },
        _count: { _all: true },
      }),
      this.ctx.prisma.pharmacyStore.groupBy({
        by: ["status"],
        where: { branchId },
        orderBy: { status: "asc" },
        _count: { _all: true },
      }),
      this.ctx.prisma.pharmacyStore.count({ where: { branchId } }),
    ]);

    return { branchId, total, byType, byStatus };
  }
}
