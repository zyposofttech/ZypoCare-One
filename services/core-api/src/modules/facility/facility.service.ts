import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { PrismaClient } from "@excelcare/db";
import { AuditService } from "../audit/audit.service";
import type { Principal } from "../auth/access-policy.service";
import {
  CreateBedDto,
  CreateDepartmentDto,
  CreateFacilityDto,
  CreateRoomDto,
  CreateSpecialtyDto,
  CreateWardDto,
  UpdateBedDto,
  UpdateDepartmentDto,
  UpdateFacilityDto,
  UpdateRoomDto,
  UpdateSpecialtyDto,
  UpdateWardDto,
} from "./facility.dto";

function norm(s: unknown) {
  return String(s ?? "").trim();
}

@Injectable()
export class FacilityService {
  constructor(
    @Inject("PRISMA") private prisma: PrismaClient,
    private audit: AuditService,
  ) {}

  private resolveBranchId(principal: Principal, inputBranchId?: string | null): string {
    const roleScope = principal.roleScope;
    const b = norm(inputBranchId);

    if (roleScope === "GLOBAL") {
      if (!b) throw new BadRequestException("branchId is required for GLOBAL users");
      return b;
    }

    const pb = principal.branchId;
    if (!pb) throw new ForbiddenException("No branch is assigned to this user");

    if (b && b !== pb) throw new ForbiddenException("Cannot operate on a different branch");
    return pb;
  }

  private assertBranchAccess(principal: Principal, branchId: string) {
    if (principal.roleScope === "GLOBAL") return;
    if (!principal.branchId || principal.branchId !== branchId) {
      throw new ForbiddenException("Branch isolation enforced");
    }
  }

  // ------------------------ Facility registry ------------------------

  async listFacilities(principal: Principal, branchId?: string) {
    const effectiveBranchId = principal.roleScope === "GLOBAL" ? norm(branchId) || undefined : principal.branchId ?? undefined;

    if (principal.roleScope !== "GLOBAL" && !effectiveBranchId) {
      throw new ForbiddenException("No branch assigned");
    }

    return this.prisma.facility.findMany({
      where: effectiveBranchId ? { branchId: effectiveBranchId } : {},
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      take: 200,
    });
  }

  async getFacility(principal: Principal, id: string) {
    const facility = await this.prisma.facility.findUnique({ where: { id: norm(id) } });
    if (!facility) throw new NotFoundException("Facility not found");
    this.assertBranchAccess(principal, facility.branchId);
    return facility;
  }

  async createFacility(principal: Principal, dto: CreateFacilityDto) {
    const branchId = this.resolveBranchId(principal, dto.branchId);

    const code = norm(dto.code);
    const name = norm(dto.name);
    const city = norm(dto.city);
    if (!code || !name || !city) throw new BadRequestException("code, name, city are required");

    try {
      const facility = await this.prisma.facility.create({
        data: {
          branchId,
          code,
          name,
          type: norm(dto.type) || null,
          addressLine1: norm(dto.addressLine1) || null,
          addressLine2: norm(dto.addressLine2) || null,
          city,
          state: norm(dto.state) || null,
          postalCode: norm(dto.postalCode) || null,
          phone: norm(dto.phone) || null,
          email: norm(dto.email) || null,
          isActive: true,
        },
      });

      await this.audit.log({
        branchId,
        actorUserId: principal.userId,
        action: "FACILITY_CREATE",
        entity: "Facility",
        entityId: facility.id,
        meta: { code, name, city },
      });

      return facility;
    } catch (e: any) {
      if (String(e?.code) === "P2002") throw new ConflictException("Facility code already exists for this branch");
      throw e;
    }
  }

  async updateFacility(principal: Principal, id: string, dto: UpdateFacilityDto) {
    const facility = await this.prisma.facility.findUnique({ where: { id: norm(id) } });
    if (!facility) throw new NotFoundException("Facility not found");
    this.assertBranchAccess(principal, facility.branchId);

    const data: any = {};
    for (const k of [
      "code",
      "name",
      "type",
      "addressLine1",
      "addressLine2",
      "city",
      "state",
      "postalCode",
      "phone",
      "email",
    ] as const) {
      const v = (dto as any)[k];
      if (v !== undefined) data[k] = norm(v) || null;
    }
    if (dto.isActive !== undefined) data.isActive = !!dto.isActive;

    try {
      const updated = await this.prisma.facility.update({ where: { id: facility.id }, data });

      await this.audit.log({
        branchId: facility.branchId,
        actorUserId: principal.userId,
        action: "FACILITY_UPDATE",
        entity: "Facility",
        entityId: facility.id,
        meta: { changes: Object.keys(data) },
      });

      return updated;
    } catch (e: any) {
      if (String(e?.code) === "P2002") throw new ConflictException("Facility code already exists for this branch");
      throw e;
    }
  }

