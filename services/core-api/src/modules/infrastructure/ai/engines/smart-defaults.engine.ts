/**
 * Smart Defaults Engine
 *
 * Given a hospital profile (bed count, type, specialties), generates
 * a complete set of recommended infrastructure defaults:
 *   - Departments, units, bed distribution
 *   - Equipment, diagnostic packs, pharmacy stores
 *   - Staffing minimums, billing defaults
 *
 * Pure logic — no framework dependencies. Reads static JSON data.
 */

import * as hospitalProfiles from "../data/hospital-profiles.json";
import * as specialtyMap from "../data/specialty-department-map.json";

// ─── Types ──────────────────────────────────────────────────────────────

export interface HospitalProfile {
  bedCount: number;
  hospitalType: string;
  cityTier: string;
  specialties: string[];
  hasEmergency?: boolean;
  hasICU?: boolean;
  hasOT?: boolean;
  hasBloodBank?: boolean;
  hasDialysis?: boolean;
  hasRadiology?: boolean;
  targetAccreditation?: string;
}

export interface SmartDefaultsResult {
  departments: Array<{
    code: string;
    name: string;
    specialtyCode: string | null;
    facilityType: string;
    suggestedUnitTypes: string[];
  }>;
  units: {
    opdRooms: number;
    generalWardBeds: number;
    privateRoomBeds: number;
    semiPrivateBeds: number;
    icuBeds: number;
    nicuBeds: number;
    emergencyBeds: number;
    otSuites: number;
    laborRooms: number;
    dialysisStations: number;
  };
  diagnosticPacks: string[];
  equipment: Array<{
    category: string;
    name: string;
    quantity: number;
    complianceRequired?: string;
  }>;
  pharmacyStores: Array<{ type: string; name: string }>;
  billing: {
    suggestedTaxCodes: Array<{ code: string; rate: number; description: string }>;
    suggestedPayers: string[];
  };
  staffing: {
    minDoctors: number;
    minNurses: number;
    minLabTechs: number;
    minPharmacists: number;
    nursePatientRatios: Record<string, string>;
  };
  confidence: number;
  reasoning: string[];
}

// ─── Engine ─────────────────────────────────────────────────────────────

