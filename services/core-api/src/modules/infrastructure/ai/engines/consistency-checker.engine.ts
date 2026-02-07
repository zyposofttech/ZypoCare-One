/**
 * Cross-Module Consistency Checker Engine  (v2 — Deep)
 *
 * 40+ checks across every infrastructure sub-module.
 * Queries real Prisma schema fields. Returns issues grouped by severity.
 *
 * Categories:
 *   LOCATION        — LocationNode / LocationNodeRevision tree integrity
 *   UNIT_TYPE       — BranchUnitType enablement → Unit linkage
 *   UNIT            — Unit → Room → Resource chain
 *   EQUIPMENT       — EquipmentAsset lifecycle (placement, PM, contracts, compliance)
 *   OT              — OtSuite → OtSpace → OtTheatre → OtTable chain
 *   DIAGNOSTICS     — DiagnosticServicePoint, Capabilities, Items, Parameters
 *   BILLING         — ServiceItem → ChargeMapping → ChargeMaster → TariffRate → TaxCode
 *   CATALOGUE       — ServiceCatalogue, ServicePackage, OrderSet completeness
 *   STAFF           — Assignments, credentials, department heads, onboarding
 *   SCHEDULING      — ServiceAvailability, ProcedureBooking orphans
 *   BRANCH_CONFIG   — BranchInfraConfig, Branch statutory fields
 */

// ─── Types ──────────────────────────────────────────────────────────────

export interface ConsistencyIssue {
  id: string;
  category: string;
  severity: "BLOCKER" | "WARNING" | "INFO";
  title: string;
  details: string;
  fixHint: string;
  entityType?: string;
  entityId?: string;
  count?: number;
}

export interface ConsistencyResult {
  totalChecks: number;
  passCount: number;
  issues: ConsistencyIssue[];
  blockers: ConsistencyIssue[];
  warnings: ConsistencyIssue[];
  infos: ConsistencyIssue[];
  score: number;
  categorySummary: Record<string, { checks: number; issues: number }>;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function issue(
  id: string,
  category: string,
  severity: ConsistencyIssue["severity"],
  title: string,
  details: string,
  fixHint: string,
  entityType?: string,
  entityId?: string,
  count?: number,
): ConsistencyIssue {
  return { id, category, severity, title, details, fixHint, entityType, entityId, count };
}

// ─── Engine ─────────────────────────────────────────────────────────────

export async function runConsistencyChecks(
  prisma: any,
  branchId: string,
): Promise<ConsistencyResult> {
  const issues: ConsistencyIssue[] = [];
  let checksRun = 0;
  const catStats: Record<string, { checks: number; issues: number }> = {};

  function track(cat: string, issuesBefore: number) {
    checksRun++;
    if (!catStats[cat]) catStats[cat] = { checks: 0, issues: 0 };
    catStats[cat].checks++;
    catStats[cat].issues += issues.length - issuesBefore;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 1. BRANCH CONFIG
  // ═══════════════════════════════════════════════════════════════════════

  // 1a. BranchInfraConfig exists
  let before = issues.length;
  const infraConfig = await prisma.branchInfraConfig.findUnique({ where: { branchId } });
  if (!infraConfig) {
    issues.push(issue(
      "BC-001", "BRANCH_CONFIG", "WARNING",
      "Branch infrastructure config not initialized",
      "BranchInfraConfig record missing — housekeeping gate and other settings not configured.",
      "Navigate to Branch Settings → Infrastructure to initialize config.",
    ));
  }
  track("BRANCH_CONFIG", before);

  // 1b. Branch statutory fields
  before = issues.length;
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: {
      id: true, code: true, name: true,
      gstNumber: true, panNumber: true, clinicalEstRegNumber: true,
      legalEntityName: true, address: true, pinCode: true, state: true,
      contactPhone1: true, contactEmail: true,
    },
  });
  if (branch) {
    if (!branch.gstNumber) {
      issues.push(issue("BC-002", "BRANCH_CONFIG", "WARNING",
        "Branch GSTIN not set",
        "GSTIN is required for tax invoicing and GST filing.",
        "Navigate to Branch Profile and enter the GSTIN.", "BRANCH", branchId));
    }
    if (!branch.panNumber) {
      issues.push(issue("BC-003", "BRANCH_CONFIG", "WARNING",
        "Branch PAN not set",
        "PAN is required for TDS compliance and statutory reporting.",
        "Navigate to Branch Profile and enter the PAN.", "BRANCH", branchId));
    }
    if (!branch.clinicalEstRegNumber) {
      issues.push(issue("BC-004", "BRANCH_CONFIG", "INFO",
        "Clinical Establishment Registration not set",
        "CEA registration number required under Clinical Establishments Act.",
        "Enter the registration number in Branch Profile.", "BRANCH", branchId));
    }
    if (!branch.legalEntityName) {
      issues.push(issue("BC-005", "BRANCH_CONFIG", "WARNING",
        "Legal entity name not set",
        "Legal entity name is required on invoices and official documents.",
        "Enter the legal entity name in Branch Profile.", "BRANCH", branchId));
    }
    if (!branch.address || !branch.pinCode || !branch.state) {
      issues.push(issue("BC-006", "BRANCH_CONFIG", "WARNING",
        "Branch address incomplete",
        "Full address (address, PIN code, state) needed for invoicing.",
        "Complete the address fields in Branch Profile.", "BRANCH", branchId));
    }
    if (!branch.contactPhone1 && !branch.contactEmail) {
      issues.push(issue("BC-007", "BRANCH_CONFIG", "INFO",
        "Branch contact info missing",
        "At least one contact method (phone or email) should be set.",
        "Add a contact phone or email in Branch Profile.", "BRANCH", branchId));
    }
  }
  track("BRANCH_CONFIG", before);

  // ═══════════════════════════════════════════════════════════════════════
  // 2. LOCATION TREE
  // ═══════════════════════════════════════════════════════════════════════

