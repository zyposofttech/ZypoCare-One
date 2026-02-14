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
    ChargeMasterItem,
    Claim,
    Department,
    DepartmentSpecialty,
    DocumentChecklist,
    DrugInteraction,
    DrugMaster,
    Formulary,
    FormularyItem,
    GovernmentSchemeConfig,
    InsuranceCase,
    InsurancePolicy,
    InventoryConfig,
    LocationNode,
    LocationNodeRevision,
    PatientPricingTier,
    Payer,
    PayerContract,
    PayerIntegrationConfig,
    PharmacyStore,
    PharmSupplier,
    PreauthRequest,
    ServiceItem,
    ServicePriceHistory,
    Specialty,
    StaffAssignment,
    TariffPlan,
    TaxCode,
    Unit,
    UnitResource,
    UnitRoom,
    BranchUnitType,
    BranchInfraConfig,
)
from src.db.session import get_session

from .models import (
    BillingSummary,
    BranchContext,
    BranchSnapshot,
    DepartmentDetail,
    DepartmentSummary,
    DrugSnapshot,
    LocationSummary,
    LocationTreeNode,
    PharmacySummary,
    PharmStoreSnapshot,
    ResourceSummary,
    RoomDetail,
    ServiceCatalogSummary,
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
        pharmacy = await _collect_pharmacy(session, branch_id)
        service_catalog = await _collect_service_catalog(session, branch_id)
        billing = await _collect_billing(session, branch_id)

    text_summary = _build_text_summary(branch, location, units, departments, pharmacy, service_catalog)
    return BranchContext(
        branch=branch,
        location=location,
        units=units,
        departments=departments,
        specialties=specialties,
        pharmacy=pharmacy,
        serviceCatalog=service_catalog,
        billing=billing,
        textSummary=text_summary,
    )


# ── Branch ────────────────────────────────────────────────────────────────


async def _collect_branch(session: AsyncSession, branch_id: str) -> BranchSnapshot:
    result = await session.execute(
        select(Branch).where(Branch.id == branch_id)
    )
    b = result.scalar_one_or_none()
    if b is None:
        raise ValueError(f"Branch {branch_id} not found")
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


# ── Pharmacy ──────────────────────────────────────────────────────────


async def _collect_pharmacy(
    session: AsyncSession, branch_id: str
) -> PharmacySummary:
    # Stores
    store_result = await session.execute(
        select(PharmacyStore).where(PharmacyStore.branchId == branch_id)
    )
    stores = store_result.scalars().all()

    store_snapshots = [
        PharmStoreSnapshot(
            id=s.id,
            storeCode=s.storeCode,
            storeName=s.storeName,
            storeType=s.storeType,
            status=s.status,
            parentStoreId=s.parentStoreId,
            pharmacistInChargeId=s.pharmacistInChargeId,
            drugLicenseNumber=s.drugLicenseNumber,
            drugLicenseExpiry=s.drugLicenseExpiry,
            is24x7=s.is24x7,
            canDispense=s.canDispense,
        )
        for s in stores
    ]

    # Drugs — cap at 500 for context size
    drug_result = await session.execute(
        select(DrugMaster)
        .where(DrugMaster.branchId == branch_id)
        .order_by(DrugMaster.drugCode.asc())
        .limit(500)
    )
    drugs = drug_result.scalars().all()

    # Total drug count (may be > 500)
    total_drug_result = await session.execute(
        select(func.count(DrugMaster.id)).where(DrugMaster.branchId == branch_id)
    )
    total_drugs = total_drug_result.scalar() or 0

    by_category: dict[str, int] = {}
    by_schedule: dict[str, int] = {}
    narcotic_count = 0
    high_alert_count = 0
    antibiotic_count = 0
    lasa_count = 0
    active_drugs = 0

    drug_snapshots: list[DrugSnapshot] = []
    for d in drugs:
        by_category[d.category] = by_category.get(d.category, 0) + 1
        by_schedule[d.scheduleClass] = by_schedule.get(d.scheduleClass, 0) + 1
        if d.isNarcotic:
            narcotic_count += 1
        if d.isHighAlert:
            high_alert_count += 1
        if d.isAntibiotic:
            antibiotic_count += 1
        if d.isLasa:
            lasa_count += 1
        if str(d.status) == "ACTIVE":
            active_drugs += 1

        drug_snapshots.append(
            DrugSnapshot(
                id=d.id,
                drugCode=d.drugCode,
                genericName=d.genericName,
                brandName=d.brandName,
                category=d.category,
                strength=d.strength,
                route=d.route,
                scheduleClass=d.scheduleClass,
                isNarcotic=d.isNarcotic,
                isControlled=d.isControlled,
                isAntibiotic=d.isAntibiotic,
                isHighAlert=d.isHighAlert,
                isLasa=d.isLasa,
                formularyStatus=d.formularyStatus,
                status=d.status,
            )
        )

    # Formulary
    formulary_result = await session.execute(
        select(Formulary)
        .where(Formulary.branchId == branch_id)
        .order_by(Formulary.version.desc())
        .limit(1)
    )
    formulary = formulary_result.scalar_one_or_none()

    # Interaction count
    interaction_result = await session.execute(
        select(func.count(DrugInteraction.id)).where(
            DrugInteraction.drugAId.in_(
                select(DrugMaster.id).where(DrugMaster.branchId == branch_id)
            )
        )
    )
    interaction_count = interaction_result.scalar() or 0

    # Supplier count
    supplier_result = await session.execute(
        select(func.count(PharmSupplier.id)).where(
            PharmSupplier.branchId == branch_id,
            cast(PharmSupplier.status, SAString) == "ACTIVE",
        )
    )
    supplier_count = supplier_result.scalar() or 0

    # Inventory config count
    inv_result = await session.execute(
        select(func.count(InventoryConfig.id)).where(
            InventoryConfig.pharmacyStoreId.in_(
                select(PharmacyStore.id).where(PharmacyStore.branchId == branch_id)
            )
        )
    )
    inv_config_count = inv_result.scalar() or 0

    return PharmacySummary(
        totalStores=len(stores),
        activeStores=sum(1 for s in stores if str(s.status) == "ACTIVE"),
        stores=store_snapshots,
        totalDrugs=total_drugs,
        activeDrugs=active_drugs,
        drugs=drug_snapshots,
        narcoticCount=narcotic_count,
        highAlertCount=high_alert_count,
        antibioticCount=antibiotic_count,
        lasaCount=lasa_count,
        hasFormulary=formulary is not None,
        formularyVersion=formulary.version if formulary else None,
        formularyStatus=str(formulary.status) if formulary else None,
        interactionCount=interaction_count,
        supplierCount=supplier_count,
        inventoryConfigCount=inv_config_count,
        byCategory=by_category,
        byScheduleClass=by_schedule,
    )


# ── Text Summary ──────────────────────────────────────────────────────────


async def _collect_service_catalog(
    session: AsyncSession, branch_id: str
) -> ServiceCatalogSummary:
    """Collect service catalog & financial config summary for a branch."""
    from collections import Counter

    # Service Items
    si_result = await session.execute(
        select(ServiceItem).where(ServiceItem.branchId == branch_id)
    )
    si_rows = si_result.scalars().all()
    active_si = [r for r in si_rows if r.isActive]
    by_cat: dict[str, int] = dict(Counter(r.category for r in si_rows if r.category))
    with_price = sum(1 for r in si_rows if r.basePrice and r.basePrice > 0)
    without_price = len(si_rows) - with_price

    # Charge Master
    cm_result = await session.execute(
        select(func.count()).select_from(ChargeMasterItem).where(ChargeMasterItem.branchId == branch_id)
    )
    total_cm = cm_result.scalar() or 0
    cm_active_result = await session.execute(
        select(func.count()).select_from(ChargeMasterItem).where(
            ChargeMasterItem.branchId == branch_id, ChargeMasterItem.isActive == True  # noqa: E712
        )
    )
    active_cm = cm_active_result.scalar() or 0

    # Payers
    payer_result = await session.execute(
        select(Payer).where(Payer.branchId == branch_id)
    )
    payer_rows = payer_result.scalars().all()
    active_payers = [p for p in payer_rows if p.isActive]
    by_kind: dict[str, int] = dict(Counter(p.kind for p in payer_rows))
    has_cash = any(p.kind == "CASH" for p in payer_rows)

    # Contracts
    contract_result = await session.execute(
        select(PayerContract).where(PayerContract.branchId == branch_id)
    )
    contract_rows = contract_result.scalars().all()
    active_contracts = [c for c in contract_rows if c.status == "ACTIVE"]
    expired_contracts = [c for c in contract_rows if c.status == "EXPIRED"]

    # Government Schemes
    gs_result = await session.execute(
        select(GovernmentSchemeConfig).where(GovernmentSchemeConfig.branchId == branch_id)
    )
    gs_rows = gs_result.scalars().all()
    active_gs = [g for g in gs_rows if g.isActive]

    # Pricing Tiers
    pt_result = await session.execute(
        select(PatientPricingTier).where(PatientPricingTier.branchId == branch_id)
    )
    pt_rows = pt_result.scalars().all()
    active_pt = [t for t in pt_rows if t.isActive]

    # Tariff Plans
    tp_result = await session.execute(
        select(func.count()).select_from(TariffPlan).where(TariffPlan.branchId == branch_id)
    )
    total_tp = tp_result.scalar() or 0
    tp_active_result = await session.execute(
        select(func.count()).select_from(TariffPlan).where(
            TariffPlan.branchId == branch_id, TariffPlan.isActive == True  # noqa: E712
        )
    )
    active_tp = tp_active_result.scalar() or 0

    # Tax Codes
    tx_result = await session.execute(
        select(func.count()).select_from(TaxCode).where(TaxCode.branchId == branch_id)
    )
    total_tax = tx_result.scalar() or 0

    # Price History count
    ph_result = await session.execute(
        select(func.count()).select_from(ServicePriceHistory).where(
            ServicePriceHistory.branchId == branch_id
        )
    )
    price_changes = ph_result.scalar() or 0

    return ServiceCatalogSummary(
        totalServiceItems=len(si_rows),
        activeServiceItems=len(active_si),
        byCategory=by_cat,
        withBasePrice=with_price,
        withoutBasePrice=without_price,
        totalChargeMaster=total_cm,
        activeChargeMaster=active_cm,
        totalPayers=len(payer_rows),
        activePayers=len(active_payers),
        byPayerKind=by_kind,
        totalContracts=len(contract_rows),
        activeContracts=len(active_contracts),
        expiredContracts=len(expired_contracts),
        totalGovSchemes=len(gs_rows),
        activeGovSchemes=len(active_gs),
        totalPricingTiers=len(pt_rows),
        activePricingTiers=len(active_pt),
        totalTariffPlans=total_tp,
        activeTariffPlans=active_tp,
        totalTaxCodes=total_tax,
        priceChangeCount=price_changes,
        hasCashPayer=has_cash,
    )


# ── Text Summary ──────────────────────────────────────────────────────────


def _build_text_summary(
    branch: BranchSnapshot,
    location: LocationSummary,
    units: UnitSummary,
    departments: DepartmentSummary,
    pharmacy: PharmacySummary | None = None,
    service_catalog: ServiceCatalogSummary | None = None,
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

    # Pharmacy
    if pharmacy and pharmacy.totalStores > 0:
        lines.append(
            f"Pharmacy stores: {pharmacy.totalStores} "
            f"({pharmacy.activeStores} active)"
        )
        lines.append(f"Drug master: {pharmacy.totalDrugs} drugs ({pharmacy.activeDrugs} active)")
        if pharmacy.narcoticCount > 0:
            lines.append(f"Narcotics: {pharmacy.narcoticCount} drug(s)")
        if pharmacy.highAlertCount > 0:
            lines.append(f"High-alert drugs: {pharmacy.highAlertCount}")
        if pharmacy.hasFormulary:
            lines.append(f"Formulary: v{pharmacy.formularyVersion} ({pharmacy.formularyStatus})")
        else:
            lines.append("Formulary: Not published")
        lines.append(f"Suppliers: {pharmacy.supplierCount}, Interactions: {pharmacy.interactionCount}")
    elif pharmacy:
        lines.append("Pharmacy: Not set up")

    # Service Catalog & Financial
    sc = service_catalog
    if sc and (sc.totalServiceItems > 0 or sc.totalPayers > 0):
        lines.append(
            f"Service items: {sc.totalServiceItems} "
            f"({sc.activeServiceItems} active, {sc.withoutBasePrice} without base price)"
        )
        lines.append(f"Charge master items: {sc.totalChargeMaster} ({sc.activeChargeMaster} active)")
        lines.append(f"Payers: {sc.totalPayers} ({sc.activePayers} active) — {', '.join(f'{k}:{v}' for k, v in sc.byPayerKind.items())}")
        lines.append(f"Contracts: {sc.totalContracts} ({sc.activeContracts} active, {sc.expiredContracts} expired)")
        lines.append(f"Government schemes: {sc.totalGovSchemes} ({sc.activeGovSchemes} active)")
        lines.append(f"Pricing tiers: {sc.totalPricingTiers} ({sc.activePricingTiers} active)")
        lines.append(f"Tariff plans: {sc.totalTariffPlans} ({sc.activeTariffPlans} active)")
        lines.append(f"Tax codes: {sc.totalTaxCodes}, Price changes logged: {sc.priceChangeCount}")
        if not sc.hasCashPayer:
            lines.append("WARNING: No CASH payer configured!")
    elif sc:
        lines.append("Service catalog: Not set up")

    return "\n".join(lines)


# ── Billing / Claims ──────────────────────────────────────────────────────


async def _collect_billing(session: AsyncSession, branch_id: str) -> BillingSummary:
    """Collect billing/claims aggregate stats for a branch."""
    try:
        # Insurance policies
        policy_rows = (await session.execute(
            select(InsurancePolicy.status, func.count()).where(
                InsurancePolicy.branchId == branch_id
            ).group_by(InsurancePolicy.status)
        )).all()
        total_policies = sum(r[1] for r in policy_rows)
        active_policies = sum(r[1] for r in policy_rows if r[0] == "ACTIVE")

        # Insurance cases
        case_rows = (await session.execute(
            select(InsuranceCase.status, func.count()).where(
                InsuranceCase.branchId == branch_id
            ).group_by(InsuranceCase.status)
        )).all()
        total_cases = sum(r[1] for r in case_rows)
        open_cases = sum(r[1] for r in case_rows if r[0] == "OPEN")

        # Pre-authorizations
        preauth_rows = (await session.execute(
            select(PreauthRequest.status, func.count()).where(
                PreauthRequest.branchId == branch_id
            ).group_by(PreauthRequest.status)
        )).all()
        preauth_by_status = {r[0]: r[1] for r in preauth_rows}
        total_preauths = sum(preauth_by_status.values())
        pending_preauths = preauth_by_status.get("PREAUTH_PENDING", 0) + preauth_by_status.get("PREAUTH_SUBMITTED", 0)
        approved_preauths = preauth_by_status.get("PREAUTH_APPROVED", 0)
        rejected_preauths = preauth_by_status.get("PREAUTH_REJECTED", 0) + preauth_by_status.get("PREAUTH_DENIED", 0)

        # Claims
        claim_rows = (await session.execute(
            select(Claim.status, func.count()).where(
                Claim.branchId == branch_id
            ).group_by(Claim.status)
        )).all()
        claim_by_status = {r[0]: r[1] for r in claim_rows}
        total_claims = sum(claim_by_status.values())
        draft_claims = claim_by_status.get("CLAIM_DRAFT", 0)
        submitted_claims = claim_by_status.get("CLAIM_SUBMITTED", 0) + claim_by_status.get("CLAIM_ACKNOWLEDGED", 0)
        settled_claims = claim_by_status.get("CLAIM_SETTLED", 0) + claim_by_status.get("CLAIM_PAID", 0)
        rejected_claims = claim_by_status.get("CLAIM_REJECTED", 0) + claim_by_status.get("CLAIM_DENIED", 0)

        # Document checklists
        checklist_count = (await session.execute(
            select(func.count()).where(DocumentChecklist.branchId == branch_id)
        )).scalar_one_or_none() or 0

        # Payer integrations
        integration_rows = (await session.execute(
            select(PayerIntegrationConfig.isActive, func.count()).where(
                PayerIntegrationConfig.branchId == branch_id
            ).group_by(PayerIntegrationConfig.isActive)
        )).all()
        total_integrations = sum(r[1] for r in integration_rows)
        active_integrations = sum(r[1] for r in integration_rows if r[0])

        return BillingSummary(
            totalInsurancePolicies=total_policies,
            activeInsurancePolicies=active_policies,
            totalInsuranceCases=total_cases,
            openInsuranceCases=open_cases,
            totalPreauths=total_preauths,
            byPreauthStatus=preauth_by_status,
            pendingPreauths=pending_preauths,
            approvedPreauths=approved_preauths,
            rejectedPreauths=rejected_preauths,
            totalClaims=total_claims,
            byClaimStatus=claim_by_status,
            draftClaims=draft_claims,
            submittedClaims=submitted_claims,
            settledClaims=settled_claims,
            rejectedClaims=rejected_claims,
            totalDocumentChecklists=checklist_count,
            totalPayerIntegrations=total_integrations,
            activePayerIntegrations=active_integrations,
        )
    except Exception as exc:
        logger.warning("billing collector failed for branch=%s: %s", branch_id, exc)
        return BillingSummary()
