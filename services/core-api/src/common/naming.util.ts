import { BadRequestException } from "@nestjs/common";

/**
 * Naming Convention Policy v1 (ExcelCare)
 * - Codes are UPPERCASE, hyphen-delimited, no spaces.
 * - Numeric zones only: Z01..Z99
 * - Validation is both regex + contextual (parent prefix).
 */

export type LocationKind = "CAMPUS" | "BUILDING" | "FLOOR" | "ZONE";

export type ResourceType =
  | "BED"
  | "BAY"
  | "CHAIR"
  | "OT_TABLE"
  | "PROCEDURE_TABLE"
  | "DIALYSIS_STATION"
  | "RECOVERY_BAY"
  | "EXAM_SLOT"
  | "INCUBATOR";

export const RESOURCE_PREFIX: Record<ResourceType, string> = {
  BED: "B",
  BAY: "BY",
  CHAIR: "CH",
  OT_TABLE: "OT",
  PROCEDURE_TABLE: "PT",
  DIALYSIS_STATION: "DS",
  RECOVERY_BAY: "RB",
  EXAM_SLOT: "EX",
  INCUBATOR: "IC",
};

/* -------------------------------------------------------------------------- */
/* Regex (exported for DTO @Matches usage)                                     */
/* -------------------------------------------------------------------------- */

export const RX_CAMPUS_CODE = /^C\d{2}$/; // C01
export const RX_BUILDING_CODE = /^C\d{2}-B\d{2}$/; // C01-B01
export const RX_FLOOR_CODE = /^C\d{2}-B\d{2}-F\d{2}$/; // C01-B01-F03
export const RX_ZONE_CODE = /^C\d{2}-B\d{2}-F\d{2}-Z\d{2}$/; // C01-B01-F03-Z01 (numeric zone)

export const RX_LOCATION_CODE_ANY = /^C\d{2}(-B\d{2}(-F\d{2}(-Z\d{2})?)?)?$/;

export const RX_UNIT_CODE = /^[A-Z0-9]{2,8}-[A-Z0-9]{3,8}-\d{2}$/; // WARD-MED-01
export const RX_ROOM_CODE = /^[A-Z0-9]{2,8}-[A-Z0-9]{3,8}-\d{2}-R\d{3}$/; // WARD-MED-01-R012

export const RX_RESOURCE_SUFFIX = /(B|BY|CH|OT|PT|DS|RB|EX|IC)\d{3}$/;
export const RX_RESOURCE_CODE_OPEN_BAY =
  /^[A-Z0-9]{2,8}-[A-Z0-9]{3,8}-\d{2}-(B|BY|CH|OT|PT|DS|RB|EX|IC)\d{3}$/;
export const RX_RESOURCE_CODE_ROOM_MODE =
  /^[A-Z0-9]{2,8}-[A-Z0-9]{3,8}-\d{2}-R\d{3}-(B|BY|CH|OT|PT|DS|RB|EX|IC)\d{3}$/;

export const RX_RESOURCE_CODE_ANY = new RegExp(
  `^(?:${RX_RESOURCE_CODE_OPEN_BAY.source}|${RX_RESOURCE_CODE_ROOM_MODE.source})$`,
);

/* -------------------------------------------------------------------------- */
/* Canonicalization helpers                                                   */
/* -------------------------------------------------------------------------- */

export function canonicalizeCode(raw: string): string {
  if (raw == null) return "";
  // Do NOT silently remove arbitrary characters; normalize only safe separators.
  return String(raw)
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, "-") // spaces/underscores => hyphen
    .replace(/-+/g, "-"); // collapse multiple hyphens
}

function pad2(n: number): string {
  const v = Math.trunc(n);
  if (v < 0 || v > 99) throw new BadRequestException("Sequence must be between 0 and 99");
  return String(v).padStart(2, "0");
}
function pad3(n: number): string {
  const v = Math.trunc(n);
  if (v < 0 || v > 999) throw new BadRequestException("Sequence must be between 0 and 999");
  return String(v).padStart(3, "0");
}

/* -------------------------------------------------------------------------- */
/* Location validation                                                        */
/* -------------------------------------------------------------------------- */

export function assertLocationCode(kind: LocationKind, codeRaw: string, parentCodeRaw?: string): string {
  const code = canonicalizeCode(codeRaw);
  const parentCode = parentCodeRaw ? canonicalizeCode(parentCodeRaw) : undefined;

  if (!RX_LOCATION_CODE_ANY.test(code)) {
    throw new BadRequestException(
      `Invalid location code "${code}". Expected patterns like C01 / C01-B01 / C01-B01-F03 / C01-B01-F03-Z01`,
    );
  }

  switch (kind) {
    case "CAMPUS":
      if (!RX_CAMPUS_CODE.test(code)) {
        throw new BadRequestException(`Invalid campus code "${code}". Example: C01`);
      }
      if (parentCode) throw new BadRequestException("Campus cannot have a parent");
      return code;

    case "BUILDING":
      if (!RX_BUILDING_CODE.test(code)) {
        throw new BadRequestException(`Invalid building code "${code}". Example: C01-B01`);
      }
      if (!parentCode || !RX_CAMPUS_CODE.test(parentCode)) {
        throw new BadRequestException("Building requires a CAMPUS parent code (e.g., C01)");
      }
      if (!code.startsWith(`${parentCode}-B`)) {
        throw new BadRequestException(`Building code "${code}" must start with parent campus "${parentCode}-B.."`);
      }
      return code;

    case "FLOOR":
      if (!RX_FLOOR_CODE.test(code)) {
        throw new BadRequestException(`Invalid floor code "${code}". Example: C01-B01-F03`);
      }
      if (!parentCode || !RX_BUILDING_CODE.test(parentCode)) {
        throw new BadRequestException("Floor requires a BUILDING parent code (e.g., C01-B01)");
      }
      if (!code.startsWith(`${parentCode}-F`)) {
        throw new BadRequestException(`Floor code "${code}" must start with parent building "${parentCode}-F.."`);
      }
      return code;

    case "ZONE":
      if (!RX_ZONE_CODE.test(code)) {
        throw new BadRequestException(`Invalid zone code "${code}". Example: C01-B01-F03-Z01 (numeric zone)`);
      }
      if (!parentCode || !RX_FLOOR_CODE.test(parentCode)) {
        throw new BadRequestException("Zone requires a FLOOR parent code (e.g., C01-B01-F03)");
      }
      if (!code.startsWith(`${parentCode}-Z`)) {
        throw new BadRequestException(`Zone code "${code}" must start with parent floor "${parentCode}-Z.."`);
      }
      return code;

    default:
      throw new BadRequestException(`Unknown location kind "${String(kind)}"`);
  }
}