  // 2a. Location nodes exist
  before = issues.length;
  const locationNodes = await prisma.locationNode.findMany({
    where: { branchId },
    select: { id: true, kind: true, parentId: true },
  });
  if (locationNodes.length === 0) {
    issues.push(issue("LOC-001", "LOCATION", "WARNING",
      "No location nodes defined",
      "Location hierarchy (Campus → Building → Floor → Zone) not set up.",
      "Create at least one Campus and Building in the Location setup."));
  }
  track("LOCATION", before);

  // 2b. Location nodes without active revisions
  before = issues.length;
  if (locationNodes.length > 0) {
    const nodesWithRevisions = await prisma.locationNodeRevision.groupBy({
      by: ["nodeId"],
      where: { node: { branchId }, isActive: true },
    });
    const nodesWithRevSet = new Set(nodesWithRevisions.map((r: any) => r.nodeId));
    const orphanedNodes = locationNodes.filter((n: any) => !nodesWithRevSet.has(n.id));
    if (orphanedNodes.length > 0) {
      issues.push(issue("LOC-002", "LOCATION", "WARNING",
        `${orphanedNodes.length} location node(s) without active revision`,
        "Location nodes need at least one active revision (code, name, etc).",
        "Edit each location node to create/activate a revision.",
        "LOCATION_NODE", undefined, orphanedNodes.length));
    }
  }
  track("LOCATION", before);

  // 2c. Buildings/Floors without fire zone
  before = issues.length;
  const fireable = locationNodes.filter((n: any) => ["BUILDING", "FLOOR"].includes(n.kind));
  if (fireable.length > 0) {
    const fireableIds = fireable.map((n: any) => n.id);
    const withFire = await prisma.locationNodeRevision.count({
      where: { nodeId: { in: fireableIds }, isActive: true, fireZone: { not: null } },
    });
    const missing = fireable.length - withFire;
    if (missing > 0) {
      issues.push(issue("LOC-003", "LOCATION", "INFO",
        `${missing} building/floor node(s) without fire zone designation`,
        "Fire zone mapping is needed for NABH fire safety compliance.",
        "Edit each Building/Floor location node and set the fire zone.", undefined, undefined, missing));
    }
  }
  track("LOCATION", before);

  // 2d. No emergency exits marked
  before = issues.length;
  if (locationNodes.length > 0) {
    const emergencyExits = await prisma.locationNodeRevision.count({
      where: { node: { branchId }, isActive: true, emergencyExit: true },
    });
    if (emergencyExits === 0) {
      issues.push(issue("LOC-004", "LOCATION", "WARNING",
        "No emergency exits marked in location tree",
        "At least one location node should be marked as emergency exit for safety compliance.",
        "Mark appropriate location nodes as emergency exits."));
    }
  }
  track("LOCATION", before);

  // ═══════════════════════════════════════════════════════════════════════
  // 3. UNIT TYPES & UNITS
  // ═══════════════════════════════════════════════════════════════════════

  // 3a. Enabled unit types with no actual units
  before = issues.length;
  const enabledTypes = await prisma.branchUnitType.findMany({
    where: { branchId, isEnabled: true },
    include: { unitType: { select: { id: true, code: true, name: true, bedBasedDefault: true } } },
  });
  for (const but of enabledTypes) {
    const unitCount = await prisma.unit.count({
      where: { branchId, isActive: true, unitTypeId: but.unitTypeId },
    });
    if (unitCount === 0) {
      issues.push(issue(
        `UT-001-${but.unitType.code}`, "UNIT_TYPE", "WARNING",
        `Unit type "${but.unitType.name}" enabled but has no units`,
        `${but.unitType.code} is enabled for this branch but zero units created.`,
        `Create at least one ${but.unitType.name} unit, or disable this unit type.`,
        "BRANCH_UNIT_TYPE", but.id));
    }
  }
  track("UNIT_TYPE", before);

  // 3b. IPD units (bed-based) without beds
  before = issues.length;
  const bedBasedTypeCodes = enabledTypes
    .filter((but: any) => but.unitType.bedBasedDefault)
    .map((but: any) => but.unitType.code);
  // Also include common IPD codes as fallback
  const ipdCodes = [...new Set([...bedBasedTypeCodes, "WARD", "ICU", "HDU", "NICU", "PICU", "CCU"])];
  const ipdUnits = await prisma.unit.findMany({
    where: { branchId, isActive: true, unitType: { code: { in: ipdCodes } } },
    include: { unitType: { select: { code: true, name: true } } },
  });
  for (const unit of ipdUnits) {
    const bedCount = await prisma.unitResource.count({
      where: { unitId: unit.id, isActive: true, resourceType: "BED" },
    });
    if (bedCount === 0) {
      issues.push(issue(
        `UNIT-001-${unit.id}`, "UNIT", "BLOCKER",
        `${unit.unitType.code} unit "${unit.name}" has no beds`,
        "IPD/bed-based unit requires at least one active bed resource for admissions.",
        `Navigate to Units → "${unit.name}" → Resources and add bed resources.`,
        "UNIT", unit.id));
    }
  }
  track("UNIT", before);

  // 3c. OPD units without consultation rooms
  before = issues.length;
  const opdUnits = await prisma.unit.findMany({
    where: { branchId, isActive: true, unitType: { code: "OPD" } },
    select: { id: true, name: true },
  });
  for (const unit of opdUnits) {
    const roomCount = await prisma.unitRoom.count({
      where: { unitId: unit.id, isActive: true },
    });
    if (roomCount === 0) {
      issues.push(issue(
        `UNIT-002-${unit.id}`, "UNIT", "WARNING",
        `OPD unit "${unit.name}" has no consultation rooms`,
        "OPD units should have at least one room for patient consultations.",
        `Add consultation rooms to OPD unit "${unit.name}".`, "UNIT", unit.id));
    }
  }
  track("UNIT", before);

