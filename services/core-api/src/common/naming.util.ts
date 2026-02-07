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
// Room codes: hospital-friendly input (canonicalized later)
// Accepts: TH01, OT-1, LAB1, 101, ICU-A-01, etc.
// Allows letters/digits plus space/underscore/hyphen (canonicalizeCode will normalize to hyphen+uppercase)
export const RX_ROOM_CODE = /^[A-Z0-9][A-Z0-9 _-]{0,31}$/i;
export const RX_RESOURCE_CODE_ANY = /^[A-Z0-9][A-Z0-9-]{0,24}$/;    // raw input (we canonicalize further in assertResourceCode)
export const RX_LOCATION_CODE_ANY = /^[A-Z0-9][A-Z0-9-]{0,48}$/;    // raw input (Zone can be numeric-only too)

export type LocationKind = "CAMPUS" | "BUILDING" | "FLOOR" | "ZONE";
export const RESOURCE_TYPES = [
  // Bed resources
  'GENERAL_BED',
  'ICU_BED',
  'NICU_INCUBATOR',
  'CRIB',
  'TROLLEY',
  'STRETCHER',
  'WHEELCHAIR_POSITION',

  // Procedure resources
  'OT_TABLE',
  'DIALYSIS_STATION',
  'CHEMOTHERAPY_CHAIR',
  'PROCEDURE_CHAIR',
  'PROCEDURE_TABLE',
  'RECOVERY_BAY',
  'DENTAL_CHAIR',
  'EXAMINATION_TABLE',

  // Diagnostic resources
  'XRAY_MACHINE_SLOT',
  'CT_SCANNER_SLOT',
  'MRI_SCANNER_SLOT',
  'USG_MACHINE_SLOT',
  'ECG_MACHINE_SLOT',
  'ECHO_MACHINE_SLOT',
  'SAMPLE_COLLECTION_COUNTER',

  // Consultation
  'CONSULTATION_SLOT',
  'EXAM_SLOT',

  // Legacy (keep for backward compatibility)
  'BED',
  'BAY',
  'CHAIR',
  'INCUBATOR',
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
 * Room code (stored exactly as a canonical code, NOT forced numeric-only).
 * Standard:
 * - Uppercase + trimmed + spaces/underscores => hyphen (canonicalizeCode)
 * - 1..32 chars
 * - Allowed chars: A-Z, 0-9, hyphen (no trailing hyphen)
 * Examples valid: TH01, OT-1, LAB1, 101
 */
export function assertRoomCode(_unitCodeRaw: string, roomCodeRaw: string) {
  const rc = canonicalizeCode(roomCodeRaw);

  if (!rc) throw new BadRequestException("Room code is required");
  if (rc.length > 32) throw new BadRequestException(`Invalid Room code "${roomCodeRaw}". Max length is 32.`);

  // Canonical format: no trailing hyphen, no consecutive hyphens after canonicalizeCode collapse
  const RX_ROOM_CODE_CANON = /^[A-Z0-9](?:[A-Z0-9]|-(?=[A-Z0-9])){0,31}$/;

  if (!RX_ROOM_CODE_CANON.test(rc)) {
    throw new BadRequestException(
      `Invalid Room code "${roomCodeRaw}". Examples: TH01, OT-1, LAB1, 101.`,
    );
  }

  // Store canonical code only (unique per unit via @@unique([unitId, code]))
  return rc;
}


export const RESOURCE_PREFIX: Record<ResourceType, string> = {
  // Bed resources
  GENERAL_BED: 'B',
  ICU_BED: 'ICU',
  NICU_INCUBATOR: 'NICU',
  CRIB: 'CR',
  TROLLEY: 'TR',
  STRETCHER: 'ST',
  WHEELCHAIR_POSITION: 'WC',

  // Procedure resources
  OT_TABLE: 'OT',
  DIALYSIS_STATION: 'DS',
  CHEMOTHERAPY_CHAIR: 'CH',
  PROCEDURE_CHAIR: 'PC',
  PROCEDURE_TABLE: 'PR',
  RECOVERY_BAY: 'RB',
  DENTAL_CHAIR: 'DC',
  EXAMINATION_TABLE: 'ET',

  // Diagnostic resources
  XRAY_MACHINE_SLOT: 'XR',
  CT_SCANNER_SLOT: 'CT',
  MRI_SCANNER_SLOT: 'MRI',
  USG_MACHINE_SLOT: 'US',
  ECG_MACHINE_SLOT: 'ECG',
  ECHO_MACHINE_SLOT: 'ECH',
  SAMPLE_COLLECTION_COUNTER: 'SC',

  // Consultation
  CONSULTATION_SLOT: 'CS',
  EXAM_SLOT: 'EX',

  // Legacy
  BED: 'B',
  BAY: 'BAY',
  CHAIR: 'CH',
  INCUBATOR: 'IN',
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
