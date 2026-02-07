/**
 * Compliance Validator Engine
 *
 * Handles:
 *   - GSTIN format + checksum validation
 *   - PAN format validation
 *   - Equipment AERB/PCPNDT compliance checking
 *
 * Pure functions — no framework dependencies.
 */

import * as gstRules from "../data/gst-rules.json";
import * as aerbData from "../data/aerb-requirements.json";

// ─── Types ──────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  input: string;
  normalized: string;
  errors: string[];
  warnings: string[];
  details?: Record<string, any>;
}

export interface EquipmentComplianceItem {
  equipmentId: string;
  equipmentName: string;
  assetTag: string | null;
  category: string;
  requiredCompliance: string[];
  status: "COMPLIANT" | "NON_COMPLIANT" | "EXPIRING_SOON";
  issues: string[];
  fixHint: string;
}

export interface EquipmentComplianceResult {
  total: number;
  compliant: number;
  nonCompliant: number;
  expiringSoon: number;
  items: EquipmentComplianceItem[];
  score: number;
}

// ─── GSTIN Validation ───────────────────────────────────────────────────

const GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function gstinChecksum(gstin14: string): string {
  // Luhn mod 36 algorithm for GSTIN check digit
  let factor = 1;
  let sum = 0;
  const n = GSTIN_CHARS.length; // 36

  for (let i = gstin14.length - 1; i >= 0; i--) {
    let codePoint = GSTIN_CHARS.indexOf(gstin14[i]);
    if (codePoint === -1) return "?";

    let addend = factor * codePoint;
    factor = factor === 2 ? 1 : 2;
    addend = Math.floor(addend / n) + (addend % n);
    sum += addend;
  }

  const remainder = sum % n;
  const checkCodePoint = (n - remainder) % n;
  return GSTIN_CHARS[checkCodePoint];
}

export function validateGSTIN(gstin: string): ValidationResult {
  const normalized = (gstin ?? "").trim().toUpperCase();
  const errors: string[] = [];
  const warnings: string[] = [];
  const details: Record<string, any> = {};

  if (!normalized) {
    return { valid: false, input: gstin, normalized, errors: ["GSTIN is required"], warnings, details };
  }

  // Length check
  if (normalized.length !== 15) {
    errors.push(`GSTIN must be 15 characters (got ${normalized.length})`);
    return { valid: false, input: gstin, normalized, errors, warnings, details };
  }

  // Format check
  const formatRegex = new RegExp(gstRules.gstinFormat);
  if (!formatRegex.test(normalized)) {
    errors.push("GSTIN format invalid. Expected: 2-digit state code + 10-char PAN + 1-digit entity + Z + check digit");
  }

  // State code validation
  const stateCode = parseInt(normalized.substring(0, 2), 10);
  if (!gstRules.validStateCodes.includes(stateCode)) {
    errors.push(`Invalid state code: ${normalized.substring(0, 2)}. Must be 01-37.`);
  } else {
    details.state = (gstRules.stateNames as any)[String(stateCode)] ?? "Unknown";
  }

  // Embedded PAN
  const embeddedPan = normalized.substring(2, 12);
  details.embeddedPan = embeddedPan;

  // Entity number
  details.entityNumber = normalized[12];

  // 14th char must be 'Z' (default for now, reserved)
  if (normalized[13] !== "Z") {
    errors.push(`14th character must be 'Z' (got '${normalized[13]}')`);
  }

  // Checksum validation
  if (errors.length === 0) {
    const expected = gstinChecksum(normalized.substring(0, 14));
    if (normalized[14] !== expected) {
      errors.push(`Checksum mismatch: expected '${expected}', got '${normalized[14]}'`);
    }
  }

  // Healthcare-specific note
  warnings.push("Most clinical healthcare services are GST-exempt (Notification 12/2017, Serial 74).");

  return {
    valid: errors.length === 0,
    input: gstin,
    normalized,
    errors,
    warnings,
    details,
  };
}

// ─── PAN Validation ─────────────────────────────────────────────────────

export function validatePAN(pan: string): ValidationResult {
  const normalized = (pan ?? "").trim().toUpperCase();
  const errors: string[] = [];
  const warnings: string[] = [];
  const details: Record<string, any> = {};

  if (!normalized) {
    return { valid: false, input: pan, normalized, errors: ["PAN is required"], warnings, details };
  }

  if (normalized.length !== 10) {
    errors.push(`PAN must be 10 characters (got ${normalized.length})`);
    return { valid: false, input: pan, normalized, errors, warnings, details };
  }

  const panRegex = new RegExp(gstRules.panFormat);
  if (!panRegex.test(normalized)) {
    errors.push("PAN format invalid. Expected: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)");
  }

  // Entity type from 4th character
  const entityChar = normalized[3];
  const entityType = (gstRules.panEntityTypes as any)[entityChar];
  if (entityType) {
    details.entityType = entityType;
    details.entityTypeCode = entityChar;
  } else {
    errors.push(`Invalid entity type character: '${entityChar}'. Valid: A,B,C,F,G,H,J,L,P,T`);
  }

  // For hospitals, typically 'C' (Company) or 'T' (Trust) or 'P' (Individual/Proprietor)
  if (entityChar && !["C", "T", "P", "F", "A", "H"].includes(entityChar)) {
    warnings.push(`Entity type '${entityType}' is unusual for healthcare. Typically C (Company), T (Trust), or P (Individual).`);
  }

  return {
    valid: errors.length === 0,
    input: pan,
    normalized,
    errors,
    warnings,
    details,
  };
}