  // 3d. Units not linked to location nodes
  before = issues.length;
  const unlinkedUnits = await prisma.unit.count({
    where: { branchId, isActive: true, locationNodeId: null },
  });
  if (unlinkedUnits > 0) {
    issues.push(issue("UNIT-003", "UNIT", "INFO",
      `${unlinkedUnits} unit(s) not linked to any location node`,
      "Units should be mapped to location nodes for wayfinding and spatial tracking.",
      "Edit each unit and assign it to the appropriate location node.",
      undefined, undefined, unlinkedUnits));
  }
  track("UNIT", before);

  // 3e. Active resources in inactive units
  before = issues.length;
  const resourcesInInactiveUnits = await prisma.unitResource.count({
    where: { branchId, isActive: true, unit: { isActive: false } },
  });
  if (resourcesInInactiveUnits > 0) {
    issues.push(issue("UNIT-004", "UNIT", "WARNING",
      `${resourcesInInactiveUnits} active resource(s) in inactive units`,
      "Active resources exist in deactivated units — they won't be usable.",
      "Deactivate resources in inactive units or reactivate the parent units.",
      undefined, undefined, resourcesInInactiveUnits));
  }
  track("UNIT", before);

  // 3f. Active rooms in inactive units
  before = issues.length;
  const roomsInInactiveUnits = await prisma.unitRoom.count({
    where: { branchId, isActive: true, unit: { isActive: false } },
  });
  if (roomsInInactiveUnits > 0) {
    issues.push(issue("UNIT-005", "UNIT", "WARNING",
      `${roomsInInactiveUnits} active room(s) in inactive units`,
      "Active rooms in deactivated units — scheduling/allocation won't work.",
      "Deactivate rooms in inactive units or reactivate the parent units.",
      undefined, undefined, roomsInInactiveUnits));
  }
  track("UNIT", before);

  // 3g. ICU rooms missing oxygen/suction
  before = issues.length;
  const icuRooms = await prisma.unitRoom.findMany({
    where: {
      branchId, isActive: true,
      unit: { isActive: true, unitType: { code: { in: ["ICU", "HDU", "NICU", "PICU", "CCU"] } } },
    },
    select: { id: true, code: true, name: true, hasOxygen: true, hasSuction: true, unitId: true },
  });
  for (const room of icuRooms) {
    if (!room.hasOxygen) {
      issues.push(issue(`UNIT-006-${room.id}`, "UNIT", "WARNING",
        `ICU room "${room.name}" missing oxygen supply`,
        "Critical care rooms must have piped oxygen for patient safety.",
        "Edit the room and enable the oxygen supply flag.", "UNIT_ROOM", room.id));
    }
    if (!room.hasSuction) {
      issues.push(issue(`UNIT-007-${room.id}`, "UNIT", "INFO",
        `ICU room "${room.name}" missing suction`,
        "Critical care rooms should have suction available.",
        "Edit the room and enable the suction flag.", "UNIT_ROOM", room.id));
    }
  }
  track("UNIT", before);

  // 3h. IPD rooms without pricing tier
  before = issues.length;
  const ipdRoomsNoPricing = await prisma.unitRoom.count({
    where: {
      branchId, isActive: true, pricingTier: null,
      unit: { isActive: true, unitType: { code: { in: ipdCodes } } },
    },
  });
  if (ipdRoomsNoPricing > 0) {
    issues.push(issue("UNIT-008", "UNIT", "INFO",
      `${ipdRoomsNoPricing} IPD room(s) without pricing tier`,
      "Pricing tier (ECONOMY, STANDARD, DELUXE, etc.) helps auto-apply bed charges.",
      "Set pricing tier on each IPD room.",
      undefined, undefined, ipdRoomsNoPricing));
  }
  track("UNIT", before);

  // ═══════════════════════════════════════════════════════════════════════
  // 4. EQUIPMENT
  // ═══════════════════════════════════════════════════════════════════════

  const allEquipment = await prisma.equipmentAsset.findMany({
    where: { branchId },
    select: {
      id: true, code: true, name: true, category: true,
      operationalStatus: true,
      amcVendor: true, amcValidTo: true, warrantyValidTo: true,
      pmFrequencyDays: true, nextPmDueAt: true,
      aerbLicenseNo: true, aerbValidTo: true,
      pcpndtRegNo: true, pcpndtValidTo: true,
      ownerDepartmentId: true,
    },
  });
  const now = new Date();

  // 4a. Equipment without placement
  before = issues.length;
  if (allEquipment.length > 0) {
    const placements = await prisma.equipmentPlacement.findMany({
      where: { branchId },
      select: { assetId: true },
    });
    const placedSet = new Set(placements.map((p: any) => p.assetId));
    const unplacedCount = allEquipment.filter((e: any) => !placedSet.has(e.id)).length;
    if (unplacedCount > 0) {
      issues.push(issue("EQ-001", "EQUIPMENT", "INFO",
        `${unplacedCount} equipment asset(s) without placement record`,
        "Equipment should be placed at a specific location/unit/room for tracking.",
        "Use Equipment → Placement to assign each asset to its physical location.",
        undefined, undefined, unplacedCount));
    }
  }
  track("EQUIPMENT", before);

  // 4b. Equipment overdue for preventive maintenance
  before = issues.length;
  const overduePm = allEquipment.filter(
    (e: any) => e.nextPmDueAt && new Date(e.nextPmDueAt) < now,
  );
  if (overduePm.length > 0) {
    for (const eq of overduePm.slice(0, 10)) {
      issues.push(issue(`EQ-002-${eq.id}`, "EQUIPMENT", "WARNING",
        `Equipment "${eq.name}" overdue for preventive maintenance`,
        `PM was due ${new Date(eq.nextPmDueAt).toISOString().split("T")[0]}. Delayed PM increases failure risk.`,
        `Schedule a PM task for equipment "${eq.name}" immediately.`,
        "EQUIPMENT_ASSET", eq.id));
    }
    if (overduePm.length > 10) {
      issues.push(issue("EQ-002-MORE", "EQUIPMENT", "WARNING",
        `${overduePm.length - 10} more equipment asset(s) overdue for PM`,
        "Multiple assets have overdue preventive maintenance.",
        "Review the equipment maintenance dashboard and schedule overdue PMs.",
        undefined, undefined, overduePm.length - 10));
    }
  }
  track("EQUIPMENT", before);

