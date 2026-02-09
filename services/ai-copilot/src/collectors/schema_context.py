"""SchemaContextCollector — central data aggregator.

Fetches real branch configuration from the database and returns it in a
structured format that both heuristic engines and LLM prompts can consume.
"""

from __future__ import annotations

import logging

from sqlalchemy import cast, func, select, String as SAString
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db.models import (
    Branch,
    Department,
    DepartmentSpecialty,
    LocationNode,
    LocationNodeRevision,
    Specialty,
    StaffAssignment,
    Unit,
    UnitResource,
    UnitRoom,
    BranchUnitType,
    BranchInfraConfig,
)
from src.db.session import get_session

from .models import (
    BranchContext,
    BranchSnapshot,
    DepartmentDetail,
    DepartmentSummary,
    LocationSummary,
    LocationTreeNode,
    ResourceSummary,
    RoomDetail,
    SpecialtyDetail,
    SpecialtySummary,
    UnitDetail,
    UnitSummary,
)

logger = logging.getLogger("ai-copilot.context")

BED_TYPES = {
    "BED", "GENERAL_BED", "ICU_BED", "NICU_INCUBATOR", "CRIB",
}


async def collect_branch_context(branch_id: str) -> BranchContext:
    """Collect full context for a branch.

    Queries run sequentially on a single session because asyncpg sessions
    are not safe for concurrent use within a single connection.
    """
    async with get_session() as session:
        branch = await _collect_branch(session, branch_id)
        location = await _collect_locations(session, branch_id)
        units = await _collect_units(session, branch_id)
        departments = await _collect_departments(session, branch_id)
        specialties = await _collect_specialties(session, branch_id)

    text_summary = _build_text_summary(branch, location, units, departments)
    return BranchContext(
        branch=branch,
        location=location,
        units=units,
        departments=departments,
        specialties=specialties,
        textSummary=text_summary,
    )


# ── Branch ────────────────────────────────────────────────────────────────


async def _collect_branch(session: AsyncSession, branch_id: str) -> BranchSnapshot:
    result = await session.execute(
        select(Branch).where(Branch.id == branch_id)
    )
    b = result.scalar_one()
    return BranchSnapshot(
        id=b.id,
        code=b.code,
        name=b.name,
        legalEntityName=b.legalEntityName,
        address=b.address,
        city=b.city,
        state=b.state,
        pinCode=b.pinCode,
        gstNumber=b.gstNumber,
        panNumber=b.panNumber,
        clinicalEstRegNumber=b.clinicalEstRegNumber,
        rohiniId=b.rohiniId,
        hfrId=b.hfrId,
        accreditations=b.accreditations,
        bedCount=b.bedCount,
        establishedDate=b.establishedDate,
        defaultCurrency=b.defaultCurrency,
        timezone=b.timezone,
        fiscalYearStartMonth=b.fiscalYearStartMonth,
        workingHours=b.workingHours,
        emergency24x7=b.emergency24x7,
        multiLanguageSupport=b.multiLanguageSupport,
        supportedLanguages=b.supportedLanguages,
        contactPhone1=b.contactPhone1,
        contactEmail=b.contactEmail,
    )


# ── Location Tree ─────────────────────────────────────────────────────────


async def _collect_locations(
    session: AsyncSession, branch_id: str
) -> LocationSummary:
    result = await session.execute(
        select(LocationNode)
        .options(selectinload(LocationNode.revisions))
        .where(LocationNode.branchId == branch_id)
        .order_by(LocationNode.createdAt.asc())
    )
    nodes = result.scalars().all()

    by_kind: dict[str, int] = {}
    node_map: dict[str, LocationTreeNode] = {}
    roots: list[LocationTreeNode] = []
    nodes_without_revision = 0

    for node in nodes:
        by_kind[node.kind] = by_kind.get(node.kind, 0) + 1

        # Get latest active revision
        active_revs = sorted(
            [r for r in node.revisions if r.isActive],
            key=lambda r: r.effectiveFrom,
            reverse=True,
        )
        rev = active_revs[0] if active_revs else None

        if not rev:
            nodes_without_revision += 1

        tree_node = LocationTreeNode(
            id=node.id,
            kind=node.kind,
            code=rev.code if rev else None,
            name=rev.name if rev else None,
            isActive=rev.isActive if rev else False,
            floorNumber=rev.floorNumber if rev else None,
            wheelchairAccess=rev.wheelchairAccess if rev else False,
            emergencyExit=rev.emergencyExit if rev else False,
            fireZone=rev.fireZone if rev else None,
        )
        node_map[node.id] = tree_node

    # Build tree
    for node in nodes:
        tree_node = node_map[node.id]
        if node.parentId and node.parentId in node_map:
            node_map[node.parentId].children.append(tree_node)
        else:
            roots.append(tree_node)

    all_tree_nodes = list(node_map.values())

    return LocationSummary(
        totalNodes=len(nodes),
        byKind=by_kind,
        tree=roots,
        hasFireZones=any(n.fireZone is not None for n in all_tree_nodes),
        hasEmergencyExits=any(n.emergencyExit for n in all_tree_nodes),
        hasWheelchairAccess=any(n.wheelchairAccess for n in all_tree_nodes),
        nodesWithoutRevision=nodes_without_revision,
    )


