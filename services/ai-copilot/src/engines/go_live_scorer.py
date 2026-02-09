"""
Go-Live Score Calculator Engine  (v2 -- Physical Infrastructure Phase)

Computes readiness score across 3 infrastructure categories:
  1. Branch Configuration  (30%)
  2. Location & Safety     (35%)
  3. Units & Resources     (35%)

Additional categories (Services & Billing, Staff, Diagnostics, OT)
will be added as those modules are completed.

Ported from:
  services/core-api/src/modules/infrastructure/ai/engines/go-live-scorer.engine.ts
"""

from __future__ import annotations

from src.engines.models import (
    ConsistencyResult,
    GoLiveCategory,
    GoLiveScoreResult,
    NABHReadinessResult,
)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def compute_go_live_score(
    consistency: ConsistencyResult,
    nabh: NABHReadinessResult,
) -> GoLiveScoreResult:
    """Compute go-live readiness score from consistency + NABH results."""

    # -- 1. Branch Configuration (30%) -------------------------------------

    branch_blockers: list[str] = []
    branch_warnings: list[str] = []
    branch_passed = 0
    branch_total = 0

    # NABH chapter 8 (Management / Branch Config)
    for ch in nabh.chapters:
        if ch.chapter == 8:
            for check in ch.checks:
                branch_total += 1
                if check.status == "PASS":
                    branch_passed += 1
                elif check.severity == "BLOCKER":
                    branch_blockers.append(f"{check.id}: {check.description}")
                else:
                    branch_warnings.append(f"{check.id}: {check.description}")

    # Consistency -> BRANCH / DEPARTMENT categories
    for issue in consistency.issues:
        if issue.category in ("BRANCH", "DEPARTMENT"):
            branch_total += 1
            if issue.severity == "BLOCKER":
                branch_blockers.append(issue.title)
            elif issue.severity == "WARNING":
                branch_warnings.append(issue.title)
            else:
                branch_passed += 1

    # -- 2. Location & Safety (35%) ----------------------------------------

    loc_blockers: list[str] = []
    loc_warnings: list[str] = []
    loc_passed = 0
    loc_total = 0

    # NABH chapter 5 (Infrastructure & Safety)
    for ch in nabh.chapters:
        if ch.chapter == 5:
            for check in ch.checks:
                loc_total += 1
                if check.status == "PASS":
                    loc_passed += 1
                elif check.severity == "BLOCKER":
                    loc_blockers.append(f"{check.id}: {check.description}")
                else:
                    loc_warnings.append(f"{check.id}: {check.description}")

    # Consistency -> LOCATION category
    for issue in consistency.issues:
        if issue.category == "LOCATION":
            loc_total += 1
            if issue.severity == "BLOCKER":
                loc_blockers.append(issue.title)
            elif issue.severity == "WARNING":
                loc_warnings.append(issue.title)
            else:
                loc_passed += 1

    # -- 3. Units & Resources (35%) ----------------------------------------

    unit_blockers: list[str] = []
    unit_warnings: list[str] = []
    unit_passed = 0
    unit_total = 0

    # NABH chapters 1 & 2 (Access & Care -- physical setup)
    for ch in nabh.chapters:
        if ch.chapter in (1, 2):
            for check in ch.checks:
                unit_total += 1
                if check.status == "PASS":
                    unit_passed += 1
                elif check.severity == "BLOCKER":
                    unit_blockers.append(f"{check.id}: {check.description}")
                else:
                    unit_warnings.append(f"{check.id}: {check.description}")

    # Consistency -> UNIT_TYPE, UNIT, ROOM, RESOURCE categories
    for issue in consistency.issues:
        if issue.category in ("UNIT_TYPE", "UNIT", "ROOM", "RESOURCE"):
            unit_total += 1
            if issue.severity == "BLOCKER":
                unit_blockers.append(issue.title)
            elif issue.severity == "WARNING":
                unit_warnings.append(issue.title)
            else:
                unit_passed += 1

    # -- Aggregate ---------------------------------------------------------

    branch_config = _build_category(
        "Branch Configuration", 30,
        branch_total, branch_passed,
        branch_blockers, branch_warnings,
    )
    location_safety = _build_category(
        "Location & Safety", 35,
        loc_total, loc_passed,
        loc_blockers, loc_warnings,
    )
    units_resources = _build_category(
        "Units & Resources", 35,
        unit_total, unit_passed,
        unit_blockers, unit_warnings,
    )

    all_categories = [branch_config, location_safety, units_resources]

    overall = round(sum(c.weightedScore for c in all_categories))

    total_blockers = sum(len(c.blockers) for c in all_categories)
    total_warnings = sum(len(c.warnings) for c in all_categories)

    # Grading: A >= 90, B >= 75, C >= 60, D >= 40, F < 40
    if overall >= 90:
        grade = "A"
    elif overall >= 75:
        grade = "B"
    elif overall >= 60:
        grade = "C"
    elif overall >= 40:
        grade = "D"
    else:
        grade = "F"

    can_go_live = total_blockers == 0 and overall >= 60

    # Recommendation text
    if can_go_live and grade == "A":
        recommendation = (
            "Physical infrastructure is fully ready. "
            "Proceed to configure Services & Billing."
        )
    elif can_go_live:
        recommendation = (
            f"Infrastructure ready (score: {overall}%). "
            f"Address {total_warnings} warning(s) for a higher score before moving on."
        )
    elif total_blockers > 0:
        recommendation = (
            f"Not ready. {total_blockers} blocker(s) must be resolved first. "
            "Run the consistency check for details."
        )
    else:
        recommendation = (
            f"Score too low ({overall}%). "
            "Improve location, unit, and room configuration to reach 60%."
        )

    return GoLiveScoreResult(
        overall=overall,
        grade=grade,
        canGoLive=can_go_live,
        phase="Physical Infrastructure",
        categories={
            "branchConfig": branch_config,
            "locationSafety": location_safety,
            "unitsResources": units_resources,
        },
        totalBlockers=total_blockers,
        totalWarnings=total_warnings,
        recommendation=recommendation,
        nextPhaseHint=(
            "Once infrastructure is ready, the next phase adds "
            "Services & Billing checks to this score."
        ),
    )


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _build_category(
    name: str,
    weight: int,
    total: int,
    passed: int,
    blockers: list[str],
    warnings: list[str],
) -> GoLiveCategory:
    """Build a single weighted Go-Live category result."""
    score = round((passed / total) * 100) if total > 0 else 100
    score = min(100, max(0, score))
    weighted_score = round((score * weight) / 100)

    return GoLiveCategory(
        name=name,
        weight=weight,
        score=score,
        weightedScore=weighted_score,
        blockers=blockers,
        warnings=warnings,
        passedChecks=passed,
        totalChecks=total,
    )
