"""Field-Level Validator — instant heuristic checks for form fields.

Runs naming convention checks, cross-field intelligence, and generates
smart suggestions. Target: <100ms response time. No DB calls required
(uses context from request body).
"""

from __future__ import annotations

import re
from typing import Any

from .models import FieldValidationResult, FieldWarning

# ── Naming patterns ───────────────────────────────────────────────────────

CODE_PATTERN = re.compile(r"^[A-Z][A-Z0-9_-]*$")

ICU_UNIT_TYPES = {"ICU", "HDU", "CCU", "NICU", "PICU", "SICU", "MICU"}
CRITICAL_CARE_UNIT_TYPES = ICU_UNIT_TYPES | {"ER", "EMERGENCY", "OT", "PACU"}


def validate_field(
    module: str,
    field: str,
    value: str,
    context: dict[str, Any] | None = None,
) -> FieldValidationResult:
    """Validate a single form field and return warnings + suggestions."""
    ctx = context or {}
    warnings: list[FieldWarning] = []
    suggestion: dict[str, Any] | None = None

    # ── Code field validation ──────────────────────────────────────────
    if field == "code" and value:
        trimmed = value.strip()
        if " " in trimmed:
            warnings.append(FieldWarning(
                level="warning",
                message="Codes should not contain spaces. Use UPPER_SNAKE_CASE (e.g., GENERAL_WARD).",
            ))
        elif not CODE_PATTERN.match(trimmed):
            warnings.append(FieldWarning(
                level="warning",
                message="Code should be uppercase with letters, numbers, underscores, or hyphens (e.g., ICU_01).",
            ))

    # ── Name field validation ──────────────────────────────────────────
    if field == "name" and value:
        trimmed = value.strip()
        if trimmed and trimmed == trimmed.lower():
            warnings.append(FieldWarning(
                level="info",
                message="Consider using Title Case for better readability.",
            ))

    # ── Room-specific cross-field checks ───────────────────────────────
    if module == "room":
        unit_type = (ctx.get("unitTypeCode") or "").upper()

        if field in ("hasOxygen", "hasSuction") and unit_type in ICU_UNIT_TYPES:
            if value in ("false", "False", "0", "", False):
                amenity = "oxygen supply" if field == "hasOxygen" else "suction"
                warnings.append(FieldWarning(
                    level="critical",
                    message=f"ICU rooms require {amenity}. NABH mandates 100% coverage in critical care areas.",
                ))

        if field == "roomType" and unit_type in ICU_UNIT_TYPES:
            suggestion = {
                "value": {"hasOxygen": True, "hasSuction": True, "hasMonitor": True, "maxOccupancy": 1},
                "reasoning": "ICU rooms need oxygen, suction, and monitoring per NABH. Max occupancy should be 1.",
                "confidence": 0.95,
            }

        if field == "maxOccupancy" and unit_type in ICU_UNIT_TYPES:
            try:
                occupancy = int(value)
                if occupancy > 1:
                    warnings.append(FieldWarning(
                        level="warning",
                        message="ICU rooms typically have max occupancy of 1 for patient safety.",
                    ))
            except (ValueError, TypeError):
                pass

        if field == "pricingTier" and not value and ctx.get("isInpatient"):
            warnings.append(FieldWarning(
                level="info",
                message="Inpatient rooms should have a pricing tier set for billing.",
            ))

    # ── Resource-specific checks ───────────────────────────────────────
    if module == "resource":
        if field == "state":
            if value == "RESERVED" and not ctx.get("reservedReason"):
                warnings.append(FieldWarning(
                    level="warning",
                    message="A reason is required when reserving a resource.",
                ))
            if value == "BLOCKED" and not ctx.get("blockedReason"):
                warnings.append(FieldWarning(
                    level="warning",
                    message="A reason is required when blocking a resource.",
                ))

    # ── Branch-specific checks ─────────────────────────────────────────
    if module == "branch":
        if field == "gstNumber" and value:
            if not re.match(r"^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z0-9]$", value.strip().upper()):
                warnings.append(FieldWarning(
                    level="warning",
                    message="GSTIN format appears invalid. Expected: 2-digit state + PAN + entity + Z + check (15 chars).",
                ))

        if field == "panNumber" and value:
            if not re.match(r"^[A-Z]{5}\d{4}[A-Z]$", value.strip().upper()):
                warnings.append(FieldWarning(
                    level="warning",
                    message="PAN format appears invalid. Expected: 5 letters + 4 digits + 1 letter (10 chars).",
                ))

        if field == "bedCount" and value:
            try:
                beds = int(value)
                if beds > 50 and not ctx.get("hasIcuUnit"):
                    warnings.append(FieldWarning(
                        level="warning",
                        message="Hospitals with 50+ beds should have ICU. Consider allocating 10-15% of beds to ICU.",
                    ))
                if beds > 30 and not ctx.get("hasErUnit") and not ctx.get("emergency24x7"):
                    warnings.append(FieldWarning(
                        level="info",
                        message="Hospitals with 30+ beds typically need an Emergency department.",
                    ))
            except (ValueError, TypeError):
                pass

    # ── Specialty-specific checks ────────────────────────────────────────
    if module == "specialty":
        if field == "code" and value:
            trimmed = value.strip().upper()
            if len(trimmed) < 2:
                warnings.append(FieldWarning(
                    level="warning",
                    message="Specialty codes should be at least 2 characters (e.g., CARDIO, ORTHO).",
                ))
            if len(trimmed) > 10:
                warnings.append(FieldWarning(
                    level="info",
                    message="Specialty codes are typically 2-10 characters. Keep them concise for easy reference.",
                ))

    # ── Department-specific checks ───────────────────────────────────────
    if module == "department":
        if field == "code" and value:
            trimmed = value.strip().upper()
            if len(trimmed) < 2:
                warnings.append(FieldWarning(
                    level="warning",
                    message="Department codes should be at least 2 characters.",
                ))
            if len(trimmed) > 20:
                warnings.append(FieldWarning(
                    level="info",
                    message="Department codes are typically 2-20 characters. Consider abbreviating.",
                ))
        if field == "costCenterCode" and value:
            trimmed = value.strip()
            if not re.match(r"^\d{3,10}$", trimmed) and not re.match(r"^[A-Z0-9]{2,10}$", trimmed.upper()):
                warnings.append(FieldWarning(
                    level="info",
                    message="Cost center codes are typically numeric (e.g., 1001) or short alphanumeric (e.g., CC01).",
                ))

    # ── Unit Type-specific checks ────────────────────────────────────────
    if module == "unitType":
        if field == "code" and value:
            trimmed = value.strip().upper()
            if len(trimmed) > 15:
                warnings.append(FieldWarning(
                    level="info",
                    message="Unit type codes should be concise (e.g., ICU, OPD, ER, WARD, OT).",
                ))

    # ── Unit-specific checks ─────────────────────────────────────────────
    if module == "unit":
        if field == "code" and value:
            trimmed = value.strip().upper()
            if len(trimmed) < 2:
                warnings.append(FieldWarning(
                    level="warning",
                    message="Unit codes should be at least 2 characters.",
                ))
        if field == "totalBedCapacity" and value:
            try:
                beds = int(value)
                unit_type = (ctx.get("unitTypeCode") or "").upper()
                if beds > 20 and unit_type in ICU_UNIT_TYPES:
                    warnings.append(FieldWarning(
                        level="info",
                        message="ICU units typically have 8-20 beds for effective patient monitoring.",
                    ))
            except (ValueError, TypeError):
                pass

    valid = all(w.level != "critical" for w in warnings)

    return FieldValidationResult(
        valid=valid,
        warnings=warnings,
        suggestion=suggestion,
    )
