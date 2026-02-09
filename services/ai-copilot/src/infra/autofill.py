"""
Branch Auto-fill Engine (Heuristic) — Python port.

Proactive intelligence for branch creation:
  - City → state, timezone, GST code
  - Bed count + hospital type → unit plan, equipment
  - Specialties → departments
"""
from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

from .models import (
    AutoFillInput,
    AutoFillResult,
    AutoFillSuggestion,
    UnitSuggestion,
    RoomType,
    DepartmentSuggestion,
    EquipmentHighlight,
)

# ── Load data files ──────────────────────────────────────────────────────

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"

def _load_json(name: str) -> dict:
    with open(_DATA_DIR / name, "r", encoding="utf-8") as f:
        return json.load(f)

_hospital_profiles: dict = _load_json("hospital_profiles.json")
_specialty_map: dict = _load_json("specialty_department_map.json")


# ── City → State/Timezone Mapping ────────────────────────────────────────

CITY_DATA: dict[str, dict[str, str]] = {
    "mumbai":       {"state": "Maharashtra",     "stateCode": "MH", "timezone": "Asia/Kolkata", "gstCode": "27"},
    "pune":         {"state": "Maharashtra",     "stateCode": "MH", "timezone": "Asia/Kolkata", "gstCode": "27"},
    "delhi":        {"state": "Delhi",           "stateCode": "DL", "timezone": "Asia/Kolkata", "gstCode": "07"},
    "new delhi":    {"state": "Delhi",           "stateCode": "DL", "timezone": "Asia/Kolkata", "gstCode": "07"},
    "bangalore":    {"state": "Karnataka",       "stateCode": "KA", "timezone": "Asia/Kolkata", "gstCode": "29"},
    "bengaluru":    {"state": "Karnataka",       "stateCode": "KA", "timezone": "Asia/Kolkata", "gstCode": "29"},
    "chennai":      {"state": "Tamil Nadu",      "stateCode": "TN", "timezone": "Asia/Kolkata", "gstCode": "33"},
    "hyderabad":    {"state": "Telangana",       "stateCode": "TG", "timezone": "Asia/Kolkata", "gstCode": "36"},
    "ahmedabad":    {"state": "Gujarat",         "stateCode": "GJ", "timezone": "Asia/Kolkata", "gstCode": "24"},
    "kolkata":      {"state": "West Bengal",     "stateCode": "WB", "timezone": "Asia/Kolkata", "gstCode": "19"},
    "jaipur":       {"state": "Rajasthan",       "stateCode": "RJ", "timezone": "Asia/Kolkata", "gstCode": "08"},
    "lucknow":      {"state": "Uttar Pradesh",   "stateCode": "UP", "timezone": "Asia/Kolkata", "gstCode": "09"},
    "chandigarh":   {"state": "Chandigarh",      "stateCode": "CH", "timezone": "Asia/Kolkata", "gstCode": "04"},
    "kochi":        {"state": "Kerala",          "stateCode": "KL", "timezone": "Asia/Kolkata", "gstCode": "32"},
    "thiruvananthapuram": {"state": "Kerala",    "stateCode": "KL", "timezone": "Asia/Kolkata", "gstCode": "32"},
    "bhopal":       {"state": "Madhya Pradesh",  "stateCode": "MP", "timezone": "Asia/Kolkata", "gstCode": "23"},
    "indore":       {"state": "Madhya Pradesh",  "stateCode": "MP", "timezone": "Asia/Kolkata", "gstCode": "23"},
    "patna":        {"state": "Bihar",           "stateCode": "BR", "timezone": "Asia/Kolkata", "gstCode": "10"},
    "guwahati":     {"state": "Assam",           "stateCode": "AS", "timezone": "Asia/Kolkata", "gstCode": "18"},
    "visakhapatnam":{"state": "Andhra Pradesh",  "stateCode": "AP", "timezone": "Asia/Kolkata", "gstCode": "37"},
    "coimbatore":   {"state": "Tamil Nadu",      "stateCode": "TN", "timezone": "Asia/Kolkata", "gstCode": "33"},
    "nagpur":       {"state": "Maharashtra",     "stateCode": "MH", "timezone": "Asia/Kolkata", "gstCode": "27"},
    "surat":        {"state": "Gujarat",         "stateCode": "GJ", "timezone": "Asia/Kolkata", "gstCode": "24"},
    "vadodara":     {"state": "Gujarat",         "stateCode": "GJ", "timezone": "Asia/Kolkata", "gstCode": "24"},
    "goa":          {"state": "Goa",             "stateCode": "GA", "timezone": "Asia/Kolkata", "gstCode": "30"},
    "noida":        {"state": "Uttar Pradesh",   "stateCode": "UP", "timezone": "Asia/Kolkata", "gstCode": "09"},
    "gurugram":     {"state": "Haryana",         "stateCode": "HR", "timezone": "Asia/Kolkata", "gstCode": "06"},
    "gurgaon":      {"state": "Haryana",         "stateCode": "HR", "timezone": "Asia/Kolkata", "gstCode": "06"},
    "thane":        {"state": "Maharashtra",     "stateCode": "MH", "timezone": "Asia/Kolkata", "gstCode": "27"},
    "navi mumbai":  {"state": "Maharashtra",     "stateCode": "MH", "timezone": "Asia/Kolkata", "gstCode": "27"},
}