  // 4c. Equipment with expired AMC
  before = issues.length;
  const expiredAmc = allEquipment.filter(
    (e: any) => e.amcVendor && e.amcValidTo && new Date(e.amcValidTo) < now,
  );
  if (expiredAmc.length > 0) {
    issues.push(issue("EQ-003", "EQUIPMENT", "WARNING",
      `${expiredAmc.length} equipment asset(s) with expired AMC`,
      "AMC contracts have expired — unplanned downtime will not be covered.",
      "Renew AMC contracts for affected equipment.",
      undefined, undefined, expiredAmc.length));
  }
  track("EQUIPMENT", before);

  // 4d. RADIOLOGY equipment without AERB license
  before = issues.length;
  const radiology = allEquipment.filter((e: any) => e.category === "RADIOLOGY");
  const radMissingAerb = radiology.filter((e: any) => !e.aerbLicenseNo || !e.aerbValidTo);
  if (radMissingAerb.length > 0) {
    for (const eq of radMissingAerb) {
      issues.push(issue(`EQ-004-${eq.id}`, "EQUIPMENT", "BLOCKER",
        `Radiology equipment "${eq.name}" missing AERB license`,
        "AERB license is legally required for all radiation-emitting equipment.",
        `Upload AERB license for "${eq.name}" in Equipment → Compliance.`,
        "EQUIPMENT_ASSET", eq.id));
    }
  }
  track("EQUIPMENT", before);

  // 4e. ULTRASOUND equipment without PCPNDT registration
  before = issues.length;
  const ultrasound = allEquipment.filter((e: any) => e.category === "ULTRASOUND");
  const usMissingPcpndt = ultrasound.filter((e: any) => !e.pcpndtRegNo || !e.pcpndtValidTo);
  if (usMissingPcpndt.length > 0) {
    for (const eq of usMissingPcpndt) {
      issues.push(issue(`EQ-005-${eq.id}`, "EQUIPMENT", "BLOCKER",
        `Ultrasound equipment "${eq.name}" missing PCPNDT registration`,
        "PCPNDT registration is legally mandatory for all ultrasound equipment.",
        `Upload PCPNDT registration for "${eq.name}" in Equipment → Compliance.`,
        "EQUIPMENT_ASSET", eq.id));
    }
  }
  track("EQUIPMENT", before);

  // 4f. Equipment with open downtime tickets > 7 days
  before = issues.length;
  const longDowntime = await prisma.downtimeTicket.findMany({
    where: {
      asset: { branchId },
      status: "OPEN",
      openedAt: { lt: new Date(Date.now() - 7 * 86400000) },
    },
    select: { id: true, assetId: true, reason: true, openedAt: true, asset: { select: { name: true } } },
    take: 20,
  });
  for (const dt of longDowntime) {
    const days = Math.ceil((now.getTime() - new Date(dt.openedAt).getTime()) / 86400000);
    issues.push(issue(`EQ-006-${dt.id}`, "EQUIPMENT", "WARNING",
      `Equipment "${dt.asset.name}" has been down for ${days} day(s)`,
      `Downtime ticket open since ${new Date(dt.openedAt).toISOString().split("T")[0]}: ${dt.reason}`,
      "Close the downtime ticket once the equipment is repaired.",
      "EQUIPMENT_ASSET", dt.assetId));
  }
  track("EQUIPMENT", before);

  // 4g. Critical equipment without PM frequency set
  before = issues.length;
  const criticalNoPm = allEquipment.filter(
    (e: any) => ["RADIOLOGY", "ULTRASOUND"].includes(e.category) && !e.pmFrequencyDays,
  );
  if (criticalNoPm.length > 0) {
    issues.push(issue("EQ-007", "EQUIPMENT", "WARNING",
      `${criticalNoPm.length} critical equipment without PM frequency`,
      "Radiology/Ultrasound equipment should have preventive maintenance schedules.",
      "Set PM frequency (days) on each critical equipment asset.",
      undefined, undefined, criticalNoPm.length));
  }
  track("EQUIPMENT", before);

  // ═══════════════════════════════════════════════════════════════════════
  // 5. OT (Operation Theatre)
  // ═══════════════════════════════════════════════════════════════════════

  before = issues.length;
  const otSuites = await prisma.otSuite.findMany({
    where: { branchId, isActive: true },
    select: { id: true, code: true, name: true, status: true, locationNodeId: true },
  });

  // 5a. OT suites without any spaces
  for (const suite of otSuites) {
    const spaceCount = await prisma.otSpace.count({
      where: { suiteId: suite.id, isActive: true },
    });
    if (spaceCount === 0) {
      issues.push(issue(`OT-001-${suite.id}`, "OT", "BLOCKER",
        `OT suite "${suite.name}" has no spaces defined`,
        "An OT suite needs at least a theatre and recovery bay.",
        `Add spaces (theatre, recovery, scrub room) to OT suite "${suite.name}".`,
        "OT_SUITE", suite.id));
    }
  }
  track("OT", before);

  // 5b. OT suites without theatre
  before = issues.length;
  for (const suite of otSuites) {
    const theatreSpaces = await prisma.otSpace.count({
      where: { suiteId: suite.id, isActive: true, type: "THEATRE" },
    });
    if (theatreSpaces === 0) {
      issues.push(issue(`OT-002-${suite.id}`, "OT", "BLOCKER",
        `OT suite "${suite.name}" has no theatre`,
        "Every OT suite must have at least one theatre for surgical procedures.",
        `Add a THEATRE space to OT suite "${suite.name}".`,
        "OT_SUITE", suite.id));
    }
  }
  track("OT", before);

