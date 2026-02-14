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
from fastapi.responses import JSONResponse
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
async def ai_health_check(branchId: str = Query(...), bust: str = Query(None)):
    """Run all engines and return unified branch health status."""
    now = time.time()

    # Check cache (skip if bust param provided — means data just changed)
    if not bust and branchId in _health_cache:
        cached_at, cached_result = _health_cache[branchId]
        if now - cached_at < HEALTH_CACHE_TTL:
            return cached_result

    from .collectors.schema_context import collect_branch_context
    from .engines.consistency_checker import run_consistency_checks
    from .engines.go_live_scorer import compute_go_live_score
    from .engines.nabh_checker import run_nabh_checks
    from .engines.naming_enforcer import run_naming_check
    from .engines.pharmacy_checker import run_pharmacy_checks

    try:
        ctx = await collect_branch_context(branchId)
    except ValueError as exc:
        return JSONResponse(status_code=404, content={"error": str(exc)})
    except Exception as exc:
        logger.warning("health-check context failed for branch=%s: %s", branchId, exc)
        return JSONResponse(status_code=500, content={"error": "Failed to collect branch context"})

    consistency = run_consistency_checks(ctx)
    nabh = run_nabh_checks(ctx)
    naming = run_naming_check(ctx)
    go_live = compute_go_live_score(consistency, nabh)
    pharmacy_issues = run_pharmacy_checks(ctx)

    # Determine overall health — include pharmacy blockers
    pharmacy_blockers = [i for i in pharmacy_issues if i.severity == "BLOCKER"]
    pharmacy_warnings = [i for i in pharmacy_issues if i.severity == "WARNING"]
    total_blockers = len(consistency.blockers) + nabh.failCount + len(pharmacy_blockers)
    total_warnings = len(consistency.warnings) + len(nabh.warnings) + len(pharmacy_warnings)

    if total_blockers == 0 and consistency.score >= 90:
        overall = "EXCELLENT"
    elif total_blockers == 0 and consistency.score >= 70:
        overall = "GOOD"
    elif total_blockers <= 3:
        overall = "NEEDS_ATTENTION"
    else:
        overall = "CRITICAL"

    # Build top issues for sidebar badges — include ALL consistency + NABH issues
    top_issues: list[dict[str, Any]] = []

    def _append_consistency_issue(issue: Any, sev: str) -> None:
        top_issues.append({
            "id": issue.id,
            "severity": sev,
            "title": issue.title,
            "category": issue.category,
            "fixHint": issue.fixHint,
            "area": _issue_area(issue.category),
        })

    # Consistency issues (all severities — blockers, warnings, and infos)
    for issue in consistency.blockers:
        _append_consistency_issue(issue, "BLOCKER")
    for issue in consistency.warnings:
        _append_consistency_issue(issue, "WARNING")
    for issue in consistency.infos:
        _append_consistency_issue(issue, "INFO")

    # NABH issues — extract from chapter results (they have id, description, fixHint)
    for chapter in nabh.chapters:
        for check in chapter.checks:
            if check.status == "FAIL":
                sev = "BLOCKER" if check.severity == "BLOCKER" else "WARNING"
                top_issues.append({
                    "id": f"nabh-{check.id}",
                    "severity": sev,
                    "title": check.description,
                    "category": "NABH",
                    "fixHint": check.fixHint,
                    "area": _nabh_area(check.id),
                })

    # Pharmacy issues
    for issue in pharmacy_issues:
        if issue.severity in ("BLOCKER", "WARNING"):
            top_issues.append({
                "id": issue.id,
                "severity": issue.severity,
                "title": issue.title,
                "category": issue.category,
                "fixHint": issue.fixHint,
                "area": _issue_area(issue.category),
            })

    # Billing issues
    bl = ctx.billing
    if bl.rejectedClaims > 0:
        top_issues.append({
            "id": "billing-rejected-claims",
            "severity": "WARNING",
            "title": f"{bl.rejectedClaims} rejected claim(s) require resubmission",
            "category": "CLAIM",
            "fixHint": "Review rejection reasons and resubmit corrected claims",
            "area": "billing-claims",
        })
        total_warnings += bl.rejectedClaims
    if bl.rejectedPreauths > 0:
        top_issues.append({
            "id": "billing-rejected-preauths",
            "severity": "WARNING",
            "title": f"{bl.rejectedPreauths} rejected pre-auth(s) need attention",
            "category": "PREAUTH",
            "fixHint": "Check rejection reasons and resubmit with additional documentation",
            "area": "billing-preauth",
        })
        total_warnings += bl.rejectedPreauths
    if bl.draftClaims > 5:
        top_issues.append({
            "id": "billing-draft-claims-backlog",
            "severity": "WARNING",
            "title": f"{bl.draftClaims} draft claims pending submission",
            "category": "CLAIM",
            "fixHint": "Submit draft claims promptly to avoid payment delays",
            "area": "billing-claims",
        })
    if bl.totalDocumentChecklists == 0 and ctx.serviceCatalog.totalPayers > 0:
        top_issues.append({
            "id": "billing-no-checklists",
            "severity": "WARNING",
            "title": "No document checklists configured for any payer",
            "category": "DOCUMENT_CHECKLIST",
            "fixHint": "Define required documents per payer for smooth claim processing",
            "area": "billing-document-checklists",
        })

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
        "PHARMACY": "pharmacy",
        # Billing Setup
        "TAX_CODE": "tax-codes",
        "CHARGE_MASTER": "charge-master",
        "TARIFF_PLAN": "tariff-plans",
        "PAYER": "payers",
        "CONTRACT": "payer-contracts",
        "GOV_SCHEME": "gov-schemes",
        "PRICING_TIER": "pricing-tiers",
        "PRICE_HISTORY": "price-history",
        # Service Catalogue
        "SERVICE_CATALOG": "service-items",
        "SERVICE_CATALOGUE": "service-catalogues",
        "SERVICE_LIBRARY": "service-library",
        "SERVICE_MAPPING": "service-mapping",
        "SERVICE_PACKAGE": "service-packages",
        "ORDER_SET": "order-sets",
        "SERVICE_AVAILABILITY": "service-availability",
        "SERVICE_BULK_IMPORT": "service-bulk-import",
        # Billing & Claims
        "BILLING": "billing",
        "PREAUTH": "billing-preauth",
        "CLAIM": "billing-claims",
        "INSURANCE_POLICY": "billing-insurance-policies",
        "INSURANCE_CASE": "billing-insurance-cases",
        "DOCUMENT_CHECKLIST": "billing-document-checklists",
        "PAYER_INTEGRATION": "billing-payer-integrations",
        "RECONCILIATION": "billing-reconciliation",
        # Legacy fallback
        "FINANCIAL": "tax-codes",
    }
    return mapping.get(category, "infrastructure")