/* -------------------------------------------------------------------------- */
/* Unit / Room / Resource validation                                          */
/* -------------------------------------------------------------------------- */

export function assertUnitCode(codeRaw: string): string {
  const code = canonicalizeCode(codeRaw);
  if (!RX_UNIT_CODE.test(code)) {
    throw new BadRequestException(`Invalid unit code "${code}". Example: WARD-MED-01`);
  }
  return code;
}

export function assertRoomCode(unitCodeRaw: string, roomCodeRaw: string): string {
  const unitCode = assertUnitCode(unitCodeRaw);
  const roomCode = canonicalizeCode(roomCodeRaw);

  if (!RX_ROOM_CODE.test(roomCode)) {
    throw new BadRequestException(`Invalid room code "${roomCode}". Example: ${unitCode}-R001`);
  }
  if (!roomCode.startsWith(`${unitCode}-R`)) {
    throw new BadRequestException(`Room code "${roomCode}" must start with "${unitCode}-R"`);
  }
  return roomCode;
}

export function assertResourceCode(args: {
  unitCode: string;
  roomCode?: string | null; // present => room-mode
  resourceType?: ResourceType; // optional: if present, prefix must match
  resourceCode: string;
}): string {
  const unitCode = assertUnitCode(args.unitCode);
  const roomCode = args.roomCode ? canonicalizeCode(args.roomCode) : null;
  const resourceCode = canonicalizeCode(args.resourceCode);

  // First validate shape: open-bay vs room-mode
  if (roomCode) {
    if (!RX_RESOURCE_CODE_ROOM_MODE.test(resourceCode)) {
      throw new BadRequestException(
        `Invalid resource code "${resourceCode}". Example: ${roomCode}-B001 or ${roomCode}-BY002`,
      );
    }
    if (!resourceCode.startsWith(`${roomCode}-`)) {
      throw new BadRequestException(`Resource code "${resourceCode}" must start with "${roomCode}-"`);
    }
  } else {
    if (!RX_RESOURCE_CODE_OPEN_BAY.test(resourceCode)) {
      throw new BadRequestException(
        `Invalid resource code "${resourceCode}". Example: ${unitCode}-B001 or ${unitCode}-BY002`,
      );
    }
    if (!resourceCode.startsWith(`${unitCode}-`)) {
      throw new BadRequestException(`Resource code "${resourceCode}" must start with "${unitCode}-"`);
    }
  }

  // If resourceType is specified, enforce prefix match
  if (args.resourceType) {
    const expectedPrefix = RESOURCE_PREFIX[args.resourceType];
    const suffix = resourceCode.split("-").pop() || "";
    if (!suffix.startsWith(expectedPrefix)) {
      throw new BadRequestException(
        `Resource code "${resourceCode}" prefix does not match type "${args.resourceType}". Expected suffix like "${expectedPrefix}001"`,
      );
    }
    if (!RX_RESOURCE_SUFFIX.test(suffix)) {
      throw new BadRequestException(`Resource code "${resourceCode}" has invalid suffix "${suffix}"`);
    }
  }

  return resourceCode;
}

/* -------------------------------------------------------------------------- */
/* Optional generators (useful for seeds / auto-create)                        */
/* -------------------------------------------------------------------------- */

export function makeCampusCode(seq: number): string {
  return `C${pad2(seq)}`;
}
export function makeBuildingCode(campusSeq: number, buildingSeq: number): string {
  return `C${pad2(campusSeq)}-B${pad2(buildingSeq)}`;
}
export function makeFloorCode(campusSeq: number, buildingSeq: number, floorSeq: number): string {
  return `C${pad2(campusSeq)}-B${pad2(buildingSeq)}-F${pad2(floorSeq)}`;
}
export function makeZoneCode(campusSeq: number, buildingSeq: number, floorSeq: number, zoneSeq: number): string {
  return `C${pad2(campusSeq)}-B${pad2(buildingSeq)}-F${pad2(floorSeq)}-Z${pad2(zoneSeq)}`;
}
export function makeRoomCode(unitCodeRaw: string, roomSeq: number): string {
  const unitCode = assertUnitCode(unitCodeRaw);
  return `${unitCode}-R${pad3(roomSeq)}`;
}
export function makeResourceCode(args: {
  unitCode: string;
  roomCode?: string | null;
  resourceType: ResourceType;
  seq: number;
}): string {
  const prefix = RESOURCE_PREFIX[args.resourceType];
  const base = args.roomCode ? canonicalizeCode(args.roomCode) : assertUnitCode(args.unitCode);
  return `${base}-${prefix}${pad3(args.seq)}`;
}