  // ------------------------ Departments ------------------------

  async listDepartments(principal: Principal, branchId?: string) {
    const effectiveBranchId = principal.roleScope === "GLOBAL" ? norm(branchId) || undefined : principal.branchId ?? undefined;
    if (!effectiveBranchId && principal.roleScope !== "GLOBAL") throw new ForbiddenException("No branch assigned");

    return this.prisma.department.findMany({
      where: effectiveBranchId ? { branchId: effectiveBranchId } : {},
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      take: 300,
    });
  }

  async createDepartment(principal: Principal, dto: CreateDepartmentDto) {
    const branchId = this.resolveBranchId(principal, dto.branchId);
    const code = norm(dto.code);
    const name = norm(dto.name);
    if (!code || !name) throw new BadRequestException("code, name are required");

    try {
      const dep = await this.prisma.department.create({ data: { branchId, code, name, isActive: true } });
      await this.audit.log({ branchId, actorUserId: principal.userId, action: "DEPARTMENT_CREATE", entity: "Department", entityId: dep.id, meta: { code, name } });
      return dep;
    } catch (e: any) {
      if (String(e?.code) === "P2002") throw new ConflictException("Department code already exists for this branch");
      throw e;
    }
  }

  async updateDepartment(principal: Principal, id: string, dto: UpdateDepartmentDto) {
    const dep = await this.prisma.department.findUnique({ where: { id: norm(id) } });
    if (!dep) throw new NotFoundException("Department not found");
    this.assertBranchAccess(principal, dep.branchId);

    const data: any = {};
    if (dto.code !== undefined) data.code = norm(dto.code);
    if (dto.name !== undefined) data.name = norm(dto.name);
    if (dto.isActive !== undefined) data.isActive = !!dto.isActive;

    try {
      const updated = await this.prisma.department.update({ where: { id: dep.id }, data });
      await this.audit.log({ branchId: dep.branchId, actorUserId: principal.userId, action: "DEPARTMENT_UPDATE", entity: "Department", entityId: dep.id, meta: { changes: Object.keys(data) } });
      return updated;
    } catch (e: any) {
      if (String(e?.code) === "P2002") throw new ConflictException("Department code already exists for this branch");
      throw e;
    }
  }

  // ------------------------ Specialties ------------------------

  async listSpecialties(principal: Principal, branchId?: string) {
    const effectiveBranchId = principal.roleScope === "GLOBAL" ? norm(branchId) || undefined : principal.branchId ?? undefined;
    if (!effectiveBranchId && principal.roleScope !== "GLOBAL") throw new ForbiddenException("No branch assigned");

    return this.prisma.specialty.findMany({
      where: effectiveBranchId ? { branchId: effectiveBranchId } : {},
      include: { department: true },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      take: 500,
    });
  }

  async createSpecialty(principal: Principal, dto: CreateSpecialtyDto) {
    const branchId = this.resolveBranchId(principal, dto.branchId);
    const code = norm(dto.code);
    const name = norm(dto.name);
    if (!code || !name) throw new BadRequestException("code, name are required");

    const departmentId = norm(dto.departmentId) || null;
    if (departmentId) {
      const dep = await this.prisma.department.findUnique({ where: { id: departmentId } });
      if (!dep) throw new BadRequestException("departmentId is invalid");
      this.assertBranchAccess(principal, dep.branchId);
    }

    try {
      const sp = await this.prisma.specialty.create({
        data: { branchId, code, name, departmentId, isActive: true },
        include: { department: true },
      });
      await this.audit.log({ branchId, actorUserId: principal.userId, action: "SPECIALTY_CREATE", entity: "Specialty", entityId: sp.id, meta: { code, name, departmentId } });
      return sp;
    } catch (e: any) {
      if (String(e?.code) === "P2002") throw new ConflictException("Specialty code already exists for this branch");
      throw e;
    }
  }

  async updateSpecialty(principal: Principal, id: string, dto: UpdateSpecialtyDto) {
    const sp = await this.prisma.specialty.findUnique({ where: { id: norm(id) }, include: { department: true } });
    if (!sp) throw new NotFoundException("Specialty not found");
    this.assertBranchAccess(principal, sp.branchId);

    const data: any = {};
    if (dto.code !== undefined) data.code = norm(dto.code);
    if (dto.name !== undefined) data.name = norm(dto.name);
    if (dto.departmentId !== undefined) {
      const departmentId = norm(dto.departmentId) || null;
      if (departmentId) {
        const dep = await this.prisma.department.findUnique({ where: { id: departmentId } });
        if (!dep) throw new BadRequestException("departmentId is invalid");
        this.assertBranchAccess(principal, dep.branchId);
      }
      data.departmentId = departmentId;
    }
    if (dto.isActive !== undefined) data.isActive = !!dto.isActive;

    try {
      const updated = await this.prisma.specialty.update({ where: { id: sp.id }, data, include: { department: true } });
      await this.audit.log({ branchId: sp.branchId, actorUserId: principal.userId, action: "SPECIALTY_UPDATE", entity: "Specialty", entityId: sp.id, meta: { changes: Object.keys(data) } });
      return updated;
    } catch (e: any) {
      if (String(e?.code) === "P2002") throw new ConflictException("Specialty code already exists for this branch");
      throw e;
    }
  }

