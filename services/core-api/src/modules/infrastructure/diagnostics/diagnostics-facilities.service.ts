import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@zypocare/db";
import type { Principal } from "./diagnostics.principal";
import { assertCode, assertName, resolveBranchId } from "./diagnostics.util";
import type { CreateServicePointDto, ListServicePointsQuery, UpdateServicePointDto } from "./dto/service-point.dto";
import type { AddEquipmentToServicePointDto, AddResourceToServicePointDto, AddRoomToServicePointDto } from "./dto/mappings.dto";

@Injectable()
export class DiagnosticsFacilitiesService {
  constructor(@Inject("PRISMA") private readonly prisma: PrismaClient) {}

  // ---------- Service Points ----------
  async listServicePoints(principal: Principal, q: ListServicePointsQuery) {
    const branchId = resolveBranchId(principal, q.branchId);

    const where: any = {
      branchId,
      ...(q.includeInactive ? {} : { isActive: true }),
      ...(q.type ? { type: q.type } : {}),
      ...(q.q
        ? {
            OR: [
              { code: { contains: q.q, mode: "insensitive" } },
              { name: { contains: q.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    return this.prisma.diagnosticServicePoint.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        locationNode: true,
        unit: true,
        _count: { select: { rooms: true, resources: true, equipment: true, staff: true, sections: true } },
      },
    });
  }

  async getServicePoint(principal: Principal, args: { id: string; branchId: string }) {
    const branchId = resolveBranchId(principal, args.branchId);

    const sp = await this.prisma.diagnosticServicePoint.findFirst({
      where: { id: args.id, branchId },
      include: { locationNode: true, unit: true },
    });
    if (!sp) throw new NotFoundException("Diagnostic service point not found");
    return sp;
  }

  async createServicePoint(principal: Principal, dto: CreateServicePointDto) {
    const branchId = resolveBranchId(principal, dto.branchId);

    const code = assertCode(dto.code, "Service point");
    const name = assertName(dto.name, "Service point");

    // location must exist in same branch
    const node = await this.prisma.locationNode.findFirst({
      where: { id: dto.locationNodeId, branchId },
      select: { id: true },
    });
    if (!node) throw new BadRequestException("Invalid locationNodeId for this branch");

    let unitId: string | null = dto.unitId ?? null;
    if (unitId) {
      const unit = await this.prisma.unit.findFirst({
        where: { id: unitId, branchId, isActive: true },
        select: { id: true, locationNodeId: true },
      });
      if (!unit) throw new BadRequestException("Invalid unitId for this branch");
      // keep data consistent: unit location should match
      if (unit.locationNodeId && unit.locationNodeId !== dto.locationNodeId) {
        throw new BadRequestException("unitId locationNodeId does not match service point locationNodeId");
      }
      if (!unit.locationNodeId) {
        throw new BadRequestException("Selected unit is not tagged to a locationNode; tag unit first");
      }
    }

    return this.prisma.diagnosticServicePoint.create({
      data: {
        branchId,
        locationNodeId: dto.locationNodeId,
        unitId,
        code,
        name,
        type: dto.type ?? "OTHER",
        sortOrder: dto.sortOrder ?? 0,
        notes: dto.notes ?? null,
        operatingHours: dto.operatingHours ?? undefined,
        capacity: dto.capacity ?? undefined,
      },
      include: { locationNode: true, unit: true },
    });
  }

  async updateServicePoint(principal: Principal, id: string, dto: UpdateServicePointDto) {
    const existing = await this.prisma.diagnosticServicePoint.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Diagnostic service point not found");

    const branchId = resolveBranchId(principal, dto.branchId ?? existing.branchId);

    const nextLocationNodeId = dto.locationNodeId ?? existing.locationNodeId;

    // If locationNodeId changes, validate within branch
    if (dto.locationNodeId && dto.locationNodeId !== existing.locationNodeId) {
      const node = await this.prisma.locationNode.findFirst({
        where: { id: dto.locationNodeId, branchId },
        select: { id: true },
      });
      if (!node) throw new BadRequestException("Invalid locationNodeId for this branch");
    }

    // unitId validation
    let nextUnitId: string | null | undefined = undefined;
    if (dto.unitId !== undefined) {
      nextUnitId = dto.unitId === null ? null : dto.unitId;
      if (nextUnitId) {
        const unit = await this.prisma.unit.findFirst({
          where: { id: nextUnitId, branchId, isActive: true },
          select: { id: true, locationNodeId: true },
        });
        if (!unit) throw new BadRequestException("Invalid unitId for this branch");
        if (!unit.locationNodeId) throw new BadRequestException("Selected unit is not tagged to a locationNode; tag unit first");
        if (unit.locationNodeId !== nextLocationNodeId) {
          throw new BadRequestException("unitId locationNodeId does not match service point locationNodeId");
        }
      }
    }

    return this.prisma.diagnosticServicePoint.update({
      where: { id },
      data: {
        ...(dto.code ? { code: assertCode(dto.code, "Service point") } : {}),
        ...(dto.name ? { name: assertName(dto.name, "Service point") } : {}),
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.locationNodeId ? { locationNodeId: dto.locationNodeId } : {}),
        ...(nextUnitId !== undefined ? { unitId: nextUnitId } : {}),
        ...(dto.operatingHours !== undefined ? { operatingHours: dto.operatingHours } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
      },
      include: { locationNode: true, unit: true },
    });
  }

  async deleteServicePoint(principal: Principal, args: { id: string; branchId: string }) {
    const branchId = resolveBranchId(principal, args.branchId);
    const sp = await this.prisma.diagnosticServicePoint.findFirst({ where: { id: args.id, branchId } });
    if (!sp) throw new NotFoundException("Diagnostic service point not found");

    return this.prisma.diagnosticServicePoint.update({
      where: { id: args.id },
      data: { isActive: false },
    });
  }

  // ---------- Rooms ----------
  async listRooms(principal: Principal, args: { servicePointId: string; branchId: string }) {
    const branchId = resolveBranchId(principal, args.branchId);
    await this.assertServicePoint(branchId, args.servicePointId);

    return this.prisma.diagnosticServicePointRoom.findMany({
      where: { branchId, servicePointId: args.servicePointId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { room: { include: { unit: true } } },
    });
  }

  async addRoom(principal: Principal, args: { servicePointId: string; branchId: string }, dto: AddRoomToServicePointDto) {
    const branchId = resolveBranchId(principal, args.branchId);
    await this.assertServicePoint(branchId, args.servicePointId);

    const room = await this.prisma.unitRoom.findFirst({
      where: { id: dto.roomId, branchId, isActive: true },
      select: { id: true },
    });
    if (!room) throw new BadRequestException("Invalid roomId for this branch");

    return this.prisma.diagnosticServicePointRoom.upsert({
      where: { servicePointId_roomId: { servicePointId: args.servicePointId, roomId: dto.roomId } },
      create: {
        branchId,
        servicePointId: args.servicePointId,
        roomId: dto.roomId,
        // Prisma enum type comes from generated client; DTO enum is runtime-valid but not type-identical.
        modality: (dto.modality ?? "OTHER") as any,
        sortOrder: dto.sortOrder ?? 0,
        notes: dto.notes ?? null,
      },
      update: {
        isActive: true,
        modality: (dto.modality ?? "OTHER") as any,
        sortOrder: dto.sortOrder ?? 0,
        notes: dto.notes ?? null,
      },
      include: { room: { include: { unit: true } } },
    });
  }

  async removeRoom(principal: Principal, args: { servicePointId: string; linkId: string; branchId: string }) {
    const branchId = resolveBranchId(principal, args.branchId);
    await this.assertServicePoint(branchId, args.servicePointId);

    const link = await this.prisma.diagnosticServicePointRoom.findFirst({
      where: { id: args.linkId, branchId, servicePointId: args.servicePointId },
      select: { id: true },
    });
    if (!link) throw new NotFoundException("Room mapping not found");

    return this.prisma.diagnosticServicePointRoom.update({ where: { id: args.linkId }, data: { isActive: false } });
  }

  // ---------- Resources ----------
  async listResources(principal: Principal, args: { servicePointId: string; branchId: string }) {
    const branchId = resolveBranchId(principal, args.branchId);
    await this.assertServicePoint(branchId, args.servicePointId);

    return this.prisma.diagnosticServicePointResource.findMany({
      where: { branchId, servicePointId: args.servicePointId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { resource: { include: { unit: true, room: true } } },
    });
  }

  async addResource(principal: Principal, args: { servicePointId: string; branchId: string }, dto: AddResourceToServicePointDto) {
    const branchId = resolveBranchId(principal, args.branchId);
    await this.assertServicePoint(branchId, args.servicePointId);

    const r = await this.prisma.unitResource.findFirst({
      where: { id: dto.resourceId, branchId, isActive: true },
      select: { id: true },
    });
    if (!r) throw new BadRequestException("Invalid resourceId for this branch");

    return this.prisma.diagnosticServicePointResource.upsert({
      where: { servicePointId_resourceId: { servicePointId: args.servicePointId, resourceId: dto.resourceId } },
      create: {
        branchId,
        servicePointId: args.servicePointId,
        resourceId: dto.resourceId,
        modality: (dto.modality ?? "OTHER") as any,
        sortOrder: dto.sortOrder ?? 0,
        notes: dto.notes ?? null,
      },
      update: {
        isActive: true,
        modality: (dto.modality ?? "OTHER") as any,
        sortOrder: dto.sortOrder ?? 0,
        notes: dto.notes ?? null,
      },
      include: { resource: { include: { unit: true, room: true } } },
    });
  }

  async removeResource(principal: Principal, args: { servicePointId: string; linkId: string; branchId: string }) {
    const branchId = resolveBranchId(principal, args.branchId);
    await this.assertServicePoint(branchId, args.servicePointId);

    const link = await this.prisma.diagnosticServicePointResource.findFirst({
      where: { id: args.linkId, branchId, servicePointId: args.servicePointId },
      select: { id: true },
    });
    if (!link) throw new NotFoundException("Resource mapping not found");

    return this.prisma.diagnosticServicePointResource.update({ where: { id: args.linkId }, data: { isActive: false } });
  }

  // ---------- Equipment ----------
  async listEquipment(principal: Principal, args: { servicePointId: string; branchId: string }) {
    const branchId = resolveBranchId(principal, args.branchId);
    await this.assertServicePoint(branchId, args.servicePointId);

    return this.prisma.diagnosticServicePointEquipment.findMany({
      where: { branchId, servicePointId: args.servicePointId, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { equipment: true },
    });
  }

  async addEquipment(principal: Principal, args: { servicePointId: string; branchId: string }, dto: AddEquipmentToServicePointDto) {
    const branchId = resolveBranchId(principal, args.branchId);
    await this.assertServicePoint(branchId, args.servicePointId);

    const eq = await this.prisma.equipmentAsset.findFirst({
      where: { id: dto.equipmentId, branchId },
      select: { id: true },
    });
    if (!eq) throw new BadRequestException("Invalid equipmentId for this branch");

    return this.prisma.diagnosticServicePointEquipment.upsert({
      where: { servicePointId_equipmentId: { servicePointId: args.servicePointId, equipmentId: dto.equipmentId } },
      create: {
        branchId,
        servicePointId: args.servicePointId,
        equipmentId: dto.equipmentId,
        modality: (dto.modality ?? "OTHER") as any,
        sortOrder: dto.sortOrder ?? 0,
        notes: dto.notes ?? null,
      },
      update: {
        isActive: true,
        modality: (dto.modality ?? "OTHER") as any,
        sortOrder: dto.sortOrder ?? 0,
        notes: dto.notes ?? null,
      },
      include: { equipment: true },
    });
  }

  async removeEquipment(principal: Principal, args: { servicePointId: string; linkId: string; branchId: string }) {
    const branchId = resolveBranchId(principal, args.branchId);
    await this.assertServicePoint(branchId, args.servicePointId);

    const link = await this.prisma.diagnosticServicePointEquipment.findFirst({
      where: { id: args.linkId, branchId, servicePointId: args.servicePointId },
      select: { id: true },
    });
    if (!link) throw new NotFoundException("Equipment mapping not found");

    return this.prisma.diagnosticServicePointEquipment.update({ where: { id: args.linkId }, data: { isActive: false } });
  }

  // ---------- Staff ----------
  async listStaff(principal: Principal, args: { servicePointId: string; branchId: string }) {
    const branchId = resolveBranchId(principal, args.branchId);
    await this.assertServicePoint(branchId, args.servicePointId);
    return this.prisma.diagnosticServicePointStaff.findMany({
      where: { branchId, servicePointId: args.servicePointId, isActive: true },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });
  }

  async addStaff(principal: Principal, args: { servicePointId: string; branchId: string }, dto: { staffId: string; role?: string }) {
    const branchId = resolveBranchId(principal, args.branchId);
    await this.assertServicePoint(branchId, args.servicePointId);
    return this.prisma.diagnosticServicePointStaff.upsert({
      where: { servicePointId_staffId: { servicePointId: args.servicePointId, staffId: dto.staffId } },
      create: { branchId, servicePointId: args.servicePointId, staffId: dto.staffId, role: dto.role ?? null, isActive: true },
      update: { isActive: true, role: dto.role ?? null },
    });
  }

  async removeStaff(principal: Principal, args: { servicePointId: string; linkId: string; branchId: string }) {
    const branchId = resolveBranchId(principal, args.branchId);
    await this.assertServicePoint(branchId, args.servicePointId);
    const link = await this.prisma.diagnosticServicePointStaff.findFirst({
      where: { id: args.linkId, branchId, servicePointId: args.servicePointId },
      select: { id: true },
    });
    if (!link) throw new NotFoundException("Staff assignment not found");
    return this.prisma.diagnosticServicePointStaff.update({ where: { id: args.linkId }, data: { isActive: false } });
  }

  // ---------- Sections ----------
  async listSections(principal: Principal, args: { servicePointId: string; branchId: string }) {
    const branchId = resolveBranchId(principal, args.branchId);
    await this.assertServicePoint(branchId, args.servicePointId);
    return this.prisma.diagnosticServicePointSection.findMany({
      where: { branchId, servicePointId: args.servicePointId, isActive: true },
      orderBy: [{ createdAt: "asc" }],
      include: { section: true },
    });
  }

  async addSection(principal: Principal, args: { servicePointId: string; branchId: string }, dto: { sectionId: string }) {
    const branchId = resolveBranchId(principal, args.branchId);
    await this.assertServicePoint(branchId, args.servicePointId);
    const section = await this.prisma.diagnosticSection.findFirst({
      where: { id: dto.sectionId, branchId, isActive: true },
      select: { id: true },
    });
    if (!section) throw new BadRequestException("Invalid sectionId for this branch");
    return this.prisma.diagnosticServicePointSection.upsert({
      where: { servicePointId_sectionId: { servicePointId: args.servicePointId, sectionId: dto.sectionId } },
      create: { branchId, servicePointId: args.servicePointId, sectionId: dto.sectionId, isActive: true },
      update: { isActive: true },
      include: { section: true },
    });
  }

  async removeSection(principal: Principal, args: { servicePointId: string; linkId: string; branchId: string }) {
    const branchId = resolveBranchId(principal, args.branchId);
    await this.assertServicePoint(branchId, args.servicePointId);
    const link = await this.prisma.diagnosticServicePointSection.findFirst({
      where: { id: args.linkId, branchId, servicePointId: args.servicePointId },
      select: { id: true },
    });
    if (!link) throw new NotFoundException("Section mapping not found");
    return this.prisma.diagnosticServicePointSection.update({ where: { id: args.linkId }, data: { isActive: false } });
  }

  private async assertServicePoint(branchId: string, servicePointId: string) {
    const sp = await this.prisma.diagnosticServicePoint.findFirst({
      where: { id: servicePointId, branchId, isActive: true },
      select: { id: true },
    });
    if (!sp) throw new NotFoundException("Diagnostic service point not found or inactive");
  }
}