def _nabh_area(check_id: str) -> str:
    """Map NABH check ID to frontend navigation area based on chapter."""
    _NABH_AREA_MAP: dict[str, str] = {
        "NABH-1": "units",       # Access & Assessment → units (OPD/ER)
        "NABH-2": "resources",   # Care of Patients → beds/resources
        "NABH-3": "rooms",       # Infection Control → rooms
        "NABH-4": "rooms",       # Patient Rights → rooms (amenities)
        "NABH-5": "locations",   # Hospital Infrastructure → locations
        "NABH-6": "resources",   # Human Resources → resources
        "NABH-7": "rooms",       # Information Management → rooms
        "NABH-8": "rooms",       # Quality Improvement → rooms
        "NABH-9": "locations",   # Safety → locations (fire zones etc.)
    }
    prefix = check_id.rsplit(".", 1)[0] if "." in check_id else check_id
    return _NABH_AREA_MAP.get(prefix, "infrastructure")


# ── Service Catalog AI Engines ─────────────────────────────────────────


class ServiceSearchInput(BaseModel):
    query: str
    branchId: str
    limit: int = 20


@app.post("/v1/ai/service-search")
async def ai_service_search(inp: ServiceSearchInput):
    """Fuzzy + synonym service search."""
    from .collectors.schema_context import collect_branch_context
    from .engines.service_search import search_services

    try:
        ctx = await collect_branch_context(inp.branchId)
        return search_services(inp.query, ctx, inp.limit).model_dump()
    except Exception as exc:
        logger.warning("service-search failed: %s", exc)
        return {"query": inp.query, "hits": [], "total": 0}