  // ------------------------ Wards / Rooms / Beds ------------------------

  async listWards(principal: Principal, branchId?: string) {
    const effectiveBranchId = principal.roleScope === "GLOBAL" ? norm(branchId) || undefined : principal.branchId ?? undefined;
    if (!effectiveBranchId && principal.roleScope !== "GLOBAL") throw new ForbiddenException("No branch assigned");

    return this.prisma.ward.findMany({
      where: effectiveBranchId ? { branchId: effectiveBranchId } : {},
      include: { rooms: { include: { beds: true } } },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      take: 200,
    });
  }

  async createWard(principal: Principal, dto: CreateWardDto) {
    const branchId = this.resolveBranchId(principal, dto.branchId);
    const code = norm(dto.code);
    const name = norm(dto.name);
    if (!code || !name) throw new BadRequestException("code, name are required");

    try {
      const ward = await this.prisma.ward.create({
        data: { branchId, code, name, specialty: norm(dto.specialty) || null, isActive: true },
        include: { rooms: { include: { beds: true } } },
      });
      await this.audit.log({ branchId, actorUserId: principal.userId, action: "WARD_CREATE", entity: "Ward", entityId: ward.id, meta: { code, name } });
      return ward;
    } catch (e: any) {
      if (String(e?.code) === "P2002") throw new ConflictException("Ward code already exists for this branch");
      throw e;
    }
  }

  async updateWard(principal: Principal, id: string, dto: UpdateWardDto) {
    const ward = await this.prisma.ward.findUnique({ where: { id: norm(id) }, include: { rooms: true } });
    if (!ward) throw new NotFoundException("Ward not found");
    this.assertBranchAccess(principal, ward.branchId);

    const data: any = {};
    if (dto.code !== undefined) data.code = norm(dto.code);
    if (dto.name !== undefined) data.name = norm(dto.name);
    if (dto.specialty !== undefined) data.specialty = norm(dto.specialty) || null;
    if (dto.isActive !== undefined) data.isActive = !!dto.isActive;

    try {
      const updated = await this.prisma.ward.update({ where: { id: ward.id }, data, include: { rooms: { include: { beds: true } } } });
      await this.audit.log({ branchId: ward.branchId, actorUserId: principal.userId, action: "WARD_UPDATE", entity: "Ward", entityId: ward.id, meta: { changes: Object.keys(data) } });
      return updated;
    } catch (e: any) {
      if (String(e?.code) === "P2002") throw new ConflictException("Ward code already exists for this branch");
      throw e;
    }
  }

  // ------------------------ Rooms ------------------------

  async listRooms(principal: Principal, wardId: string) {
    const ward = await this.prisma.ward.findUnique({ where: { id: norm(wardId) } });
    if (!ward) throw new NotFoundException("Ward not found");
    this.assertBranchAccess(principal, ward.branchId);

    return this.prisma.room.findMany({ where: { wardId: ward.id }, include: { beds: true }, orderBy: [{ isActive: "desc" }, { name: "asc" }] });
  }

  async createRoom(principal: Principal, wardId: string, dto: CreateRoomDto) {
    const ward = await this.prisma.ward.findUnique({ where: { id: norm(wardId) } });
    if (!ward) throw new NotFoundException("Ward not found");
    this.assertBranchAccess(principal, ward.branchId);

    const code = norm(dto.code);
    const name = norm(dto.name);
    if (!code || !name) throw new BadRequestException("code, name are required");

    try {
      const room = await this.prisma.room.create({
        data: {
          branchId: ward.branchId,
          wardId: ward.id,
          code,
          name,
          floor: norm(dto.floor) || null,
          type: norm(dto.type) || null,
          isActive: true,
        },
        include: { beds: true },
      });
      await this.audit.log({ branchId: ward.branchId, actorUserId: principal.userId, action: "ROOM_CREATE", entity: "Room", entityId: room.id, meta: { wardId: ward.id, code, name } });
      return room;
    } catch (e: any) {
      if (String(e?.code) === "P2002") throw new ConflictException("Room code already exists for this ward");
      throw e;
    }
  }

