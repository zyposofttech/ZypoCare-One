"""
Branch Smart Reviewer Engine (Heuristic)

Unlike validation (field X is empty -> error), this engine performs
HOLISTIC analysis. It reads the entire branch configuration and
provides contextual, reasoned assessments.

Think of it as a senior hospital administrator reviewing your setup:
  - "Your 200-bed hospital has no ICU. 95% of hospitals this size have one."
  - "Your ICU has 10 beds but only 2 with oxygen -- NABH requires 100% oxygen coverage."
  - "Your OPD has 15 consultation rooms but only 3 departments -- that's 5 rooms per dept,
     which is unusually high. Verify this matches your patient volume."

Output categories:
  CRITICAL  -- Likely won't work / regulatory risk
  CONCERN   -- Unusual configuration, may cause operational issues
  INSIGHT   -- Contextual observation, no action needed
  STRENGTH  -- Something that's done well

Ported from: services/core-api/.../heuristic/branch-reviewer.engine.ts
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from src.collectors.models import BranchContext, UnitDetail
from src.engines.models import ReviewInsight, ReviewMetric, ReviewResult

# ---------------------------------------------------------------------------
# Load hospital profiles JSON
# ---------------------------------------------------------------------------

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
_HOSPITAL_PROFILES: dict[str, Any] = {}

_profiles_path = _DATA_DIR / "hospital_profiles.json"
if _profiles_path.exists():
    with open(_profiles_path, encoding="utf-8") as f:
        _HOSPITAL_PROFILES = json.load(f)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _count_beds_by_unit_type(units: list[UnitDetail], type_codes: list[str]) -> int:
    """Sum bed counts across active units whose typeCode is in *type_codes*."""
    return sum(
        u.resources.beds
        for u in units
        if u.typeCode in type_codes and u.isActive
    )


def _infer_type(branch: Any, units: Any, departments: Any) -> str:
    """Infer the hospital type from bed count and department count."""
    beds: int = branch.bedCount or sum(u.resources.beds for u in units.units)
    dept_count: int = departments.total

    if beds == 0:
        return "CLINIC"
    if beds <= 25:
        return "NURSING_HOME"
    if beds <= 50 and dept_count <= 5:
        return "SINGLE_SPECIALTY"
    if beds <= 200:
        return "MULTI_SPECIALTY"
    return "SUPER_SPECIALTY"


def _build_narrative(
    branch: Any,
    health: str,
    criticals: int,
    concerns: int,
    strengths: int,
    beds: int,
    hospital_type: str,
) -> str:
    """Build a 2-3 sentence AI-style narrative summary."""
    name = branch.name or "This branch"
    htype = hospital_type.replace("_", " ").lower()

    if health == "EXCELLENT":
        return (
            f"{name} is well-configured as a "
            f"{f'{beds}-bed ' if beds > 0 else ''}{htype} facility. "
            f"{strengths} configuration strengths identified. "
            f"Ready for next setup phases."
        )

    if health == "CRITICAL":
        extra = (
            f"Additionally, {concerns} concern(s) should be reviewed. "
            if concerns > 0
            else ""
        )
        return (
            f"{name} has {criticals} critical issue(s) that need "
            f"immediate attention before the facility can operate. "
            f"{extra}"
            f"Focus on resolving critical items first -- they represent "
            f"regulatory or patient safety gaps."
        )

    if health == "NEEDS_ATTENTION":
        strength_note = (
            f"{strengths} aspect(s) are already well-configured."
            if strengths > 0
            else ""
        )
        return (
            f"{name} has a solid foundation but {concerns} area(s) need attention. "
            f"These aren't blockers, but addressing them will improve operational "
            f"readiness and compliance posture. {strength_note}"
        )

    # GOOD
    concern_note = (
        f"{concerns} minor concern(s) to review. " if concerns > 0 else ""
    )
    strength_note = (
        f"{strengths} configuration strength(s) identified."
        if strengths > 0
        else ""
    )
    return (
        f"{name} is in good shape as a "
        f"{f'{beds}-bed ' if beds > 0 else ''}{htype} facility. "
        f"{concern_note}{strength_note}"
    )


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

def review_branch_config(ctx: BranchContext) -> ReviewResult:
    """
    Perform a holistic, heuristic review of the branch configuration.

    Returns scored insights across categories: CRITICAL, CONCERN,
    INSIGHT, and STRENGTH -- plus a narrative summary.
    """
    insights: list[ReviewInsight] = []
    branch = ctx.branch
    location = ctx.location
    units = ctx.units
    departments = ctx.departments

    # Infer hospital type from bed count + existing config
    hospital_type = _infer_type(branch, units, departments)
    bed_distribution = _HOSPITAL_PROFILES.get("bedDistribution", {})
    profile = bed_distribution.get(hospital_type)
    # staffProfile loaded but currently used for future expansions
    # staff_profile = _HOSPITAL_PROFILES.get("staffingMinimums", {}).get(hospital_type)

    # ===================================================================
    # BRANCH PROFILE REVIEW
    # ===================================================================

    # Statutory completeness
    statutory_fields = [
        {"field": "gstNumber", "label": "GSTIN", "regulatory": True},
        {"field": "panNumber", "label": "PAN", "regulatory": True},
        {"field": "clinicalEstRegNumber", "label": "Clinical Establishment Registration", "regulatory": True},
        {"field": "legalEntityName", "label": "Legal Entity Name", "regulatory": False},
    ]
    missing_statutory = [
        f for f in statutory_fields
        if not getattr(branch, f["field"], None)
    ]
    missing_regulatory = [f for f in missing_statutory if f["regulatory"]]

    if missing_regulatory:
        labels = [f["label"] for f in missing_regulatory]
        gst_note = ""
        if any(f["field"] == "gstNumber" for f in missing_regulatory):
            gst_note = (
                "Note: Most clinical services are GST-exempt "
                "(Notification 12/2017), but you still need a GSTIN."
            )
        insights.append(ReviewInsight(
            id="BR-STAT-001",
            category="CRITICAL",
            area="Branch Profile",
            title=f"Missing regulatory identifiers: {', '.join(labels)}",
            reasoning=(
                f"Indian healthcare facilities are required to have "
                f"{' and '.join(labels)} "
                f"for tax compliance, government reporting, and NABH accreditation. "
                f"Without these, billing and statutory reporting cannot function correctly."
            ),
            recommendation=(
                f"Enter these in Branch Profile -> Statutory section. {gst_note}"
            ),
        ))

    if not missing_statutory:
        insights.append(ReviewInsight(
            id="BR-STAT-OK",
            category="STRENGTH",
            area="Branch Profile",
            title="All statutory identifiers are set",
            reasoning=(
                "GSTIN, PAN, and Clinical Establishment Registration are all present. "
                "This branch is ready for regulatory reporting."
            ),
        ))

    # Bed count vs actual beds
    actual_beds = sum(u.resources.beds for u in units.units)
    if branch.bedCount and actual_beds > 0 and abs(actual_beds - branch.bedCount) > 5:
        diff = actual_beds - branch.bedCount
        if diff > 0:
            rec = (
                f"Either update declared bed count to {actual_beds}, "
                f"or deactivate {diff} excess bed resources."
            )
        else:
            rec = (
                f"Either add {abs(diff)} more bed resources, "
                f"or update declared bed count to {actual_beds}."
            )
        insights.append(ReviewInsight(
            id="BR-BEDS-001",
            category="CONCERN",
            area="Branch Profile",
            title=(
                f"Declared bed count ({branch.bedCount}) doesn't match "
                f"actual beds ({actual_beds})"
            ),
            reasoning=(
                f"The branch profile declares {branch.bedCount} beds, but you've "
                f"configured {actual_beds} bed resources across units. "
                f"A {'surplus' if diff > 0 else 'deficit'} of {abs(diff)} beds "
                f"can cause issues with: licensing (Clinical Establishment Act caps), "
                f"NABH audit, and occupancy reporting."
            ),
            recommendation=rec,
            metric=ReviewMetric(
                current=actual_beds, benchmark=branch.bedCount, unit="beds",
            ),
        ))

    # Working hours
    if not branch.workingHours:
        htype = hospital_type.replace("_", " ").lower()
        insights.append(ReviewInsight(
            id="BR-HOURS-001",
            category="CONCERN",
            area="Branch Profile",
            title="Working hours not configured",
            reasoning=(
                "Working hours drive appointment scheduling, OPD slot generation, "
                "staff duty allocation, and billing cutoff times. "
                "Without this, these modules won't have default boundaries."
            ),
            recommendation=(
                f"Set working hours in Branch Profile. For a {htype}, "
                f"typical OPD hours are 8 AM - 8 PM."
            ),
        ))

    # Emergency for large hospitals
    if (branch.bedCount or 0) >= 50 and not branch.emergency24x7:
        insights.append(ReviewInsight(
            id="BR-ER-001",
            category="CONCERN",
            area="Branch Profile",
            title="24/7 emergency not enabled for a hospital with 50+ beds",
            reasoning=(
                f"Hospitals with {branch.bedCount} beds are expected to have 24/7 "
                f"emergency services by state CEA regulations and NABH Entry Level Standards. "
                f"This also affects ambulance routing and government health portal listings."
            ),
            recommendation=(
                "Enable emergency24x7 in Branch Profile if you have an ER, "
                "or document an exemption reason."
            ),
        ))

    # ===================================================================
    # LOCATION REVIEW
    # ===================================================================

    if location.totalNodes == 0:
        insights.append(ReviewInsight(
            id="LOC-001",
            category="CONCERN",
            area="Location",
            title="No location hierarchy set up",
            reasoning=(
                "The location tree (Campus -> Building -> Floor -> Zone) drives wayfinding, "
                "fire safety zone mapping, equipment placement tracking, and accessibility "
                "compliance. Units and rooms exist without physical placement."
            ),
            recommendation=(
                "Create at least a Campus -> Building -> Floor structure. "
                "Map existing units to floor/zone nodes."
            ),
        ))
    else:
        # Good location setup
        by_kind = location.byKind
        if by_kind.get("CAMPUS") and by_kind.get("BUILDING") and by_kind.get("FLOOR"):
            level_count = len(by_kind)
            insights.append(ReviewInsight(
                id="LOC-OK",
                category="STRENGTH",
                area="Location",
                title=(
                    f"Location hierarchy well-structured: "
                    f"{location.totalNodes} nodes across {level_count} levels"
                ),
                reasoning=(
                    "You have a proper Campus -> Building -> Floor hierarchy. "
                    "This enables wayfinding, equipment tracking, and fire safety zone mapping."
                ),
            ))

        # Fire safety
        if not location.hasFireZones and (branch.bedCount or 0) >= 30:
            insights.append(ReviewInsight(
                id="LOC-FIRE-001",
                category="CONCERN",
                area="Location",
                title="No fire zones mapped in location tree",
                reasoning=(
                    "Fire zone mapping on Building/Floor nodes is required for "
                    "NABH Chapter 5 (Facility Management & Safety). "
                    "Hospital fire safety audits require zone-wise evacuation plans."
                ),
                recommendation=(
                    "Assign fire zone designations to each Building and Floor node."
                ),
            ))

        if not location.hasEmergencyExits:
            cat = "CONCERN" if location.totalNodes > 3 else "INSIGHT"
            insights.append(ReviewInsight(
                id="LOC-EXIT-001",
                category=cat,  # type: ignore[arg-type]
                area="Location",
                title="No emergency exits marked",
                reasoning=(
                    "Emergency exit marking in the location tree supports evacuation "
                    "planning and is checked during NABH facility audits."
                ),
                recommendation=(
                    "Mark at least one emergency exit per floor in the location tree."
                ),
            ))

        if not location.hasWheelchairAccess and (branch.bedCount or 0) >= 30:
            insights.append(ReviewInsight(
                id="LOC-ACCESS-001",
                category="INSIGHT",
                area="Location",
                title="No wheelchair access points marked",
                reasoning=(
                    "Rights of Persons with Disabilities Act (RPwD) 2016 requires "
                    "healthcare facilities to be accessible. Marking wheelchair-accessible "
                    "nodes helps with patient routing."
                ),
                recommendation=(
                    "Mark wheelchair-accessible entrances, elevators, and ramps "
                    "in the location tree."
                ),
            ))

    # ===================================================================
    # UNIT & BED DISTRIBUTION REVIEW
    # ===================================================================

    if units.activeUnits == 0:
        insights.append(ReviewInsight(
            id="UNIT-001",
            category="CRITICAL",
            area="Units",
            title="No active units configured",
            reasoning=(
                "Without units, there's no place to admit patients, run "
                "consultations, or allocate resources. This branch is not operational."
            ),
            recommendation=(
                "Start by creating your core units: at minimum, one OPD "
                "and one ward/IPD unit."
            ),
        ))
    elif profile and actual_beds > 0:
        # Bed distribution analysis
        icu_beds = _count_beds_by_unit_type(units.units, ["ICU", "HDU", "CCU"])
        expected_icu_pct: float = profile.get("icuPct", 0)
        actual_icu_pct = icu_beds / actual_beds if actual_beds > 0 else 0

        if expected_icu_pct > 0 and icu_beds == 0:
            expected_count = max(4, round(actual_beds * expected_icu_pct))
            insights.append(ReviewInsight(
                id="UNIT-ICU-001",
                category="CRITICAL",
                area="Bed Distribution",
                title=f"No ICU beds configured for a {actual_beds}-bed hospital",
                reasoning=(
                    f"{round(expected_icu_pct * 100)}% of beds "
                    f"(~{round(actual_beds * expected_icu_pct)} beds) should be ICU "
                    f"for a {hospital_type.replace('_', ' ').lower()} hospital. "
                    f"NABH requires ICU for hospitals with >50 beds. "
                    f"Without ICU, critical patients must be transferred out, "
                    f"creating liability and revenue loss."
                ),
                recommendation=(
                    f"Create an ICU unit with at least {expected_count} beds. "
                    f"Each bed needs: multi-para monitor, oxygen, suction, "
                    f"and 1:1-1:2 nurse ratio."
                ),
                metric=ReviewMetric(
                    current=0,
                    benchmark=f"{round(expected_icu_pct * 100)}%",
                    unit="ICU beds",
                ),
            ))
        elif icu_beds > 0 and actual_icu_pct < expected_icu_pct * 0.5:
            insights.append(ReviewInsight(
                id="UNIT-ICU-002",
                category="CONCERN",
                area="Bed Distribution",
                title=(
                    f"ICU capacity ({icu_beds} beds, "
                    f"{round(actual_icu_pct * 100, 1)}%) is below benchmark "
                    f"({round(expected_icu_pct * 100)}%)"
                ),
                reasoning=(
                    f"For {actual_beds} total beds, industry benchmarks suggest "
                    f"{round(actual_beds * expected_icu_pct)} ICU beds. "
                    f"Your {icu_beds} beds may be insufficient during peak demand, "
                    f"leading to denied admissions or unsafe boarder patients."
                ),
                metric=ReviewMetric(
                    current=f"{round(actual_icu_pct * 100, 1)}%",
                    benchmark=f"{round(expected_icu_pct * 100)}%",
                    unit="ICU ratio",
                ),
            ))

        # ER check
        er_beds = _count_beds_by_unit_type(units.units, ["ER", "EMERGENCY"])
        emergency_flat: int = profile.get("emergencyFlat", 0)
        if emergency_flat > 0 and er_beds == 0:
            er_extra = ""
            if branch.emergency24x7:
                er_extra = (
                    "You've declared 24/7 emergency services but "
                    "have no ER beds configured."
                )
            insights.append(ReviewInsight(
                id="UNIT-ER-001",
                category="CONCERN",
                area="Bed Distribution",
                title="No emergency beds configured",
                reasoning=(
                    f"A {hospital_type.replace('_', ' ').lower()} hospital typically has "
                    f"{emergency_flat}+ ER beds. {er_extra}"
                ),
                recommendation=(
                    f"Create an ER unit with {emergency_flat} beds including "
                    f"triage and resuscitation areas."
                ),
            ))

        # OPD rooms check
        opd_rooms = sum(
            len(u.rooms)
            for u in units.units
            if u.typeCode == "OPD" and u.isActive
        )
        opd_per_bed_ratio: float = profile.get("opdPerBedRatio", 0.1)
        expected_opd_rooms = max(1, round(actual_beds * opd_per_bed_ratio))

        if opd_rooms == 0 and actual_beds > 0:
            insights.append(ReviewInsight(
                id="UNIT-OPD-001",
                category="CONCERN",
                area="Units",
                title="No OPD consultation rooms",
                reasoning=(
                    "Every hospital needs outpatient consultation rooms. "
                    "OPD is typically the first patient touchpoint and primary "
                    "revenue driver."
                ),
                recommendation=(
                    f"Create an OPD unit with {expected_opd_rooms} consultation rooms."
                ),
            ))
        elif opd_rooms > 0 and departments.total > 0:
            rooms_per_dept = opd_rooms / departments.total
            if rooms_per_dept > 5:
                insights.append(ReviewInsight(
                    id="UNIT-OPD-002",
                    category="INSIGHT",
                    area="Units",
                    title=(
                        f"High OPD room density: {opd_rooms} rooms for "
                        f"{departments.total} departments "
                        f"({rooms_per_dept:.1f} per dept)"
                    ),
                    reasoning=(
                        f"Typical ratio is 2-3 consultation rooms per department. "
                        f"{rooms_per_dept:.1f} rooms/dept suggests either "
                        f"high patient volume (good) or rooms that may be "
                        f"underutilized. Verify against your daily OPD footfall."
                    ),
                    metric=ReviewMetric(
                        current=f"{rooms_per_dept:.1f}",
                        benchmark="2-3",
                        unit="rooms/department",
                    ),
                ))

    # ===================================================================
    # ROOM AMENITY REVIEW (ICU-specific)
    # ===================================================================

    icu_type_codes = ["ICU", "HDU", "CCU", "NICU", "PICU"]
    icu_units = [
        u for u in units.units
        if u.typeCode in icu_type_codes and u.isActive
    ]

    for icu in icu_units:
        total_icu_rooms = len(icu.rooms)
        if total_icu_rooms == 0:
            continue

        with_oxygen = sum(1 for r in icu.rooms if r.hasOxygen)
        with_suction = sum(1 for r in icu.rooms if r.hasSuction)

        if with_oxygen < total_icu_rooms:
            missing = total_icu_rooms - with_oxygen
            insights.append(ReviewInsight(
                id=f"ROOM-O2-{icu.id}",
                category="CRITICAL",
                area="Room Amenities",
                title=(
                    f"{icu.name}: {missing}/{total_icu_rooms} rooms without oxygen"
                ),
                reasoning=(
                    f"NABH mandates 100% oxygen availability in ICU/HDU areas. "
                    f"{missing} rooms in {icu.name} lack oxygen. "
                    f"This is a patient safety issue and NABH blocker."
                ),
                recommendation=f"Enable oxygen flag on all rooms in {icu.name}.",
                metric=ReviewMetric(
                    current=with_oxygen,
                    benchmark=total_icu_rooms,
                    unit="rooms with O2",
                ),
            ))

        if with_suction < total_icu_rooms:
            missing = total_icu_rooms - with_suction
            cat = "CRITICAL" if with_suction == 0 else "CONCERN"
            insights.append(ReviewInsight(
                id=f"ROOM-SUCT-{icu.id}",
                category=cat,  # type: ignore[arg-type]
                area="Room Amenities",
                title=(
                    f"{icu.name}: {missing}/{total_icu_rooms} rooms without suction"
                ),
                reasoning=(
                    f"Suction is essential in ICU for airway management. "
                    f"{missing} rooms in {icu.name} lack suction facilities."
                ),
                metric=ReviewMetric(
                    current=with_suction,
                    benchmark=total_icu_rooms,
                    unit="rooms with suction",
                ),
            ))

    # ===================================================================
    # DEPARTMENT REVIEW
    # ===================================================================

    if departments.total > 0 and departments.withHead < departments.total:
        pct_with_head = round((departments.withHead / departments.total) * 100)
        cat = "CONCERN" if pct_with_head < 50 else "INSIGHT"
        no_head_names = [
            d.name for d in departments.departments if not d.hasHead
        ]
        insights.append(ReviewInsight(
            id="DEPT-HEAD-001",
            category=cat,  # type: ignore[arg-type]
            area="Departments",
            title=(
                f"{departments.total - departments.withHead}/"
                f"{departments.total} departments without a head"
            ),
            reasoning=(
                f"NABH expects each department to have a designated head for clinical "
                f"governance. Currently {pct_with_head}% of departments have heads "
                f"assigned. Departments without heads: {', '.join(no_head_names)}."
            ),
            recommendation="Assign department heads in Department settings.",
            metric=ReviewMetric(
                current=f"{pct_with_head}%",
                benchmark="100%",
                unit="departments with head",
            ),
        ))

    if departments.total > 0 and departments.withHead == departments.total:
        insights.append(ReviewInsight(
            id="DEPT-HEAD-OK",
            category="STRENGTH",
            area="Departments",
            title="All departments have designated heads",
            reasoning=(
                "Full department head coverage supports clinical governance "
                "and NABH compliance."
            ),
        ))

    # Units not linked to departments
    units_no_dept = [u for u in units.units if u.isActive and not u.departmentId]
    if units_no_dept and departments.total > 0:
        sample = [u.name for u in units_no_dept[:5]]
        extra = "..." if len(units_no_dept) > 5 else ""
        insights.append(ReviewInsight(
            id="UNIT-DEPT-001",
            category="INSIGHT",
            area="Units",
            title=f"{len(units_no_dept)} unit(s) not linked to any department",
            reasoning=(
                "Units linked to departments enable department-wise reporting, "
                "cost allocation, and clinical governance."
            ),
            recommendation=(
                f"Link units to departments: {', '.join(sample)}{extra}."
            ),
        ))

    # ===================================================================
    # SCORING
    # ===================================================================

    criticals = [i for i in insights if i.category == "CRITICAL"]
    concerns = [i for i in insights if i.category == "CONCERN"]
    strengths = [i for i in insights if i.category == "STRENGTH"]

    health_score = 100
    health_score -= len(criticals) * 15
    health_score -= len(concerns) * 5
    health_score += len(strengths) * 2  # small bonus
    health_score = max(0, min(100, health_score))

    if len(criticals) > 0:
        overall_health = "CRITICAL"
    elif health_score < 60:
        overall_health = "NEEDS_ATTENTION"
    elif health_score < 80:
        overall_health = "GOOD"
    else:
        overall_health = "EXCELLENT"

    # --- Narrative Summary ---
    narrative_summary = _build_narrative(
        branch,
        overall_health,
        len(criticals),
        len(concerns),
        len(strengths),
        actual_beds,
        hospital_type,
    )

    return ReviewResult(
        overallHealth=overall_health,  # type: ignore[arg-type]
        healthScore=health_score,
        insights=insights,
        criticalCount=len(criticals),
        concernCount=len(concerns),
        strengthCount=len(strengths),
        narrativeSummary=narrative_summary,
    )