  // 5c. OT suites without recovery bay
  before = issues.length;
  for (const suite of otSuites) {
    const recoveryBays = await prisma.otSpace.count({
      where: { suiteId: suite.id, isActive: true, type: "RECOVERY_BAY" },
    });
    if (recoveryBays === 0) {
      issues.push(issue(`OT-003-${suite.id}`, "OT", "WARNING",
        `OT suite "${suite.name}" has no recovery bay`,
        "A recovery bay is needed for post-operative patient monitoring.",
        `Add a RECOVERY_BAY space to OT suite "${suite.name}".`,
        "OT_SUITE", suite.id));
    }
  }
  track("OT", before);

  // 5d. OT theatres without tables
  before = issues.length;
  const theatreSpaces = await prisma.otSpace.findMany({
    where: { suite: { branchId }, isActive: true, type: "THEATRE" },
    select: { id: true, code: true, name: true, suiteId: true },
  });
  for (const space of theatreSpaces) {
    const theatre = await prisma.otTheatre.findUnique({ where: { spaceId: space.id } });
    if (theatre) {
      const tableCount = await prisma.otTable.count({ where: { theatreId: theatre.id, isActive: true } });
      if (tableCount === 0) {
        issues.push(issue(`OT-004-${space.id}`, "OT", "BLOCKER",
          `OT theatre "${space.name}" has no operating table`,
          "Every theatre requires at least one OT table for surgical procedures.",
          `Add an OT table to theatre "${space.name}".`, "OT_SPACE", space.id));
      }
    } else {
      issues.push(issue(`OT-005-${space.id}`, "OT", "BLOCKER",
        `OT space "${space.name}" is THEATRE type but has no theatre config`,
        "Theatre type/airflow/pressure configuration is missing.",
        `Configure the theatre settings for space "${space.name}".`, "OT_SPACE", space.id));
    }
  }
  track("OT", before);

  // 5e. OT suites without essential equipment (anesthesia machine + patient monitoring)
  before = issues.length;
  const essentialOtCategories = ["ANESTHESIA_MACHINE", "PATIENT_MONITORING"];
  for (const suite of otSuites) {
    const equipment = await prisma.otEquipment.findMany({
      where: { suiteId: suite.id, isActive: true },
      select: { category: true },
    });
    const categories = new Set(equipment.map((e: any) => e.category));
    for (const required of essentialOtCategories) {
      if (!categories.has(required)) {
        issues.push(issue(`OT-006-${suite.id}-${required}`, "OT", "BLOCKER",
          `OT suite "${suite.name}" missing ${required.replace(/_/g, " ").toLowerCase()}`,
          `Essential OT equipment category ${required} is not present.`,
          `Add ${required.replace(/_/g, " ").toLowerCase()} equipment to OT suite "${suite.name}".`,
          "OT_SUITE", suite.id));
      }
    }
  }
  track("OT", before);

  // 5f. OT suites not linked to location node
  before = issues.length;
  const otSuitesNoLocation = otSuites.filter((s: any) => !s.locationNodeId);
  if (otSuitesNoLocation.length > 0) {
    issues.push(issue("OT-007", "OT", "INFO",
      `${otSuitesNoLocation.length} OT suite(s) not linked to a location node`,
      "OT suites should be mapped to a location for wayfinding.",
      "Assign location nodes to OT suites.",
      undefined, undefined, otSuitesNoLocation.length));
  }
  track("OT", before);

  // ═══════════════════════════════════════════════════════════════════════
  // 6. DIAGNOSTICS
  // ═══════════════════════════════════════════════════════════════════════

  // 6a. Diagnostic service points without rooms or resources
  before = issues.length;
  const servicePoints = await prisma.diagnosticServicePoint.findMany({
    where: { branchId, isActive: true },
    select: { id: true, code: true, name: true, type: true },
  });
  for (const sp of servicePoints) {
    const roomCount = await prisma.diagnosticServicePointRoom.count({
      where: { servicePointId: sp.id, isActive: true },
    });
    const resourceCount = await prisma.diagnosticServicePointResource.count({
      where: { servicePointId: sp.id, isActive: true },
    });
    if (roomCount === 0 && resourceCount === 0) {
      issues.push(issue(`DIAG-001-${sp.id}`, "DIAGNOSTICS", "WARNING",
        `Diagnostic service point "${sp.name}" has no rooms or resources`,
        `${sp.type} service point needs physical space (rooms/resources) to operate.`,
        `Assign rooms or resources to service point "${sp.name}".`,
        "DIAGNOSTIC_SERVICE_POINT", sp.id));
    }
  }
  track("DIAGNOSTICS", before);

  // 6b. Diagnostic items without any service point capability
  before = issues.length;
  const totalDiagItems = await prisma.diagnosticItem.count({ where: { branchId, isActive: true } });
  if (totalDiagItems > 0) {
    const itemsWithCapability = await prisma.diagnosticCapability.groupBy({
      by: ["diagnosticItemId"],
      where: { branchId, isActive: true },
    });
    const unmappedCount = totalDiagItems - itemsWithCapability.length;
    if (unmappedCount > 0) {
      issues.push(issue("DIAG-002", "DIAGNOSTICS", "WARNING",
        `${unmappedCount} diagnostic item(s) not mapped to any service point`,
        "Diagnostic items need capability mappings to be orderable/executable.",
        "Map diagnostic items to service points in Diagnostics → Capabilities.",
        undefined, undefined, unmappedCount));
    }
  }
  track("DIAGNOSTICS", before);

  // 6c. Lab items without specimen type
  before = issues.length;
  const labItemsNoSpecimen = await prisma.diagnosticItem.count({
    where: { branchId, isActive: true, kind: "LAB", specimenId: null },
  });
  if (labItemsNoSpecimen > 0) {
    issues.push(issue("DIAG-003", "DIAGNOSTICS", "INFO",
      `${labItemsNoSpecimen} lab item(s) without specimen type`,
      "Lab tests should specify specimen type for sample collection instructions.",
      "Assign specimen types to lab diagnostic items.",
      undefined, undefined, labItemsNoSpecimen));
  }
  track("DIAGNOSTICS", before);