// ─── Equipment AERB/PCPNDT Compliance ───────────────────────────────────

export async function runEquipmentCompliance(
  prisma: any,
  branchId: string,
): Promise<EquipmentComplianceResult> {
  const equipment = await prisma.equipmentAsset.findMany({
    where: { branchId },
    select: {
      id: true,
      name: true,
      assetTag: true,
      category: true,
      aerbLicenseNo: true,
      aerbValidTo: true,
      pcpndtRegNo: true,
      pcpndtValidTo: true,
    },
  });

  const now = new Date();
  const soonThreshold = new Date(Date.now() + 90 * 86400000); // 90 days
  const items: EquipmentComplianceItem[] = [];

  for (const eq of equipment) {
    const nameLower = (eq.name ?? "").toLowerCase();
    const categoryLower = (eq.category ?? "").toLowerCase();
    const requiredCompliance: string[] = [];
    const issues: string[] = [];
    const fixHints: string[] = [];

    // Check AERB requirement
    const needsAerb = (aerbData as any).aerbEquipment.some(
      (rule: any) => nameLower.includes(rule.keyword) || categoryLower.includes(rule.keyword),
    );
    if (needsAerb) {
      requiredCompliance.push("AERB");
      if (!eq.aerbLicenseNo) {
        issues.push("Missing AERB license number");
        fixHints.push("Upload AERB license number for this equipment");
      }
      if (!eq.aerbValidTo) {
        issues.push("Missing AERB validity date");
        fixHints.push("Enter AERB license validity date");
      } else if (new Date(eq.aerbValidTo) < now) {
        issues.push(`AERB license expired on ${new Date(eq.aerbValidTo).toISOString().split("T")[0]}`);
        fixHints.push("Renew AERB license — it has expired");
      } else if (new Date(eq.aerbValidTo) < soonThreshold) {
        issues.push(`AERB license expiring on ${new Date(eq.aerbValidTo).toISOString().split("T")[0]}`);
        fixHints.push("AERB license expiring soon — initiate renewal");
      }
    }

    // Check PCPNDT requirement
    const needsPcpndt = (aerbData as any).pcpndtEquipment.some(
      (rule: any) => nameLower.includes(rule.keyword) || categoryLower.includes(rule.keyword),
    );
    if (needsPcpndt) {
      requiredCompliance.push("PCPNDT");
      if (!eq.pcpndtRegNo) {
        issues.push("Missing PCPNDT registration number");
        fixHints.push("Upload PCPNDT registration for this equipment");
      }
      if (!eq.pcpndtValidTo) {
        issues.push("Missing PCPNDT validity date");
        fixHints.push("Enter PCPNDT registration validity date");
      } else if (new Date(eq.pcpndtValidTo) < now) {
        issues.push(`PCPNDT registration expired on ${new Date(eq.pcpndtValidTo).toISOString().split("T")[0]}`);
        fixHints.push("Renew PCPNDT registration — it has expired");
      } else if (new Date(eq.pcpndtValidTo) < soonThreshold) {
        issues.push(`PCPNDT registration expiring on ${new Date(eq.pcpndtValidTo).toISOString().split("T")[0]}`);
        fixHints.push("PCPNDT registration expiring soon — initiate renewal");
      }
    }

    // Only track equipment that requires compliance
    if (requiredCompliance.length > 0) {
      let status: EquipmentComplianceItem["status"] = "COMPLIANT";
      if (issues.some((i) => i.includes("Missing") || i.includes("expired"))) {
        status = "NON_COMPLIANT";
      } else if (issues.some((i) => i.includes("expiring"))) {
        status = "EXPIRING_SOON";
      }

      items.push({
        equipmentId: eq.id,
        equipmentName: eq.name,
        assetTag: eq.assetTag,
        category: eq.category,
        requiredCompliance,
        status,
        issues,
        fixHint: fixHints.join("; ") || "No action needed",
      });
    }
  }

  const compliant = items.filter((i) => i.status === "COMPLIANT").length;
  const nonCompliant = items.filter((i) => i.status === "NON_COMPLIANT").length;
  const expiringSoon = items.filter((i) => i.status === "EXPIRING_SOON").length;
  const total = items.length;
  const score = total > 0 ? Math.round((compliant / total) * 100) : 100;

  return { total, compliant, nonCompliant, expiringSoon, items, score };
}