  async updateRoom(principal: Principal, roomId: string, dto: UpdateRoomDto) {
    const room = await this.prisma.room.findUnique({ where: { id: norm(roomId) }, include: { ward: true } });
    if (!room) throw new NotFoundException("Room not found");
    this.assertBranchAccess(principal, room.branchId);

    const data: any = {};
    if (dto.code !== undefined) data.code = norm(dto.code);
    if (dto.name !== undefined) data.name = norm(dto.name);
    if (dto.floor !== undefined) data.floor = norm(dto.floor) || null;
    if (dto.type !== undefined) data.type = norm(dto.type) || null;
    if (dto.isActive !== undefined) data.isActive = !!dto.isActive;

    try {
      const updated = await this.prisma.room.update({ where: { id: room.id }, data, include: { beds: true, ward: true } });
      await this.audit.log({ branchId: room.branchId, actorUserId: principal.userId, action: "ROOM_UPDATE", entity: "Room", entityId: room.id, meta: { changes: Object.keys(data) } });
      return updated;
    } catch (e: any) {
      if (String(e?.code) === "P2002") throw new ConflictException("Room code already exists for this ward");
      throw e;
    }
  }

  // ------------------------ Beds ------------------------

  async listBedsForWard(principal: Principal, wardId: string) {
    const ward = await this.prisma.ward.findUnique({ where: { id: norm(wardId) } });
    if (!ward) throw new NotFoundException("Ward not found");
    this.assertBranchAccess(principal, ward.branchId);

    return this.prisma.bed.findMany({
      where: { room: { wardId: ward.id } },
      include: { room: true },
      orderBy: [{ room: { code: "asc" } }, { code: "asc" }],
    });
  }

  async listBedsForRoom(principal: Principal, roomId: string) {
    const room = await this.prisma.room.findUnique({ where: { id: norm(roomId) }, include: { ward: true } });
    if (!room) throw new NotFoundException("Room not found");
    this.assertBranchAccess(principal, room.branchId);

    return this.prisma.bed.findMany({ where: { roomId: room.id }, orderBy: { code: "asc" } });
  }

  async createBed(principal: Principal, roomId: string, dto: CreateBedDto) {
    const room = await this.prisma.room.findUnique({ where: { id: norm(roomId) }, include: { ward: true } });
    if (!room) throw new NotFoundException("Room not found");
    this.assertBranchAccess(principal, room.branchId);

    const code = norm(dto.code);
    if (!code) throw new BadRequestException("code is required");

    try {
      const bed = await this.prisma.bed.create({
        data: { branchId: room.branchId, roomId: room.id, code, state: "VACANT", isActive: true },
      });
      await this.audit.log({ branchId: room.branchId, actorUserId: principal.userId, action: "BED_CREATE", entity: "Bed", entityId: bed.id, meta: { roomId: room.id, code } });
      return bed;
    } catch (e: any) {
      if (String(e?.code) === "P2002") throw new ConflictException("Bed code already exists for this room");
      throw e;
    }
  }

  private isValidTransition(from: string, to: string) {
    if (from === to) return true;
    const allowed: Record<string, string[]> = {
      VACANT: ["OCCUPIED", "CLEANING", "MAINTENANCE"],
      OCCUPIED: ["CLEANING", "MAINTENANCE"],
      CLEANING: ["VACANT", "MAINTENANCE"],
      MAINTENANCE: ["VACANT"],
    };
    return (allowed[from] || []).includes(to);
  }

  async updateBed(principal: Principal, bedId: string, dto: UpdateBedDto) {
    const bed = await this.prisma.bed.findUnique({ where: { id: norm(bedId) }, include: { room: { include: { ward: true } } } });
    if (!bed) throw new NotFoundException("Bed not found");
    this.assertBranchAccess(principal, bed.room.ward.branchId);

    const data: any = {};
    if (dto.code !== undefined) data.code = norm(dto.code);
    if (dto.isActive !== undefined) data.isActive = !!dto.isActive;

    if (dto.state !== undefined) {
      const to = dto.state;
      const from = bed.state;
      if (!this.isValidTransition(from, to)) {
        throw new BadRequestException(`Invalid bed state transition ${from} -> ${to}`);
      }
      data.state = to;
    }

    try {
      const updated = await this.prisma.bed.update({ where: { id: bed.id }, data });
      await this.audit.log({
        branchId: bed.room.ward.branchId,
        actorUserId: principal.userId,
        action: "BED_UPDATE",
        entity: "Bed",
        entityId: bed.id,
        meta: { changes: Object.keys(data), note: norm(dto.note) || undefined },
      });
      return updated;
    } catch (e: any) {
      if (String(e?.code) === "P2002") throw new ConflictException("Bed code already exists for this room");
      throw e;
    }
  }
}