class CodeSuggestInput(BaseModel):
    serviceName: str
    category: str | None = None
    branchId: str | None = None


@app.post("/v1/ai/suggest-codes")
async def ai_suggest_codes(inp: CodeSuggestInput):
    """Suggest LOINC/CPT/SNOMED codes for a service."""
    from .engines.code_suggester import suggest_codes

    ctx = None
    if inp.branchId:
        try:
            from .collectors.schema_context import collect_branch_context
            ctx = await collect_branch_context(inp.branchId)
        except Exception:
            pass
    return suggest_codes(inp.serviceName, inp.category, ctx).model_dump()


class DuplicateCheckInput(BaseModel):
    branchId: str
    threshold: float = 0.7


@app.post("/v1/ai/duplicate-check")
async def ai_duplicate_check(inp: DuplicateCheckInput):
    """Detect potential duplicate service items."""
    from .collectors.schema_context import collect_branch_context
    from .engines.duplicate_detector import detect_duplicates

    try:
        ctx = await collect_branch_context(inp.branchId)
        return detect_duplicates(ctx, inp.threshold).model_dump()
    except Exception as exc:
        logger.warning("duplicate-check failed: %s", exc)
        return {"totalItemsChecked": 0, "potentialDuplicates": [], "highConfidence": 0, "mediumConfidence": 0}


class PricingRecommendInput(BaseModel):
    branchId: str


@app.post("/v1/ai/pricing-recommend")
async def ai_pricing_recommend(inp: PricingRecommendInput):
    """Statistical pricing advice based on branch data."""
    from .collectors.schema_context import collect_branch_context
    from .engines.pricing_recommender import recommend_pricing

    try:
        ctx = await collect_branch_context(inp.branchId)
        return recommend_pricing(ctx).model_dump()
    except Exception as exc:
        logger.warning("pricing-recommend failed: %s", exc)
        return {"insights": [], "serviceCoveragePercent": 0}


class ContractAnalysisInput(BaseModel):
    branchId: str


@app.post("/v1/ai/contract-analysis")
async def ai_contract_analysis(inp: ContractAnalysisInput):
    """Payer contract profitability and coverage analysis."""
    from .collectors.schema_context import collect_branch_context
    from .engines.payer_contract_analyzer import analyze_contracts

    try:
        ctx = await collect_branch_context(inp.branchId)
        return analyze_contracts(ctx).model_dump()
    except Exception as exc:
        logger.warning("contract-analysis failed: %s", exc)
        return {"totalPayers": 0, "totalContracts": 0, "activeContracts": 0, "insights": [], "coverageScore": 0}


class GSTClassifyInput(BaseModel):
    serviceName: str
    category: str | None = None
    branchId: str | None = None


@app.post("/v1/ai/gst-classify")
async def ai_gst_classify(inp: GSTClassifyInput):
    """Auto GST/SAC classification for a service."""
    from .engines.gst_compliance import classify_gst

    ctx = None
    if inp.branchId:
        try:
            from .collectors.schema_context import collect_branch_context
            ctx = await collect_branch_context(inp.branchId)
        except Exception:
            pass
    return classify_gst(inp.serviceName, inp.category, ctx).model_dump()


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
# Compliance AI Help — /v1/ai/compliance/...
# ══════════════════════════════════════════════════════════════════════════


class ComplianceHelpInput(BaseModel):
    pageId: str


@app.post("/v1/ai/compliance/page-help")
def ai_compliance_page_help(inp: ComplianceHelpInput):
    """Get contextual help for a specific compliance page."""
    from .engines.compliance_help import get_page_help

    result = get_page_help(inp.pageId)
    return result.model_dump()


@app.get("/v1/ai/compliance/glossary")
def ai_compliance_glossary(category: str = Query(None), search: str = Query(None)):
    """Get compliance glossary terms, optionally filtered."""
    from .engines.compliance_help import COMPLIANCE_GLOSSARY

    terms = COMPLIANCE_GLOSSARY
    if category:
        terms = [t for t in terms if t.category.lower() == category.lower()]
    if search:
        q = search.lower()
        terms = [t for t in terms if q in t.term.lower() or q in t.shortDef.lower() or q in t.longDef.lower()]

    return {"terms": [t.model_dump() for t in terms], "total": len(terms)}


