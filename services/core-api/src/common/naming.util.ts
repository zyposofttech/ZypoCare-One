import { BadRequestException } from "@nestjs/common";

/**
 * Canonical code rules (strict, backend-enforced)
 * - Uppercase
 * - Trim
 * - Convert spaces/underscores to hyphen
 * - Collapse multiple hyphens
 */
export function canonicalizeCode(input: string) {
  const s = String(input ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s;
}

// ---------- Regex used by DTOs ----------
export const RX_UNIT_CODE = /^[A-Z][A-Z0-9]{1,7}(-[A-Z0-9]{1,8})?$/; // e.g. ICU-A, OT-01, WARD-3
export const RX_ROOM_CODE = /^[A-Z0-9][A-Z0-9-]{0,20}$/;            // raw input (we canonicalize further in assertRoomCode)
export const RX_RESOURCE_CODE_ANY = /^[A-Z0-9][A-Z0-9-]{0,24}$/;    // raw input (we canonicalize further in assertResourceCode)
export const RX_LOCATION_CODE_ANY = /^[A-Z0-9][A-Z0-9-]{0,48}$/;    // raw input (Zone can be numeric-only too)

export type LocationKind = "CAMPUS" | "BUILDING" | "FLOOR" | "ZONE";
export const RESOURCE_TYPES = [
  "BED",
  "BAY",
  "CHAIR",
  "OT_TABLE",
  "PROCEDURE_TABLE",
  "DIALYSIS_STATION",
  "RECOVERY_BAY",
  "EXAM_SLOT",
  "INCUBATOR",
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

function padLeft(numStr: string, width: number) {
  const s = String(numStr);
  return s.length >= width ? s : "0".repeat(width - s.length) + s;
}

/**
 * Location code standard (branch-unique, hierarchical):
 * - CAMPUS: C##     (e.g. C01)
 * - BUILDING: C##-B##  (input expects B##)
 * - FLOOR: C##-B##-F## (input expects F##)
 * - ZONE: C##-B##-F##-NN (zone code numeric; input can be "01" or "Z01"; stored as "-01")
 */
export function assertLocationCode(kind: LocationKind, rawCode: string, parentCode?: string) {
  const code = canonicalizeCode(rawCode);

  if (kind === "CAMPUS") {
    if (parentCode) throw new BadRequestException("CAMPUS cannot have a parent.");
    if (!/^C\d{2}$/.test(code)) {
      throw new BadRequestException(`Invalid CAMPUS code "${rawCode}". Expected pattern: C## (e.g., C01).`);
    }
    return code;
  }

  if (!parentCode) throw new BadRequestException(`${kind} requires a parent location code.`);

  if (kind === "BUILDING") {
    if (!/^C\d{2}$/.test(parentCode)) throw new BadRequestException("BUILDING parent must be a CAMPUS.");
    if (!/^B\d{2}$/.test(code)) throw new BadRequestException(`Invalid BUILDING code "${rawCode}". Expected: B## (e.g., B01).`);
    return `${parentCode}-${code}`;
  }

  if (kind === "FLOOR") {
    if (!/^C\d{2}-B\d{2}$/.test(parentCode)) throw new BadRequestException("FLOOR parent must be a BUILDING.");
    if (!/^F\d{2}$/.test(code)) throw new BadRequestException(`Invalid FLOOR code "${rawCode}". Expected: F## (e.g., F01).`);
    return `${parentCode}-${code}`;
  }

  // ZONE
  if (!/^C\d{2}-B\d{2}-F\d{2}$/.test(parentCode)) throw new BadRequestException("ZONE parent must be a FLOOR.");

  // numeric zone preference: allow "01" or "Z01"
  const zone = code.startsWith("Z") ? code.slice(1) : code;
  if (!/^\d{1,4}$/.test(zone)) {
    throw new BadRequestException(`Invalid ZONE code "${rawCode}". Zone code must be numeric (e.g., 01).`);
  }

  const zoneNorm = padLeft(zone, 2); // stored as 2-digit by default
  return `${parentCode}-${zoneNorm}`;
}

export function assertUnitCode(raw: string) {
  const code = canonicalizeCode(raw);
  if (!RX_UNIT_CODE.test(code)) {
    throw new BadRequestException(`Invalid Unit code "${raw}". Examples: OT-01, ICU-A, WARD-3.`);
  }
  return code;
}

/**
 * Room code stored as: UNITCODE-R###
 * - Accepts "101" or "R101" or "UNIT-R101"
 */
export function assertRoomCode(unitCodeRaw: string, roomCodeRaw: string) {
  const unitCode = canonicalizeCode(unitCodeRaw);
  let rc = canonicalizeCode(roomCodeRaw);

  // allow full codes like UNIT-R101
  if (rc.startsWith(unitCode + "-")) rc = rc.slice(unitCode.length + 1);

  // normalize digits -> R###
  if (/^\d{1,4}$/.test(rc)) rc = `R${padLeft(rc, 3)}`;
  if (!/^R\d{1,4}$/.test(rc)) {
    throw new BadRequestException(`Invalid Room code "${roomCodeRaw}". Use numeric (101) or R-prefixed (R101).`);
  }

  return `${unitCode}-${rc}`;
}

export const RESOURCE_PREFIX: Record<ResourceType, string> = {

  BED: "B",
  BAY: "BAY",
  CHAIR: "CH",
  OT_TABLE: "OT",
  PROCEDURE_TABLE: "PR",
  DIALYSIS_STATION: "DS",
  RECOVERY_BAY: "RB",
  EXAM_SLOT: "EX",
  INCUBATOR: "IN",
};

type AssertResourceArgs = {
  unitCode: string;
  roomCode?: string | null;
  resourceType: ResourceType;
  resourceCode: string;
};


/**
 * Resource code stored as:
 * - If room: ROOMCODE-<PREFIX><NNN>
 * - If open-bay: UNITCODE-<PREFIX><NNN>
 *
 * Accepts raw resourceCode like "1" or "B1" or "OT01"; canonicalizes to PREFIX + padded number where applicable.
 */
export function assertResourceCode(args: AssertResourceArgs) {
  const unitCode = canonicalizeCode(args.unitCode);
  const base = args.roomCode ? canonicalizeCode(args.roomCode) : unitCode;

  const prefix = RESOURCE_PREFIX[args.resourceType];
  let rc = canonicalizeCode(args.resourceCode);

  // strip base prefix if user passes full code
  if (rc.startsWith(base + "-")) rc = rc.slice(base.length + 1);

  // numeric -> PREFIX + pad
  if (/^\d{1,4}$/.test(rc)) rc = `${prefix}${padLeft(rc, 3)}`;

  // allow already prefixed forms like B001, OT001, BAY001
  if (!/^[A-Z]{1,4}\d{1,4}$/.test(rc) && !/^[A-Z]{2,6}\d{1,4}$/.test(rc)) {
    throw new BadRequestException(`Invalid Resource code "${args.resourceCode}". Use numeric (1) or prefixed (B001, OT001).`);
  }

  return `${base}-${rc}`;
}
