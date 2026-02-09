"""Natural Language Query Engine (Ollama-powered).

Users ask questions in plain English and get conversational answers
backed by real data from the BranchContext.

Examples:
  "How many beds do we have?"
  "Which departments don't have a head?"
  "What's our ICU to total bed ratio?"

The LLM works with pre-collected BranchContext — no direct DB queries.
Fallback: Without Ollama, uses keyword matching for common questions.
"""

from __future__ import annotations

import json
import re
import time
from typing import Any

from src.collectors.models import BranchContext
from src.services.ollama import OllamaService, ollama_service

from .models import NLQueryResponse


# ── System Prompt ─────────────────────────────────────────────────────────


def _build_system_prompt(ctx: BranchContext) -> str:
    unit_lines = "\n".join(
        f"{u.name} ({u.typeCode}): {len(u.rooms)} rooms, {u.resources.beds} beds, "
        f"{'Active' if u.isActive else 'Inactive'}"
        for u in ctx.units.units
    )
    dept_lines = "\n".join(
        f"{d.name} ({d.code}): {'Has head' if d.hasHead else 'No head'}, {d.staffCount} staff"
        for d in ctx.departments.departments
    )

    return f"""You are a helpful hospital infrastructure assistant for "{ctx.branch.name}".
You answer questions about the hospital's configuration using ONLY the data provided below.
If the data doesn't contain the answer, say "I don't have that information in the current context."

Be concise, specific, and use actual numbers from the data. Don't make up data.

HOSPITAL DATA:
{ctx.textSummary}

DETAILED UNIT DATA:
{json.dumps(ctx.units.byType, indent=2)}

Units: {unit_lines}

Departments: {dept_lines}

Location: {ctx.location.totalNodes} nodes. Fire zones: {"Yes" if ctx.location.hasFireZones else "No"}. Emergency exits: {"Yes" if ctx.location.hasEmergencyExits else "No"}.

Answer the user's question in 1-3 sentences. Be direct and helpful."""


# ── Keyword-based fallback ────────────────────────────────────────────────

ICU_TYPE_CODES = {"ICU", "HDU", "CCU", "NICU", "PICU"}