WORKING_HOURS: dict[str, Any] = {
    "CLINIC":           {"opd": {"start": "09:00", "end": "18:00"}, "days": ["MON","TUE","WED","THU","FRI","SAT"]},
    "NURSING_HOME":     {"opd": {"start": "08:00", "end": "20:00"}, "ipd": "24x7", "days": ["MON","TUE","WED","THU","FRI","SAT"]},
    "SINGLE_SPECIALTY": {"opd": {"start": "08:00", "end": "20:00"}, "ipd": "24x7", "emergency": {"start": "08:00", "end": "22:00"}, "days": ["MON","TUE","WED","THU","FRI","SAT"]},
    "MULTI_SPECIALTY":  {"opd": {"start": "07:00", "end": "21:00"}, "ipd": "24x7", "emergency": "24x7", "days": ["MON","TUE","WED","THU","FRI","SAT","SUN"]},
    "SUPER_SPECIALTY":  {"opd": {"start": "07:00", "end": "21:00"}, "ipd": "24x7", "emergency": "24x7", "ot": {"start": "07:30", "end": "20:00"}, "days": ["MON","TUE","WED","THU","FRI","SAT","SUN"]},
    "TEACHING":         {"opd": {"start": "08:00", "end": "16:00"}, "ipd": "24x7", "emergency": "24x7", "ot": {"start": "08:00", "end": "17:00"}, "days": ["MON","TUE","WED","THU","FRI","SAT"]},
}


# ── Hospital Type Inference ──────────────────────────────────────────────

def _infer_hospital_type(inp: AutoFillInput) -> str:
    beds = inp.bedCount or 0
    specs = len(inp.specialties)
    if beds == 0 and specs <= 1:
        return "CLINIC"
    if beds <= 25:
        return "NURSING_HOME"
    if beds <= 50 and specs <= 3:
        return "SINGLE_SPECIALTY"
    if beds <= 200:
        return "MULTI_SPECIALTY"
    if specs > 10 or beds > 300:
        return "SUPER_SPECIALTY"
    return "MULTI_SPECIALTY"


# ── Main Engine ──────────────────────────────────────────────────────────

