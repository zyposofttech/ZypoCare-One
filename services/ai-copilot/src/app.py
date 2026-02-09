"""ZypoCare AI Copilot — FastAPI application.

All AI capabilities for ZypoCare HIMS live here:
  /v1/infra/*  — Infrastructure AI (auto-fill, review, consistency, NABH, etc.)
  /v1/ai/*     — Co-pilot features  (chat, field-validate, health-check, smart-defaults)
  /v1/clinical/* — Clinical AI stubs (future)
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Literal, Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import CORS_ORIGIN
from .db.session import close_db, init_db
from .services.ollama import ollama_service

# ── Existing imports ──────────────────────────────────────────────────────
from .infra.autofill import generate_auto_fill
from .infra.models import AutoFillInput, AutoFillResult

logger = logging.getLogger("ai-copilot")
logging.basicConfig(level=logging.INFO, format="%(name)s | %(levelname)s | %(message)s")


# ── In-memory health-check cache ──────────────────────────────────────────

_health_cache: dict[str, tuple[float, Any]] = {}
HEALTH_CACHE_TTL = 300  # 5 minutes


# ── Lifespan ──────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        await init_db()
        logger.info("Connected to PostgreSQL")
    except Exception as exc:
        logger.error("Failed to connect to PostgreSQL: %s", exc)

    is_up = await ollama_service.check_health()
    if is_up:
        logger.info(
            "Ollama connected — model: %s @ %s",
            ollama_service.model,
            ollama_service.base_url,
        )
    else:
        logger.warning(
            "Ollama not available at %s. "
            "Copilot & NL Query features will use heuristic fallback. "
            "Install: https://ollama.ai, then run: ollama pull %s",
            ollama_service.base_url,
            ollama_service.model,
        )

    yield

    # Shutdown
    await close_db()
    logger.info("Database connection closed")


app = FastAPI(
    title="ZypoCare AI Copilot",
    version="0.4.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ══════════════════════════════════════════════════════════════════════════
# Health
# ══════════════════════════════════════════════════════════════════════════


@app.get("/health")
def health():
    return {"ok": True}


# ══════════════════════════════════════════════════════════════════════════
# Infrastructure AI — /v1/infra/...
# ══════════════════════════════════════════════════════════════════════════


@app.post("/v1/infra/auto-fill", response_model=AutoFillResult)
def infra_auto_fill(inp: AutoFillInput):
    """Intelligent auto-fill for branch creation."""
    return generate_auto_fill(inp)


@app.get("/v1/infra/ai-status")
async def infra_ai_status():
    """Check AI engine availability."""
    ollama_up = await ollama_service.check_health()
    return {
        "heuristic": {"available": True},
        "ollama": {
            "available": ollama_up,
            "model": ollama_service.model,
            "baseUrl": ollama_service.base_url,
        },
        "capabilities": {
            "autoFill": {"available": True, "engine": "heuristic"},
            "reviewer": {"available": True, "engine": "heuristic"},
            "consistencyCheck": {"available": True, "engine": "heuristic"},
            "nabhReadiness": {"available": True, "engine": "heuristic"},
            "goLiveScore": {"available": True, "engine": "heuristic"},
            "namingCheck": {"available": True, "engine": "heuristic"},
            "fixSuggestions": {"available": True, "engine": "heuristic"},
            "complianceValidator": {"available": True, "engine": "heuristic"},
            "copilot": {"available": ollama_up, "engine": "ollama", "fallback": "heuristic"},
            "nlQuery": {"available": ollama_up, "engine": "ollama", "fallback": "keyword_match"},
            "chat": {"available": True, "engine": "ollama+keyword"},
            "fieldValidate": {"available": True, "engine": "heuristic"},
            "healthCheck": {"available": True, "engine": "heuristic"},
            "smartDefaults": {"available": True, "engine": "heuristic"},
        },
    }


@app.get("/v1/infra/context")
async def infra_context(branchId: str = Query(...)):
    """Get full branch context (debug/diagnostic endpoint)."""
    from .collectors.schema_context import collect_branch_context

    ctx = await collect_branch_context(branchId)
    return ctx.model_dump()


# ── Consistency Check ─────────────────────────────────────────────────────


@app.get("/v1/infra/consistency-check")
async def infra_consistency_check(branchId: str = Query(...)):
    """Run 35+ cross-module consistency checks."""
    from .collectors.schema_context import collect_branch_context
    from .engines.consistency_checker import run_consistency_checks

    ctx = await collect_branch_context(branchId)
    result = run_consistency_checks(ctx)
    return result.model_dump()


# ── NABH Readiness ────────────────────────────────────────────────────────


@app.get("/v1/infra/nabh-readiness")
async def infra_nabh_readiness(branchId: str = Query(...)):
    """NABH standards readiness assessment."""
    from .collectors.schema_context import collect_branch_context
    from .engines.nabh_checker import run_nabh_checks

    ctx = await collect_branch_context(branchId)
    result = run_nabh_checks(ctx)
    return result.model_dump()


# ── Go-Live Score ─────────────────────────────────────────────────────────


@app.get("/v1/infra/go-live-score")
async def infra_go_live_score(branchId: str = Query(...)):
    """Compute go-live readiness score (requires consistency + NABH)."""
    from .collectors.schema_context import collect_branch_context
    from .engines.consistency_checker import run_consistency_checks
    from .engines.go_live_scorer import compute_go_live_score
    from .engines.nabh_checker import run_nabh_checks

    ctx = await collect_branch_context(branchId)
    consistency = run_consistency_checks(ctx)
    nabh = run_nabh_checks(ctx)
    result = compute_go_live_score(consistency, nabh)
    return result.model_dump()


# ── Branch Review ─────────────────────────────────────────────────────────


@app.get("/v1/infra/review")
async def infra_review(branchId: str = Query(...)):
    """Holistic branch infrastructure review with insights."""
    from .collectors.schema_context import collect_branch_context
    from .engines.branch_reviewer import review_branch_config

    ctx = await collect_branch_context(branchId)
    result = review_branch_config(ctx)
    return result.model_dump()


# ── Fix Suggestions ──────────────────────────────────────────────────────


@app.get("/v1/infra/fix-suggestions")
async def infra_fix_suggestions(branchId: str = Query(...)):
    """Generate actionable fix suggestions from consistency issues."""
    from .collectors.schema_context import collect_branch_context
    from .engines.consistency_checker import run_consistency_checks
    from .engines.fix_suggester import generate_fix_suggestions

    ctx = await collect_branch_context(branchId)
    consistency = run_consistency_checks(ctx)
    result = generate_fix_suggestions(consistency)
    return result.model_dump()


# ── Naming Check ─────────────────────────────────────────────────────────


@app.get("/v1/infra/naming-check")
async def infra_naming_check(branchId: str = Query(...)):
    """Check naming conventions across all entities."""
    from .collectors.schema_context import collect_branch_context
    from .engines.naming_enforcer import run_naming_check

    ctx = await collect_branch_context(branchId)
    result = run_naming_check(ctx)
    return result.model_dump()


# ── Compliance Validators ────────────────────────────────────────────────


class GstinInput(BaseModel):
    gstin: str


class PanInput(BaseModel):
    pan: str


@app.post("/v1/infra/validate-gstin")
def infra_validate_gstin(inp: GstinInput):
    """Validate GSTIN format and checksum."""
    from .engines.compliance_validator import validate_gstin

    result = validate_gstin(inp.gstin)
    return result.model_dump()


@app.post("/v1/infra/validate-pan")
def infra_validate_pan(inp: PanInput):
    """Validate PAN format."""
    from .engines.compliance_validator import validate_pan

    result = validate_pan(inp.pan)
    return result.model_dump()


# ── Setup Copilot (LLM-powered) ─────────────────────────────────────────


class CopilotInput(BaseModel):
    description: str
    existingContext: dict[str, Any] | None = None


@app.post("/v1/infra/copilot")
async def infra_copilot(inp: CopilotInput):
    """Generate full infrastructure plan from natural language description."""
    from .engines.setup_copilot import run_setup_copilot

    result = await run_setup_copilot(
        description=inp.description,
        existing_context=inp.existingContext,
    )
    return result.model_dump()


# ── Natural Language Query (LLM-powered) ─────────────────────────────────


class NLQueryInput(BaseModel):
    question: str
    branchId: str


@app.post("/v1/infra/ask")
async def infra_ask(inp: NLQueryInput):
    """Answer natural language questions about infrastructure data."""
    from .collectors.schema_context import collect_branch_context
    from .engines.nl_query import run_nl_query

    ctx = await collect_branch_context(inp.branchId)
    result = await run_nl_query(inp.question, ctx)
    return result.model_dump()


# ══════════════════════════════════════════════════════════════════════════
# Co-pilot AI — /v1/ai/...
# ══════════════════════════════════════════════════════════════════════════


# ── Field Validation ─────────────────────────────────────────────────────


class FieldValidateInput(BaseModel):
    module: str
    field: str
    value: str
    branchId: str | None = None
    context: dict[str, Any] | None = None


@app.post("/v1/ai/field-validate")
def ai_field_validate(inp: FieldValidateInput):
    """Instant field-level validation with AI warnings and smart suggestions."""
    from .engines.field_validator import validate_field

    result = validate_field(
        module=inp.module,
        field=inp.field,
        value=inp.value,
        context=inp.context,
    )
    return result.model_dump()


# ── Smart Defaults ───────────────────────────────────────────────────────


class SmartDefaultsInput(BaseModel):
    entityType: str
    branchId: str | None = None
    parentContext: dict[str, Any] | None = None


@app.post("/v1/ai/smart-defaults")
def ai_smart_defaults(inp: SmartDefaultsInput):
    """Get context-aware defaults when creating entities."""
    from .engines.smart_defaults import get_smart_defaults

    return get_smart_defaults(
        entity_type=inp.entityType,
        parent_context=inp.parentContext,
    )


# ── Health Check (aggregated) ────────────────────────────────────────────


@app.get("/v1/ai/health-check")
async def ai_health_check(branchId: str = Query(...)):
    """Run all engines and return unified branch health status."""
    now = time.time()

    # Check cache
    if branchId in _health_cache:
        cached_at, cached_result = _health_cache[branchId]
        if now - cached_at < HEALTH_CACHE_TTL:
            return cached_result

    from .collectors.schema_context import collect_branch_context
    from .engines.consistency_checker import run_consistency_checks
    from .engines.go_live_scorer import compute_go_live_score
    from .engines.nabh_checker import run_nabh_checks
    from .engines.naming_enforcer import run_naming_check

    ctx = await collect_branch_context(branchId)
    consistency = run_consistency_checks(ctx)
    nabh = run_nabh_checks(ctx)
    naming = run_naming_check(ctx)
    go_live = compute_go_live_score(consistency, nabh)

    # Determine overall health
    total_blockers = len(consistency.blockers) + nabh.failCount
    total_warnings = len(consistency.warnings) + len(nabh.warnings)

    if total_blockers == 0 and consistency.score >= 90:
        overall = "EXCELLENT"
    elif total_blockers == 0 and consistency.score >= 70:
        overall = "GOOD"
    elif total_blockers <= 3:
        overall = "NEEDS_ATTENTION"
    else:
        overall = "CRITICAL"

    # Build top issues for sidebar badges — ensure every area is represented
    top_issues: list[dict[str, Any]] = []
    seen_areas: set[str] = set()

    def _append_issue(issue: Any, sev: str) -> None:
        top_issues.append({
            "id": issue.id,
            "severity": sev,
            "title": issue.title,
            "category": issue.category,
            "fixHint": issue.fixHint,
            "area": _issue_area(issue.category),
        })
        seen_areas.add(issue.category)

    # Include ALL blockers and warnings (not just first 5)
    for issue in consistency.blockers:
        _append_issue(issue, "BLOCKER")
    for issue in consistency.warnings:
        _append_issue(issue, "WARNING")

    result = {
        "branchId": branchId,
        "branchName": ctx.branch.name,
        "overallHealth": overall,
        "consistencyScore": consistency.score,
        "nabhScore": nabh.overallScore,
        "goLiveScore": go_live.overall,
        "goLiveGrade": go_live.grade,
        "namingScore": naming.score,
        "totalBlockers": total_blockers,
        "totalWarnings": total_warnings,
        "canGoLive": go_live.canGoLive,
        "topIssues": top_issues,
        "summary": go_live.recommendation,
    }

    # Cache
    _health_cache[branchId] = (now, result)
    return result


def _issue_area(category: str) -> str:
    """Map consistency category to frontend navigation area."""
    mapping = {
        "BRANCH": "branches",
        "LOCATION": "locations",
        "DEPARTMENT": "departments",
        "UNIT_TYPE": "unit-types",
        "UNIT": "units",
        "ROOM": "rooms",
        "RESOURCE": "resources",
    }
    return mapping.get(category, "infrastructure")


# ── Page-Level Insights ─────────────────────────────────────────────────


class PageInsightsInput(BaseModel):
    module: str
    branchId: str


@app.post("/v1/ai/page-insights")
async def ai_page_insights(inp: PageInsightsInput):
    """Return contextual insights for a specific infrastructure page."""
    import time as _time

    from .collectors.schema_context import collect_branch_context
    from .engines.page_insights import get_page_insights

    try:
        ctx = await collect_branch_context(inp.branchId)
        result = get_page_insights(inp.module, ctx)
        return result.model_dump()
    except Exception as exc:
        logger.warning("page-insights failed for module=%s branch=%s: %s", inp.module, inp.branchId, exc)
        return {"module": inp.module, "insights": [], "generatedAt": _time.time()}


# ── Conversational Chat ──────────────────────────────────────────────────


class ChatInput(BaseModel):
    message: str
    branchId: str
    sessionId: str | None = None
    pageContext: dict[str, Any] | None = None


@app.post("/v1/ai/chat")
async def ai_chat(inp: ChatInput):
    """Conversational chat with session memory. Keyword match + Ollama fallback."""
    from .collectors.schema_context import collect_branch_context
    from .engines.nl_query import run_nl_query
    from .services.chat_session import chat_store

    # Session management
    session = chat_store.create_or_resume(inp.sessionId)
    session.add_message("user", inp.message)

    # Get branch context for the query
    ctx = await collect_branch_context(inp.branchId)

    # Run NL query engine (keyword match + Ollama fallback)
    result = await run_nl_query(inp.message, ctx)

    # Store assistant response
    session.add_message("assistant", result.answer, source=result.source)

    return {
        "answer": result.answer,
        "source": result.source,
        "sessionId": session.session_id,
        "followUp": result.followUp or [],
        "data": result.data,
        "durationMs": result.durationMs,
    }


# ══════════════════════════════════════════════════════════════════════════
# Clinical AI — /v1/clinical/...  (stubs — future)
# ══════════════════════════════════════════════════════════════════════════


class ContextPack(BaseModel):
    role: Literal["DOCTOR", "NURSE", "BILLING", "OPS", "SUPER_ADMIN"]
    branch_id: Optional[str] = None
    patient_id: Optional[str] = None
    encounter_id: Optional[str] = None
    facts: Dict[str, Any] = {}
    documents: List[Dict[str, Any]] = []
    vitals: List[Dict[str, Any]] = []
    meds: List[Dict[str, Any]] = []
    labs: List[Dict[str, Any]] = []
    imaging: List[Dict[str, Any]] = []
    billing: Dict[str, Any] = {}


class ClinicalCopilotResponse(BaseModel):
    alerts: List[str] = []
    suggestions: List[str] = []
    summary: Optional[str] = None
    confidence: Optional[float] = None


@app.post("/v1/clinical/interaction-check", response_model=ClinicalCopilotResponse)
def interaction_check(ctx: ContextPack):
    return ClinicalCopilotResponse(
        suggestions=["Stub: integrate DDI + allergies + formulary rules."],
        confidence=0.1,
    )


@app.post("/v1/clinical/summarize", response_model=ClinicalCopilotResponse)
def summarize(ctx: ContextPack):
    return ClinicalCopilotResponse(
        summary="Stub: connect summarizer with citations.", confidence=0.1
    )


@app.post("/v1/nursing/handoff", response_model=ClinicalCopilotResponse)
def handoff(ctx: ContextPack):
    return ClinicalCopilotResponse(
        summary="Stub: shift handoff generator.", confidence=0.1
    )


@app.post("/v1/billing/claim-score", response_model=ClinicalCopilotResponse)
def claim_score(ctx: ContextPack):
    return ClinicalCopilotResponse(
        suggestions=["Stub: rejection probability model."], confidence=0.1
    )


@app.post("/v1/ops/recommendations", response_model=ClinicalCopilotResponse)
def ops(ctx: ContextPack):
    return ClinicalCopilotResponse(
        suggestions=["Stub: predictive maintenance + rostering."], confidence=0.1
    )