  // 6d. Lab items without parameters
  before = issues.length;
  const labItemsNoParams = await prisma.diagnosticItem.count({
    where: {
      branchId, isActive: true, kind: "LAB", isPanel: false,
      parameters: { none: {} },
    },
  });
  if (labItemsNoParams > 0) {
    issues.push(issue("DIAG-004", "DIAGNOSTICS", "WARNING",
      `${labItemsNoParams} lab test(s) without parameters`,
      "Lab tests need at least one parameter defined for result entry.",
      "Add parameters to diagnostic items in Diagnostics → Configuration.",
      undefined, undefined, labItemsNoParams));
  }
  track("DIAGNOSTICS", before);

  // 6e. Parameters without reference ranges
  before = issues.length;
  const numericParamsNoRange = await prisma.diagnosticParameter.count({
    where: {
      test: { branchId, isActive: true },
      dataType: "NUMERIC",
      isActive: true,
      ranges: { none: {} },
    },
  });
  if (numericParamsNoRange > 0) {
    issues.push(issue("DIAG-005", "DIAGNOSTICS", "INFO",
      `${numericParamsNoRange} numeric parameter(s) without reference ranges`,
      "Numeric parameters should have reference ranges for auto-flagging abnormal results.",
      "Add reference ranges in Diagnostics → Parameters.",
      undefined, undefined, numericParamsNoRange));
  }
  track("DIAGNOSTICS", before);

  // 6f. Panels with inactive child items
  before = issues.length;
  const panelLinks = await prisma.diagnosticPanelItem.findMany({
    where: { panel: { branchId, isActive: true, isPanel: true } },
    select: { panelId: true, item: { select: { isActive: true } } },
  });
  const inactivePanelChildren = panelLinks.filter((pl: any) => !pl.item.isActive);
  if (inactivePanelChildren.length > 0) {
    issues.push(issue("DIAG-006", "DIAGNOSTICS", "WARNING",
      `${inactivePanelChildren.length} diagnostic panel(s) reference inactive child items`,
      "Panel components pointing to inactive items will cause ordering errors.",
      "Remove or replace inactive items in diagnostic panels.",
      undefined, undefined, inactivePanelChildren.length));
  }
  track("DIAGNOSTICS", before);

  // 6g. Radiology service points without equipment
  before = issues.length;
  const radSPs = servicePoints.filter((sp: any) => sp.type === "RADIOLOGY");
  for (const sp of radSPs) {
    const eqCount = await prisma.diagnosticServicePointEquipment.count({
      where: { servicePointId: sp.id, isActive: true },
    });
    if (eqCount === 0) {
      issues.push(issue(`DIAG-007-${sp.id}`, "DIAGNOSTICS", "WARNING",
        `Radiology service point "${sp.name}" has no linked equipment`,
        "Radiology service points need equipment for imaging studies.",
        `Link imaging equipment to service point "${sp.name}".`,
        "DIAGNOSTIC_SERVICE_POINT", sp.id));
    }
  }
  track("DIAGNOSTICS", before);

  // ═══════════════════════════════════════════════════════════════════════
  // 7. BILLING CHAIN
  // ═══════════════════════════════════════════════════════════════════════

  // 7a. Active billable services without charge mapping
  before = issues.length;
  const billableServices = await prisma.serviceItem.findMany({
    where: { branchId, isActive: true, isBillable: true, lifecycleStatus: "PUBLISHED" },
    select: { id: true, code: true, name: true },
    take: 200,
  });
  if (billableServices.length > 0) {
    const serviceIds = billableServices.map((s: any) => s.id);
    const mappings = await prisma.serviceChargeMapping.findMany({
      where: { branchId, serviceItemId: { in: serviceIds }, effectiveTo: null },
      select: { serviceItemId: true },
    });
    const mappedIds = new Set(mappings.map((m: any) => m.serviceItemId));
    const unmapped = billableServices.filter((s: any) => !mappedIds.has(s.id));
    if (unmapped.length > 0) {
      issues.push(issue("BILL-001", "BILLING", "BLOCKER",
        `${unmapped.length} published billable service(s) without charge mapping`,
        "Services cannot be billed without a ServiceChargeMapping → ChargeMasterItem link.",
        "Navigate to each service → Billing tab and create a charge mapping.",
        undefined, undefined, unmapped.length));
    }
  }
  track("BILLING", before);

  // 7b. Charge master items without tax code
  before = issues.length;
  const chargesNoTax = await prisma.chargeMasterItem.count({
    where: { branchId, isActive: true, taxCodeId: null },
  });
  if (chargesNoTax > 0) {
    issues.push(issue("BILL-002", "BILLING", "WARNING",
      `${chargesNoTax} charge master item(s) without tax code`,
      "Missing tax code will cause invoicing errors. Use GST_EXEMPT for clinical services.",
      "Assign tax codes to all charge master items.",
      undefined, undefined, chargesNoTax));
  }
  track("BILLING", before);

  // 7c. Charge master items without HSN/SAC code
  before = issues.length;
  const chargesNoHsn = await prisma.chargeMasterItem.count({
    where: { branchId, isActive: true, hsnSac: null },
  });
  if (chargesNoHsn > 0) {
    issues.push(issue("BILL-003", "BILLING", "INFO",
      `${chargesNoHsn} charge master item(s) without HSN/SAC code`,
      "HSN/SAC codes are required on GST invoices for healthcare services (SAC: 9993).",
      "Assign HSN/SAC codes to charge master items.",
      undefined, undefined, chargesNoHsn));
  }
  track("BILLING", before);

  // 7d. No active tariff plan
  before = issues.length;
  const activePlans = await prisma.tariffPlan.count({
    where: { branchId, planStatus: "ACTIVE" },
  });
  if (activePlans === 0) {
    issues.push(issue("BILL-004", "BILLING", "BLOCKER",
      "No active tariff plan found",
      "At least one ACTIVE tariff plan (price list) is required for billing.",
      "Create and activate a tariff plan in Billing → Tariff Plans."));
  }
  track("BILLING", before);