def generate_auto_fill(inp: AutoFillInput) -> AutoFillResult:
    suggestions: list[AutoFillSuggestion] = []
    unit_plan: list[UnitSuggestion] = []
    dept_suggestions: list[DepartmentSuggestion] = []
    equipment_highlights: list[EquipmentHighlight] = []

    hospital_type = inp.hospitalType or _infer_hospital_type(inp)
    bed_count = inp.bedCount or 0
    bed_dist = _hospital_profiles.get("bedDistribution", {})
    profile = bed_dist.get(hospital_type)

    # ── Geographic ───────────────────────────────────────────────────

    if inp.city:
        city_key = inp.city.lower().strip()
        city_info = CITY_DATA.get(city_key)
        if city_info:
            if not inp.state:
                suggestions.append(AutoFillSuggestion(
                    field="state",
                    value=city_info["state"],
                    confidence=0.95,
                    reasoning=f"{inp.city} is in {city_info['state']}.",
                    source="geographic",
                ))
            suggestions.append(AutoFillSuggestion(
                field="timezone",
                value=city_info["timezone"],
                confidence=0.99,
                reasoning="All Indian cities use IST (Asia/Kolkata).",
                source="geographic",
            ))
            suggestions.append(AutoFillSuggestion(
                field="gstStateCode",
                value=city_info["gstCode"],
                confidence=0.90,
                reasoning=f"GST state code for {city_info['state']} is {city_info['gstCode']}. First 2 digits of your GSTIN should be \"{city_info['gstCode']}\".",
                source="regulatory",
            ))

    # ── Currency ─────────────────────────────────────────────────────

    suggestions.append(AutoFillSuggestion(
        field="defaultCurrency",
        value="INR",
        confidence=0.99,
        reasoning="Indian hospital — default currency is INR.",
        source="geographic",
    ))

    # ── Fiscal year ──────────────────────────────────────────────────

    suggestions.append(AutoFillSuggestion(
        field="fiscalYearStartMonth",
        value=4,
        confidence=0.95,
        reasoning="Indian fiscal year starts April (month 4). Required for financial reporting.",
        source="regulatory",
    ))

    # ── Working hours ────────────────────────────────────────────────

    hours = WORKING_HOURS.get(hospital_type)
    if hours:
        ht_label = hospital_type.replace("_", " ").lower()
        suggestions.append(AutoFillSuggestion(
            field="workingHours",
            value=hours,
            confidence=0.70,
            reasoning=f"Typical working hours for a {ht_label} hospital. Adjust to match your actual schedule.",
            source="industry_benchmark",
        ))

    # ── Emergency ────────────────────────────────────────────────────

    if hospital_type in ("MULTI_SPECIALTY", "SUPER_SPECIALTY", "TEACHING"):
        suggestions.append(AutoFillSuggestion(
            field="emergency24x7",
            value=True,
            confidence=0.85,
            reasoning=f"{hospital_type.replace('_', ' ')} hospitals typically run 24/7 emergency services. NABH expectation for hospitals with >50 beds.",
            source="industry_benchmark",
        ))

    # ── Unit Plan ────────────────────────────────────────────────────

    if bed_count > 0 and profile:
        # General Ward
        gw_beds = round(bed_count * profile.get("generalWardPct", 0))
        if gw_beds > 0:
            unit_plan.append(UnitSuggestion(
                typeCode="WARD", typeName="General Ward",
                suggestedCount=math.ceil(gw_beds / 30),
                bedCount=gw_beds,
                roomTypes=[RoomType(type="GENERAL_WARD", count=math.ceil(gw_beds / 6))],
                reasoning=f"{round(profile['generalWardPct'] * 100)}% of beds as general ward. ~30 beds per ward unit.",
            ))

        # Private Rooms
        pr_beds = round(bed_count * profile.get("privateRoomPct", 0))
        if pr_beds > 0:
            unit_plan.append(UnitSuggestion(
                typeCode="PRIVATE_ROOM", typeName="Private Rooms",
                suggestedCount=1, bedCount=pr_beds,
                roomTypes=[RoomType(type="PRIVATE", count=pr_beds)],
                reasoning=f"{round(profile['privateRoomPct'] * 100)}% private rooms. 1 bed each. Higher revenue per bed.",
            ))

        # Semi-Private
        sp_beds = round(bed_count * profile.get("semiPrivatePct", 0))
        if sp_beds > 0:
            unit_plan.append(UnitSuggestion(
                typeCode="SEMI_PRIVATE", typeName="Semi-Private Rooms",
                suggestedCount=1, bedCount=sp_beds,
                roomTypes=[RoomType(type="SEMI_PRIVATE", count=math.ceil(sp_beds / 2))],
                reasoning=f"{round(profile['semiPrivatePct'] * 100)}% semi-private (2-bed rooms). Balance of privacy and cost.",
            ))

        # ICU
        icu_beds = round(bed_count * profile.get("icuPct", 0))
        if icu_beds > 0:
            unit_plan.append(UnitSuggestion(
                typeCode="ICU", typeName="Intensive Care Unit",
                suggestedCount=math.ceil(icu_beds / 12),
                bedCount=icu_beds,
                roomTypes=[RoomType(type="ICU_BAY", count=icu_beds)],
                reasoning=f"{round(profile['icuPct'] * 100)}% ICU beds ({icu_beds}). NABH requires min 5% for >50 beds. Each needs O2, suction, monitoring.",
            ))

        # Emergency
        er_flat = profile.get("emergencyFlat", 0)
        if er_flat > 0:
            unit_plan.append(UnitSuggestion(
                typeCode="ER", typeName="Emergency Room",
                suggestedCount=1, bedCount=er_flat,
                roomTypes=[
                    RoomType(type="ER_BAY", count=er_flat),
                    RoomType(type="TRIAGE", count=1),
                    RoomType(type="RESUSCITATION", count=1),
                ],
                reasoning=f"{er_flat} ER beds standard for this size. Includes triage and resuscitation bay.",
            ))

        # OPD
        opd_rooms = max(1, round(bed_count * profile.get("opdPerBedRatio", 0.1)))
        unit_plan.append(UnitSuggestion(
            typeCode="OPD", typeName="Outpatient Department",
            suggestedCount=1, bedCount=0,
            roomTypes=[
                RoomType(type="CONSULTATION", count=opd_rooms),
                RoomType(type="PROCEDURE_ROOM", count=max(1, opd_rooms // 5)),
            ],
            reasoning=f"{opd_rooms} consultation rooms based on bed-to-OPD ratio. Plus procedure rooms at 1:5.",
        ))

        # NICU
        nicu_pct = profile.get("nicuPct", 0)
        if nicu_pct > 0:
            nicu_beds = max(2, round(bed_count * nicu_pct))
            unit_plan.append(UnitSuggestion(
                typeCode="NICU", typeName="Neonatal ICU",
                suggestedCount=1, bedCount=nicu_beds,
                roomTypes=[RoomType(type="NICU_BAY", count=nicu_beds)],
                reasoning=f"NICU needed for OBG/Pediatrics. {nicu_beds} warmers/incubators recommended.",
            ))

    # ── Department suggestions ───────────────────────────────────────

    if inp.specialties:
        spec_depts = _specialty_map.get("specialtyDepartments", {})
        for spec_code in inp.specialties:
            mapping = spec_depts.get(spec_code)
            if mapping:
                unit_list = ", ".join(mapping.get("unitTypes", ["OPD"]))
                dept_suggestions.append(DepartmentSuggestion(
                    code=spec_code,
                    name=mapping["department"],
                    reason=f"Required for {spec_code} specialty. Typical unit types: {unit_list}.",
                ))

        dept_suggestions.append(DepartmentSuggestion(
            code="ADMIN", name="Administration",
            reason="Required for hospital operations, billing, and compliance.",
        ))
        dept_suggestions.append(DepartmentSuggestion(
            code="NURSING", name="Nursing Administration",
            reason="Manages nursing staff scheduling and ward assignments.",
        ))

        if bed_count >= 50 or hospital_type in ("MULTI_SPECIALTY", "SUPER_SPECIALTY", "TEACHING"):
            dept_suggestions.append(DepartmentSuggestion(
                code="QUALITY", name="Quality Assurance",
                reason="Required for NABH accreditation. Manages audits, incident reports, quality metrics.",
            ))

    # ── Equipment highlights ─────────────────────────────────────────

    eq_data = _hospital_profiles.get("equipmentSuggestions", {}).get(hospital_type, [])
    for eq in eq_data[:8]:
        compliance = eq.get("compliance")
        equipment_highlights.append(EquipmentHighlight(
            name=eq["name"],
            quantity=eq["quantity"],
            compliance=compliance,
            reason=(
                f"{eq['name']} requires {compliance} compliance. Ensure license before installation."
                if compliance
                else f"Standard equipment for {hospital_type.replace('_', ' ').lower()} hospitals."
            ),
        ))

    # ── Overall confidence ───────────────────────────────────────────

    fields_provided = sum([
        bool(inp.name),
        bool(inp.bedCount),
        bool(inp.hospitalType),
        bool(inp.city),
        bool(inp.specialties),
    ])
    overall_confidence = min(0.95, 0.3 + (fields_provided / 5) * 0.65)

    # ── Summary ──────────────────────────────────────────────────────

    parts: list[str] = []
    if bed_count > 0 and hospital_type:
        total_unit_beds = sum(u.bedCount for u in unit_plan)
        ht_label = hospital_type.replace("_", " ").lower()
        parts.append(
            f"For a {bed_count}-bed {ht_label}, I recommend {len(unit_plan)} unit types "
            f"with {total_unit_beds} beds distributed across wards, ICU, private rooms, and emergency."
        )
    if dept_suggestions:
        parts.append(f"{len(dept_suggestions)} departments suggested based on your specialties.")
    compliance_eq = [e for e in equipment_highlights if e.compliance]
    if compliance_eq:
        parts.append(f"{len(compliance_eq)} equipment items require regulatory compliance (AERB/PCPNDT).")
    if not parts:
        parts.append("Provide hospital type, bed count, and specialties for more specific suggestions.")

    return AutoFillResult(
        suggestions=suggestions,
        unitPlan=unit_plan,
        departmentSuggestions=dept_suggestions,
        equipmentHighlights=equipment_highlights,
        summary=" ".join(parts),
        confidence=overall_confidence,
    )
