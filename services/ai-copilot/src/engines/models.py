"""Pydantic models shared across all heuristic / AI engines.

Covers every engine in the infrastructure AI layer:
  - Consistency Checker
  - NABH Readiness Checker
  - Go-Live Scorer
  - Naming Convention Enforcer
  - Fix Suggestion Generator
  - Branch Smart Reviewer
  - Compliance Validator (GSTIN / PAN)
  - Field Validation
  - Natural Language Query
  - Setup Copilot
  - Branch Health Status
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════════
# Consistency Checker
# ═══════════════════════════════════════════════════════════════════════════


class ConsistencyIssue(BaseModel):
    id: str
    category: str
    severity: Literal["BLOCKER", "WARNING", "INFO"]
    title: str
    details: str
    fixHint: str
    entityType: str | None = None
    entityId: str | None = None
    count: int | None = None


class ConsistencyResult(BaseModel):
    totalChecks: int
    passCount: int
    issues: list[ConsistencyIssue] = Field(default_factory=list)
    blockers: list[ConsistencyIssue] = Field(default_factory=list)
    warnings: list[ConsistencyIssue] = Field(default_factory=list)
    infos: list[ConsistencyIssue] = Field(default_factory=list)
    score: int
    categorySummary: dict[str, dict[str, int]] = Field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════════════════
# NABH Readiness Checker
# ═══════════════════════════════════════════════════════════════════════════


class NABHCheckResult(BaseModel):
    id: str
    description: str
    status: Literal["PASS", "FAIL"]
    severity: str
    fixHint: str
    details: str | None = None


class NABHChapterResult(BaseModel):
    chapter: int
    name: str
    score: int
    maxScore: int
    checks: list[NABHCheckResult] = Field(default_factory=list)


class NABHReadinessResult(BaseModel):
    overallScore: int
    maxScore: int
    chapters: list[NABHChapterResult] = Field(default_factory=list)
    blockers: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    passCount: int = 0
    failCount: int = 0


# ═══════════════════════════════════════════════════════════════════════════
# Go-Live Scorer
# ═══════════════════════════════════════════════════════════════════════════


class GoLiveCategory(BaseModel):
    name: str
    weight: int
    score: int
    weightedScore: int
    blockers: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    passedChecks: int = 0
    totalChecks: int = 0


class GoLiveScoreResult(BaseModel):
    overall: int
    grade: Literal["A", "B", "C", "D", "F"]
    canGoLive: bool
    phase: str
    categories: dict[str, GoLiveCategory] = Field(default_factory=dict)
    totalBlockers: int = 0
    totalWarnings: int = 0
    recommendation: str = ""
    nextPhaseHint: str = ""


# ═══════════════════════════════════════════════════════════════════════════
# Naming Convention Enforcer
# ═══════════════════════════════════════════════════════════════════════════


class NamingIssue(BaseModel):
    entityType: str
    entityId: str
    field: str
    currentValue: str
    suggestedValue: str
    issueType: Literal["FORMAT", "DUPLICATE", "INCONSISTENT", "MISSING"]
    severity: Literal["WARNING", "INFO"]
    description: str


class NamingCheckResult(BaseModel):
    totalEntities: int = 0
    issues: list[NamingIssue] = Field(default_factory=list)
    issueCount: int = 0
    score: int = 100


# ═══════════════════════════════════════════════════════════════════════════
# Fix Suggestion Generator
# ═══════════════════════════════════════════════════════════════════════════


class FixSuggestion(BaseModel):
    issueId: str
    category: str
    severity: str
    title: str
    suggestedAction: str
    actionType: Literal["NAVIGATE", "MANUAL"]
    navigateTo: str | None = None
    entityType: str | None = None
    entityId: str | None = None


class FixSuggestionsResult(BaseModel):
    total: int = 0
    suggestions: list[FixSuggestion] = Field(default_factory=list)
    navigable: int = 0
    manual: int = 0
    blockerFixes: int = 0
    warningFixes: int = 0


# ═══════════════════════════════════════════════════════════════════════════
# Branch Smart Reviewer
# ═══════════════════════════════════════════════════════════════════════════


class ReviewMetric(BaseModel):
    current: int | float | str
    benchmark: int | float | str
    unit: str


class ReviewInsight(BaseModel):
    id: str
    category: Literal["CRITICAL", "CONCERN", "INSIGHT", "STRENGTH"]
    area: str
    title: str
    reasoning: str
    recommendation: str | None = None
    metric: ReviewMetric | None = None


class ReviewResult(BaseModel):
    overallHealth: Literal["EXCELLENT", "GOOD", "NEEDS_ATTENTION", "CRITICAL"]
    healthScore: int
    insights: list[ReviewInsight] = Field(default_factory=list)
    criticalCount: int = 0
    concernCount: int = 0
    strengthCount: int = 0
    narrativeSummary: str = ""


# ═══════════════════════════════════════════════════════════════════════════
# Compliance Validator (GSTIN / PAN)
# ═══════════════════════════════════════════════════════════════════════════


class ComplianceResult(BaseModel):
    valid: bool
    input: str
    normalized: str = ""
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    details: dict[str, Any] | None = None


GstinValidationResult = ComplianceResult
PanValidationResult = ComplianceResult


# ═══════════════════════════════════════════════════════════════════════════
# Field Validation
# ═══════════════════════════════════════════════════════════════════════════


class FieldWarning(BaseModel):
    level: Literal["critical", "warning", "info"] = "warning"
    message: str
    field: str | None = None
    suggestedValue: Any = None


class FieldValidationResult(BaseModel):
    valid: bool
    warnings: list[FieldWarning] = Field(default_factory=list)
    suggestion: dict[str, Any] | None = None


# ═══════════════════════════════════════════════════════════════════════════
# Natural Language Query
# ═══════════════════════════════════════════════════════════════════════════


class NLQueryResponse(BaseModel):
    answer: str
    source: Literal["ollama", "keyword_match"]
    data: dict[str, Any] | None = None
    followUp: list[str] | None = None
    durationMs: int = 0
    error: str | None = None


# ═══════════════════════════════════════════════════════════════════════════
# Setup Copilot
# ═══════════════════════════════════════════════════════════════════════════


class CopilotPlan(BaseModel):
    hospitalType: str = "MULTI_SPECIALTY"
    bedCount: int = 0
    specialties: list[str] = Field(default_factory=list)
    departments: list[dict[str, Any]] = Field(default_factory=list)
    units: list[dict[str, Any]] = Field(default_factory=list)
    locationPlan: dict[str, Any] = Field(default_factory=dict)
    equipment: list[dict[str, Any]] = Field(default_factory=list)
    branchSettings: dict[str, Any] = Field(default_factory=dict)
    reasoning: str = ""


class CopilotResponse(BaseModel):
    available: bool
    source: Literal["ollama", "heuristic"]
    plan: CopilotPlan | None = None
    heuristicFallback: dict[str, Any] | None = None
    rawResponse: str | None = None
    error: str | None = None
    durationMs: int = 0


# ═══════════════════════════════════════════════════════════════════════════
# Branch Health Status (composite)
# ═══════════════════════════════════════════════════════════════════════════


class BranchHealthStatus(BaseModel):
    branchId: str
    branchName: str
    overallHealth: Literal["EXCELLENT", "GOOD", "NEEDS_ATTENTION", "CRITICAL"]
    consistencyScore: int = 0
    nabhScore: int = 0
    goLiveScore: int = 0
    namingScore: int = 0
    totalBlockers: int = 0
    totalWarnings: int = 0
    canGoLive: bool = False
    summary: str = ""


# ═══════════════════════════════════════════════════════════════════════════
# Page Insights
# ═══════════════════════════════════════════════════════════════════════════


class PageInsight(BaseModel):
    id: str
    level: Literal["info", "warning", "critical"] = "info"
    message: str
    actionHint: str | None = None
    entityCount: int | None = None


class PageInsightsResult(BaseModel):
    module: str
    insights: list[PageInsight] = Field(default_factory=list)
    generatedAt: float = 0