# ── Units + Rooms + Resources ─────────────────────────────────────────────


async def _collect_units(session: AsyncSession, branch_id: str) -> UnitSummary:
    result = await session.execute(
        select(Unit)
        .options(
            selectinload(Unit.unitType),
            selectinload(Unit.department),
            selectinload(Unit.rooms),
            selectinload(Unit.resources),
        )
        .where(Unit.branchId == branch_id)
        .order_by(Unit.code.asc())
    )
    units = result.scalars().all()

    by_type: dict[str, dict] = {}
    unit_details: list[UnitDetail] = []

    for unit in units:
        type_code = unit.unitType.code if unit.unitType else "UNKNOWN"
        type_name = unit.unitType.name if unit.unitType else type_code

        if type_code not in by_type:
            by_type[type_code] = {"count": 0, "typeName": type_name}
        if unit.isActive:
            by_type[type_code]["count"] += 1

        # Aggregate resources
        resources_by_type: dict[str, int] = {}
        resources_by_state: dict[str, int] = {}
        beds = 0
        schedulable = 0

        for r in unit.resources:
            resources_by_type[r.resourceType] = resources_by_type.get(r.resourceType, 0) + 1
            if r.state:
                resources_by_state[r.state] = resources_by_state.get(r.state, 0) + 1
            if r.resourceType in BED_TYPES and r.isActive:
                beds += 1
            if r.isSchedulable and r.isActive:
                schedulable += 1

        # Active rooms only
        active_rooms = [rm for rm in unit.rooms if rm.isActive]

        unit_details.append(
            UnitDetail(
                id=unit.id,
                code=unit.code,
                name=unit.name,
                typeName=type_name,
                typeCode=type_code,
                isActive=unit.isActive,
                locationNodeId=unit.locationNodeId,
                departmentId=unit.departmentId,
                departmentName=unit.department.name if unit.department else None,
                rooms=[
                    RoomDetail(
                        id=rm.id,
                        code=rm.code,
                        name=rm.name,
                        roomType=rm.roomType,
                        areaSqFt=rm.areaSqFt,
                        maxOccupancy=rm.maxOccupancy,
                        pricingTier=rm.pricingTier,
                        hasAttachedBathroom=rm.hasAttachedBathroom,
                        hasAC=rm.hasAC,
                        hasTV=rm.hasTV,
                        hasOxygen=rm.hasOxygen,
                        hasSuction=rm.hasSuction,
                        isActive=rm.isActive,
                    )
                    for rm in active_rooms
                ],
                resources=ResourceSummary(
                    total=len(unit.resources),
                    beds=beds,
                    schedulable=schedulable,
                    byType=resources_by_type,
                    byState=resources_by_state,
                ),
            )
        )

    return UnitSummary(
        totalUnits=len(units),
        activeUnits=sum(1 for u in units if u.isActive),
        byType=by_type,
        units=unit_details,
    )


# ── Departments ───────────────────────────────────────────────────────────


async def _collect_departments(
    session: AsyncSession, branch_id: str
) -> DepartmentSummary:
    result = await session.execute(
        select(Department).where(
            Department.branchId == branch_id,
            Department.isActive == True,  # noqa: E712
        )
    )
    depts = result.scalars().all()

    # Get staff counts per department
    staff_counts_result = await session.execute(
        select(
            StaffAssignment.departmentId,
            func.count(StaffAssignment.id).label("cnt"),
        )
        .where(
            StaffAssignment.branchId == branch_id,
            cast(StaffAssignment.status, SAString) == "ACTIVE",
        )
        .group_by(StaffAssignment.departmentId)
    )
    staff_map: dict[str, int] = {
        row.departmentId: row.cnt for row in staff_counts_result if row.departmentId
    }

    dept_details = [
        DepartmentDetail(
            id=d.id,
            code=d.code,
            name=d.name,
            hasHead=d.headStaffId is not None,
            staffCount=staff_map.get(d.id, 0),
            facilityType=d.facilityType,
        )
        for d in depts
    ]

    return DepartmentSummary(
        total=len(depts),
        withHead=sum(1 for d in dept_details if d.hasHead),
        withStaff=sum(1 for d in dept_details if d.staffCount > 0),
        departments=dept_details,
    )