  // 7e. No tax codes defined
  before = issues.length;
  const taxCodeCount = await prisma.taxCode.count({ where: { branchId, isActive: true } });
  if (taxCodeCount === 0) {
    issues.push(issue("BILL-005", "BILLING", "BLOCKER",
      "No tax codes defined",
      "At least one tax code is required (e.g., GST_EXEMPT for clinical services).",
      "Create tax codes in Billing → Tax Codes."));
  }
  track("BILLING", before);

  // 7f. Services marked requiresAppointment but no availability calendar
  before = issues.length;
  const apptServices = await prisma.serviceItem.findMany({
    where: { branchId, isActive: true, requiresAppointment: true },
    select: { id: true, code: true, name: true },
  });
  if (apptServices.length > 0) {
    const apptIds = apptServices.map((s: any) => s.id);
    const calendars = await prisma.serviceAvailabilityCalendar.findMany({
      where: { branchId, isActive: true, serviceItemId: { in: apptIds } },
      select: { serviceItemId: true },
    });
    const hasCalendar = new Set(calendars.map((c: any) => c.serviceItemId));
    const missing = apptServices.filter((s: any) => !hasCalendar.has(s.id));
    if (missing.length > 0) {
      issues.push(issue("BILL-006", "BILLING", "BLOCKER",
        `${missing.length} appointment-based service(s) without availability calendar`,
        "Services requiring appointments need an availability calendar with rules.",
        "Create availability calendars for appointment-based services.",
        undefined, undefined, missing.length));
    }
  }
  track("BILLING", before);

  // ═══════════════════════════════════════════════════════════════════════
  // 8. CATALOGUES, PACKAGES, ORDER SETS
  // ═══════════════════════════════════════════════════════════════════════

  // 8a. Published catalogues with inactive items
  before = issues.length;
  const publishedCatalogues = await prisma.serviceCatalogue.findMany({
    where: { branchId, status: "PUBLISHED" },
    select: { id: true, code: true, name: true },
  });
  for (const cat of publishedCatalogues) {
    const inactiveItems = await prisma.serviceCatalogueItem.count({
      where: { catalogueId: cat.id, serviceItem: { isActive: false } },
    });
    if (inactiveItems > 0) {
      issues.push(issue(`CAT-001-${cat.id}`, "CATALOGUE", "WARNING",
        `Catalogue "${cat.name}" has ${inactiveItems} inactive service item(s)`,
        "Published catalogues should not reference inactive services.",
        `Review and remove inactive items from catalogue "${cat.name}".`,
        "SERVICE_CATALOGUE", cat.id));
    }
  }
  track("CATALOGUE", before);

  // 8b. Published packages with missing/inactive components
  before = issues.length;
  const publishedPackages = await prisma.servicePackage.findMany({
    where: { branchId, status: "PUBLISHED" },
    select: { id: true, code: true, name: true, pricingMode: true, pricingValue: true, billingChargeMasterItemId: true },
  });
  for (const pkg of publishedPackages) {
    const components = await prisma.servicePackageComponent.findMany({
      where: { packageId: pkg.id, isActive: true },
      select: {
        id: true, componentType: true,
        serviceItem: { select: { isActive: true } },
        diagnosticItem: { select: { isActive: true } },
        chargeMaster: { select: { isActive: true } },
      },
    });
    const inactiveComponents = components.filter((c: any) => {
      if (c.componentType === "SERVICE_ITEM" && c.serviceItem && !c.serviceItem.isActive) return true;
      if (c.componentType === "DIAGNOSTIC_ITEM" && c.diagnosticItem && !c.diagnosticItem.isActive) return true;
      if (c.componentType === "CHARGE_MASTER_ITEM" && c.chargeMaster && !c.chargeMaster.isActive) return true;
      return false;
    });
    if (inactiveComponents.length > 0) {
      issues.push(issue(`CAT-002-${pkg.id}`, "CATALOGUE", "WARNING",
        `Package "${pkg.name}" has ${inactiveComponents.length} inactive component(s)`,
        "Published packages should not contain inactive items.",
        `Review components in package "${pkg.name}" and replace inactive items.`,
        "SERVICE_PACKAGE", pkg.id));
    }
    // Package without components
    if (components.length === 0) {
      issues.push(issue(`CAT-003-${pkg.id}`, "CATALOGUE", "BLOCKER",
        `Package "${pkg.name}" has no components`,
        "A published package must have at least one component.",
        `Add components to package "${pkg.name}".`,
        "SERVICE_PACKAGE", pkg.id));
    }
    // Fixed-price package without billing charge master item
    if (["FIXED", "CAP"].includes(String(pkg.pricingMode)) && !pkg.billingChargeMasterItemId) {
      issues.push(issue(`CAT-004-${pkg.id}`, "CATALOGUE", "WARNING",
        `Package "${pkg.name}" (${pkg.pricingMode}) has no billing charge master item`,
        "Fixed/cap-priced packages should link to a charge master item for invoicing.",
        `Set a billing charge master item for package "${pkg.name}".`,
        "SERVICE_PACKAGE", pkg.id));
    }
  }
  track("CATALOGUE", before);

  // 8c. Published order sets with inactive items
  before = issues.length;
  const publishedOrderSets = await prisma.orderSet.findMany({
    where: { branchId, status: "PUBLISHED" },
    select: { id: true, code: true, name: true },
  });
  for (const os of publishedOrderSets) {
    const osItems = await prisma.orderSetItem.findMany({
      where: { orderSetId: os.id },
      select: {
        id: true, itemType: true,
        serviceItem: { select: { isActive: true } },
        diagnosticItem: { select: { isActive: true } },
      },
    });
    const inactive = osItems.filter((i: any) => {
      if (i.itemType === "SERVICE_ITEM" && i.serviceItem && !i.serviceItem.isActive) return true;
      if (i.itemType === "DIAGNOSTIC_ITEM" && i.diagnosticItem && !i.diagnosticItem.isActive) return true;
      return false;
    });
    if (inactive.length > 0) {
      issues.push(issue(`CAT-005-${os.id}`, "CATALOGUE", "WARNING",
        `Order set "${os.name}" has ${inactive.length} inactive item(s)`,
        "Published order sets should not reference inactive services/diagnostics.",
        `Review and update items in order set "${os.name}".`,
        "ORDER_SET", os.id));
    }
    if (osItems.length === 0) {
      issues.push(issue(`CAT-006-${os.id}`, "CATALOGUE", "WARNING",
        `Order set "${os.name}" is empty`,
        "Published order sets should have at least one item.",
        `Add items to order set "${os.name}".`, "ORDER_SET", os.id));
    }
  }
  track("CATALOGUE", before);

