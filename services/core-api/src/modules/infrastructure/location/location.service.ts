import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Principal } from "../../auth/access-policy.service";
import { InfraContextService } from "../shared/infra-context.service";
import type { CreateLocationNodeDto, UpdateLocationNodeDto } from "./dto";
import { assertLocationCode, canonicalizeCode } from "../../../common/naming.util";

@Injectable()
export class LocationService {
  constructor(private readonly ctx: InfraContextService) {}

  async listLocations(principal: Principal, q: { branchId?: string; kind?: string; at?: string }) {
    const branchId = this.ctx.resolveBranchId(principal, q.branchId ?? null);
    const at = q.at ? new Date(q.at) : new Date();

    const nodes = await this.ctx.prisma.locationNode.findMany({
      where: {
        branchId,
        ...(q.kind ? { kind: q.kind as any } : {}),
      },
      orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
      include: {
        revisions: {
          where: {
            effectiveFrom: { lte: at },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
          },
          orderBy: [{ effectiveFrom: "desc" }],
          take: 1,
        },
      },
    });

    return nodes.map((n) => ({
      id: n.id,
      branchId: n.branchId,
      kind: n.kind,
      parentId: n.parentId,
      current: n.revisions[0] ?? null,
    }));
  }

  async getLocationTree(principal: Principal, branchIdParam?: string | null, at?: string) {
    const branchId = this.ctx.resolveBranchId(principal, branchIdParam ?? null);
    const when = at ? new Date(at) : new Date();

    const nodes = await this.ctx.prisma.locationNode.findMany({
      where: { branchId },
      select: {
        id: true,
        kind: true,
        parentId: true,
        revisions: {
          where: {
            effectiveFrom: { lte: when },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: when } }],
          },
          orderBy: [{ effectiveFrom: "desc" }],
          take: 1,
          select: {
            code: true,
            name: true,
            isActive: true,
            effectiveFrom: true,
            effectiveTo: true,
            gpsLat: true,
            gpsLng: true,
            floorNumber: true,
            wheelchairAccess: true,
            stretcherAccess: true,
            emergencyExit: true,
            fireZone: true,
          },
        },
      },
      orderBy: [{ createdAt: "asc" }],
    });

    type TreeNode = {
      id: string;
      kind: any;
      parentId: string | null;
      code: string;
      name: string;
      isActive: boolean;
      effectiveFrom: Date;
      effectiveTo: Date | null;

      gpsLat?: number | null;
      gpsLng?: number | null;
      floorNumber?: number | null;
      wheelchairAccess?: boolean;
      stretcherAccess?: boolean;
      emergencyExit?: boolean;
      fireZone?: string | null;

      children: TreeNode[];
    };

    const byId = new Map<string, TreeNode>();

    for (const n of nodes) {
      const cur = n.revisions?.[0];
      if (!cur) continue;

      byId.set(n.id, {
        id: n.id,
        kind: n.kind,
        parentId: n.parentId ?? null,
        code: cur.code,
        name: cur.name,
        isActive: cur.isActive,
        effectiveFrom: cur.effectiveFrom,
        effectiveTo: cur.effectiveTo,

        gpsLat: cur.gpsLat ?? null,
        gpsLng: cur.gpsLng ?? null,
        floorNumber: cur.floorNumber ?? null,
        wheelchairAccess: cur.wheelchairAccess ?? false,
        stretcherAccess: cur.stretcherAccess ?? false,
        emergencyExit: cur.emergencyExit ?? false,
        fireZone: cur.fireZone ?? null,

        children: [],
      });
    }

    const roots: TreeNode[] = [];
    for (const node of byId.values()) {
      if (node.parentId && byId.has(node.parentId)) {
        byId.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    const sortRec = (arr: TreeNode[]) => {
      arr.sort((a, b) => a.code.localeCompare(b.code));
      for (const x of arr) sortRec(x.children);
    };
    sortRec(roots);

    return { branchId, roots };
  }

  private async assertLocationCodeUnique(
    branchId: string,
    code: string,
    effectiveFrom: Date,
    effectiveTo: Date | null,
    excludeNodeId?: string,
  ) {
    const overlaps = await this.ctx.prisma.locationNodeRevision.findMany({
      where: {
        code,
        node: {
          branchId,
          ...(excludeNodeId ? { id: { not: excludeNodeId } } : {}),
        },
        effectiveFrom: { lt: effectiveTo ?? new Date("9999-12-31T00:00:00.000Z") },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: effectiveFrom } }],
      },
      select: { id: true, nodeId: true, effectiveFrom: true, effectiveTo: true },
      take: 1,
    });

    if (overlaps.length) {
      throw new BadRequestException(`Location code "${code}" already exists for an overlapping effective period.`);
    }
  }

  private async getCurrentLocationCode(nodeId: string, at: Date): Promise<string> {
    const rev = await this.ctx.prisma.locationNodeRevision.findFirst({
      where: {
        nodeId,
        effectiveFrom: { lte: at },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
      },
      orderBy: [{ effectiveFrom: "desc" }],
      select: { code: true },
    });
    if (!rev) throw new BadRequestException("Parent location has no effective revision");
    return rev.code;
  }

  async assertValidLocationNode(
    branchId: string,
    locationNodeId: string,
    opts?: { allowKinds?: ("CAMPUS" | "BUILDING" | "FLOOR" | "ZONE" | "AREA")[] },
  ) {
    if (!locationNodeId?.trim()) throw new BadRequestException("locationNodeId is required");

    const at = new Date();
    const node = await this.ctx.prisma.locationNode.findFirst({
      where: { id: locationNodeId, branchId },
      select: {
        id: true,
        kind: true,
        parentId: true,
        revisions: {
          where: {
            effectiveFrom: { lte: at },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: at } }],
          },
          orderBy: [{ effectiveFrom: "desc" }],
          take: 1,
          select: { code: true, name: true, isActive: true, effectiveFrom: true, effectiveTo: true },
        },
      },
    });

    if (!node) throw new BadRequestException("Invalid locationNodeId (must belong to your branch)");

    const current = node.revisions?.[0];
    if (!current) throw new BadRequestException("Location node has no current effective revision");
    if (!current.isActive) throw new BadRequestException("Location node is inactive (cannot assign units)");

    const allow = opts?.allowKinds;
    if (allow?.length && !allow.includes(node.kind as any)) {
      throw new BadRequestException(`Units must be mapped to one of: ${allow.join(", ")}.`);
    }

    return { id: node.id, kind: node.kind, parentId: node.parentId, current };
  }

  async createLocation(principal: Principal, dto: CreateLocationNodeDto, branchIdParam?: string | null) {
    const branchId = this.ctx.resolveBranchId(principal, branchIdParam ?? null);

    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;

    const expectedParentKind: Record<string, string | null> = {
      CAMPUS: null,
      BUILDING: "CAMPUS",
      FLOOR: "BUILDING",
      ZONE: "FLOOR",
      AREA: "ZONE",
    };

    const expected = expectedParentKind[dto.kind];
    if (expected == null) {
      if (dto.parentId) throw new BadRequestException("CAMPUS cannot have a parent.");
    } else {
      if (!dto.parentId) throw new BadRequestException(`${dto.kind} requires a parent location.`);
    }

    const parent = dto.parentId
      ? await this.ctx.prisma.locationNode.findFirst({
          where: { id: dto.parentId, branchId },
          select: { id: true, kind: true },
        })
      : null;

    if (dto.parentId && !parent) throw new BadRequestException("Invalid parentId (must belong to your branch)");
    if (parent && expected && parent.kind !== (expected as any)) {
      throw new BadRequestException(`${dto.kind} parent must be a ${expected}.`);
    }

    const hasGps = dto.gpsLat !== undefined || dto.gpsLng !== undefined;
    if (hasGps) {
      if (dto.kind !== "CAMPUS") throw new BadRequestException("GPS coordinates are allowed only for CAMPUS nodes.");
      if (dto.gpsLat === undefined || dto.gpsLng === undefined) {
        throw new BadRequestException("Both gpsLat and gpsLng are required together.");
      }
    }

    if (dto.floorNumber !== undefined && dto.kind !== "FLOOR") {
      throw new BadRequestException("floorNumber can be set only on FLOOR nodes.");
    }

    const parentCode = parent ? await this.getCurrentLocationCode(parent.id, effectiveFrom) : undefined;
    const code = assertLocationCode(dto.kind as any, canonicalizeCode(dto.code), parentCode);

    await this.assertLocationCodeUnique(branchId, code, effectiveFrom, effectiveTo, undefined);

    const node = await this.ctx.prisma.locationNode.create({
      data: {
        branchId,
        kind: dto.kind as any,
        parentId: dto.parentId ?? null,
        revisions: {
          create: {
            code,
            name: dto.name.trim(),
            isActive: dto.isActive ?? true,
            effectiveFrom,
            effectiveTo,
            createdByUserId: principal.userId,

            gpsLat: dto.kind === "CAMPUS" ? dto.gpsLat ?? null : null,
            gpsLng: dto.kind === "CAMPUS" ? dto.gpsLng ?? null : null,
            floorNumber: dto.kind === "FLOOR" ? dto.floorNumber ?? null : null,

            wheelchairAccess: dto.wheelchairAccess ?? false,
            stretcherAccess: dto.stretcherAccess ?? false,
            emergencyExit: dto.emergencyExit ?? false,
            fireZone: dto.fireZone?.trim() || null,
          },
        },
      },
      include: { revisions: { orderBy: [{ effectiveFrom: "desc" }], take: 1 } },
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_LOCATION_CREATE",
      entity: "LocationNode",
      entityId: node.id,
      meta: dto,
    });

    return { id: node.id, kind: node.kind, parentId: node.parentId, current: node.revisions[0] };
  }

  async updateLocation(principal: Principal, id: string, dto: UpdateLocationNodeDto) {
    const node = await this.ctx.prisma.locationNode.findUnique({
      where: { id },
      select: { id: true, branchId: true, kind: true, parentId: true },
    });
    if (!node) throw new NotFoundException("Location not found");

    const branchId = this.ctx.resolveBranchId(principal, node.branchId);

    const now = new Date();
    const current = await this.ctx.prisma.locationNodeRevision.findFirst({
      where: { nodeId: id, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
      orderBy: [{ effectiveFrom: "desc" }],
    });
    if (!current) throw new BadRequestException("No current effective revision found");

    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : now;
    const effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;

    const hasGps = dto.gpsLat !== undefined || dto.gpsLng !== undefined;
    if (hasGps) {
      if (node.kind !== ("CAMPUS" as any)) throw new BadRequestException("GPS coordinates are allowed only for CAMPUS nodes.");
      if (dto.gpsLat === undefined || dto.gpsLng === undefined) throw new BadRequestException("Both gpsLat and gpsLng are required together.");
    }

    if (dto.floorNumber !== undefined && node.kind !== ("FLOOR" as any)) {
      throw new BadRequestException("floorNumber can be set only on FLOOR nodes.");
    }

    let nextCode = current.code;
    if (dto.code) {
      const parentCode = node.parentId ? await this.getCurrentLocationCode(node.parentId, effectiveFrom) : undefined;
      nextCode = assertLocationCode(node.kind as any, canonicalizeCode(dto.code), parentCode);
    }

    await this.assertLocationCodeUnique(branchId, nextCode, effectiveFrom, effectiveTo, node.id);

    const nextGpsLat = dto.gpsLat ?? (current as any).gpsLat ?? null;
    const nextGpsLng = dto.gpsLng ?? (current as any).gpsLng ?? null;
    const nextFloorNumber = dto.floorNumber ?? (current as any).floorNumber ?? null;

    const nextWheelchair = dto.wheelchairAccess ?? (current as any).wheelchairAccess ?? false;
    const nextStretcher = dto.stretcherAccess ?? (current as any).stretcherAccess ?? false;
    const nextEmergencyExit = dto.emergencyExit ?? (current as any).emergencyExit ?? false;

    const nextFireZone =
      dto.fireZone !== undefined ? (dto.fireZone?.trim() || null) : ((current as any).fireZone ?? null);

    const newRev = await this.ctx.prisma.$transaction(async (tx) => {
      if (current.effectiveTo == null || current.effectiveTo > effectiveFrom) {
        await tx.locationNodeRevision.update({ where: { id: current.id }, data: { effectiveTo: effectiveFrom } });
      }

      return tx.locationNodeRevision.create({
        data: {
          nodeId: node.id,
          code: nextCode,
          name: (dto.name ?? current.name).trim(),
          isActive: dto.isActive ?? current.isActive,
          effectiveFrom,
          effectiveTo,
          createdByUserId: principal.userId,

          gpsLat: node.kind === ("CAMPUS" as any) ? nextGpsLat : null,
          gpsLng: node.kind === ("CAMPUS" as any) ? nextGpsLng : null,
          floorNumber: node.kind === ("FLOOR" as any) ? nextFloorNumber : null,

          wheelchairAccess: nextWheelchair,
          stretcherAccess: nextStretcher,
          emergencyExit: nextEmergencyExit,

          fireZone: nextFireZone,
        },
      });
    });

    await this.ctx.audit.log({
      branchId,
      actorUserId: principal.userId,
      action: "INFRA_LOCATION_UPDATE",
      entity: "LocationNode",
      entityId: node.id,
      meta: dto,
    });

    return { id: node.id, kind: node.kind, parentId: node.parentId, current: newRev };
  }
}