export function generateSmartDefaults(profile: HospitalProfile): SmartDefaultsResult {
  const reasoning: string[] = [];
  const beds = Math.max(1, profile.bedCount);
  const type = profile.hospitalType || "MULTI_SPECIALTY";

  // 1. Bed distribution
  const dist = (hospitalProfiles as any).bedDistribution[type]
    ?? (hospitalProfiles as any).bedDistribution.MULTI_SPECIALTY;

  const generalWardBeds = Math.round(beds * dist.generalWardPct);
  const privateRoomBeds = Math.round(beds * dist.privateRoomPct);
  const semiPrivateBeds = Math.round(beds * dist.semiPrivatePct);
  const icuBeds = profile.hasICU !== false ? Math.max(2, Math.round(beds * dist.icuPct)) : 0;
  const nicuBeds = Math.round(beds * dist.nicuPct);
  const laborRooms = Math.round(beds * dist.laborPct);
  const dialysisStations = profile.hasDialysis ? Math.max(2, Math.round(beds * dist.dialysisPct)) : 0;
  const emergencyBeds = profile.hasEmergency !== false ? Math.max(2, dist.emergencyFlat) : 0;
  const opdRooms = Math.max(1, Math.round(beds * dist.opdPerBedRatio));
  const otSuites = profile.hasOT !== false && beds >= dist.otThreshold
    ? Math.max(1, Math.round(beds * dist.otPerBedRatio))
    : 0;

  reasoning.push(`Bed distribution for ${type}: ${generalWardBeds} general, ${privateRoomBeds} private, ${icuBeds} ICU.`);

  // 2. Departments from specialties
  const departments: SmartDefaultsResult["departments"] = [];
  const allUnitTypes = new Set<string>();
  const allDiagPacks = new Set<string>();

  for (const specCode of profile.specialties) {
    const mapping = (specialtyMap as any).specialtyDepartments[specCode];
    if (mapping) {
      departments.push({
        code: specCode,
        name: mapping.department,
        specialtyCode: specCode,
        facilityType: "CLINICAL",
        suggestedUnitTypes: mapping.unitTypes,
      });
      mapping.unitTypes.forEach((ut: string) => allUnitTypes.add(ut));
      mapping.diagnosticPacks.forEach((dp: string) => allDiagPacks.add(dp));
    }
  }

  // Add support departments
  for (const sd of (specialtyMap as any).supportDepartments) {
    const shouldAdd =
      sd.code === "PHARMACY" ||
      sd.code === "ADMIN" ||
      (sd.code === "BLOOD_BANK" && profile.hasBloodBank) ||
      (sd.code === "CSSD" && profile.hasOT !== false) ||
      (sd.code === "STORES" && beds >= 50) ||
      (sd.code === "DIETARY" && beds >= 30) ||
      (sd.code === "HOUSEKEEPING" && beds >= 20) ||
      (sd.code === "LAUNDRY" && beds >= 50) ||
      (sd.code === "BIOMEDICAL" && beds >= 100);

    if (shouldAdd) {
      departments.push({
        code: sd.code,
        name: sd.name,
        specialtyCode: null,
        facilityType: "SUPPORT",
        suggestedUnitTypes: sd.requiredUnitTypes,
      });
    }
  }

  reasoning.push(`${departments.length} departments suggested (${departments.filter(d => d.facilityType === "CLINICAL").length} clinical, ${departments.filter(d => d.facilityType === "SUPPORT").length} support).`);

  // 3. Diagnostic packs
  const diagnosticPacks = Array.from(allDiagPacks);
  if (profile.hasRadiology) {
    if (!diagnosticPacks.includes("RADIOLOGY_CORE_V1")) diagnosticPacks.push("RADIOLOGY_CORE_V1");
  }
  reasoning.push(`${diagnosticPacks.length} diagnostic packs recommended.`);

  // 4. Equipment
  const eqKey = type === "SINGLE_SPECIALTY" ? "MULTI_SPECIALTY" : type;
  const equipmentSuggestions: any[] =
    (hospitalProfiles as any).equipmentSuggestions[eqKey]
    ?? (hospitalProfiles as any).equipmentSuggestions.MULTI_SPECIALTY
    ?? [];

  const equipment = equipmentSuggestions.map((eq: any) => ({
    category: eq.category,
    name: eq.name,
    quantity: eq.quantity,
    complianceRequired: eq.compliance ?? undefined,
  }));

  // 5. Pharmacy stores
  const storeTypes: string[] =
    (hospitalProfiles as any).pharmacyStores[type]
    ?? (hospitalProfiles as any).pharmacyStores.MULTI_SPECIALTY
    ?? [];

  const pharmacyStores = storeTypes.map((s: string) => ({
    type: s,
    name: s.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
  }));

  // 6. Billing defaults
  const suggestedTaxCodes = (hospitalProfiles as any).defaultTaxCodes ?? [];
  const suggestedPayers: string[] =
    (hospitalProfiles as any).defaultPayers[type]
    ?? (hospitalProfiles as any).defaultPayers.MULTI_SPECIALTY
    ?? [];

  // 7. Staffing
  const staffRules = (hospitalProfiles as any).staffingMinimums[type]
    ?? (hospitalProfiles as any).staffingMinimums.MULTI_SPECIALTY;

  const staffing = {
    minDoctors: Math.max(1, Math.ceil(beds * staffRules.doctorPerBed)),
    minNurses: Math.max(1, Math.ceil(beds * staffRules.nursePerBed)),
    minLabTechs: staffRules.labTechFlat,
    minPharmacists: staffRules.pharmacistFlat,
    nursePatientRatios: staffRules.nursePatientRatio,
  };

  reasoning.push(`Staffing: ${staffing.minDoctors} doctors, ${staffing.minNurses} nurses recommended.`);

  // 8. Confidence
  let confidence = 70;
  if (profile.specialties.length > 0) confidence += 10;
  if (beds >= 10) confidence += 5;
  if (profile.targetAccreditation === "NABH") confidence += 5;
  if (type !== "CLINIC") confidence += 5;
  confidence = Math.min(95, confidence);

  return {
    departments,
    units: {
      opdRooms,
      generalWardBeds,
      privateRoomBeds,
      semiPrivateBeds,
      icuBeds,
      nicuBeds,
      emergencyBeds,
      otSuites,
      laborRooms,
      dialysisStations,
    },
    diagnosticPacks,
    equipment,
    pharmacyStores,
    billing: { suggestedTaxCodes, suggestedPayers },
    staffing,
    confidence,
    reasoning,
  };
}