def _keyword_answer(question: str, ctx: BranchContext) -> NLQueryResponse | None:
    q = question.lower().strip()
    start = time.time()

    total_beds = sum(u.resources.beds for u in ctx.units.units)
    total_rooms = sum(len(u.rooms) for u in ctx.units.units)

    def ms() -> int:
        return int((time.time() - start) * 1000)

    # Bed count questions
    if re.search(r"how many\s+beds|total\s+beds|bed\s+count|number of beds", q):
        breakdown_parts = []
        for k, v in ctx.units.byType.items():
            if v.get("count", 0) > 0:
                type_beds = sum(
                    u.resources.beds
                    for u in ctx.units.units
                    if u.typeCode == k and u.isActive
                )
                breakdown_parts.append(f"{k}: {type_beds} beds")
        breakdown = ", ".join(breakdown_parts)

        return NLQueryResponse(
            answer=f"You have {total_beds} beds across {ctx.units.activeUnits} active units. Breakdown: {breakdown}.",
            source="keyword_match",
            data={"totalBeds": total_beds, "byType": ctx.units.byType},
            followUp=[
                "What's our ICU to total bed ratio?",
                "Which units have no beds?",
                "What's the occupancy?",
            ],
            durationMs=ms(),
        )

    # Room count
    if re.search(r"how many\s+rooms|total\s+rooms|room\s+count", q):
        return NLQueryResponse(
            answer=f"You have {total_rooms} active rooms across {ctx.units.activeUnits} units.",
            source="keyword_match",
            data={"totalRooms": total_rooms},
            followUp=["Which units have no rooms?", "How many consultation rooms?"],
            durationMs=ms(),
        )

    # Department heads
    if re.search(r"department.*head|head.*department|departments?\s+without.*head|who.*head", q):
        no_head = [d for d in ctx.departments.departments if not d.hasHead]
        if not no_head:
            return NLQueryResponse(
                answer=f"All {ctx.departments.total} departments have designated heads.",
                source="keyword_match",
                data={"allHaveHeads": True},
                durationMs=ms(),
            )
        names = ", ".join(d.name for d in no_head)
        return NLQueryResponse(
            answer=f"{len(no_head)} out of {ctx.departments.total} departments don't have a head: {names}.",
            source="keyword_match",
            data={"departmentsWithoutHead": [d.model_dump() for d in no_head]},
            followUp=["How many staff in each department?"],
            durationMs=ms(),
        )

    # ICU ratio
    if re.search(r"icu.*ratio|ratio.*icu|icu.*percent|percent.*icu", q):
        icu_beds = sum(
            u.resources.beds
            for u in ctx.units.units
            if u.typeCode in ICU_TYPE_CODES and u.isActive
        )
        ratio = f"{(icu_beds / total_beds * 100):.1f}" if total_beds > 0 else "0"
        return NLQueryResponse(
            answer=f"ICU beds: {icu_beds} out of {total_beds} total ({ratio}%). NABH recommends 10-15% for hospitals with 50+ beds.",
            source="keyword_match",
            data={"icuBeds": icu_beds, "totalBeds": total_beds, "ratio": ratio},
            followUp=[
                "How many ventilators do we have?",
                "Are all ICU rooms equipped with oxygen?",
            ],
            durationMs=ms(),
        )

    # Fire zones
    if re.search(r"fire.*zone|zone.*fire|fire.*safety", q):
        if ctx.location.hasFireZones:
            answer = f"Yes, fire zones are mapped in the location tree across {ctx.location.totalNodes} location nodes."
        else:
            answer = "No fire zones mapped yet. Fire zone designation is needed on Building and Floor nodes for NABH compliance."
        return NLQueryResponse(
            answer=answer,
            source="keyword_match",
            data={"hasFireZones": ctx.location.hasFireZones},
            followUp=["Are emergency exits marked?", "Is wheelchair access available?"],
            durationMs=ms(),
        )

    # Emergency exits
    if re.search(r"emergency.*exit|exit.*emergency", q):
        if ctx.location.hasEmergencyExits:
            answer = "Yes, emergency exits are marked in the location tree."
        else:
            answer = "No emergency exits marked yet. Mark at least one per floor for fire safety compliance."
        return NLQueryResponse(
            answer=answer,
            source="keyword_match",
            data={"hasEmergencyExits": ctx.location.hasEmergencyExits},
            durationMs=ms(),
        )

    # Units without rooms/beds
    if re.search(r"units?\s+(without|no)\s+(rooms?|beds?)|empty\s+units?", q):
        no_rooms = [u for u in ctx.units.units if u.isActive and len(u.rooms) == 0]
        no_beds = [u for u in ctx.units.units if u.isActive and u.resources.beds == 0]
        no_rooms_names = ", ".join(u.name for u in no_rooms) or "None"
        no_beds_names = ", ".join(u.name for u in no_beds) or "None"
        return NLQueryResponse(
            answer=(
                f"{len(no_rooms)} active unit(s) without rooms: {no_rooms_names}. "
                f"{len(no_beds)} active unit(s) without beds: {no_beds_names}."
            ),
            source="keyword_match",
            data={
                "unitsWithoutRooms": [u.name for u in no_rooms],
                "unitsWithoutBeds": [u.name for u in no_beds],
            },
            durationMs=ms(),
        )

    # Location summary
    if re.search(r"location|campus|building|floor|where|layout", q):
        if ctx.location.totalNodes == 0:
            return NLQueryResponse(
                answer="No location hierarchy set up yet. Create a Campus -> Building -> Floor structure.",
                source="keyword_match",
                durationMs=ms(),
            )
        kinds = ", ".join(f"{v} {k.lower()}" for k, v in ctx.location.byKind.items())
        fz = "Y" if ctx.location.hasFireZones else "N"
        ee = "Y" if ctx.location.hasEmergencyExits else "N"
        wa = "Y" if ctx.location.hasWheelchairAccess else "N"
        return NLQueryResponse(
            answer=(
                f"Location hierarchy: {ctx.location.totalNodes} nodes ({kinds}). "
                f"Fire zones: {fz}, Emergency exits: {ee}, Wheelchair access: {wa}."
            ),
            source="keyword_match",
            data={"location": ctx.location.byKind},
            durationMs=ms(),
        )

    # Branch summary / overview
    if re.search(r"summary|overview|status|how.*branch|tell me about|what do we have", q):
        return NLQueryResponse(
            answer=ctx.textSummary,
            source="keyword_match",
            data={
                "bedCount": total_beds,
                "rooms": total_rooms,
                "units": ctx.units.activeUnits,
                "departments": ctx.departments.total,
            },
            followUp=[
                "Which departments don't have a head?",
                "What's our ICU to bed ratio?",
                "Are there units without beds?",
            ],
            durationMs=ms(),
        )

    return None  # No keyword match


# ── Engine ────────────────────────────────────────────────────────────────


async def run_nl_query(
    question: str,
    branch_context: BranchContext,
    ollama: OllamaService | None = None,
) -> NLQueryResponse:
    """Answer a natural language question about infrastructure data."""
    svc = ollama or ollama_service
    start = time.time()

    # Try keyword match first (instant)
    keyword_result = _keyword_answer(question, branch_context)
    if keyword_result:
        return keyword_result

    def ms() -> int:
        return int((time.time() - start) * 1000)

    # Fall back to Ollama
    if not svc.available:
        return NLQueryResponse(
            answer=(
                "I can answer common questions about beds, rooms, departments, ICU ratios, "
                "fire zones, and location layout. For more complex questions, install Ollama "
                'for AI-powered answers. Try: "How many beds do we have?"'
            ),
            source="keyword_match",
            followUp=[
                "How many beds do we have?",
                "Which departments don't have a head?",
                "What's our ICU ratio?",
                "Give me a summary",
            ],
            durationMs=ms(),
        )

    system_prompt = _build_system_prompt(branch_context)
    response = await svc.generate_text(system_prompt, question, temperature=0.2)

    if not response.get("available") or not response.get("text"):
        return NLQueryResponse(
            answer='Unable to process your question right now. Try a simpler question like "How many beds do we have?"',
            source="keyword_match",
            error=response.get("error"),
            durationMs=ms(),
        )

    return NLQueryResponse(
        answer=response["text"],
        source="ollama",
        followUp=[
            "How many beds do we have?",
            "Are all locations fire zone mapped?",
            "Which units need attention?",
        ],
        durationMs=ms(),
    )
