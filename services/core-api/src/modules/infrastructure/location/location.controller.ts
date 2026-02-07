import { Body, Controller, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Permissions } from "../../auth/permissions.decorator";
import { PERM } from "../../iam/iam.constants";
import { CreateLocationNodeDto, UpdateLocationNodeDto } from "./dto";
import { LocationService } from "./location.service";

@ApiTags("infrastructure/locations")
@Controller(["infrastructure", "infra"])
export class LocationController {
  constructor(private readonly svc: LocationService) {}

  private principal(req: any) {
    return req.principal;
  }

  @Get("locations")
  @Permissions(PERM.INFRA_LOCATION_READ)
  async listLocations(
    @Req() req: any,
    @Query("branchId") branchId?: string,
    @Query("kind") kind?: string,
    @Query("at") at?: string,
  ) {
    return this.svc.listLocations(this.principal(req), { branchId, kind, at });
  }

  @Get("locations/tree")
  @Permissions(PERM.INFRA_LOCATION_READ)
  async locationTree(@Req() req: any, @Query("branchId") branchId?: string, @Query("at") at?: string) {
    const principal = this.principal(req);
    const { branchId: resolvedBranchId, roots } = await this.svc.getLocationTree(principal, branchId ?? null, at);

    const mapNode = (n: any): any => {
      const type = n.type ?? n.kind;
      const base: any = {
        id: n.id,
        branchId: resolvedBranchId,
        type,
        parentId: n.parentId ?? null,

        code: n.code,
        name: n.name,
        isActive: n.isActive,
        effectiveFrom: n.effectiveFrom,
        effectiveTo: n.effectiveTo,

        gpsLat: n.gpsLat ?? null,
        gpsLng: n.gpsLng ?? null,
        floorNumber: n.floorNumber ?? null,
        wheelchairAccess: n.wheelchairAccess ?? false,
        stretcherAccess: n.stretcherAccess ?? false,
        emergencyExit: n.emergencyExit ?? false,
        fireZone: n.fireZone ?? null,
      };

      const kids: any[] = Array.isArray(n.children) ? n.children : [];
      if (type === "CAMPUS") base.buildings = kids.filter((x) => x.kind === "BUILDING").map(mapNode);
      if (type === "BUILDING") base.floors = kids.filter((x) => x.kind === "FLOOR").map(mapNode);
      if (type === "FLOOR") base.zones = kids.filter((x) => x.kind === "ZONE").map(mapNode);
      if (type === "ZONE") base.areas = kids.filter((x) => x.kind === "AREA").map(mapNode);

      return base;
    };

    const campuses = roots.filter((r) => r.kind === "CAMPUS").map(mapNode);
    return { campuses };
  }

  // Optional compatibility endpoint (if you want it)
  @Post("locations/areas")
  @Permissions(PERM.INFRA_LOCATION_CREATE)
  async createArea(@Req() req: any, @Body() body: any, @Query("branchId") branchId?: string) {
    const { branchId: bodyBranchId, ...rest } = body || {};
    const bid: string | undefined = branchId ?? bodyBranchId;
    return this.svc.createLocation(this.principal(req), { ...rest, kind: "AREA" } as any, bid);
  }

  @Post("locations")
  @Permissions(PERM.INFRA_LOCATION_CREATE)
  async createLocation(@Req() req: any, @Body() dto: CreateLocationNodeDto, @Query("branchId") branchId?: string) {
    return this.svc.createLocation(this.principal(req), dto, branchId ?? null);
  }

  @Patch("locations/:id")
  @Permissions(PERM.INFRA_LOCATION_UPDATE)
  async updateLocation(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateLocationNodeDto) {
    return this.svc.updateLocation(this.principal(req), id, dto);
  }
}
