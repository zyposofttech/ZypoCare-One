"""
Naming Convention Enforcer Engine  (v2 -- Physical Infrastructure)

Scope: Department . Unit . UnitRoom . UnitResource . LocationNode codes/names

Checks:
  - UPPERCASE_SNAKE codes (departments, units)
  - Title Case names
  - Duplicate codes within scope
  - Missing codes
  - Location revision code consistency among siblings

Ported from: services/core-api/.../engines/naming-enforcer.engine.ts
"""

from __future__ import annotations

import re
from collections import defaultdict

from src.collectors.models import BranchContext
from src.engines.models import NamingCheckResult, NamingIssue

# ---------------------------------------------------------------------------
# Patterns
# ---------------------------------------------------------------------------

CODE_PATTERN = re.compile(r"^[A-Z][A-Z0-9_]*$")


def _to_canonical_code(value: str) -> str:
    """Convert an arbitrary string to UPPER_SNAKE form."""
    result = value.strip().upper()
    result = re.sub(r"[\s\-]+", "_", result)
    result = re.sub(r"[^A-Z0-9_]", "", result)
    result = re.sub(r"_{2,}", "_", result)
    result = re.sub(r"^_|_$", "", result)
    return result


def _to_title_case(value: str) -> str:
    """Normalize to Title Case (capitalize first letter of each word)."""
    collapsed = re.sub(r"\s+", " ", value.strip())
    return re.sub(r"\b\w", lambda m: m.group(0).upper(), collapsed)


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

