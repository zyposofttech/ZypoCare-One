"""
NABH Compliance Gap Detector Engine  (v2 -- Physical Infrastructure)

Scope: Branch . Location . Department . UnitType . Unit . Room . Resource

Evaluates NABH 6th Edition checks that map to physical infrastructure.
Other chapters (staff, diagnostics, billing, etc.) will be added when those
modules are completed.

Ported from:
  services/core-api/src/modules/infrastructure/ai/engines/nabh-checker.engine.ts

Key difference from the TypeScript version:
  - TS version runs live Prisma queries against the database.
  - Python version operates against a pre-collected BranchContext snapshot,
    walking in-memory models instead of issuing DB queries.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from src.collectors.models import BranchContext, LocationTreeNode
from src.engines.models import NABHCheckResult, NABHChapterResult, NABHReadinessResult

# ---------------------------------------------------------------------------
# Load NABH checklist at module import time
# ---------------------------------------------------------------------------

_CHECKLIST_PATH = Path(__file__).resolve().parent.parent / "data" / "nabh-checklist.json"

with open(_CHECKLIST_PATH, encoding="utf-8") as _f:
    _NABH_DATA: dict[str, Any] = json.load(_f)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_nabh_checks(ctx: BranchContext) -> NABHReadinessResult:
    """Run all NABH physical-infrastructure checks against a BranchContext."""

    chapters: list[NABHChapterResult] = []
    all_blockers: list[str] = []
    all_warnings: list[str] = []
    total_score = 0
    total_max = 0
    pass_count = 0
    fail_count = 0

    for chapter in _NABH_DATA["chapters"]:
        chapter_results: list[NABHCheckResult] = []
        chapter_score = 0
        chapter_max = 0

        for check in chapter["checks"]:
            weight = (
                3 if check["severity"] == "BLOCKER"
                else 2 if check["severity"] == "WARNING"
                else 1
            )
            chapter_max += weight

            passed = False
            details: str | None = None

            try:
                result = _evaluate_check(ctx, check)
                passed = result["passed"]
                details = result.get("details")
            except Exception as exc:
                passed = False
                details = f"Check evaluation error: {exc}"

            if passed:
                chapter_score += weight
                pass_count += 1
            else:
                fail_count += 1
                if check["severity"] == "BLOCKER":
                    all_blockers.append(f"{check['id']}: {check['description']}")
                elif check["severity"] == "WARNING":
                    all_warnings.append(f"{check['id']}: {check['description']}")

            chapter_results.append(NABHCheckResult(
                id=check["id"],
                description=check["description"],
                status="PASS" if passed else "FAIL",
                severity=check["severity"],
                fixHint=check["fixHint"],
                details=details,
            ))

        total_score += chapter_score
        total_max += chapter_max

        chapters.append(NABHChapterResult(
            chapter=chapter["chapter"],
            name=chapter["name"],
            score=round((chapter_score / chapter_max) * 100) if chapter_max > 0 else 100,
            maxScore=chapter_max,
            checks=chapter_results,
        ))

    return NABHReadinessResult(
        overallScore=round((total_score / total_max) * 100) if total_max > 0 else 0,
        maxScore=total_max,
        chapters=chapters,
        blockers=all_blockers,
        warnings=all_warnings,
        passCount=pass_count,
        failCount=fail_count,
    )


# ---------------------------------------------------------------------------
# Location tree helpers
# ---------------------------------------------------------------------------

def _flatten_tree(nodes: list[LocationTreeNode]) -> list[LocationTreeNode]:
    """Recursively flatten a location tree into a flat list of all nodes."""
    result: list[LocationTreeNode] = []
    for node in nodes:
        result.append(node)
        if node.children:
            result.extend(_flatten_tree(node.children))
    return result


def _count_nodes_by_kind(flat_nodes: list[LocationTreeNode], kind: str) -> int:
    """Count nodes matching a specific kind."""
    return sum(1 for n in flat_nodes if n.kind == kind)


def _find_root_nodes_by_kind(
    flat_nodes: list[LocationTreeNode],
    tree_roots: list[LocationTreeNode],
    kind: str,
) -> int:
    """Count root-level nodes (no parent) of a given kind.

    In the tree model, root nodes are the top-level entries in ``tree``.
    """
    return sum(1 for n in tree_roots if n.kind == kind)


# ---------------------------------------------------------------------------
# Check Evaluator  (match/case on query type)
# ---------------------------------------------------------------------------

def _evaluate_check(
    ctx: BranchContext,
    check: dict[str, Any],
) -> dict[str, Any]:
    """Evaluate a single NABH check against the BranchContext.

    Returns ``{"passed": bool, "details": str | None}``.
    """
    query: str = check["query"]
    params: dict[str, Any] = check.get("params", {})

    branch = ctx.branch
    units = ctx.units
    location = ctx.location
    departments = ctx.departments

    # Pre-compute flat list of all location nodes
    flat_loc = _flatten_tree(location.tree)

    # -- Unit Type existence ------------------------------------------------

    if query == "UNIT_TYPE_EXISTS":
        unit_type_code = params["unitTypeCode"]
        count = sum(
            1 for u in units.units
            if u.isActive and u.typeCode == unit_type_code
        )
        return {
            "passed": count > 0,
            "details": f"Found {count} active {unit_type_code} unit(s)",
        }

    if query == "UNIT_TYPE_EXISTS_IF_EMERGENCY":
        # Only require ER unit if branch is marked as 24x7 emergency
        if not branch.emergency24x7:
            return {
                "passed": True,
                "details": "Branch is not 24\u00d77 emergency \u2014 ER unit not required",
            }
        unit_type_code = params["unitTypeCode"]
        count = sum(
            1 for u in units.units
            if u.isActive and u.typeCode == unit_type_code
        )
        return {
            "passed": count > 0,
            "details": f"Emergency 24\u00d77 branch: found {count} ER unit(s)",
        }

    # -- Room type existence ------------------------------------------------

    if query == "ROOM_TYPE_EXISTS":
        room_type = params["roomType"]
        count = 0
        for u in units.units:
            if not u.isActive:
                continue
            for r in u.rooms:
                if r.isActive and r.roomType == room_type:
                    count += 1
        return {
            "passed": count > 0,
            "details": f"Found {count} {room_type} room(s)",
        }

    if query == "ROOM_TYPE_EXISTS_ANY":
        room_types: list[str] = params["roomTypes"]
        room_type_set = set(room_types)
        count = 0
        for u in units.units:
            if not u.isActive:
                continue
            for r in u.rooms:
                if r.isActive and r.roomType in room_type_set:
                    count += 1
        return {
            "passed": count > 0,
            "details": f"Found {count} room(s) of types: {', '.join(room_types)}",
        }

    if query == "ROOM_TYPE_IN_UNIT_TYPE":
        room_type = params["roomType"]
        unit_type_code = params["unitTypeCode"]
        count = 0
        for u in units.units:
            if not u.isActive or u.typeCode != unit_type_code:
                continue
            for r in u.rooms:
                if r.isActive and r.roomType == room_type:
                    count += 1
        return {
            "passed": count > 0,
            "details": f"Found {count} {room_type} room(s) in {unit_type_code} units",
        }

    if query == "ROOM_TYPE_IN_UNIT_TYPES":
        room_type = params["roomType"]
        unit_type_codes: list[str] = params["unitTypeCodes"]
        utc_set = set(unit_type_codes)
        count = 0
        for u in units.units:
            if not u.isActive or u.typeCode not in utc_set:
                continue
            for r in u.rooms:
                if r.isActive and r.roomType == room_type:
                    count += 1
        return {
            "passed": count > 0,
            "details": (
                f"Found {count} {room_type} room(s) in "
                f"{'/'.join(unit_type_codes)} units"
            ),
        }

    # -- Unit + Resource ----------------------------------------------------

    if query == "UNIT_HAS_RESOURCE":
        resource_type = params["resourceType"]
        unit_type_codes = params["unitTypeCodes"]
        utc_set = set(unit_type_codes)
        min_count = params.get("minCount", 1)
        count = 0
        for u in units.units:
            if not u.isActive or u.typeCode not in utc_set:
                continue
            count += u.resources.byType.get(resource_type, 0)
        return {
            "passed": count >= min_count,
            "details": (
                f"Found {count} {resource_type} resource(s) in "
                f"{'/'.join(unit_type_codes)} units"
            ),
        }

    if query == "BED_COUNT_SYNC":
        # Total beds across all units
        actual = sum(u.resources.beds for u in units.units)
        if branch.bedCount is None:
            return {
                "passed": actual > 0,
                "details": f"Branch.bedCount not set; {actual} BED resource(s) exist",
            }
        match = branch.bedCount == actual
        return {
            "passed": match,
            "details": (
                f"Branch.bedCount = {branch.bedCount}, "
                f"actual BED resources = {actual}"
            ),
        }

    # -- Critical care room amenities ---------------------------------------

    if query == "CRITICAL_CARE_ROOMS_HAVE_AMENITY":
        amenity: str = params["amenity"]
        unit_type_codes = params["unitTypeCodes"]
        utc_set = set(unit_type_codes)
        rooms_in_scope = []
        for u in units.units:
            if not u.isActive or u.typeCode not in utc_set:
                continue
            for r in u.rooms:
                if r.isActive:
                    rooms_in_scope.append(r)
        if len(rooms_in_scope) == 0:
            return {
                "passed": True,
                "details": f"No rooms in {'/'.join(unit_type_codes)} units",
            }
        with_amenity = sum(
            1 for r in rooms_in_scope if getattr(r, amenity, False) is True
        )
        return {
            "passed": with_amenity == len(rooms_in_scope),
            "details": (
                f"{with_amenity}/{len(rooms_in_scope)} critical care rooms "
                f"have {amenity}"
            ),
        }

    # -- Location Tree ------------------------------------------------------

    if query == "LOCATION_ROOT_EXISTS":
        kind = params["kind"]
        count = _find_root_nodes_by_kind(flat_loc, location.tree, kind)
        return {
            "passed": count > 0,
            "details": f"Found {count} root {kind} node(s)",
        }

    if query == "LOCATION_KIND_EXISTS":
        kind = params["kind"]
        count = _count_nodes_by_kind(flat_loc, kind)
        return {
            "passed": count > 0,
            "details": f"Found {count} {kind} node(s)",
        }

    if query == "LOCATION_FIRE_ZONE_COVERAGE":
        kinds: list[str] = params["kinds"]
        kind_set = set(kinds)
        target_nodes = [n for n in flat_loc if n.kind in kind_set]
        if len(target_nodes) == 0:
            return {"passed": False, "details": "No BUILDING/FLOOR nodes found"}
        with_fire = sum(1 for n in target_nodes if n.fireZone is not None)
        pct = round((with_fire / len(target_nodes)) * 100)
        return {
            "passed": with_fire == len(target_nodes),
            "details": (
                f"{with_fire}/{len(target_nodes)} ({pct}%) have fire zone"
            ),
        }

    if query == "LOCATION_HAS_EMERGENCY_EXIT":
        count = sum(1 for n in flat_loc if n.emergencyExit)
        return {
            "passed": count > 0,
            "details": f"{count} emergency exit(s) marked",
        }

    if query == "LOCATION_HAS_WHEELCHAIR_ACCESS":
        count = sum(1 for n in flat_loc if n.wheelchairAccess)
        return {
            "passed": count > 0,
            "details": f"{count} wheelchair-accessible node(s)",
        }

    if query == "LOCATION_HAS_STRETCHER_ACCESS":
        # stretcherAccess may not exist on the model yet; use getattr safely
        count = sum(1 for n in flat_loc if getattr(n, "stretcherAccess", False))
        return {
            "passed": count > 0,
            "details": f"{count} stretcher-accessible node(s)",
        }

    if query == "LOCATION_ALL_HAVE_ACTIVE_REVISION":
        total_nodes = location.totalNodes
        if total_nodes == 0:
            return {"passed": True, "details": "No location nodes"}
        # Nodes without an active revision are tracked by LocationSummary
        nodes_with_rev = total_nodes - location.nodesWithoutRevision
        return {
            "passed": nodes_with_rev == total_nodes,
            "details": f"{nodes_with_rev}/{total_nodes} nodes have active revisions",
        }

    if query == "UNITS_LINKED_TO_LOCATION":
        min_percent = params.get("minPercent", 80)
        total = len([u for u in units.units if u.isActive])
        if total == 0:
            return {"passed": True, "details": "No active units"}
        linked = sum(
            1 for u in units.units
            if u.isActive and u.locationNodeId is not None
        )
        pct = round((linked / total) * 100)
        return {
            "passed": pct >= min_percent,
            "details": f"{linked}/{total} ({pct}%) units linked to location",
        }

    # -- Branch fields ------------------------------------------------------

    if query == "BRANCH_FIELD_SET":
        field = params["field"]
        value = getattr(branch, field, None)
        is_set = value is not None and value != ""
        return {
            "passed": is_set,
            "details": f"{field} is set" if is_set else f"{field} is not set",
        }

    if query == "BRANCH_ADDRESS_COMPLETE":
        has_addr = bool(branch.address)
        has_pin = bool(branch.pinCode)
        has_state = bool(branch.state)
        complete = has_addr and has_pin and has_state
        missing: list[str] = []
        if not has_addr:
            missing.append("address")
        if not has_pin:
            missing.append("pinCode")
        if not has_state:
            missing.append("state")
        return {
            "passed": complete,
            "details": "Address complete" if complete else f"Missing: {', '.join(missing)}",
        }

    # -- Department ---------------------------------------------------------

    if query == "DEPARTMENTS_WITH_HEAD":
        min_percent = params.get("minPercent", 80)
        total = departments.total
        if total == 0:
            return {"passed": True, "details": "No departments"}
        with_head = departments.withHead
        pct = round((with_head / total) * 100)
        return {
            "passed": pct >= min_percent,
            "details": f"{with_head}/{total} ({pct}%) departments have heads",
        }

    if query == "DEPARTMENT_COUNT_MIN":
        min_val = params.get("min", 1)
        count = departments.total
        return {
            "passed": count >= min_val,
            "details": f"{count} active department(s)",
        }

    if query == "INFRA_CONFIG_EXISTS":
        # The BranchContext does not carry infra config status directly.
        # We infer readiness from whether the branch has core fields populated.
        # This is a best-effort heuristic since the Python copilot works
        # off a snapshot rather than querying BranchInfraConfig directly.
        has_config = (
            branch.bedCount is not None
            or branch.workingHours is not None
        )
        return {
            "passed": has_config,
            "details": "Config initialized" if has_config else "BranchInfraConfig not found",
        }

    # -- Fallback -----------------------------------------------------------

    return {"passed": False, "details": f"Unknown check query: {query}"}