class ComplianceWorkflowInput(BaseModel):
    complianceState: dict[str, Any]
    currentPage: str | None = None


@app.post("/v1/ai/compliance/whats-next")
def ai_compliance_whats_next(inp: ComplianceWorkflowInput):
    """Compute workflow progress and next steps."""
    import time as _time
    from .engines.compliance_help import compute_workflow_steps

    steps = compute_workflow_steps(inp.complianceState)
    done_count = sum(1 for s in steps if s.status == "done")
    progress = int(done_count / len(steps) * 100) if steps else 0

    return {
        "currentPage": inp.currentPage,
        "overallProgress": progress,
        "steps": [s.model_dump() for s in steps],
        "generatedAt": _time.time(),
    }


class ComplianceChatInput(BaseModel):
    message: str
    pageContext: str | None = None
    complianceState: dict[str, Any] | None = None


@app.post("/v1/ai/compliance/chat")
def ai_compliance_chat(inp: ComplianceChatInput):
    """Compliance-specific chat Q&A with knowledge base answers."""
    from .engines.compliance_help import answer_compliance_question

    result = answer_compliance_question(
        question=inp.message,
        page_context=inp.pageContext,
        compliance_state=inp.complianceState,
    )
    return result.model_dump()


# ── Compliance Health Check — sidebar badges + dashboard summary ─────────


class ComplianceHealthInput(BaseModel):
    complianceState: dict[str, Any]
    branchId: str | None = None


_compliance_health_cache: dict[str, tuple[float, Any]] = {}
COMPLIANCE_HEALTH_CACHE_TTL = 120  # 2 minutes