def run_naming_check(ctx: BranchContext) -> NamingCheckResult:
    """
    Run naming convention checks against a fully-collected BranchContext.
    Returns issues found and a score (0-100).
    """
    issues: list[NamingIssue] = []
    total_entities = 0

    # ------------------------------------------------------------------
    # 1. Departments
    # ------------------------------------------------------------------
    departments = [
        d for d in ctx.departments.departments
    ]
    total_entities += len(departments)

    dept_codes: dict[str, list[str]] = defaultdict(list)

    for dept in departments:
        # Code format
        if dept.code and not CODE_PATTERN.match(dept.code):
            issues.append(NamingIssue(
                entityType="DEPARTMENT",
                entityId=dept.id,
                field="code",
                currentValue=dept.code,
                suggestedValue=_to_canonical_code(dept.code),
                issueType="FORMAT",
                severity="INFO",
                description=(
                    f'Department code "{dept.code}" should be '
                    f"UPPERCASE_SNAKE (e.g., GENERAL_MEDICINE)."
                ),
            ))

        if not dept.code:
            issues.append(NamingIssue(
                entityType="DEPARTMENT",
                entityId=dept.id,
                field="code",
                currentValue="(empty)",
                suggestedValue=_to_canonical_code(dept.name or "DEPT"),
                issueType="MISSING",
                severity="WARNING",
                description=f'Department "{dept.name}" has no code.',
            ))

        # Duplicate tracking
        norm = (dept.code or "").upper()
        if norm:
            dept_codes[norm].append(dept.id)

        # Name: starts with lowercase?
        if dept.name and re.match(r"^[a-z]", dept.name):
            issues.append(NamingIssue(
                entityType="DEPARTMENT",
                entityId=dept.id,
                field="name",
                currentValue=dept.name,
                suggestedValue=_to_title_case(dept.name),
                issueType="INCONSISTENT",
                severity="INFO",
                description=f'Department name "{dept.name}" should use Title Case.',
            ))

    for code, ids in dept_codes.items():
        if len(ids) > 1:
            for entity_id in ids:
                issues.append(NamingIssue(
                    entityType="DEPARTMENT",
                    entityId=entity_id,
                    field="code",
                    currentValue=code,
                    suggestedValue=f"{code}_{ids.index(entity_id) + 1}",
                    issueType="DUPLICATE",
                    severity="WARNING",
                    description=(
                        f'Duplicate department code "{code}" shared '
                        f"by {len(ids)} departments."
                    ),
                ))

    # ------------------------------------------------------------------
    # 2. Units
    # ------------------------------------------------------------------
    units = ctx.units.units
    total_entities += len(units)

    unit_codes: dict[str, list[str]] = defaultdict(list)

    for unit in units:
        if unit.code and not CODE_PATTERN.match(unit.code):
            issues.append(NamingIssue(
                entityType="UNIT",
                entityId=unit.id,
                field="code",
                currentValue=unit.code,
                suggestedValue=_to_canonical_code(unit.code),
                issueType="FORMAT",
                severity="INFO",
                description=f'Unit code "{unit.code}" should be UPPERCASE_SNAKE.',
            ))

        if not unit.code:
            issues.append(NamingIssue(
                entityType="UNIT",
                entityId=unit.id,
                field="code",
                currentValue="(empty)",
                suggestedValue=_to_canonical_code(unit.name or "UNIT"),
                issueType="MISSING",
                severity="WARNING",
                description=f'Unit "{unit.name}" has no code.',
            ))

        norm = (unit.code or "").upper()
        if norm:
            unit_codes[norm].append(unit.id)

    for code, ids in unit_codes.items():
        if len(ids) > 1:
            issues.append(NamingIssue(
                entityType="UNIT",
                entityId=ids[0],
                field="code",
                currentValue=code,
                suggestedValue=code,
                issueType="DUPLICATE",
                severity="WARNING",
                description=f'Duplicate unit code "{code}" ({len(ids)} units).',
            ))

    # ------------------------------------------------------------------
    # 3. Rooms  (first 500 from context)
    # ------------------------------------------------------------------
    rooms: list[tuple[str, str | None, str | None, str]] = []  # (id, code, name, unitId)
    for unit in ctx.units.units:
        for room in unit.rooms[:500]:
            rooms.append((room.id, room.code if room.code else None, room.name if room.name else None, unit.id))
        if len(rooms) >= 500:
            rooms = rooms[:500]
            break
    total_entities += len(rooms)

    # Check for spaces in room codes
    for room_id, room_code, room_name, unit_id in rooms:
        if room_code and re.search(r"\s", room_code):
            issues.append(NamingIssue(
                entityType="UNIT_ROOM",
                entityId=room_id,
                field="code",
                currentValue=room_code,
                suggestedValue=_to_canonical_code(room_code),
                issueType="FORMAT",
                severity="INFO",
                description=f'Room code "{room_code}" contains spaces.',
            ))

        if not room_code:
            issues.append(NamingIssue(
                entityType="UNIT_ROOM",
                entityId=room_id,
                field="code",
                currentValue="(empty)",
                suggestedValue=_to_canonical_code(room_name or "ROOM"),
                issueType="MISSING",
                severity="WARNING",
                description=f'Room "{room_name}" has no code.',
            ))

    # Duplicate room codes within same unit
    rooms_by_unit: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for room_id, room_code, room_name, unit_id in rooms:
        if not room_code:
            continue
        norm = room_code.upper()
        rooms_by_unit[unit_id][norm] += 1

    for _unit_id, code_map in rooms_by_unit.items():
        for code, count in code_map.items():
            if count > 1:
                issues.append(NamingIssue(
                    entityType="UNIT_ROOM",
                    entityId="",
                    field="code",
                    currentValue=code,
                    suggestedValue=code,
                    issueType="DUPLICATE",
                    severity="WARNING",
                    description=(
                        f'Duplicate room code "{code}" ({count} rooms) '
                        f"within the same unit."
                    ),
                ))

    # ------------------------------------------------------------------
    # 4. Resources  (first 500 from context -- gathered from unit resources)
    # ------------------------------------------------------------------
    resources: list[tuple[str, str | None, str | None, str]] = []  # (id, code, name, unitId)
    for unit in ctx.units.units:
        # Resources are summarized in context; we only have byType/byState
        # counts -- not individual resource rows with codes. The TS version
        # queries Prisma directly. In the Python port we work with whatever
        # the BranchContext provides. Because ResourceSummary does not carry
        # individual resource codes, we skip per-resource naming checks if
        # the context lacks them.
        pass
    # NOTE: The TypeScript engine queries prisma.unitResource directly to
    # get individual resource {id, code, name}. In Python the BranchContext
    # ResourceSummary only has aggregated counts (total, beds, byType, byState).
    # When individual resource data becomes available in BranchContext, this
    # section should be uncommented and populated.
    total_entities += len(resources)

    # ------------------------------------------------------------------
    # 5. Location revision codes
    # ------------------------------------------------------------------
    # Walk the location tree and extract revision data
    loc_revisions: list[tuple[str, str, str | None, str | None]] = []  # (id, nodeId, code, name)

    def _collect_location_nodes(
        nodes: list,
        collected: list[tuple[str, str, str | None, str | None]],
    ) -> None:
        for node in nodes:
            # Each node in the tree IS a revision snapshot
            collected.append((node.id, node.id, node.code, node.name))
            if node.children:
                _collect_location_nodes(node.children, collected)

    _collect_location_nodes(ctx.location.tree, loc_revisions)
    loc_revisions = loc_revisions[:300]
    total_entities += len(loc_revisions)

    for rev_id, node_id, rev_code, rev_name in loc_revisions:
        if rev_code and not CODE_PATTERN.match(rev_code) and re.search(r"\s", rev_code):
            issues.append(NamingIssue(
                entityType="LOCATION_NODE_REVISION",
                entityId=rev_id,
                field="code",
                currentValue=rev_code,
                suggestedValue=_to_canonical_code(rev_code),
                issueType="FORMAT",
                severity="INFO",
                description=(
                    f'Location code "{rev_code}" contains spaces '
                    f"-- use underscores."
                ),
            ))

        if not rev_code:
            issues.append(NamingIssue(
                entityType="LOCATION_NODE_REVISION",
                entityId=rev_id,
                field="code",
                currentValue="(empty)",
                suggestedValue=_to_canonical_code(rev_name or "LOC"),
                issueType="MISSING",
                severity="WARNING",
                description=f"Location revision for node {node_id} has no code.",
            ))

    # ------------------------------------------------------------------
    # Score
    # ------------------------------------------------------------------
    if total_entities > 0:
        score = round(((total_entities - len(issues)) / total_entities) * 100)
    else:
        score = 100

    score = max(0, min(100, score))

    return NamingCheckResult(
        totalEntities=total_entities,
        issues=issues,
        issueCount=len(issues),
        score=score,
    )
