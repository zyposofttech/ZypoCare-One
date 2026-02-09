"""Setup Copilot Engine (Ollama-powered).

Takes a natural language description of a hospital and generates
a complete infrastructure configuration plan using local LLM.

Example input:
  "We're a 150-bed multi-specialty hospital in Pune with cardiology,
   orthopedics, and general surgery. We have a 24/7 ER."

Output: Structured JSON with departments, units, beds, rooms,
        equipment, location plan — ready for one-click apply.

Fallback: If Ollama is unavailable, falls back to heuristic auto-fill engine.
"""

from __future__ import annotations

import re
import time
from typing import Any

from src.collectors.models import BranchContext
from src.infra.autofill import generate_auto_fill
from src.infra.models import AutoFillInput, AutoFillResult
from src.services.ollama import OllamaService, ollama_service

from .models import CopilotPlan, CopilotResponse


# ── System Prompt ─────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert hospital infrastructure planner for Indian healthcare facilities.
You help configure Hospital Information Management Systems (HIMS).

When given a hospital description, generate a complete infrastructure configuration plan as JSON.

Rules:
- Indian hospitals (INR currency, Asia/Kolkata timezone, April fiscal year)
- Follow NABH (National Accreditation Board for Hospitals) guidelines
- ICU beds should be 10-15% for hospitals >50 beds
- ER is mandatory for hospitals >30 beds or declaring emergency services
- Each ICU bed needs oxygen, suction, and monitoring
- Radiology equipment needs AERB license
- Ultrasound needs PCPNDT registration
- Hospital types: CLINIC, NURSING_HOME, SINGLE_SPECIALTY, MULTI_SPECIALTY, SUPER_SPECIALTY, TEACHING
- Department facilityTypes: SERVICE, CLINICAL, SUPPORT

