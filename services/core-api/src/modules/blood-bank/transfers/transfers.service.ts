import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { BBContextService } from "../shared/bb-context.service";
import { NotificationsService } from "../../notifications/notifications.service";
import type { CreateTransferDto, DispatchTransferDto } from "./dto";

@Injectable()
export class TransfersService {
  constructor(
    private readonly ctx: BBContextService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(
    principal: Principal,
    opts: { branchId?: string | null; dir?: "in" | "out" | "all"; status?: string; take?: number },
  ) {
    const bid = this.ctx.resolveBranchId(principal, opts.branchId);
    const dir = opts.dir ?? "all";

    const where: any = {};
    if (dir === "in") where.toBranchId = bid;
    else if (dir === "out") where.fromBranchId = bid;
    else where.OR = [{ fromBranchId: bid }, { toBranchId: bid }];

    if (opts.status) where.status = opts.status;

    return this.ctx.prisma.bloodUnitTransfer.findMany({
      where,
      include: {
        fromBranch: { select: { id: true, code: true, name: true, city: true } },
        toBranch: { select: { id: true, code: true, name: true, city: true } },
        items: {
          include: {
            bloodUnit: {
              select: {
                id: true,
                unitNumber: true,
                bloodGroup: true,
                componentType: true,
                status: true,
                expiryDate: true,
              },
            },
          },
        },
        createdByUser: { select: { id: true, name: true, email: true } },
        dispatchedByUser: { select: { id: true, name: true, email: true } },
        receivedByUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(opts.take ?? 100, 300),
    });
  }

  async get(principal: Principal, id: string) {
    const t = await this.ctx.prisma.bloodUnitTransfer.findUnique({
      where: { id },
      include: {
        fromBranch: { select: { id: true, code: true, name: true, city: true } },
        toBranch: { select: { id: true, code: true, name: true, city: true } },
        items: { include: { bloodUnit: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
        dispatchedByUser: { select: { id: true, name: true, email: true } },
        receivedByUser: { select: { id: true, name: true, email: true } },
      },
    });
    if (!t) throw new NotFoundException("Transfer not found");
    // Access if principal can operate on either side; branch-scoped users should only see their own.
    this.ctx.resolveBranchId(principal, t.fromBranchId);
    return t;
  }

  async create(principal: Principal, dto: CreateTransferDto) {
    const fromBranchId = this.ctx.resolveBranchId(principal, dto.branchId ?? null);
    const toBranchId = String(dto.toBranchId || "").trim();
    if (!toBranchId) throw new BadRequestException("toBranchId is required");
    if (toBranchId === fromBranchId) throw new BadRequestException("toBranchId must be different from fromBranchId");

    const unitIds = Array.from(new Set((dto.unitIds ?? []).map((u) => String(u).trim()).filter(Boolean)));
    if (!unitIds.length) throw new BadRequestException("unitIds is required");
    if (unitIds.length > 100) throw new BadRequestException("Maximum 100 units per transfer");

    const units = await this.ctx.prisma.bloodUnit.findMany({
      where: { id: { in: unitIds }, branchId: fromBranchId },
      select: { id: true, status: true, unitNumber: true },
    });
    if (units.length !== unitIds.length) {
      throw new BadRequestException("One or more units are missing or not in the source branch");
    }
    const invalid = units.filter((u) => u.status !== "AVAILABLE");
    if (invalid.length) {
      throw new BadRequestException(
        `Only AVAILABLE units can be transferred. Invalid: ${invalid.map((u) => `${u.unitNumber}(${u.status})`).join(", ")}`,
      );
    }

    const result = await this.ctx.prisma.$transaction(async (tx) => {
      const transfer = await tx.bloodUnitTransfer.create({
        data: {
          fromBranchId,
          toBranchId,
          status: "INITIATED",
          createdByUserId: principal.userId,
          notes: dto.notes?.trim() || undefined,
          items: {
            createMany: {
              data: unitIds.map((id) => ({ bloodUnitId: id })),
            },
          },
        },
      });

      await tx.bloodUnit.updateMany({
        where: { id: { in: unitIds } },
        data: { status: "TRANSFER_PENDING" },
      });

      await this.ctx.audit.log(
        {
          branchId: fromBranchId,
          actorUserId: principal.userId,
          action: "BB_TRANSFER_REQUESTED",
          entity: "BloodUnitTransfer",
          entityId: transfer.id,
          meta: { toBranchId, unitCount: unitIds.length },
        },
        tx,
      );

      return transfer;
    });

    // Notify destination branch (non-blocking)
    try {
      await this.notifications.create(principal, {
        branchId: toBranchId,
        title: `Incoming blood unit transfer requested`,
        message: `Transfer requested from ${fromBranchId} with ${unitIds.length} unit(s).`,
        severity: "INFO",
        source: "blood-bank",
        entity: "BloodUnitTransfer",
        entityId: result.id,
        tags: ["blood-bank", "transfer"],
      });
    } catch {
      // ignore
    }

    return this.get(principal, result.id);
  }

  async dispatch(principal: Principal, id: string, dto: DispatchTransferDto) {
    const transfer = await this.ctx.prisma.bloodUnitTransfer.findUnique({
      where: { id },
      include: { items: { select: { bloodUnitId: true } } },
    });
    if (!transfer) throw new NotFoundException("Transfer not found");

    const fromBranchId = this.ctx.resolveBranchId(principal, transfer.fromBranchId);
    if (transfer.status !== "INITIATED") throw new BadRequestException(`Cannot dispatch transfer in status ${transfer.status}`);

    const unitIds = transfer.items.map((i) => i.bloodUnitId);
    if (!unitIds.length) throw new BadRequestException("Transfer has no items");

    await this.ctx.prisma.$transaction(async (tx) => {
      await tx.bloodUnitTransfer.update({
        where: { id },
        data: {
          status: "DISPATCHED",
          dispatchedAt: new Date(),
          dispatchedByUserId: principal.userId,
          courierName: dto.courierName?.trim() || undefined,
          dispatchTempC: dto.transportBoxTempC != null ? dto.transportBoxTempC : undefined,
        },
      });

      await tx.bloodUnit.updateMany({
        where: { id: { in: unitIds } },
        data: { status: "IN_TRANSIT" },
      });

      // Remove storage slots: units physically leave the facility
      await tx.bloodInventorySlot.deleteMany({ where: { bloodUnitId: { in: unitIds } } });

      await this.ctx.audit.log(
        {
          branchId: fromBranchId,
          actorUserId: principal.userId,
          action: "BB_TRANSFER_DISPATCHED",
          entity: "BloodUnitTransfer",
          entityId: id,
          meta: { toBranchId: transfer.toBranchId, unitCount: unitIds.length, courierName: dto.courierName, tempC: dto.transportBoxTempC },
        },
        tx,
      );
    });

    try {
      await this.notifications.create(principal, {
        branchId: transfer.toBranchId,
        title: `Incoming blood unit transfer dispatched`,
        message: `Transfer dispatched from ${transfer.fromBranchId}. Please receive on arrival.`,
        severity: "WARNING",
        source: "blood-bank",
        entity: "BloodUnitTransfer",
        entityId: id,
        tags: ["blood-bank", "transfer"],
      });
    } catch {
      // ignore
    }

    return this.get(principal, id);
  }

  async receive(principal: Principal, id: string) {
    const transfer = await this.ctx.prisma.bloodUnitTransfer.findUnique({
      where: { id },
      include: { items: { select: { bloodUnitId: true } } },
    });
    if (!transfer) throw new NotFoundException("Transfer not found");

    const toBranchId = this.ctx.resolveBranchId(principal, transfer.toBranchId);
    if (transfer.status !== "DISPATCHED") throw new BadRequestException(`Cannot receive transfer in status ${transfer.status}`);

    const unitIds = transfer.items.map((i) => i.bloodUnitId);
    if (!unitIds.length) throw new BadRequestException("Transfer has no items");

    await this.ctx.prisma.$transaction(async (tx) => {
      await tx.bloodUnitTransfer.update({
        where: { id },
        data: {
          status: "RECEIVED",
          receivedAt: new Date(),
          receivedByUserId: principal.userId,
        },
      });

      await tx.bloodUnit.updateMany({
        where: { id: { in: unitIds } },
        data: { branchId: toBranchId, status: "AVAILABLE" },
      });

      // Auto-placement: drop into default active refrigerator if available.
      const defaultEq = await tx.bloodBankEquipment.findFirst({
        where: { branchId: toBranchId, isActive: true, equipmentType: "REFRIGERATOR" },
        orderBy: [{ capacityUnits: "desc" }, { createdAt: "asc" }],
      });
      if (defaultEq) {
        const currentCount = await tx.bloodInventorySlot.count({ where: { equipmentId: defaultEq.id } });
        const free = Math.max((defaultEq.capacityUnits ?? 0) - currentCount, 0);
        const toPlace = unitIds.slice(0, free);
        if (toPlace.length) {
          await tx.bloodInventorySlot.createMany({
            data: toPlace.map((bloodUnitId) => ({
              bloodUnitId,
              equipmentId: defaultEq.id,
              shelf: null,
              slot: null,
            })),
          });
        }
      }

      await this.ctx.audit.log(
        {
          branchId: toBranchId,
          actorUserId: principal.userId,
          action: "BB_TRANSFER_RECEIVED",
          entity: "BloodUnitTransfer",
          entityId: id,
          meta: { fromBranchId: transfer.fromBranchId, unitCount: unitIds.length },
        },
        tx,
      );
    });

    try {
      await this.notifications.create(principal, {
        branchId: transfer.fromBranchId,
        title: `Blood unit transfer received`,
        message: `Transfer ${id} received by destination branch.`,
        severity: "INFO",
        source: "blood-bank",
        entity: "BloodUnitTransfer",
        entityId: id,
        tags: ["blood-bank", "transfer"],
      });
    } catch {
      // ignore
    }

    return this.get(principal, id);
  }

  async cancel(principal: Principal, id: string) {
    const transfer = await this.ctx.prisma.bloodUnitTransfer.findUnique({
      where: { id },
      include: { items: { select: { bloodUnitId: true } } },
    });
    if (!transfer) throw new NotFoundException("Transfer not found");
    const fromBranchId = this.ctx.resolveBranchId(principal, transfer.fromBranchId);
    if (transfer.status !== "INITIATED") throw new BadRequestException(`Cannot cancel transfer in status ${transfer.status}`);

    const unitIds = transfer.items.map((i) => i.bloodUnitId);
    await this.ctx.prisma.$transaction(async (tx) => {
      await tx.bloodUnitTransfer.update({ where: { id }, data: { status: "CANCELLED" } });
      await tx.bloodUnit.updateMany({ where: { id: { in: unitIds } }, data: { status: "AVAILABLE" } });
      await this.ctx.audit.log(
        {
          branchId: fromBranchId,
          actorUserId: principal.userId,
          action: "BB_TRANSFER_CANCELLED",
          entity: "BloodUnitTransfer",
          entityId: id,
          meta: { toBranchId: transfer.toBranchId, unitCount: unitIds.length },
        },
        tx,
      );
    });

    return this.get(principal, id);
  }
}