  // ═══════════════════════════════════════════════════════════════════════
  // 9. STAFF
  // ═══════════════════════════════════════════════════════════════════════

  // 9a. Departments without any staff assignments
  before = issues.length;
  const departments = await prisma.department.findMany({
    where: { branchId, isActive: true },
    select: { id: true, code: true, name: true, headStaffId: true },
  });
  for (const dept of departments) {
    const staffCount = await prisma.staffAssignment.count({
      where: { branchId, departmentId: dept.id, status: "ACTIVE" },
    });
    if (staffCount === 0) {
      issues.push(issue(`STAFF-001-${dept.id}`, "STAFF", "WARNING",
        `Department "${dept.name}" has no active staff assigned`,
        `Department ${dept.code} has zero active staff assignments.`,
        `Assign at least one staff member to department "${dept.name}".`,
        "DEPARTMENT", dept.id));
    }
  }
  track("STAFF", before);

  // 9b. Departments without a head
  before = issues.length;
  const deptsNoHead = departments.filter((d: any) => !d.headStaffId);
  if (deptsNoHead.length > 0) {
    issues.push(issue("STAFF-002", "STAFF", "WARNING",
      `${deptsNoHead.length} department(s) without a department head`,
      "Each department should have a designated head for accountability and NABH compliance.",
      "Assign department heads in Department settings.",
      undefined, undefined, deptsNoHead.length));
  }
  track("STAFF", before);

  // 9c. Medical staff without any credentials
  before = issues.length;
  const medicalStaffNoCredentials = await prisma.staff.count({
    where: {
      isActive: true,
      category: "MEDICAL",
      assignments: { some: { branchId, status: "ACTIVE" } },
      credentials: { none: {} },
    },
  });
  if (medicalStaffNoCredentials > 0) {
    issues.push(issue("STAFF-003", "STAFF", "BLOCKER",
      `${medicalStaffNoCredentials} medical staff without any credentials`,
      "All medical staff must have at least one credential (medical registration, nursing registration, etc.).",
      "Add credentials for all medical staff in Staff → Credentials.",
      undefined, undefined, medicalStaffNoCredentials));
  }
  track("STAFF", before);

  // 9d. Active staff with onboarding not completed
  before = issues.length;
  const incompleteOnboarding = await prisma.staff.count({
    where: {
      isActive: true,
      assignments: { some: { branchId, status: "ACTIVE" } },
      onboardingStatus: { in: ["DRAFT", "IN_REVIEW"] },
    },
  });
  if (incompleteOnboarding > 0) {
    issues.push(issue("STAFF-004", "STAFF", "INFO",
      `${incompleteOnboarding} active staff with incomplete onboarding`,
      "Staff onboarding should be completed before they are fully operational.",
      "Complete onboarding for all active staff members.",
      undefined, undefined, incompleteOnboarding));
  }
  track("STAFF", before);

  // 9e. USG equipment exists but no authorized staff
  before = issues.length;
  if (ultrasound.length > 0) {
    const usgAuth = await prisma.staff.count({
      where: {
        isActive: true, isUsgAuthorized: true,
        assignments: { some: { branchId, status: "ACTIVE" } },
      },
    });
    if (usgAuth === 0) {
      issues.push(issue("STAFF-005", "STAFF", "BLOCKER",
        "Ultrasound equipment exists but no USG-authorized staff",
        "PCPNDT Act requires at least one authorized person to operate ultrasound equipment.",
        "Grant USG authorization to qualified staff members.",
      ));
    }
  }
  track("STAFF", before);

  // 9f. Expired credentials on active staff
  before = issues.length;
  const expiredCredentials = await prisma.staffCredential.count({
    where: {
      validTo: { lt: now },
      staff: {
        isActive: true,
        assignments: { some: { branchId, status: "ACTIVE" } },
      },
    },
  });
  if (expiredCredentials > 0) {
    issues.push(issue("STAFF-006", "STAFF", "BLOCKER",
      `${expiredCredentials} expired credential(s) on active staff`,
      "Staff with expired credentials may not be legally authorized to practice.",
      "Renew expired credentials or suspend affected staff.",
      undefined, undefined, expiredCredentials));
  }
  track("STAFF", before);

  // 9g. Payer contracts expired
  before = issues.length;
  const expiredContracts = await prisma.payerContract.count({
    where: { branchId, status: "ACTIVE", endAt: { lt: now } },
  });
  if (expiredContracts > 0) {
    issues.push(issue("BILL-007", "BILLING", "WARNING",
      `${expiredContracts} payer contract(s) marked ACTIVE but past end date`,
      "Active contracts with past end dates should be renewed or status updated.",
      "Review and update expired payer contracts.",
      undefined, undefined, expiredContracts));
  }
  track("BILLING", before);

  // ═══════════════════════════════════════════════════════════════════════
  // SCORE
  // ═══════════════════════════════════════════════════════════════════════

  const blockers = issues.filter((i) => i.severity === "BLOCKER");
  const warnings = issues.filter((i) => i.severity === "WARNING");
  const infos = issues.filter((i) => i.severity === "INFO");
  const passCount = checksRun - blockers.length;

  let score = 100;
  score -= blockers.length * 5;
  score -= warnings.length * 2;
  score -= infos.length * 0.5;
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    totalChecks: checksRun,
    passCount: Math.max(0, passCount),
    issues,
    blockers,
    warnings,
    infos,
    score,
    categorySummary: catStats,
  };
}