@app.post("/v1/ai/compliance/health-check")
def ai_compliance_health_check(inp: ComplianceHealthInput):
    """Run compliance health analysis and return issues for sidebar badges + dashboard card.

    Returns a structure similar to the infrastructure health-check:
    - overallHealth: EXCELLENT | GOOD | NEEDS_ATTENTION | CRITICAL
    - complianceScore: 0-100
    - totalBlockers: number of blocking issues
    - totalWarnings: number of warning issues
    - topIssues: list of issues with area mapping for NavBadgeAI
    - summary: human-readable summary text
    - areas: per-area score breakdowns
    """
    from .engines.compliance_help import compute_workflow_steps

    # Optional caching by branchId
    cache_key = inp.branchId or "__default__"
    now = time.time()
    if cache_key in _compliance_health_cache:
        cached_at, cached_result = _compliance_health_cache[cache_key]
        if now - cached_at < COMPLIANCE_HEALTH_CACHE_TTL:
            return cached_result

    s = inp.complianceState
    top_issues: list[dict[str, Any]] = []
    area_scores: dict[str, dict[str, Any]] = {}

    # ── ABDM checks ────────────────────────────────────────────────
    abdm_score = 0
    abdm_checks = 0
    abdm_total = 3  # ABHA, HFR, HPR

    if not s.get("hasAbhaConfig"):
        top_issues.append({
            "id": "comp-abdm-no-abha",
            "severity": "BLOCKER",
            "title": "ABHA integration not configured",
            "category": "COMPLIANCE_ABDM",
            "fixHint": "Go to ABDM → ABHA Config and set up your client credentials.",
            "area": "compliance-abdm",
        })
    else:
        abdm_checks += 1

    hfr = s.get("hfrCompleteness", 0)
    if hfr < 50:
        top_issues.append({
            "id": "comp-abdm-hfr-incomplete",
            "severity": "BLOCKER" if hfr < 20 else "WARNING",
            "title": f"HFR profile only {hfr}% complete",
            "category": "COMPLIANCE_ABDM",
            "fixHint": "Fill in all HFR profile fields in ABDM → HFR Profile.",
            "area": "compliance-abdm-hfr",
        })
    elif hfr >= 80:
        abdm_checks += 1

    hpr = s.get("hprLinked", 0)
    if hpr == 0:
        top_issues.append({
            "id": "comp-abdm-no-hpr",
            "severity": "WARNING",
            "title": "No staff linked to HPR",
            "category": "COMPLIANCE_ABDM",
            "fixHint": "Link your doctors and nurses to HPR in ABDM → HPR Linkage.",
            "area": "compliance-abdm-hpr",
        })
    else:
        abdm_checks += 1

    abdm_score = int(abdm_checks / abdm_total * 100)
    area_scores["abdm"] = {"score": abdm_score, "label": "ABDM", "issues": sum(1 for i in top_issues if i["area"].startswith("compliance-abdm"))}

    # ── Workspace checks ───────────────────────────────────────────
    if not s.get("hasWorkspace"):
        top_issues.append({
            "id": "comp-ws-none",
            "severity": "BLOCKER",
            "title": "No compliance workspace created",
            "category": "COMPLIANCE_WORKSPACE",
            "fixHint": "Create a workspace in Workspaces to begin compliance setup.",
            "area": "compliance-workspaces",
        })
    elif s.get("workspaceStatus") == "DRAFT":
        top_issues.append({
            "id": "comp-ws-draft",
            "severity": "WARNING",
            "title": "Workspace is still in DRAFT status",
            "category": "COMPLIANCE_WORKSPACE",
            "fixHint": "Complete setup and activate the workspace.",
            "area": "compliance-workspaces",
        })

    # ── Schemes checks ─────────────────────────────────────────────
    scheme_score = 0
    has_pmjay = s.get("pmjayActive", False)
    has_cghs = s.get("cghsActive", False)
    has_echs = s.get("echsActive", False)
    has_any_scheme = has_pmjay or has_cghs or has_echs

    if not has_any_scheme:
        top_issues.append({
            "id": "comp-scheme-none",
            "severity": "WARNING",
            "title": "No government scheme configured",
            "category": "COMPLIANCE_SCHEME",
            "fixHint": "Set up at least one scheme (PMJAY, CGHS, or ECHS) in Schemes.",
            "area": "compliance-schemes",
        })
        scheme_score = 0
    else:
        active_count = sum([has_pmjay, has_cghs, has_echs])
        scheme_score = min(100, active_count * 30)

        unmapped = s.get("unmappedPercent", 100)
        if unmapped > 50:
            top_issues.append({
                "id": "comp-scheme-unmapped-high",
                "severity": "BLOCKER",
                "title": f"{unmapped}% of services unmapped to scheme codes",
                "category": "COMPLIANCE_SCHEME",
                "fixHint": "Map your services to scheme codes in Schemes → Mappings.",
                "area": "compliance-schemes-mapping",
            })
        elif unmapped > 20:
            top_issues.append({
                "id": "comp-scheme-unmapped",
                "severity": "WARNING",
                "title": f"{unmapped}% of services unmapped to scheme codes",
                "category": "COMPLIANCE_SCHEME",
                "fixHint": "Map remaining services in Schemes → Mappings.",
                "area": "compliance-schemes-mapping",
            })
            scheme_score = min(scheme_score, 70)
        else:
            scheme_score = min(100, scheme_score + 40)

    area_scores["schemes"] = {"score": scheme_score, "label": "Schemes", "issues": sum(1 for i in top_issues if i["area"].startswith("compliance-scheme"))}

    # ── Evidence checks ────────────────────────────────────────────
    evidence_score = 0
    ev_count = s.get("evidenceCount", 0)
    ev_expiring = s.get("evidenceExpiring", 0)

    if ev_count == 0:
        top_issues.append({
            "id": "comp-ev-none",
            "severity": "BLOCKER",
            "title": "No evidence documents uploaded",
            "category": "COMPLIANCE_EVIDENCE",
            "fixHint": "Upload compliance documents to the Evidence Vault.",
            "area": "compliance-evidence",
        })
    else:
        evidence_score = min(100, ev_count * 10)

    if ev_expiring > 0:
        top_issues.append({
            "id": "comp-ev-expiring",
            "severity": "WARNING" if ev_expiring < 3 else "BLOCKER",
            "title": f"{ev_expiring} evidence document(s) expiring within 30 days",
            "category": "COMPLIANCE_EVIDENCE",
            "fixHint": "Renew expiring documents in the Evidence Vault.",
            "area": "compliance-evidence",
        })
        evidence_score = max(0, evidence_score - ev_expiring * 10)

    area_scores["evidence"] = {"score": max(0, evidence_score), "label": "Evidence", "issues": sum(1 for i in top_issues if i["area"].startswith("compliance-evidence"))}

    # ── NABH checks ────────────────────────────────────────────────
    nabh_progress = s.get("nabhProgress", 0)
    nabh_score = nabh_progress

    if nabh_progress == 0:
        top_issues.append({
            "id": "comp-nabh-not-started",
            "severity": "WARNING",
            "title": "NABH checklist not started",
            "category": "COMPLIANCE_NABH",
            "fixHint": "Begin the NABH checklist in NABH → Checklist.",
            "area": "compliance-nabh",
        })
    elif nabh_progress < 30:
        top_issues.append({
            "id": "comp-nabh-early",
            "severity": "WARNING",
            "title": f"NABH checklist only {nabh_progress}% complete",
            "category": "COMPLIANCE_NABH",
            "fixHint": "Continue working through the NABH checklist items.",
            "area": "compliance-nabh-checklist",
        })

    area_scores["nabh"] = {"score": nabh_score, "label": "NABH", "issues": sum(1 for i in top_issues if i["area"].startswith("compliance-nabh"))}

    # ── Approvals checks ───────────────────────────────────────────
    pending = s.get("pendingApprovals", 0)
    if pending > 0:
        top_issues.append({
            "id": "comp-approvals-pending",
            "severity": "WARNING",
            "title": f"{pending} approval(s) pending review",
            "category": "COMPLIANCE_APPROVAL",
            "fixHint": "Review and decide on pending approvals.",
            "area": "compliance-approvals",
        })

    # ── Validator / readiness checks ───────────────────────────────
    validator_score = s.get("validatorScore", 0)
    blocking_gaps = s.get("blockingGapCount", 0)
    has_blocking = s.get("hasBlockingGaps", True)

    if has_blocking and blocking_gaps > 0:
        top_issues.append({
            "id": "comp-validator-blockers",
            "severity": "BLOCKER",
            "title": f"{blocking_gaps} blocking gap(s) in validator",
            "category": "COMPLIANCE_VALIDATOR",
            "fixHint": "Run the Validator and fix all blocking gaps before go-live.",
            "area": "compliance-validator",
        })

    # ── Compute overall score (weighted) ───────────────────────────
    # NABH 40%, Schemes 25%, ABDM 20%, Evidence 15%
    compliance_score = int(
        nabh_score * 0.40
        + scheme_score * 0.25
        + abdm_score * 0.20
        + max(0, evidence_score) * 0.15
    )

    total_blockers = sum(1 for i in top_issues if i["severity"] == "BLOCKER")
    total_warnings = sum(1 for i in top_issues if i["severity"] == "WARNING")

    if total_blockers == 0 and compliance_score >= 80:
        overall = "EXCELLENT"
    elif total_blockers == 0 and compliance_score >= 50:
        overall = "GOOD"
    elif total_blockers <= 2:
        overall = "NEEDS_ATTENTION"
    else:
        overall = "CRITICAL"

    # ── Summary text ───────────────────────────────────────────────
    if overall == "EXCELLENT":
        summary = "Compliance is in great shape. All major areas are configured."
    elif overall == "GOOD":
        summary = "Compliance is progressing well. A few areas need attention."
    elif overall == "NEEDS_ATTENTION":
        summary = f"Compliance needs work. {total_blockers} blocker(s) and {total_warnings} warning(s) found."
    else:
        summary = f"Critical compliance gaps found. {total_blockers} blocker(s) must be resolved before go-live."

    # Workflow progress
    steps = compute_workflow_steps(s)
    done_count = sum(1 for step in steps if step.status == "done")
    workflow_progress = int(done_count / len(steps) * 100) if steps else 0

    result = {
        "overallHealth": overall,
        "complianceScore": compliance_score,
        "workflowProgress": workflow_progress,
        "totalBlockers": total_blockers,
        "totalWarnings": total_warnings,
        "topIssues": top_issues,
        "summary": summary,
        "areas": area_scores,
        "generatedAt": now,
    }

    _compliance_health_cache[cache_key] = (now, result)
    return result


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
