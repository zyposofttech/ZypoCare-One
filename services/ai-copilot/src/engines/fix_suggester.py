"""
Fix Suggestion Engine  (v2 -- Physical Infrastructure)

Generates actionable fix suggestions from consistency check results.
Each suggestion includes a navigation route and clear instructions.

Scoped to: Branch . Location . Department . Unit . Room . Resource

Ported from: services/core-api/.../engines/fix-suggester.engine.ts
"""

from __future__ import annotations

from typing import Callable

from src.engines.models import (
    ConsistencyResult,
    FixSuggestion,
    FixSuggestionsResult,
)

# ---------------------------------------------------------------------------
# Route templates
# ---------------------------------------------------------------------------

_RouteEntry = dict  # {"route": str, "action": str}
_RouteGen = Callable[[str | None], _RouteEntry]


def _branch_route(_id: str | None = None) -> _RouteEntry:
    return {
        "route": "/infra/branch/profile",
        "action": "Update the branch profile with the missing information.",
    }


def _location_node_route(entity_id: str | None = None) -> _RouteEntry:
    return {
        "route": f"/infra/locations/{entity_id or ''}",
        "action": (
            "Edit this location node to add missing attributes "
            "(fire zone, accessibility, revision)."
        ),
    }


def _location_tree_route(_id: str | None = None) -> _RouteEntry:
    return {
        "route": "/infra/locations",
        "action": "Review the location tree and fix structural issues.",
    }


def _department_route(entity_id: str | None = None) -> _RouteEntry:
    return {
        "route": f"/infra/departments/{entity_id or ''}",
        "action": "Update this department's configuration.",
    }


def _branch_unit_type_route(_id: str | None = None) -> _RouteEntry:
    return {
        "route": "/infra/unit-types",
        "action": (
            "Review enabled unit types and create units for each, "
            "or disable unused types."
        ),
    }


def _unit_route(entity_id: str | None = None) -> _RouteEntry:
    return {
        "route": f"/infra/units/{entity_id or ''}",
        "action": (
            "Edit this unit to add missing rooms, resources, "
            "or location binding."
        ),
    }


def _unit_room_route(entity_id: str | None = None) -> _RouteEntry:
    return {
        "route": f"/infra/rooms/{entity_id or ''}",
        "action": (
            "Update this room's attributes "
            "(oxygen, suction, pricing tier, room type)."
        ),
    }


def _unit_resource_route(entity_id: str | None = None) -> _RouteEntry:
    return {
        "route": f"/infra/resources/{entity_id or ''}",
        "action": (
            "Review this resource's state and add missing "
            "reason/documentation."
        ),
    }


ROUTES: dict[str, _RouteGen] = {
    "BRANCH": _branch_route,
    "LOCATION_NODE": _location_node_route,
    "LOCATION_TREE": _location_tree_route,
    "DEPARTMENT": _department_route,
    "BRANCH_UNIT_TYPE": _branch_unit_type_route,
    "UNIT": _unit_route,
    "UNIT_ROOM": _unit_room_route,
    "UNIT_RESOURCE": _unit_resource_route,
}

# ---------------------------------------------------------------------------
# Category -> route key mapping
# ---------------------------------------------------------------------------

_CATEGORY_TO_ROUTE_KEY: dict[str, str] = {
    "BRANCH": "BRANCH",
    "LOCATION": "LOCATION_TREE",
    "DEPARTMENT": "DEPARTMENT",
    "UNIT_TYPE": "BRANCH_UNIT_TYPE",
    "UNIT": "UNIT",
    "ROOM": "UNIT_ROOM",
    "RESOURCE": "UNIT_RESOURCE",
}


def _category_to_route_key(category: str) -> str:
    return _CATEGORY_TO_ROUTE_KEY.get(category, "BRANCH")


# ---------------------------------------------------------------------------
# Severity sort order
# ---------------------------------------------------------------------------

_SEVERITY_ORDER: dict[str, int] = {
    "BLOCKER": 0,
    "WARNING": 1,
    "INFO": 2,
}

# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------


def generate_fix_suggestions(
    consistency: ConsistencyResult,
) -> FixSuggestionsResult:
    """
    Transform consistency-check issues into actionable fix suggestions,
    each enriched with a UI navigation route (where possible).

    Suggestions are sorted by severity: BLOCKER -> WARNING -> INFO.
    """
    suggestions: list[FixSuggestion] = []

    for issue in consistency.issues:
        entity_type = issue.entityType or issue.category
        route_key = issue.entityType or _category_to_route_key(issue.category)
        route_gen = ROUTES.get(route_key)

        navigate_to: str | None = None
        suggested_action = issue.fixHint

        if route_gen is not None:
            resolved = route_gen(issue.entityId)
            navigate_to = resolved["route"]
            suggested_action = f"{issue.fixHint} -> {resolved['action']}"

        suggestions.append(FixSuggestion(
            issueId=issue.id,
            category=issue.category,
            severity=issue.severity,
            title=issue.title,
            suggestedAction=suggested_action,
            actionType="NAVIGATE" if navigate_to else "MANUAL",
            navigateTo=navigate_to,
            entityType=issue.entityType,
            entityId=issue.entityId,
        ))

    # Sort: BLOCKERs first, then WARNINGs, then INFOs
    suggestions.sort(key=lambda s: _SEVERITY_ORDER.get(s.severity, 3))

    navigable = sum(1 for s in suggestions if s.actionType == "NAVIGATE")
    manual = sum(1 for s in suggestions if s.actionType == "MANUAL")
    blocker_fixes = sum(1 for s in suggestions if s.severity == "BLOCKER")
    warning_fixes = sum(1 for s in suggestions if s.severity == "WARNING")

    return FixSuggestionsResult(
        total=len(suggestions),
        suggestions=suggestions,
        navigable=navigable,
        manual=manual,
        blockerFixes=blocker_fixes,
        warningFixes=warning_fixes,
    )