Respond ONLY with valid JSON matching this structure:
{
  "hospitalType": "MULTI_SPECIALTY",
  "bedCount": 150,
  "specialties": ["CARDIOLOGY", "ORTHOPEDICS"],
  "departments": [{"code": "CARDIO", "name": "Cardiology", "facilityType": "CLINICAL", "reason": "..."}],
  "units": [{"typeCode": "WARD", "name": "General Ward A", "bedCount": 30, "rooms": [{"name": "Bay 1", "type": "GENERAL_WARD", "count": 5}], "reason": "..."}],
  "locationPlan": {"campus": "Main Campus", "buildings": [{"name": "Main Building", "floors": [{"name": "Ground Floor", "zones": ["OPD", "Emergency"]}]}]},
  "equipment": [{"name": "X-Ray", "category": "RADIOLOGY", "quantity": 1, "compliance": "AERB"}],
  "branchSettings": {"timezone": "Asia/Kolkata", "currency": "INR", "fiscalYearStartMonth": 4, "emergency24x7": true, "workingHours": {}},
  "reasoning": "Explanation of key decisions..."
}"""


# ── Engine ────────────────────────────────────────────────────────────────


async def run_setup_copilot(
    description: str,
    existing_context: str | None = None,
    ollama: OllamaService | None = None,
) -> CopilotResponse:
    """Run the setup copilot. Uses Ollama if available, else heuristic fallback."""
    svc = ollama or ollama_service
    start = time.time()

    # Always generate heuristic fallback (fast, works offline)
    heuristic_input = _extract_heuristic_input(description)
    heuristic_result = generate_auto_fill(heuristic_input)

    # Try Ollama
    if not svc.available:
        return CopilotResponse(
            available=False,
            source="heuristic",
            plan=None,
            heuristicFallback=heuristic_result,
            error="Ollama not available. Showing heuristic suggestions. Install Ollama for AI copilot.",
            durationMs=int((time.time() - start) * 1000),
        )

    # Build prompt
    prompt = f'Hospital description: "{description}"'
    if existing_context:
        prompt += f"\n\nCurrent configuration:\n{existing_context}"
        prompt += "\n\nGenerate a plan that builds upon or improves the existing configuration."
    else:
        prompt += "\n\nGenerate a complete infrastructure configuration plan for this hospital."

    response = await svc.generate_json(SYSTEM_PROMPT, prompt, temperature=0.4)

    if not response.get("available") or not response.get("data"):
        return CopilotResponse(
            available=False,
            source="heuristic",
            plan=None,
            heuristicFallback=heuristic_result,
            error=response.get("error", "LLM returned no data. Falling back to heuristic engine."),
            durationMs=int((time.time() - start) * 1000),
        )

    plan = _sanitize_plan(response["data"])

    return CopilotResponse(
        available=True,
        source="ollama",
        plan=plan,
        heuristicFallback=heuristic_result,
        durationMs=int((time.time() - start) * 1000),
    )


# ── Extract basic params from free text for heuristic fallback ────────────

CITIES = [
    "mumbai", "pune", "delhi", "bangalore", "bengaluru", "chennai",
    "hyderabad", "ahmedabad", "kolkata", "jaipur", "lucknow", "kochi",
    "chandigarh", "bhopal", "indore", "patna", "guwahati", "coimbatore",
    "nagpur", "surat", "vadodara", "goa", "thiruvananthapuram", "visakhapatnam",
]

SPECIALTY_KEYWORDS: dict[str, str] = {
    "cardiology": "CARDIOLOGY", "cardiac": "CARDIOLOGY",
    "orthop": "ORTHOPEDICS", "ortho": "ORTHOPEDICS",
    "general surgery": "GENERAL_SURGERY", "surgery": "GENERAL_SURGERY",
    "pediatr": "PEDIATRICS", "paediatr": "PEDIATRICS",
    "ob.*gy": "OBG", "obstetric": "OBG", "gynec": "OBG",
    "neurol": "NEUROLOGY", "neuro": "NEUROLOGY",
    "nephrol": "NEPHROLOGY",
    "dermat": "DERMATOLOGY",
    "ent": "ENT", "otorhin": "ENT",
    "ophthal": "OPHTHALMOLOGY", "eye": "OPHTHALMOLOGY",
    "gastro": "GASTROENTEROLOGY",
    "pulmon": "PULMONOLOGY", "chest": "PULMONOLOGY",
    "urolog": "UROLOGY",
    "oncol": "ONCOLOGY", "cancer": "ONCOLOGY",
    "general medicine": "GENERAL_MEDICINE", "medicine": "GENERAL_MEDICINE",
    "psychiatr": "PSYCHIATRY", "mental health": "PSYCHIATRY",
    "dental": "DENTAL",
    "physiother": "PHYSIOTHERAPY", "rehab": "PHYSIOTHERAPY",
}


def _extract_heuristic_input(description: str) -> AutoFillInput:
    lower = description.lower()
    kwargs: dict[str, Any] = {}

    # Extract bed count
    bed_match = re.search(r"(\d+)\s*[-–]?\s*beds?", lower)
    if bed_match:
        kwargs["bedCount"] = int(bed_match.group(1))

    # Extract city
    for city in CITIES:
        if city in lower:
            kwargs["city"] = city.capitalize()
            break

    # Extract hospital type
    if "super" in lower and "special" in lower:
        kwargs["hospitalType"] = "SUPER_SPECIALTY"
    elif "multi" in lower and "special" in lower:
        kwargs["hospitalType"] = "MULTI_SPECIALTY"
    elif "single" in lower and "special" in lower:
        kwargs["hospitalType"] = "SINGLE_SPECIALTY"
    elif "teaching" in lower:
        kwargs["hospitalType"] = "TEACHING"
    elif "nursing home" in lower:
        kwargs["hospitalType"] = "NURSING_HOME"
    elif "clinic" in lower:
        kwargs["hospitalType"] = "CLINIC"

    # Extract specialties
    specialties: list[str] = []
    for keyword, code in SPECIALTY_KEYWORDS.items():
        if re.search(keyword, lower, re.IGNORECASE) and code not in specialties:
            specialties.append(code)
    if specialties:
        kwargs["specialties"] = specialties

    # Extract emergency
    if "24" in lower or "emergency" in lower or "er " in lower:
        kwargs["emergency24x7"] = True

    return AutoFillInput(**kwargs)


# ── Sanitize LLM output ──────────────────────────────────────────────────


def _sanitize_plan(data: dict[str, Any]) -> CopilotPlan:
    departments = []
    if isinstance(data.get("departments"), list):
        for d in data["departments"]:
            departments.append({
                "code": d.get("code", "UNKNOWN"),
                "name": d.get("name", d.get("code", "Unknown")),
                "facilityType": d.get("facilityType", "CLINICAL"),
                "reason": d.get("reason", ""),
            })

    units = []
    if isinstance(data.get("units"), list):
        for u in data["units"]:
            units.append({
                "typeCode": u.get("typeCode", "WARD"),
                "name": u.get("name", "Unit"),
                "bedCount": u.get("bedCount", 0) if isinstance(u.get("bedCount"), (int, float)) else 0,
                "rooms": u.get("rooms", []) if isinstance(u.get("rooms"), list) else [],
                "reason": u.get("reason", ""),
            })

    settings = data.get("branchSettings", {}) or {}

    return CopilotPlan(
        hospitalType=data.get("hospitalType", "MULTI_SPECIALTY"),
        bedCount=data.get("bedCount", 50) if isinstance(data.get("bedCount"), (int, float)) else 50,
        specialties=data.get("specialties", []) if isinstance(data.get("specialties"), list) else [],
        departments=departments,
        units=units,
        locationPlan=data.get("locationPlan", {"campus": "Main Campus", "buildings": []}),
        equipment=data.get("equipment", []) if isinstance(data.get("equipment"), list) else [],
        branchSettings={
            "timezone": settings.get("timezone", "Asia/Kolkata"),
            "currency": settings.get("currency", "INR"),
            "fiscalYearStartMonth": settings.get("fiscalYearStartMonth", 4),
            "emergency24x7": settings.get("emergency24x7", False),
            "workingHours": settings.get("workingHours", {}),
        },
        reasoning=data.get("reasoning", "Plan generated by AI copilot."),
    )
