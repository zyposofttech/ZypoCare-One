export type LocationKind = "CAMPUS" | "BUILDING" | "FLOOR" | "ZONE" | "AREA";

export const LOCATION_KIND_RANK: Record<LocationKind, number> = {
  CAMPUS: 1,
  BUILDING: 2,
  FLOOR: 3,
  ZONE: 4,
  AREA: 5,
};

export function assertMinLocationKind(kind: LocationKind, minKind: LocationKind, message?: string) {
  if ((LOCATION_KIND_RANK[kind] ?? 0) < (LOCATION_KIND_RANK[minKind] ?? 0)) {
    throw new Error(message ?? `Location kind must be ${minKind} or deeper.`);
  }
}

export type UnitRoomType =
  | "CONSULTATION"
  | "EXAMINATION"
  | "PROCEDURE"
  | "PATIENT_ROOM"
  | "ISOLATION"
  | "NEGATIVE_PRESSURE"
  | "POSITIVE_PRESSURE"
  | "RECOVERY"
  | "WAITING"
  | "NURSING_STATION"
  | "UTILITY"
  | "STORAGE";

export type UnitResourceType =
  | "BED"
  | "BAY"
  | "CHAIR"
  | "OT_TABLE"
  | "PROCEDURE_TABLE"
  | "DIALYSIS_STATION"
  | "RECOVERY_BAY"
  | "EXAM_SLOT"
  | "INCUBATOR";

export function allowedRoomTypesForUnitTypeCode(unitTypeCode: string): Set<UnitRoomType> {
  const code = (unitTypeCode ?? "").toUpperCase();

  if (code.startsWith("OPD")) return new Set(["CONSULTATION", "EXAMINATION", "WAITING", "UTILITY", "STORAGE"]);
  if (code.startsWith("IPD")) return new Set(["PATIENT_ROOM", "ISOLATION", "NEGATIVE_PRESSURE", "POSITIVE_PRESSURE", "NURSING_STATION", "UTILITY", "STORAGE"]);
  if (code.includes("ICU") || code.includes("CCU") || code.includes("NICU")) return new Set(["PATIENT_ROOM", "ISOLATION", "NEGATIVE_PRESSURE", "NURSING_STATION", "UTILITY", "STORAGE"]);
  if (code.startsWith("OT") || code.includes("CATH") || code.includes("ENDO")) return new Set(["PROCEDURE", "RECOVERY", "UTILITY", "STORAGE"]);
  if (code.includes("DIALYSIS")) return new Set(["PROCEDURE", "EXAMINATION", "RECOVERY", "UTILITY", "STORAGE"]);
  if (code.startsWith("RAD")) return new Set(["EXAMINATION", "PROCEDURE", "WAITING", "UTILITY", "STORAGE"]);

  return new Set(["EXAMINATION", "PROCEDURE", "UTILITY", "STORAGE"]);
}

export function allowedResourceTypesForUnitTypeCode(unitTypeCode: string): Set<UnitResourceType> {
  const code = (unitTypeCode ?? "").toUpperCase();

  if (code.startsWith("OPD")) return new Set(["EXAM_SLOT", "CHAIR", "BAY"]);
  if (code.startsWith("IPD")) return new Set(["BED", "BAY"]);
  if (code.includes("ICU") || code.includes("CCU")) return new Set(["BED", "BAY"]);
  if (code.includes("NICU")) return new Set(["INCUBATOR", "BED", "BAY"]);
  if (code.startsWith("OT") || code.includes("CATH") || code.includes("ENDO")) return new Set(["OT_TABLE", "PROCEDURE_TABLE", "RECOVERY_BAY"]);
  if (code.includes("DIALYSIS")) return new Set(["DIALYSIS_STATION", "CHAIR", "BAY"]);
  if (code.startsWith("RAD")) return new Set(["EXAM_SLOT", "BAY"]);

  return new Set(["BAY", "CHAIR", "EXAM_SLOT"]);
}

export function isIsolationRoomType(roomType?: string | null): boolean {
  return roomType === "ISOLATION" || roomType === "NEGATIVE_PRESSURE" || roomType === "POSITIVE_PRESSURE";
}

export function isPatientRoomType(roomType?: string | null): boolean {
  return roomType === "PATIENT_ROOM" || isIsolationRoomType(roomType);
}
