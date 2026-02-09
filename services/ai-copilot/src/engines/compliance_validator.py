"""
Compliance Validator Engine

Handles:
  - GSTIN format + Luhn mod-36 checksum validation
  - PAN format validation

Pure functions -- no framework dependencies.

Ported from: services/core-api/.../engines/compliance-validator.engine.ts
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from src.engines.models import ComplianceResult, GstinValidationResult, PanValidationResult

# ---------------------------------------------------------------------------
# Load GST rules JSON
# ---------------------------------------------------------------------------

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_GST_RULES: dict[str, Any] = {}

_gst_rules_path = _DATA_DIR / "gst_rules.json"
if _gst_rules_path.exists():
    with open(_gst_rules_path, encoding="utf-8") as f:
        _GST_RULES = json.load(f)


# ---------------------------------------------------------------------------
# GSTIN character set (0-9, A-Z) for Luhn mod-36
# ---------------------------------------------------------------------------

GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"


def _gstin_checksum(gstin14: str) -> str:
    """
    Compute the Luhn mod-36 check digit for the first 14 characters of a GSTIN.

    Algorithm:
      - Process characters right-to-left.
      - Alternating factor between 1 and 2.
      - For each character, multiply its code-point index by the factor.
      - addend = floor(product / 36) + (product % 36)
      - Sum all addends, then check_digit = (36 - (sum % 36)) % 36
    """
    factor = 1
    total = 0
    n = len(GSTIN_CHARS)  # 36

    for i in range(len(gstin14) - 1, -1, -1):
        code_point = GSTIN_CHARS.find(gstin14[i])
        if code_point == -1:
            return "?"

        addend = factor * code_point
        factor = 1 if factor == 2 else 2
        addend = (addend // n) + (addend % n)
        total += addend

    remainder = total % n
    check_code_point = (n - remainder) % n
    return GSTIN_CHARS[check_code_point]


# ---------------------------------------------------------------------------
# GSTIN Validation
# ---------------------------------------------------------------------------

def validate_gstin(gstin: str) -> GstinValidationResult:
    """
    Validate an Indian GSTIN (Goods & Services Tax Identification Number).

    Checks:
      1. Non-empty
      2. Length == 15
      3. Format regex (2-digit state + 10-char PAN + entity digit + Z + check digit)
      4. Valid state code (01-37)
      5. 14th character must be 'Z'
      6. Luhn mod-36 checksum on the 15th character
    """
    normalized = (gstin or "").strip().upper()
    errors: list[str] = []
    warnings: list[str] = []
    details: dict[str, Any] = {}

    if not normalized:
        return ComplianceResult(
            valid=False,
            input=gstin,
            normalized=normalized,
            errors=["GSTIN is required"],
            warnings=warnings,
            details=details,
        )

    # Length check
    if len(normalized) != 15:
        errors.append(f"GSTIN must be 15 characters (got {len(normalized)})")
        return ComplianceResult(
            valid=False,
            input=gstin,
            normalized=normalized,
            errors=errors,
            warnings=warnings,
            details=details,
        )

    # Format check
    gstin_format = _GST_RULES.get("gstinFormat", r"^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z\d]$")
    if not re.match(gstin_format, normalized):
        errors.append(
            "GSTIN format invalid. Expected: 2-digit state code + "
            "10-char PAN + 1-digit entity + Z + check digit"
        )

    # State code validation
    state_code_str = normalized[:2]
    try:
        state_code = int(state_code_str)
    except ValueError:
        state_code = -1

    valid_state_codes: list[int] = _GST_RULES.get("validStateCodes", [])
    if state_code not in valid_state_codes:
        errors.append(
            f"Invalid state code: {state_code_str}. Must be 01-37."
        )
    else:
        state_names: dict[str, str] = _GST_RULES.get("stateNames", {})
        details["state"] = state_names.get(str(state_code), "Unknown")

    # Embedded PAN
    embedded_pan = normalized[2:12]
    details["embeddedPan"] = embedded_pan

    # Entity number
    details["entityNumber"] = normalized[12]

    # 14th char must be 'Z' (index 13, reserved)
    if normalized[13] != "Z":
        errors.append(
            f"14th character must be 'Z' (got '{normalized[13]}')"
        )

    # Checksum validation (only if no prior errors)
    if not errors:
        expected = _gstin_checksum(normalized[:14])
        if normalized[14] != expected:
            errors.append(
                f"Checksum mismatch: expected '{expected}', got '{normalized[14]}'"
            )

    # Healthcare-specific note
    warnings.append(
        "Most clinical healthcare services are GST-exempt "
        "(Notification 12/2017, Serial 74)."
    )

    return ComplianceResult(
        valid=len(errors) == 0,
        input=gstin,
        normalized=normalized,
        errors=errors,
        warnings=warnings,
        details=details,
    )


# ---------------------------------------------------------------------------
# PAN Validation
# ---------------------------------------------------------------------------

def validate_pan(pan: str) -> PanValidationResult:
    """
    Validate an Indian PAN (Permanent Account Number).

    Checks:
      1. Non-empty
      2. Length == 10
      3. Format regex (5 letters + 4 digits + 1 letter)
      4. Valid entity type character (4th char)
      5. Healthcare-appropriateness warning
    """
    normalized = (pan or "").strip().upper()
    errors: list[str] = []
    warnings: list[str] = []
    details: dict[str, Any] = {}

    if not normalized:
        return ComplianceResult(
            valid=False,
            input=pan,
            normalized=normalized,
            errors=["PAN is required"],
            warnings=warnings,
            details=details,
        )

    if len(normalized) != 10:
        errors.append(f"PAN must be 10 characters (got {len(normalized)})")
        return ComplianceResult(
            valid=False,
            input=pan,
            normalized=normalized,
            errors=errors,
            warnings=warnings,
            details=details,
        )

    # Format check
    pan_format = _GST_RULES.get("panFormat", r"^[A-Z]{5}\d{4}[A-Z]$")
    if not re.match(pan_format, normalized):
        errors.append(
            "PAN format invalid. Expected: 5 letters + 4 digits + "
            "1 letter (e.g., ABCDE1234F)"
        )

    # Entity type from 4th character (index 3)
    entity_char = normalized[3] if len(normalized) > 3 else ""
    pan_entity_types: dict[str, str] = _GST_RULES.get("panEntityTypes", {})
    entity_type = pan_entity_types.get(entity_char)

    if entity_type:
        details["entityType"] = entity_type
        details["entityTypeCode"] = entity_char
    else:
        errors.append(
            f"Invalid entity type character: '{entity_char}'. "
            f"Valid: A,B,C,F,G,H,J,L,P,T"
        )

    # For hospitals, typically 'C' (Company) or 'T' (Trust) or 'P' (Individual/Proprietor)
    healthcare_typical = {"C", "T", "P", "F", "A", "H"}
    if entity_char and entity_char not in healthcare_typical:
        warnings.append(
            f"Entity type '{entity_type}' is unusual for healthcare. "
            f"Typically C (Company), T (Trust), or P (Individual)."
        )

    return ComplianceResult(
        valid=len(errors) == 0,
        input=pan,
        normalized=normalized,
        errors=errors,
        warnings=warnings,
        details=details,
    )