# ── Specialties ───────────────────────────────────────────────────────


async def _collect_specialties(session: AsyncSession, branch_id: str) -> SpecialtySummary:
    result = await session.execute(
        select(Specialty).where(Specialty.branchId == branch_id)
    )
    rows = result.scalars().all()

    # Count department links per specialty
    dept_link_result = await session.execute(
        select(
            DepartmentSpecialty.specialtyId,
            func.count(DepartmentSpecialty.id).label("cnt"),
        )
        .join(Specialty, Specialty.id == DepartmentSpecialty.specialtyId)
        .where(Specialty.branchId == branch_id)
        .group_by(DepartmentSpecialty.specialtyId)
    )
    dept_counts: dict[str, int] = {r[0]: r[1] for r in dept_link_result.all()}

    specialties = []
    by_kind: dict[str, int] = {}
    active_count = 0

    for s in rows:
        detail = SpecialtyDetail(
            id=s.id,
            code=s.code,
            name=s.name,
            kind=s.kind,
            isActive=s.isActive,
            departmentCount=dept_counts.get(s.id, 0),
        )
        specialties.append(detail)
        by_kind[s.kind] = by_kind.get(s.kind, 0) + 1
        if s.isActive:
            active_count += 1

    return SpecialtySummary(
        total=len(rows),
        active=active_count,
        byKind=by_kind,
        specialties=specialties,
    )


# ── Text Summary ──────────────────────────────────────────────────────────


def _build_text_summary(
    branch: BranchSnapshot,
    location: LocationSummary,
    units: UnitSummary,
    departments: DepartmentSummary,
) -> str:
    lines: list[str] = []

    # Branch identity
    legal = f" ({branch.legalEntityName})" if branch.legalEntityName else ""
    lines.append(f"Hospital: {branch.name}{legal}")
    loc_parts = [p for p in [branch.city, branch.state] if p]
    if loc_parts:
        lines.append(f"Location: {', '.join(loc_parts)}, India")
    if branch.bedCount:
        lines.append(f"Declared bed count: {branch.bedCount}")
    if branch.emergency24x7:
        lines.append("24x7 emergency services: Yes")
    if branch.timezone:
        lines.append(f"Timezone: {branch.timezone}")

    # Statutory
    statutory = []
    statutory.append("GSTIN ✓" if branch.gstNumber else "GSTIN ✗")
    statutory.append("PAN ✓" if branch.panNumber else "PAN ✗")
    statutory.append("CEA Reg ✓" if branch.clinicalEstRegNumber else "CEA Reg ✗")
    lines.append(f"Statutory: {', '.join(statutory)}")

    # Location
    if location.totalNodes > 0:
        kinds = ", ".join(
            f"{v} {k.lower()}(s)" for k, v in location.byKind.items()
        )
        lines.append(f"Location tree: {location.totalNodes} nodes — {kinds}")
        if location.hasFireZones:
            lines.append("Fire zones: Mapped")
        if location.hasEmergencyExits:
            lines.append("Emergency exits: Marked")
        if location.hasWheelchairAccess:
            lines.append("Wheelchair access: Available")
    else:
        lines.append("Location tree: Not set up")

    # Units
    if units.activeUnits > 0:
        type_breakdown = ", ".join(
            f"{v['count']} {k}"
            for k, v in units.byType.items()
            if v.get("count", 0) > 0
        )
        lines.append(f"Active units: {units.activeUnits} — {type_breakdown}")
        total_beds = sum(u.resources.beds for u in units.units)
        total_rooms = sum(len(u.rooms) for u in units.units)
        lines.append(f"Total rooms: {total_rooms}, Total beds: {total_beds}")
    else:
        lines.append("Units: Not set up")

    # Departments
    if departments.total > 0:
        lines.append(
            f"Departments: {departments.total} "
            f"({departments.withHead} with head, {departments.withStaff} with staff)"
        )
    else:
        lines.append("Departments: Not set up")

    return "\n".join(lines)
