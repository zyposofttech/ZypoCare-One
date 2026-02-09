/* ─── Client-side heuristic rules for field validation (Tier 1, <10ms) ─── */

import type { FieldWarning } from "./types";

const CODE_RE = /^[A-Z][A-Z0-9_-]*$/;
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z0-9]$/;
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;

const ICU_TYPES = new Set(["ICU", "HDU", "CCU", "NICU", "PICU", "SICU", "MICU"]);

type FieldContext = Record<string, unknown>;

/**
 * Run client-side field validation rules.
 * These are instant (no network call) and handle the most common cases.
 * Returns null if no rule matches (caller should then hit the API for Tier 2).
 */
export function checkFieldRules(
  module: string,
  field: string,
  value: string,
  context?: FieldContext
): FieldWarning[] | null {
  const warnings: FieldWarning[] = [];
  const ctx = context ?? {};

  // ── Code field ──────────────────────────────────────────────────────
  if (field === "code" && value) {
    const trimmed = value.trim();
    if (trimmed.includes(" ")) {
      warnings.push({
        level: "warning",
        message: "Codes should not contain spaces. Use UPPER_SNAKE_CASE (e.g., GENERAL_WARD).",
      });
    } else if (!CODE_RE.test(trimmed)) {
      warnings.push({
        level: "warning",
        message: "Code should be uppercase with letters, numbers, underscores, or hyphens.",
      });
    }
  }

  // ── Name field ─────────────────────────────────────────────────────
  if (field === "name" && value) {
    const trimmed = value.trim();
    if (trimmed && trimmed === trimmed.toLowerCase() && trimmed.length > 2) {
      warnings.push({
        level: "info",
        message: "Consider using Title Case for better readability.",
      });
    }
  }

  // ── GSTIN ──────────────────────────────────────────────────────────
  if (field === "gstNumber" && value) {
    const upper = value.trim().toUpperCase();
    if (upper.length > 0 && !GSTIN_RE.test(upper)) {
      warnings.push({
        level: "warning",
        message: "GSTIN format appears invalid. Expected: 15-character format (e.g., 27AACCT1234A1ZV).",
      });
    }
  }

  // ── PAN ────────────────────────────────────────────────────────────
  if (field === "panNumber" && value) {
    const upper = value.trim().toUpperCase();
    if (upper.length > 0 && !PAN_RE.test(upper)) {
      warnings.push({
        level: "warning",
        message: "PAN format appears invalid. Expected: 10-character format (e.g., AACCT1234A).",
      });
    }
  }

  // ── Room: ICU without oxygen/suction ──────────────────────────────
  if (module === "room") {
    const unitType = String(ctx.unitTypeCode ?? "").toUpperCase();

    if (
      (field === "hasOxygen" || field === "hasSuction") &&
      ICU_TYPES.has(unitType)
    ) {
      if (value === "false" || value === "" || value === "0") {
        const amenity = field === "hasOxygen" ? "oxygen supply" : "suction";
        warnings.push({
          level: "critical",
          message: `ICU rooms require ${amenity}. NABH mandates 100% coverage in critical care areas.`,
        });
      }
    }

    if (field === "maxOccupancy" && ICU_TYPES.has(unitType)) {
      const occ = parseInt(value, 10);
      if (!isNaN(occ) && occ > 1) {
        warnings.push({
          level: "warning",
          message: "ICU rooms typically have max occupancy of 1 for patient safety.",
        });
      }
    }
  }

  // ── Branch: bed count ─────────────────────────────────────────────
  if (module === "branch" && field === "bedCount" && value) {
    const beds = parseInt(value, 10);
    if (!isNaN(beds) && beds > 50 && !ctx.hasIcuUnit) {
      warnings.push({
        level: "warning",
        message: "Hospitals with 50+ beds should have ICU. Consider allocating 10-15% of beds to ICU.",
      });
    }
  }

  // ── Resource: reserved/blocked without reason ─────────────────────
  if (module === "resource" && field === "state") {
    if (value === "RESERVED" && !ctx.reservedReason) {
      warnings.push({
        level: "warning",
        message: "A reason is required when reserving a resource.",
      });
    }
    if (value === "BLOCKED" && !ctx.blockedReason) {
      warnings.push({
        level: "warning",
        message: "A reason is required when blocking a resource.",
      });
    }
  }

  // ── Specialty ───────────────────────────────────────────────────────
  if (module === "specialty") {
    if (field === "code" && value) {
      const trimmed = value.trim().toUpperCase();
      if (trimmed.length > 0 && trimmed.length < 2) {
        warnings.push({
          level: "warning",
          message: "Specialty codes should be at least 2 characters (e.g., CARDIO, ORTHO).",
        });
      }
      if (trimmed.length > 10) {
        warnings.push({
          level: "info",
          message: "Specialty codes are typically 2-10 characters. Keep them concise for easy reference.",
        });
      }
    }
  }

  // ── Department ──────────────────────────────────────────────────────
  if (module === "department") {
    if (field === "code" && value) {
      const trimmed = value.trim().toUpperCase();
      if (trimmed.length > 0 && trimmed.length < 2) {
        warnings.push({
          level: "warning",
          message: "Department codes should be at least 2 characters (e.g., CARDIOLOGY, GEN-SURG).",
        });
      }
      if (trimmed.length > 20) {
        warnings.push({
          level: "info",
          message: "Department codes are typically 2-20 characters. Consider abbreviating.",
        });
      }
    }
    if (field === "costCenterCode" && value) {
      const trimmed = value.trim();
      if (trimmed.length > 0 && !/^\d{3,10}$/.test(trimmed) && !/^[A-Z0-9]{2,10}$/i.test(trimmed)) {
        warnings.push({
          level: "info",
          message: "Cost center codes are typically numeric (e.g., 1001) or short alphanumeric (e.g., CC01).",
        });
      }
    }
  }

  // ── Unit Type ───────────────────────────────────────────────────────
  if (module === "unitType") {
    if (field === "code" && value) {
      const trimmed = value.trim().toUpperCase();
      if (trimmed.length > 15) {
        warnings.push({
          level: "info",
          message: "Unit type codes should be concise (e.g., ICU, OPD, ER, WARD, OT).",
        });
      }
    }
  }

  // ── Unit ────────────────────────────────────────────────────────────
  if (module === "unit") {
    if (field === "totalBedCapacity" && value) {
      const beds = parseInt(value, 10);
      const unitType = String(ctx.unitTypeCode ?? "").toUpperCase();
      if (!isNaN(beds) && beds > 20 && ICU_TYPES.has(unitType)) {
        warnings.push({
          level: "info",
          message: "ICU units typically have 8-20 beds for effective patient monitoring.",
        });
      }
    }
    if (field === "code" && value) {
      const trimmed = value.trim().toUpperCase();
      if (trimmed.length > 0 && trimmed.length < 2) {
        warnings.push({
          level: "warning",
          message: "Unit codes should be at least 2 characters.",
        });
      }
    }
  }

  return warnings.length > 0 ? warnings : null;
}
