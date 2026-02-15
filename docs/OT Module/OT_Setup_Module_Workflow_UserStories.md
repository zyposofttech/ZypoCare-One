# ZypoCare One — OT Setup Module
# Complete Workflow & User Stories

**Module:** 3.11 OT Setup (Infrastructure — Phase 0)  
**Document Type:** Product Workflow & User Stories  
**Author:** Senior Product Manager  
**Version:** 1.0  
**Date:** February 15, 2026  
**Parent BRD:** ZypoCare One Unified BRD v2.0  
**BRD Reference:** Section 3.11 (OT Setup), Section 4.7 (OT Operations), INF-016

---

## 1. Module Purpose & Context

### 1.1 Why This Module Exists

The OT Setup module is a **Phase 0 (Infrastructure)** module. Its sole purpose is to configure the hospital's Operation Theatre complex **before** a single surgery is ever scheduled. Think of it as building and equipping the OT physically — but digitally. Without this setup being complete and validated, the operational OT module (Section 4.7 — OT Scheduling, Surgical Safety Checklist, Anesthesia Records, Intra-op Notes) **cannot function**.

### 1.2 Relationship to Other Modules

```
INFRASTRUCTURE (Phase 0 — This Module)           OPERATIONS (Phase 1+)
═══════════════════════════════════               ═══════════════════════
                                                  
┌──────────────────────┐                          ┌──────────────────────┐
│  3.4 Location        │──── Campus/Floor/Zone ──▶│  4.7 OT Scheduling   │
│  Hierarchy           │                          │  & Booking           │
└──────────────────────┘                          └──────────────────────┘
         │                                                 │
         ▼                                                 ▼
┌──────────────────────┐                          ┌──────────────────────┐
│  3.11 OT SETUP       │──── Theatres, Spaces ───▶│  Surgical Safety     │
│  (THIS MODULE)       │     Scheduling Rules     │  Checklist (WHO)     │
└──────────────────────┘                          └──────────────────────┘
         │                                                 │
         ▼                                                 ▼
┌──────────────────────┐                          ┌──────────────────────┐
│  3.12 Equipment      │──── OT Tables, Lights ──▶│  Anesthesia Records  │
│  Register            │     Cautery, Laparo      │  & Intra-op Notes    │
└──────────────────────┘                          └──────────────────────┘
         │                                                 │
         ▼                                                 ▼
┌──────────────────────┐                          ┌──────────────────────┐
│  3.6 Staff &         │──── Surgeon Privileges ─▶│  OT Consumable &     │
│  Privilege Mgmt      │     Anesthesia Priv.     │  Implant Tracking    │
└──────────────────────┘                          └──────────────────────┘
         │                                                 │
         ▼                                                 ▼
┌──────────────────────┐                          ┌──────────────────────┐
│  3.8 Pharmacy Infra  │──── OT Store Config  ───▶│  Post-op Care &      │
│  (OT Store)          │                          │  Recovery Mgmt       │
└──────────────────────┘                          └──────────────────────┘
         │
         ▼
┌──────────────────────┐
│  3.7 Service Catalog │──── Surgical Services ──▶  Billing & Revenue
└──────────────────────┘
```

### 1.3 Key Stakeholders

| Stakeholder | Role in OT Setup | Interaction Type |
|---|---|---|
| Hospital Admin / IT Lead | Primary configurator — runs the setup wizard, enters all data | Direct User |
| Chief Surgeon / Medical Director | Approves theatre configurations, specialty assignments, scheduling rules | Reviewer / Approver |
| Head of Anesthesia | Reviews induction room config, anesthesia store, gas pipeline mapping | Reviewer |
| OT In-Charge (Senior Nurse) | Validates space layout, sterile store, staff change rooms, turnaround rules | Reviewer |
| Biomedical Engineer | Links OT equipment from the Equipment Register, validates gas/electrical specs | Contributor |
| ZypoCare Implementation Team | Assists with template-based setup, validates go-live readiness | Support |
| AI Copilot | Suggests defaults, detects gaps, validates NABH compliance | System Actor |

### 1.4 Success Criteria

| Metric | Target |
|---|---|
| Time to configure complete OT infrastructure (per branch) | < 45 minutes for template-based, < 2 hours for manual |
| Go-Live validation pass rate for OT section | > 90% first attempt |
| NABH Chapter 8 (Facility Management) OT checks passing | 100% |
| Zero surgical scheduling failures due to missing infra config | 0 post go-live |
| OT utilization tracking available from Day 1 of operations | Yes |

---

## 2. Complete Workflow

### 2.1 High-Level OT Setup Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OT SETUP — MASTER WORKFLOW                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PREREQUISITES (must be completed before OT Setup)                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │ Org/Branch │  │ Location   │  │ Staff &    │  │ Service    │           │
│  │ Created    │  │ Hierarchy  │  │ Privileges │  │ Catalog    │           │
│  │ (3.2/3.3)  │  │ Set (3.4)  │  │ Done (3.6) │  │ Loaded(3.7)│           │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘           │
│         └────────────────┼───────────────┼───────────────┘                  │
│                          ▼                                                  │
│  ╔════════════════════════════════════════════════════════════════╗         │
│  ║  PHASE 1: OT COMPLEX REGISTRATION                            ║         │
│  ║  Step 1 → Define OT Complex (name, location in hierarchy)    ║         │
│  ║  Step 2 → Select hospital template OR start blank            ║         │
│  ║  🤖 AI suggests OT count based on bed strength & specialties ║         │
│  ╚════════════════════════════════════════════════════════════════╝         │
│                          │                                                  │
│                          ▼                                                  │
│  ╔════════════════════════════════════════════════════════════════╗         │
│  ║  PHASE 2: SPACE CONFIGURATION                                 ║         │
│  ║  Step 3 → Add OT Suite spaces (Theatre, Recovery, Pre-op,    ║         │
│  ║           Induction, Scrub, Sterile Store, Anesthesia Store,  ║         │
│  ║           Staff Change)                                       ║         │
│  ║  Step 4 → Map spaces to physical locations (floor/zone/area)  ║         │
│  ║  🤖 AI pre-fills mandatory spaces per NABH requirements      ║         │
│  ╚════════════════════════════════════════════════════════════════╝         │
│                          │                                                  │
│                          ▼                                                  │
│  ╔════════════════════════════════════════════════════════════════╗         │
│  ║  PHASE 3: THEATRE CONFIGURATION                               ║         │
│  ║  Step 5 → Configure each theatre:                             ║         │
│  ║           - Type (General/Modular/Laminar/Hybrid)             ║         │
│  ║           - Engineering specs (airflow, pressure, ISO class)  ║         │
│  ║           - Physical attributes (area, gas pipeline, power)   ║         │
│  ║  Step 6 → Assign specialties to theatres                      ║         │
│  ║  Step 7 → Set scheduling parameters                           ║         │
│  ║           (turnaround, cleaning time, max cases/day)          ║         │
│  ║  🤖 AI validates engineering specs against theatre type       ║         │
│  ╚════════════════════════════════════════════════════════════════╝         │
│                          │                                                  │
│                          ▼                                                  │
│  ╔════════════════════════════════════════════════════════════════╗         │
│  ║  PHASE 4: EQUIPMENT LINKING                                   ║         │
│  ║  Step 8 → Link equipment from Equipment Register (3.12)       ║         │
│  ║           to specific theatres/spaces                         ║         │
│  ║  Step 9 → Validate mandatory equipment per theatre type       ║         │
│  ║  🤖 AI flags missing mandatory equipment per NABH            ║         │
│  ╚════════════════════════════════════════════════════════════════╝         │
│                          │                                                  │
│                          ▼                                                  │
│  ╔════════════════════════════════════════════════════════════════╗         │
│  ║  PHASE 5: STAFF & ACCESS CONFIGURATION                        ║         │
│  ║  Step 10 → Assign default OT staff (OT in-charge, techs,     ║         │
│  ║            nursing staff, housekeeping)                        ║         │
│  ║  Step 11 → Configure access control (who can enter which      ║         │
│  ║            zones — sterile, semi-sterile, unrestricted)       ║         │
│  ║  Step 12 → Map surgeon & anesthetist privileges to theatres   ║         │
│  ║  🤖 AI detects privilege gaps for assigned specialties        ║         │
│  ╚════════════════════════════════════════════════════════════════╝         │
│                          │                                                  │
│                          ▼                                                  │
│  ╔════════════════════════════════════════════════════════════════╗         │
│  ║  PHASE 6: OT STORE & CONSUMABLES SETUP                        ║         │
│  ║  Step 13 → Link or create OT Store (from Pharmacy Infra 3.8) ║         │
│  ║  Step 14 → Configure default surgical consumables list        ║         │
│  ║  Step 15 → Set par levels for OT-specific items               ║         │
│  ║  🤖 AI suggests consumable list based on specialties          ║         │
│  ╚════════════════════════════════════════════════════════════════╝         │
│                          │                                                  │
│                          ▼                                                  │
│  ╔════════════════════════════════════════════════════════════════╗         │
│  ║  PHASE 7: SCHEDULING RULES & POLICIES                         ║         │
│  ║  Step 16 → Define OT operating hours (per theatre/per day)    ║         │
│  ║  Step 17 → Configure slot duration rules per surgery type     ║         │
│  ║  Step 18 → Set emergency OT reservation policy                ║         │
│  ║  Step 19 → Define cancellation & rescheduling rules           ║         │
│  ║  Step 20 → Configure pre-op checklist templates               ║         │
│  ║  🤖 AI suggests operating hours based on case mix data        ║         │
│  ╚════════════════════════════════════════════════════════════════╝         │
│                          │                                                  │
│                          ▼                                                  │
│  ╔════════════════════════════════════════════════════════════════╗         │
│  ║  PHASE 8: SERVICE & BILLING MAPPING                           ║         │
│  ║  Step 21 → Link surgical services from Service Catalog (3.7)  ║         │
│  ║  Step 22 → Map OT charges (theatre charges, anesthesia        ║         │
│  ║            charges, material charges) to tariff plans          ║         │
│  ║  Step 23 → Configure surgeon fee structures                   ║         │
│  ║  🤖 AI validates all surgical services have charge mappings   ║         │
│  ╚════════════════════════════════════════════════════════════════╝         │
│                          │                                                  │
│                          ▼                                                  │
│  ╔════════════════════════════════════════════════════════════════╗         │
│  ║  PHASE 9: COMPLIANCE & SAFETY CONFIGURATION                   ║         │
│  ║  Step 24 → Enable WHO Surgical Safety Checklist               ║         │
│  ║  Step 25 → Configure infection control zones (sterile,        ║         │
│  ║            semi-sterile, unrestricted)                         ║         │
│  ║  Step 26 → Set fumigation/sterilization schedule              ║         │
│  ║  Step 27 → Configure biomedical waste zones                   ║         │
│  ║  Step 28 → Map fire safety & emergency exits                  ║         │
│  ║  🤖 AI runs NABH Chapter 5 & 8 compliance validation         ║         │
│  ╚════════════════════════════════════════════════════════════════╝         │
│                          │                                                  │
│                          ▼                                                  │
│  ╔════════════════════════════════════════════════════════════════╗         │
│  ║  PHASE 10: REVIEW, VALIDATE & ACTIVATE                        ║         │
│  ║  Step 29 → Run OT-specific Go-Live Validation                 ║         │
│  ║  Step 30 → Review summary with Medical Director / Chief       ║         │
│  ║            Surgeon for sign-off                                ║         │
│  ║  Step 31 → Activate OT Complex → ready for operations team    ║         │
│  ║  🤖 AI generates readiness score and gap report               ║         │
│  ╚════════════════════════════════════════════════════════════════╝         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 State Machine — OT Setup Lifecycle

```
                    ┌───────────┐
                    │  NOT      │
                    │  STARTED  │
                    └─────┬─────┘
                          │ Admin initiates OT Setup
                          ▼
                    ┌───────────┐
                    │  DRAFT    │ ◄─── Can edit freely
                    │           │      No validation enforced
                    └─────┬─────┘
                          │ Admin clicks "Submit for Review"
                          ▼
                    ┌───────────┐
                    │ IN REVIEW │ ◄─── Medical Director / Chief Surgeon reviews
                    │           │      Can send back to DRAFT with comments
                    └─────┬─────┘
                          │ Reviewer approves
                          ▼
                    ┌───────────┐
                    │ VALIDATED │ ◄─── Go-Live Validator runs automated checks
                    │           │      Must pass all blocker-level checks
                    └─────┬─────┘
                          │ Admin activates
                          ▼
                    ┌───────────┐
                    │  ACTIVE   │ ◄─── OT is now live and schedulable
                    │           │      Operations team can use it
                    └─────┬─────┘
                          │
              ┌───────────┼───────────┐
              ▼                       ▼
     ┌──────────────┐      ┌──────────────┐
     │ UNDER         │      │ DECOMMIS-    │
     │ MAINTENANCE   │      │ SIONED       │
     │ (Temporary)   │      │ (Permanent)  │
     └──────────────┘      └──────────────┘
```

---

## 3. Detailed User Stories

### 3.0 Epic Overview

| Epic ID | Epic Name | Phase | Story Count |
|---|---|---|---|
| OT-EPIC-01 | OT Complex Registration | Phase 1 | 5 |
| OT-EPIC-02 | OT Space Configuration | Phase 2 | 7 |
| OT-EPIC-03 | Theatre Configuration | Phase 3 | 9 |
| OT-EPIC-04 | Equipment Linking | Phase 4 | 5 |
| OT-EPIC-05 | Staff & Access Configuration | Phase 5 | 7 |
| OT-EPIC-06 | OT Store & Consumables | Phase 6 | 5 |
| OT-EPIC-07 | Scheduling Rules & Policies | Phase 7 | 8 |
| OT-EPIC-08 | Service & Billing Mapping | Phase 8 | 5 |
| OT-EPIC-09 | Compliance & Safety Config | Phase 9 | 7 |
| OT-EPIC-10 | Validation & Activation | Phase 10 | 6 |
| **Total** | | | **64** |

---

### EPIC 01: OT Complex Registration

> **Goal:** Register the OT complex within the hospital's location hierarchy and establish its identity in the system.

---

**OTS-001: Create OT Complex**

- **As a** Hospital Admin
- **I want to** create a new OT Complex by providing a name, code, and selecting its location in the hospital hierarchy (Campus → Building → Floor → Zone)
- **So that** the OT complex exists as a defined zone within the hospital's physical layout and all subsequent OT configuration is anchored to this location
- **Acceptance Criteria:**
  1. Admin can create an OT Complex with: Name (e.g., "Main OT Complex"), Code (auto-generated, editable), Description, and parent location (must be a Floor or Zone in the existing hierarchy)
  2. System validates that no duplicate OT Complex code exists within the branch
  3. OT Complex is created with status = DRAFT
  4. OT Complex appears in the Location Hierarchy tree under its parent
  5. Audit log records who created it and when
- **Priority:** P0

---

**OTS-002: Apply Hospital Template for OT**

- **As a** Hospital Admin
- **I want to** apply a pre-built hospital template (Small/Medium/Large) that auto-generates OT spaces, theatres, and default configurations based on my hospital's size and specialties
- **So that** I can set up the OT infrastructure in minutes instead of hours, and only customize what's different from the default
- **Acceptance Criteria:**
  1. When OT Complex is created, system offers: "Apply Template" or "Configure Manually"
  2. Templates available: Small Clinic (1 OT, 1 Recovery Bay), Medium Hospital (2-3 OTs, 2 Recovery Bays, full support spaces), Large Hospital (4+ OTs, dedicated recovery ward, full suite)
  3. Template pre-fills: all OT suite spaces, theatre types, default scheduling parameters, mandatory equipment list, infection control zones, and WHO checklist enablement
  4. Admin can review and modify every pre-filled value before saving
  5. Template application is logged as a single audit event with template name and version
- **Priority:** P0

---

**OTS-003: AI-Suggested OT Configuration**

- **As a** Hospital Admin
- **I want** the AI Copilot to analyze my hospital's bed strength, registered specialties, and surgeon count, and suggest the optimal number of theatres, their types, and specialty assignments
- **So that** I don't under-provision or over-provision OT capacity for my hospital
- **Acceptance Criteria:**
  1. AI Copilot analyzes: total bed count, surgical specialty count, registered surgeons with SURGICAL privilege, and hospital template (if applied)
  2. AI generates a recommendation card: "Based on your 75-bed hospital with 5 surgical specialties and 12 surgeons, we recommend 3 theatres — 2 General + 1 Laminar Flow"
  3. Recommendation includes reasoning (e.g., "Orthopedics and Ophthalmology benefit from laminar flow")
  4. Admin can accept, modify, or dismiss the recommendation
  5. If dismissed, AI does not re-prompt unless admin explicitly asks
- **Priority:** P1

---

**OTS-004: Clone OT Configuration from Another Branch**

- **As a** Hospital Admin of a multi-branch hospital chain
- **I want to** clone the entire OT setup from an existing branch to a new branch
- **So that** I can replicate a proven configuration instantly and only adjust for branch-specific differences (e.g., fewer theatres, different floor)
- **Acceptance Criteria:**
  1. Admin can select a source branch and target branch
  2. System clones: all OT spaces, theatre configurations, scheduling rules, compliance settings, and checklist templates
  3. Equipment, staff assignments, and store linkages are NOT cloned (these are branch-specific)
  4. Cloned configuration is created in DRAFT status for review
  5. System shows a diff summary: "Cloned 3 theatres, 8 spaces, 15 scheduling rules from [Branch A]. Equipment and staff assignments need to be configured."
- **Priority:** P0

---

**OTS-005: View and Edit OT Complex Summary**

- **As a** Hospital Admin
- **I want to** see a single-screen summary dashboard of the OT Complex showing all configured spaces, theatres, equipment counts, staff assignments, and current setup status
- **So that** I can quickly assess progress and identify what's left to configure
- **Acceptance Criteria:**
  1. Dashboard shows: OT Complex name, location, status (Draft/In Review/Active), setup progress bar (% complete across all phases)
  2. Section-wise status cards: Spaces (x/y configured), Theatres (x/y configured), Equipment (x linked), Staff (x assigned), Store (linked/not linked), Scheduling (configured/not), Compliance (x/y checks passing)
  3. Each card is clickable and navigates to the respective configuration screen
  4. Incomplete sections are highlighted with amber; blocker sections in red
  5. "Last edited by [User] at [timestamp]" shown at the top
- **Priority:** P0

---

### EPIC 02: OT Space Configuration

> **Goal:** Define every physical space within the OT complex — theatres, recovery bays, pre-op holding, induction rooms, scrub areas, sterile stores, anesthesia stores, and staff change rooms.

---

**OTS-006: Add OT Suite Space**

- **As a** Hospital Admin
- **I want to** add individual spaces to the OT Complex by selecting a space type (THEATRE, RECOVERY_BAY, PREOP_HOLDING, INDUCTION_ROOM, SCRUB_ROOM, STERILE_STORE, ANESTHESIA_STORE, STAFF_CHANGE)
- **So that** every physical area within the OT complex is digitally registered and can be managed
- **Acceptance Criteria:**
  1. Admin can add a space with: Space Type (from enum), Name (e.g., "Recovery Bay 1"), Code, Floor Area (sq ft), Location mapping (floor/zone), Capacity (for recovery bays — number of trolleys/beds), and status (Active/Inactive/Under Maintenance)
  2. Multiple spaces of the same type can be added (e.g., 2 recovery bays)
  3. System enforces that at least one space of each mandatory type exists before validation (THEATRE, RECOVERY_BAY, SCRUB_ROOM — minimum NABH requirement)
  4. Spaces inherit the parent OT Complex's branch and campus
  5. Each space gets a unique system ID for cross-referencing in operational modules
- **Priority:** P0

---

**OTS-007: Configure Recovery Bay**

- **As a** Hospital Admin
- **I want to** configure each recovery bay with its trolley/bed capacity, monitoring equipment availability, nurse-to-patient ratio, and maximum recovery duration defaults
- **So that** the operational OT module can manage post-operative patient flow and prevent recovery bay overflow
- **Acceptance Criteria:**
  1. Each recovery bay captures: Total trolley/bed count, Monitoring stations available (with/without monitor), Oxygen points, Suction points, Default recovery duration (minutes) by surgery category (Minor/Major/Complex), Nurse-to-patient ratio
  2. Trolleys/beds within recovery bays follow the standard resource state machine (Available → Occupied → Cleaning → Available)
  3. System calculates total recovery capacity for the OT Complex (sum across all bays)
  4. AI Copilot warns if recovery capacity is insufficient relative to theatre count and max daily cases (e.g., "3 theatres × 8 cases/day = 24 cases. Your 4-trolley recovery bay may bottleneck after 3 PM.")
- **Priority:** P0

---

**OTS-008: Configure Pre-Op Holding Area**

- **As a** Hospital Admin
- **I want to** configure the pre-op holding area with its bed/trolley capacity, patient identification verification points, and consent documentation station
- **So that** the system knows the holding capacity and can manage the pre-op queue flow
- **Acceptance Criteria:**
  1. Pre-op holding captures: Capacity (beds/trolleys), ID verification station flag (wristband printer), Consent station flag, Average holding duration (minutes), Attached to which theatres (1:many relationship)
  2. System enforces that at least one pre-op holding area exists if any theatre is configured
  3. Pre-op holding appears on the OT workflow when scheduling is active
- **Priority:** P0

---

**OTS-009: Configure Induction Room**

- **As a** Hospital Admin
- **I want to** configure induction rooms where anesthesia is administered before the patient enters the theatre
- **So that** the operational module can track patient movement from induction to theatre and measure induction-to-incision time
- **Acceptance Criteria:**
  1. Induction room captures: Name/Code, Attached theatres (which theatres this induction room serves), Anesthesia machine availability, Monitoring equipment, Emergency crash cart availability flag, Gas pipeline availability (O2, N2O, Air, Vacuum)
  2. Induction rooms are optional (some hospitals administer anesthesia inside the theatre)
  3. If no induction room is configured, system assumes anesthesia happens in-theatre
- **Priority:** P1

---

**OTS-010: Configure Scrub Room**

- **As a** Hospital Admin
- **I want to** configure scrub rooms (stations) attached to specific theatres, specifying the number of scrub stations (sinks) per room
- **So that** the system can enforce scrub area adequacy during NABH audits and support scrub compliance tracking
- **Acceptance Criteria:**
  1. Scrub room captures: Name/Code, Number of scrub stations (sinks), Attached theatres (which theatres it serves — usually shared between 2 theatres), Elbow-operated/sensor taps flag, Timer display available flag
  2. NABH validation rule: Minimum 1 scrub station per theatre; at least 2 stations per scrub room recommended
  3. AI flags if scrub station count is below recommended ratio
- **Priority:** P0

---

**OTS-011: Configure Sterile Store & Anesthesia Store**

- **As a** Hospital Admin
- **I want to** configure the sterile supply store and anesthesia store within the OT complex, including their storage capacity, temperature monitoring, and inventory linkage
- **So that** surgical and anesthesia supplies are tracked from storage to usage within the OT
- **Acceptance Criteria:**
  1. Sterile Store captures: Name/Code, Area (sq ft), Shelving capacity, Temperature monitoring flag, Humidity monitoring flag, Autoclave availability (linked from Equipment Register), CSSD linkage (Central Sterile Supply Department — internal or external)
  2. Anesthesia Store captures: Name/Code, Controlled substance storage (narcotics safe — present/absent), Drug refrigerator flag, Linked to pharmacy sub-store (from Pharmacy Infra 3.8 — OT Store)
  3. System creates the link between anesthesia store and OT pharmacy store for inventory management
  4. If OT Store not yet configured in Pharmacy Infra, system shows a warning with a link to configure it
- **Priority:** P0

---

**OTS-012: Configure Staff Change Rooms**

- **As a** Hospital Admin
- **I want to** configure staff change rooms with their capacity, locker count, and gender separation
- **So that** the system records OT access control points and supports infection control zone mapping
- **Acceptance Criteria:**
  1. Staff change room captures: Name/Code, Gender (Male/Female/Unisex), Locker count, Shower facility flag, Shoe change station flag
  2. At least one male and one female change room recommended; AI flags if only one unisex room for large OT complexes
  3. Change rooms are mapped as the entry point to the semi-restricted zone in infection control configuration
- **Priority:** P1

---

### EPIC 03: Theatre Configuration

> **Goal:** Configure each individual Operation Theatre with its type, engineering specifications, specialty assignments, and scheduling parameters.

---

**OTS-013: Create Theatre**

- **As a** Hospital Admin
- **I want to** create a new theatre within the OT Complex by specifying its name, code, and type (General, Modular, Laminar, Hybrid)
- **So that** each theatre is individually identifiable and its capabilities are recorded for appropriate case assignment
- **Acceptance Criteria:**
  1. Theatre creation requires: Name (e.g., "OT-1"), Code (auto-generated, editable), Theatre Type (GENERAL / MODULAR / LAMINAR / HYBRID), Status (Active / Inactive / Under Maintenance)
  2. System auto-assigns a sequential number if code is not overridden
  3. Theatre type determines default engineering spec suggestions (e.g., LAMINAR → Laminar airflow auto-selected)
  4. Theatre is created within the OT Complex's location and inherits its branch/campus
  5. Theatre appears on the OT calendar/scheduler once activated
- **Priority:** P0

---

**OTS-014: Configure Theatre Engineering Specifications**

- **As a** Hospital Admin / Biomedical Engineer
- **I want to** configure the engineering specifications for each theatre: airflow type, pressure configuration, ISO cleanliness class, gas pipeline connections, electrical backup, and area
- **So that** the system can validate whether a theatre meets the engineering requirements for specific surgery types and support NABH facility audits
- **Acceptance Criteria:**
  1. Engineering specs per theatre: Airflow Type (Standard / Laminar), Pressure Configuration (Positive / Negative / Neutral), ISO Cleanliness Class (ISO 5 / ISO 6 / ISO 7 / ISO 8), Area (sq ft), Ceiling Height (ft), Gas Pipeline (O2, N2O, Medical Air, Vacuum — each with on/off and outlet count), Electrical: UPS-backed outlets count, Isolated power supply flag, Temperature & Humidity control (range values), Lighting: Lux level (operating zone), Emergency lighting flag
  2. AI validates combinations: e.g., Laminar type must have ISO 5 or ISO 6; Negative pressure for isolation cases; Hybrid OT must have imaging-compatible specifications
  3. Mismatched combinations trigger a warning (not a blocker) with recommended corrections
  4. All specs are auditable and version-controlled (change history maintained)
- **Priority:** P0

---

**OTS-015: Assign Specialties to Theatre**

- **As a** Hospital Admin / Chief Surgeon
- **I want to** assign one or more surgical specialties to each theatre (e.g., OT-1 → General Surgery + Orthopedics, OT-2 → Ophthalmology + ENT)
- **So that** the scheduling system restricts bookings to appropriate theatres and enables specialty-wise utilization tracking
- **Acceptance Criteria:**
  1. Admin selects specialties from the pre-loaded MCI specialty master (only surgical specialties shown)
  2. A theatre can have multiple specialties; a specialty can be assigned to multiple theatres
  3. One specialty can be marked as "Primary" for reporting purposes
  4. If a theatre type is LAMINAR, AI suggests specialties that benefit from laminar flow (Orthopedics, Ophthalmology, Cardiac Surgery)
  5. System warns if a registered surgical specialty has no theatre assigned (e.g., "Urology has 2 surgeons with SURGICAL privilege but no assigned theatre")
- **Priority:** P0

---

**OTS-016: Configure Theatre Scheduling Parameters**

- **As a** Hospital Admin / OT In-Charge
- **I want to** set the scheduling parameters for each theatre: turnaround time between cases, cleaning time, maximum cases per day, and slot duration defaults
- **So that** the OT scheduling engine enforces realistic time gaps and prevents over-booking
- **Acceptance Criteria:**
  1. Parameters per theatre: Turnaround Time (minutes — time between one case end and next case start, includes cleaning), Cleaning Time (minutes — subset of turnaround, for housekeeping tracking), Max Cases Per Day (hard cap), Default Slot Duration by category (Minor: default 60 min, Major: default 120 min, Complex: default 180 min — all editable), Buffer between emergency and elective slots (minutes)
  2. System calculates: Available surgical hours/day = (Operating hours) - (Turnaround × Max cases) - Buffer
  3. AI warns if max cases per day is unrealistic given turnaround time and operating hours (e.g., "With 30-min turnaround and 8 operating hours, max realistic cases for major surgeries is 4, not 8")
  4. Parameters can differ per theatre (e.g., laminar flow OT may have longer turnaround due to air handling)
- **Priority:** P0

---

**OTS-017: Configure Theatre Operating Hours**

- **As a** Hospital Admin
- **I want to** define operating hours for each theatre on a per-day-of-week basis, including distinction between elective hours and emergency-only hours
- **So that** the scheduling system knows when each theatre is available and can differentiate elective vs emergency slots
- **Acceptance Criteria:**
  1. Operating hours per theatre, per day of week: Start Time, End Time, Session Type (ELECTIVE / EMERGENCY / BOTH), Lunch Break (if applicable — start, end)
  2. Support for: Full day (e.g., 8 AM – 6 PM), Half day (e.g., Saturday 8 AM – 1 PM), Closed (e.g., Sunday), 24×7 (for designated emergency OT)
  3. At least one theatre must be configured as available for emergency (24×7 or with on-call availability flag) — this is an NABH requirement
  4. System prevents scheduling outside defined hours unless emergency override is used
  5. Operating hours are effective-dated (can be changed for future dates without affecting past schedules)
- **Priority:** P0

---

**OTS-018: Configure Specialty-Day Allocation**

- **As a** Hospital Admin / Chief Surgeon
- **I want to** allocate specific days and time slots to specific specialties within a theatre (e.g., OT-1: Monday AM = Orthopedics, Monday PM = General Surgery, Tuesday = ENT all day)
- **So that** specialties have predictable OT access and the scheduling system can enforce allocation-based bookings
- **Acceptance Criteria:**
  1. Allocation grid: Theatre × Day of Week × Time Slot (AM/PM/Full Day) → Specialty
  2. Unallocated slots remain open for any specialty (OPEN pool)
  3. Allocation is a preference, not a hard block (can be overridden with appropriate privilege)
  4. AI suggests allocation based on surgeon availability patterns and historical case mix (P2 feature)
  5. View: Weekly calendar view showing specialty color-coded blocks per theatre
- **Priority:** P1

---

**OTS-019: Set Emergency OT Reservation Policy**

- **As a** Hospital Admin / Medical Director
- **I want to** configure the emergency OT reservation policy — which theatre(s) are designated for emergencies, whether a dedicated emergency OT exists, and the escalation rules when all theatres are occupied
- **So that** emergency surgeries always have a guaranteed pathway and the system can handle emergency OT booking logic correctly
- **Acceptance Criteria:**
  1. Policy configuration: Dedicated Emergency OT flag (yes/no — if yes, designate which theatre), Emergency OT availability (24×7 or on-call after hours), Escalation rule when all OTs occupied: (a) Bump lowest-priority elective, (b) Queue with ETA, (c) Alert Medical Director
  2. If no dedicated emergency OT, system requires at least one theatre marked as "Emergency Eligible"
  3. Emergency booking bypasses specialty-day allocation and slot duration rules
  4. Emergency booking requires entry of: Emergency category (Immediate / Urgent / Expedited) per NCEPOD classification
  5. System logs all emergency pre-emptions with reason and approver
- **Priority:** P0

---

**OTS-020: Bulk Import Theatre Configuration**

- **As a** Hospital Admin
- **I want to** import multiple theatre configurations via a structured Excel/CSV template
- **So that** large hospitals with 8+ theatres can configure all theatres at once without repetitive manual entry
- **Acceptance Criteria:**
  1. System provides a downloadable template (Excel) with columns for all theatre fields: Name, Code, Type, Airflow, Pressure, ISO Class, Area, Specialties (comma-separated), Turnaround Min, Cleaning Min, Max Cases/Day, Operating Hours
  2. Upload validates all rows before import; shows row-by-row errors/warnings
  3. Successfully imported theatres appear in DRAFT status
  4. Import log is recorded with file name, row count, success/failure counts
  5. Template includes a "Sample Data" sheet with filled examples
- **Priority:** P1

---

**OTS-021: Theatre Configuration Diff & Version History**

- **As a** Hospital Admin
- **I want to** view the change history of any theatre's configuration, with a diff view showing what changed, when, and by whom
- **So that** I can audit configuration changes, especially before NABH assessments or after any incident investigation
- **Acceptance Criteria:**
  1. Every save to theatre configuration creates a version record
  2. Admin can view version history: list of changes with timestamp, user, and summary
  3. Diff view shows field-by-field comparison between any two versions
  4. Changes to critical fields (ISO class, airflow, pressure, emergency designation) are flagged with a special audit marker
  5. Version history is exportable as PDF for NABH audit documentation
- **Priority:** P1

---

### EPIC 04: Equipment Linking

> **Goal:** Link equipment assets from the Equipment Register (3.12) to specific theatres and OT spaces, and validate mandatory equipment presence.

---

**OTS-022: Link Equipment to Theatre**

- **As a** Hospital Admin / Biomedical Engineer
- **I want to** link equipment items (OT Table, OT Light, Cautery, Anesthesia Workstation, Laparoscopy Tower, Patient Monitor, etc.) from the central Equipment Register to a specific theatre
- **So that** each theatre has a known equipment inventory, and the system can validate equipment availability before scheduling a case
- **Acceptance Criteria:**
  1. Admin sees a searchable list of equipment from the Equipment Register, filtered by category = "Surgical" and status = "Active"
  2. Admin selects equipment and assigns it to a specific theatre
  3. One equipment item can only be assigned to one location at a time (prevents double-assignment)
  4. Equipment assignment records: Equipment ID, Theatre, Assignment Date, Assigned By
  5. Theatre's equipment tab shows all linked equipment with their maintenance status and next service date
- **Priority:** P0

---

**OTS-023: Link Equipment to OT Spaces (Non-Theatre)**

- **As a** Hospital Admin / Biomedical Engineer
- **I want to** link equipment to non-theatre OT spaces — patient monitors to recovery bays, autoclaves to sterile stores, crash carts to induction rooms
- **So that** the complete OT equipment inventory is location-mapped and nothing is unaccounted for
- **Acceptance Criteria:**
  1. Equipment can be linked to any OT space (not just theatres)
  2. Recovery Bay: Patient monitors, Pulse oximeters, Oxygen concentrators
  3. Sterile Store: Autoclaves, Washer disinfectors
  4. Induction Room: Anesthesia machines, Monitors, Crash cart
  5. System shows an OT-wide equipment summary: total equipment linked, categorized by space
- **Priority:** P0

---

**OTS-024: Validate Mandatory Equipment per Theatre Type**

- **As a** Hospital Admin
- **I want** the system to automatically validate that each theatre has the mandatory equipment based on its type, and flag missing items
- **So that** no theatre goes live without essential equipment, preventing patient safety risks
- **Acceptance Criteria:**
  1. Mandatory equipment rules by theatre type:
     - ALL theatres: OT Table, OT Light, Cautery/Diathermy, Patient Monitor (with SpO2, ECG, NIBP), Anesthesia Workstation, Suction Machine, Defibrillator (or access to one)
     - LAMINAR: All above + HEPA filter system
     - HYBRID: All above + C-Arm or fixed imaging system
     - LAPAROSCOPIC-enabled: All above + Laparoscopy Tower + Monitor + Insufflator
  2. System runs validation automatically and shows: ✅ Present, ❌ Missing, ⚠️ Under Maintenance
  3. Missing mandatory equipment is a Go-Live blocker
  4. Equipment under maintenance generates a warning (not a blocker)
- **Priority:** P0

---

**OTS-025: OT Equipment Dashboard**

- **As a** Hospital Admin / OT In-Charge
- **I want to** see a dashboard showing all OT equipment across all theatres and spaces — with their current status, maintenance schedule, and AMC (Annual Maintenance Contract) expiry
- **So that** I can proactively manage equipment availability and plan maintenance windows
- **Acceptance Criteria:**
  1. Dashboard shows: Equipment name, Location (theatre/space), Status (Active/Under Maintenance/Out of Order), Last Maintenance Date, Next Maintenance Due, AMC Vendor, AMC Expiry Date
  2. Filterable by: Location, Status, Equipment Category, AMC Expiry (within 30/60/90 days)
  3. AI alerts: "OT Table in OT-2 maintenance overdue by 15 days" or "AMC for Anesthesia Workstation expiring in 20 days"
  4. Export to Excel for procurement/biomedical team
- **Priority:** P1

---

**OTS-026: Equipment Downtime Impact Analysis**

- **As a** Hospital Admin / OT In-Charge
- **I want** the system to show me the impact when I mark a critical equipment item as "Under Maintenance" or "Out of Order"
- **So that** I understand which surgeries or theatre capabilities are affected before taking equipment offline
- **Acceptance Criteria:**
  1. When admin changes equipment status to Under Maintenance or Out of Order, system checks: Is this equipment mandatory for the theatre type? Are there scheduled cases in the next 7 days requiring this equipment? Is there a backup unit available in another theatre?
  2. System shows impact summary: "Taking Laparoscopy Tower offline in OT-1 will affect 3 scheduled laparoscopic surgeries this week. OT-3 has an available Laparoscopy Tower."
  3. Admin can proceed or cancel the status change
  4. If proceeded, affected scheduled cases are flagged for the OT coordinator
- **Priority:** P2

---

### EPIC 05: Staff & Access Configuration

> **Goal:** Assign default OT staff, map surgeon and anesthetist privileges to theatres, and configure OT zone-based access control.

---

**OTS-027: Assign Default OT Staff**

- **As a** Hospital Admin
- **I want to** assign default OT staff members — OT In-Charge, OT Technicians, Scrub Nurses, Circulating Nurses, OT Attendants, and Housekeeping staff — to the OT Complex
- **So that** the OT has a known team, and the scheduling system can default these staff for case assignments
- **Acceptance Criteria:**
  1. Staff roles available for OT assignment: OT In-Charge, OT Technician, Scrub Nurse, Circulating Nurse, Recovery Nurse, OT Attendant, Housekeeping, Anesthesia Technician
  2. Admin selects staff from the Staff Register (3.6), filtered by department = "OT" or role = OT-related
  3. Each staff member is assigned a default shift pattern (Morning/Evening/Night)
  4. One OT In-Charge must be designated (mandatory for NABH)
  5. Staff list is the default team; individual case-level staff assignment happens in operational module
- **Priority:** P0

---

**OTS-028: Map Surgeon Privileges to Theatres**

- **As a** Hospital Admin / Medical Director
- **I want to** view all doctors with SURGICAL privileges and map which theatres they are authorized to operate in
- **So that** the scheduling system only allows a surgeon to book a theatre they are authorized for
- **Acceptance Criteria:**
  1. System pulls all doctors with Privilege Type = SURGICAL from Staff Module (3.6)
  2. Admin maps each surgeon to one or more theatres (default: all theatres for their specialty)
  3. Mapping considers: Surgeon's specialty vs Theatre's assigned specialties (must match at least one)
  4. System flags surgeons with SURGICAL privilege but no theatre mapping ("Dr. X has surgical privileges for Orthopedics but is not mapped to any theatre")
  5. Mapping is effective-dated and can be revoked
- **Priority:** P0

---

**OTS-029: Map Anesthetist Privileges to Theatres**

- **As a** Hospital Admin / Head of Anesthesia
- **I want to** map anesthetists (doctors with ANESTHESIA privilege) to theatres they are authorized to administer anesthesia in
- **So that** every surgery has a validated anesthetist assignment and the system can enforce anesthesia coverage during scheduling
- **Acceptance Criteria:**
  1. System pulls all doctors with Privilege Type = ANESTHESIA from Staff Module
  2. Admin maps each anesthetist to theatres (default: all theatres)
  3. System validates: at least one anesthetist is mapped to each active theatre (NABH requirement)
  4. AI warns: "OT-3 has no mapped anesthetist. Surgeries cannot be scheduled until at least one anesthetist is authorized."
  5. System supports concurrent mapping (one anesthetist covering multiple theatres on the same day) with a concurrent-case limit
- **Priority:** P0

---

**OTS-030: Configure OT Zone Access Control**

- **As a** Hospital Admin / OT In-Charge
- **I want to** define the OT's infection control zones — Unrestricted, Semi-Restricted, and Restricted — and map which roles/staff categories can access which zones
- **So that** the system supports infection control auditing and access tracking aligns with NABH Chapter 5 (Hospital Infection Control) requirements
- **Acceptance Criteria:**
  1. Three zones defined: UNRESTRICTED (reception, corridors), SEMI_RESTRICTED (staff change, pre-op holding, recovery), RESTRICTED (theatres, scrub, sterile store, induction)
  2. Admin maps each OT space to a zone
  3. Role-based access rules: e.g., Surgeons → Restricted, Recovery Nurse → Semi-Restricted only, Housekeeping → Restricted (with schedule), Visitors → Unrestricted only
  4. Configuration is for policy documentation and audit — not physical access control (no hardware dependency)
  5. Exportable as an OT Access Policy document (PDF) for NABH file
- **Priority:** P1

---

**OTS-031: Set Minimum Staffing Rules per Theatre**

- **As a** Hospital Admin / OT In-Charge
- **I want to** define the minimum staffing requirement per theatre per case — e.g., 1 Surgeon, 1 Anesthetist, 1 Scrub Nurse, 1 Circulating Nurse — as a configurable rule
- **So that** the scheduling system enforces minimum staffing before a case can begin, ensuring patient safety
- **Acceptance Criteria:**
  1. Minimum staffing rule per theatre: Surgeon (min count), Anesthetist (min count), Scrub Nurse (min count), Circulating Nurse (min count), OT Technician (min count — optional), Anesthesia Technician (min count — optional)
  2. Rules can differ per surgery category (Minor: relaxed, Major/Complex: full team)
  3. Default rule (NABH-aligned): 1 Surgeon + 1 Anesthetist + 1 Scrub Nurse + 1 Circulating Nurse = mandatory
  4. Scheduling system uses these rules to validate case assignments in the operational module
  5. Rule violation generates a warning during case scheduling, with override requiring senior approval
- **Priority:** P0

---

**OTS-032: AI Detection of Privilege Gaps**

- **As a** Hospital Admin
- **I want** the AI Copilot to automatically detect gaps in surgical and anesthesia privilege assignments relative to the OT setup
- **So that** I don't go live with theatres that lack authorized surgeons or anesthetists
- **Acceptance Criteria:**
  1. AI checks: Every theatre with an assigned specialty has at least one surgeon with SURGICAL privilege for that specialty mapped to it
  2. AI checks: Every active theatre has at least one anesthetist mapped
  3. AI checks: Surgeon privileges are not expired or expiring within 30 days
  4. Gaps are shown as warnings in the OT Setup Dashboard and as blockers in Go-Live Validation
  5. AI suggests resolution: "Map Dr. Y (Orthopedics, SURGICAL privilege valid till Dec 2026) to OT-2 to cover Orthopedics"
- **Priority:** P1

---

**OTS-033: OT Staff Contact Directory**

- **As a** Hospital Admin / OT In-Charge
- **I want to** generate an OT staff contact directory showing all assigned staff with their role, contact number, shift pattern, and on-call status
- **So that** the OT In-Charge has a quick-reference contact list for coordination, especially during emergencies
- **Acceptance Criteria:**
  1. Directory shows: Staff Name, Role, Contact Number, Email, Default Shift, On-Call Roster (if configured), Photo (from staff profile)
  2. Filterable by role, shift, and on-call status
  3. Printable as a single-page directory (PDF) for display in OT reception
  4. Auto-updates when staff assignments change
- **Priority:** P2

---

### EPIC 06: OT Store & Consumables Setup

> **Goal:** Link the OT pharmacy sub-store and configure default surgical consumables and implant tracking.

---

**OTS-034: Link OT Pharmacy Store**

- **As a** Hospital Admin
- **I want to** link the OT Complex to its corresponding OT Store from the Pharmacy Infrastructure (3.8)
- **So that** surgical consumable management, indenting, and usage tracking flow through the pharmacy system
- **Acceptance Criteria:**
  1. Admin selects from available pharmacy stores of type = OT_STORE
  2. If no OT Store exists, system provides a "Create OT Store" shortcut that navigates to Pharmacy Infra module with pre-filled OT store template
  3. Link records: OT Complex ↔ Pharmacy Store (1:1 relationship)
  4. Once linked, consumable indenting and stock queries in the OT module route to this store
  5. OT Store must have a Pharmacist-In-Charge assigned and a valid Drug License — system validates this
- **Priority:** P0

---

**OTS-035: Configure Default Surgical Consumable List**

- **As a** Hospital Admin / OT In-Charge
- **I want to** configure a default surgical consumables list per surgery category (Minor/Major/Complex) and per specialty
- **So that** when a surgery is scheduled, the system can auto-generate a consumable indent request based on the case type
- **Acceptance Criteria:**
  1. Admin creates consumable templates: Template Name, Surgery Category, Specialty, List of Items (from Drug Master) with default quantities
  2. Templates can be created for common procedures (e.g., "Laparoscopic Cholecystectomy Pack" → suture material, trocar, gauze, draping, gloves, etc.)
  3. Templates are suggestions — can be modified per case in the operational module
  4. System supports "Generic" templates (applicable to all specialties) and specialty-specific ones
  5. AI suggests common consumable lists based on selected specialties (P2)
- **Priority:** P1

---

**OTS-036: Configure Implant Tracking Rules**

- **As a** Hospital Admin
- **I want to** configure rules for implant tracking within the OT — which categories require implant documentation, barcode scanning, and patient-level tracing
- **So that** every implant used in surgery is traced from procurement to patient, supporting NABH and regulatory requirements
- **Acceptance Criteria:**
  1. Admin defines implant categories requiring tracking: Orthopedic (plates, screws, joints), Cardiac (stents, pacemakers, valves), Ophthalmic (IOLs), General (mesh, clips)
  2. For each category, configure: Mandatory barcode scan (yes/no), Mandatory batch/serial number entry, Mandatory manufacturer and supplier recording, Mandatory patient consent documentation for implant
  3. System enforces these rules in the operational module during intra-op documentation
  4. Implant register is searchable by patient, batch, manufacturer for recall scenarios
- **Priority:** P1

---

**OTS-037: Configure Par Levels for OT-Specific Items**

- **As a** Hospital Admin / OT In-Charge
- **I want to** set minimum par levels (minimum stock to maintain) for OT-specific consumables and drugs in the OT Store
- **So that** the system generates auto-replenishment indents when stock falls below par, preventing stock-outs during surgery
- **Acceptance Criteria:**
  1. Par levels configured per item per OT Store: Minimum Stock, Reorder Level, Reorder Quantity, Maximum Stock
  2. System triggers indent request to Main Pharmacy when stock hits reorder level
  3. Critical items (anesthesia drugs, emergency drugs, suture material) can be flagged as "Never Out of Stock" — triggers urgent alert if stock < minimum
  4. Dashboard shows current stock vs par level for OT Store
- **Priority:** P1

---

**OTS-038: Link Anesthesia Store to Controlled Substances Vault**

- **As a** Hospital Admin
- **I want to** link the anesthesia store to the controlled substances (narcotics) vault from the Pharmacy Infra
- **So that** Schedule H1, X, and narcotic drug dispensing in the OT follows the controlled substance register workflow with double-verification
- **Acceptance Criteria:**
  1. Admin maps: Anesthesia Store ↔ Narcotics Vault (from Pharmacy Infra)
  2. System enforces: All controlled substance dispensing from OT routes through the narcotics register
  3. Configuration captures: Who can authorize narcotics requisition (Anesthetist only), Double-check requirement flag, Register maintenance responsibility (Pharmacist/Anesthesia Technician)
  4. This configuration is a NABH Chapter 3 (Management of Medication) requirement
- **Priority:** P0

---

### EPIC 07: Scheduling Rules & Policies

> **Goal:** Define all scheduling policies, slot rules, pre-op checklist templates, and cancellation rules that govern OT operations.

---

**OTS-039: Define Surgery Categories & Duration Defaults**

- **As a** Hospital Admin / Chief Surgeon
- **I want to** define surgery categories (Minor / Major / Complex / Day-Care) with their default duration ranges, and map common procedures to categories
- **So that** the scheduling system auto-assigns appropriate slot durations when a procedure is selected
- **Acceptance Criteria:**
  1. Categories: MINOR (default 30-60 min), MAJOR (default 90-180 min), COMPLEX (default 180-360 min), DAYCARE (default 30-90 min)
  2. Each category has: Min Duration, Default Duration, Max Duration, Requires ICU booking flag (Complex → yes), Requires blood reservation flag
  3. Common procedures from Service Catalog can be mapped to categories (e.g., Appendectomy → Major, Cataract → Minor)
  4. Unmapped procedures default to MAJOR
  5. Durations are defaults — overridable by surgeon during booking
- **Priority:** P0

---

**OTS-040: Configure Pre-Op Checklist Templates**

- **As a** Hospital Admin / OT In-Charge
- **I want to** configure pre-operative checklist templates that must be completed before a patient enters the theatre
- **So that** the WHO Surgical Safety Checklist (Sign-In phase) and hospital-specific pre-op checks are standardized and enforced digitally
- **Acceptance Criteria:**
  1. System provides a default WHO Surgical Safety Checklist template (Sign-In, Time-Out, Sign-Out) pre-loaded and non-deletable
  2. Admin can create additional checklists: Pre-Op Nursing Checklist (patient ID, consent, NPO status, site marking, allergy band, blood grouping, pre-op vitals), Anesthesia Pre-Assessment Checklist, Specialty-specific checklists (e.g., Orthopedics → implant size confirmed)
  3. Each checklist item can be: Required or Optional, Type (Yes/No, Text, Numeric, Signature, Photo), Responsible role (Nurse/Surgeon/Anesthetist)
  4. Checklists are versioned — changes create new versions; old versions remain linked to past cases
  5. At least the WHO checklist must be enabled per theatre — this is a Go-Live validation blocker
- **Priority:** P0

---

**OTS-041: Configure Cancellation & Rescheduling Policies**

- **As a** Hospital Admin
- **I want to** configure OT cancellation and rescheduling rules — how far in advance a case can be cancelled, who can cancel, and what documentation is required
- **So that** OT utilization is protected, cancellation reasons are tracked, and the system supports cancellation audit
- **Acceptance Criteria:**
  1. Configuration: Minimum cancellation notice period (hours before scheduled time), Cancellation authority (Surgeon / OT In-Charge / Admin), Mandatory cancellation reason (dropdown: Patient unfit, Patient refusal, Surgeon unavailable, Emergency pre-emption, Equipment failure, Other), Free-text note (optional), Auto-notification to patient (SMS/WhatsApp — configurable)
  2. Rescheduling rules: Maximum reschedules allowed per case, Priority boost for rescheduled cases (yes/no)
  3. System logs all cancellations with reason, time, and cancelling user
  4. Cancellation rate per surgeon/theatre is available as a report metric
- **Priority:** P1

---

**OTS-042: Configure OT Booking Approval Workflow**

- **As a** Hospital Admin / Medical Director
- **I want to** configure whether OT bookings require approval, and if so, define the approval workflow
- **So that** the hospital can choose between direct booking (surgeon books directly) or approval-based booking (OT coordinator approves) based on their operational model
- **Acceptance Criteria:**
  1. Configuration options: Direct Booking (no approval needed — surgeon books, it's confirmed), Approval Required (surgeon requests → OT Coordinator approves → confirmed), Auto-Approve + Notify (surgeon books, it's confirmed, OT Coordinator is notified)
  2. Approval workflow can differ by: Surgery category (Minor → auto, Major/Complex → approval), Emergency (always auto-approved)
  3. Approval timeout: if not approved within X hours, auto-escalate to Medical Director
  4. Configuration is per OT Complex (not per theatre)
- **Priority:** P1

---

**OTS-043: Configure OT Utilization Tracking Parameters**

- **As a** Hospital Admin / Medical Director
- **I want to** configure the parameters for OT utilization tracking — what metrics to calculate, target utilization %, and alert thresholds
- **So that** from Day 1 of operations, the hospital has visibility into OT efficiency
- **Acceptance Criteria:**
  1. Metrics configured: Theatre Utilization % (surgical hours / available hours), Turnover Time (actual vs configured turnaround), First Case On-Time Start %, Cancellation Rate %, Emergency vs Elective Ratio, Surgeon-wise utilization
  2. Target values configurable per metric (e.g., Target utilization = 70%, First case on-time = 90%)
  3. Alert thresholds: e.g., alert if weekly utilization drops below 50% or cancellation rate exceeds 15%
  4. Metrics are calculated automatically once operations begin — this setup only defines the targets and thresholds
- **Priority:** P1

---

**OTS-044: Configure Post-Op Recovery Protocols**

- **As a** Hospital Admin / OT In-Charge
- **I want to** configure default post-operative recovery protocols — monitoring frequency, mandatory vitals, discharge criteria from recovery bay, and escalation rules
- **So that** recovery bay management is standardized and patient safety is ensured during the immediate post-op period
- **Acceptance Criteria:**
  1. Configuration per surgery category: Monitoring frequency (e.g., every 15 min for first hour, then every 30 min), Mandatory vitals (SpO2, BP, HR, Pain Score, Consciousness Level — Modified Aldrete Score), Minimum recovery duration before discharge to ward, Discharge criteria (Modified Aldrete Score ≥ 9), Escalation rules (e.g., SpO2 < 92% → alert anesthetist)
  2. Default protocols pre-loaded based on NABH guidelines
  3. Protocols are templates — can be overridden per patient in operational module
  4. Recovery discharge requires sign-off by designated role (Recovery Nurse or Anesthetist — configurable)
- **Priority:** P1

---

**OTS-045: Configure Surgical Consent Templates**

- **As a** Hospital Admin
- **I want to** configure surgical consent form templates that include standard elements (procedure, risks, alternatives, anesthesia consent) and specialty-specific sections
- **So that** consent documentation is standardized, digitizable, and meets legal requirements under the Clinical Establishments Act
- **Acceptance Criteria:**
  1. Default template includes: Patient details (auto-filled), Procedure name and side/site, Surgeon and Anesthetist names, Risks and complications, Alternative treatments, Anesthesia type and risks, Special consents (blood transfusion, high-risk procedure), Witness and patient/guardian signature fields
  2. Admin can create specialty-specific addendums (e.g., Orthopedics implant consent, Obstetrics consent for C-section)
  3. Templates support multilingual content (Hindi + English minimum — configurable)
  4. Consent templates are versioned; old versions remain linked to past cases
  5. Digital signature capture supported (patient sign on tablet)
- **Priority:** P1

---

**OTS-046: Configure OT Notification Rules**

- **As a** Hospital Admin
- **I want to** configure who gets notified for various OT events — booking confirmation, case start, case completion, emergency booking, cancellation
- **So that** the right stakeholders are informed automatically without manual phone calls
- **Acceptance Criteria:**
  1. Events: Booking Created, Booking Approved, Case Starting (patient in OT), Case Completed, Case Cancelled, Emergency Booking, Equipment Failure, Blood Requirement Alert
  2. For each event, configure: Notification recipients by role (Surgeon, Anesthetist, OT In-Charge, Ward Nurse, Patient Kin), Channel (In-app, SMS, WhatsApp, Push), Timing (Immediate, 15 min before, 30 min before)
  3. Default notification rules pre-loaded; admin can customize
  4. Patient/kin notifications follow consent preferences from Patient Registration module
- **Priority:** P1

---

### EPIC 08: Service & Billing Mapping

> **Goal:** Link surgical services from the Service Catalog to the OT and configure OT-related billing components.

---

**OTS-047: Link Surgical Services to OT**

- **As a** Hospital Admin
- **I want to** link surgical procedures from the Service Catalog (3.7) to the OT module, categorizing them by specialty and surgery category
- **So that** the scheduling system shows only valid procedures during OT booking and billing is auto-linked
- **Acceptance Criteria:**
  1. Admin selects services from Service Catalog where category = "Surgical"
  2. Each linked service maps to: Specialty, Surgery Category (Minor/Major/Complex/Daycare), Default Theatre Type preference (if any), Requires specific equipment (e.g., Laparoscopy Tower)
  3. Linked services appear in the OT booking workflow's procedure selection dropdown
  4. Unlinked surgical services generate a warning during Go-Live validation
  5. System supports SNOMED / ICD-10-PCS coding for each procedure
- **Priority:** P0

---

**OTS-048: Configure OT Charge Components**

- **As a** Hospital Admin / Finance Lead
- **I want to** configure the charge components that make up an OT bill — Theatre Charges (per hour or per case), Anesthesia Charges, Surgeon Fees, Material/Consumable Charges, and Monitoring Charges
- **So that** the billing module can auto-generate an itemized OT bill when a case is completed
- **Acceptance Criteria:**
  1. Charge components: Theatre Charge (per hour / per slab / flat per case — configurable), Anesthesia Charge (per hour / flat — by anesthesia type), Surgeon Fee (per procedure — from tariff plan), Assistant Surgeon Fee, Material Charges (actual consumption from OT store), Implant Charges (actual — passed through at MRP or contract rate), Monitoring Charges (if applicable)
  2. Each component is linked to a service item in Service Catalog and a GL (General Ledger) code
  3. GST applicability configured per component (most OT charges are GST exempt under healthcare exemption)
  4. Charges can differ by payer (insurance rates vs cash rates) — linked to Tariff Plans (3.13)
- **Priority:** P0

---

**OTS-049: Map OT Charges to Tariff Plans**

- **As a** Hospital Admin / Finance Lead
- **I want to** map OT charge components to each tariff plan (Cash, Insurance, TPA, CGHS, PMJAY) with plan-specific rates
- **So that** the billing system auto-picks the correct rate based on the patient's payer at the time of billing
- **Acceptance Criteria:**
  1. For each tariff plan, admin can set: Theatre charge rate, Anesthesia rate, Surgeon fee schedule (per procedure), Material markup %, Implant passthrough policy (at cost / markup / package inclusive)
  2. PMJAY package rates: System maps PMJAY surgical packages to OT procedures (package is all-inclusive — no separate component billing)
  3. CGHS rates: System maps CGHS rate card to OT procedures
  4. Default (Cash) tariff must be configured — Go-Live blocker if missing
  5. Rate effective dates supported (future rate changes can be scheduled)
- **Priority:** P0

---

**OTS-050: Configure Surgical Package Pricing**

- **As a** Hospital Admin / Finance Lead
- **I want to** configure all-inclusive surgical packages (e.g., "Laparoscopic Cholecystectomy Package = ₹80,000 including OT charges, surgeon fees, 2-day room, consumables, and basic investigations")
- **So that** the hospital can offer package-based pricing to patients and insurance companies
- **Acceptance Criteria:**
  1. Package includes: Package Name, Procedure(s) covered, Inclusions (theatre, surgeon fee, anesthesia, room for X days, consumables, investigations — selectable), Exclusions (implants, blood products, ICU — selectable), Package Rate (per payer/tariff plan), Validity period
  2. Package auto-applies when the procedure is billed under a matching tariff plan
  3. Overshoot handling: configurable (absorb / charge extra / require approval)
  4. PMJAY packages auto-imported if PMJAY scheme is configured in Compliance module
- **Priority:** P1

---

**OTS-051: AI Validation of Billing Completeness**

- **As a** Hospital Admin
- **I want** the AI Copilot to validate that every surgical service linked to the OT has a corresponding charge mapping in at least the default (Cash) tariff plan
- **So that** no surgery is performed without a known charge, preventing billing leakage
- **Acceptance Criteria:**
  1. AI scans: All linked surgical services × All active tariff plans
  2. Flags: Services with no charge mapping (critical gap), Services with charge in Cash but not in Insurance/TPA plans (warning), Charge = ₹0 for non-exempt services (warning)
  3. Results shown in OT Setup Dashboard and Go-Live Validation report
  4. AI suggests: "45 surgical services have cash rates. 12 are missing insurance rates. Would you like to bulk-set insurance rates at 80% of cash rate?"
- **Priority:** P1

---

### EPIC 09: Compliance & Safety Configuration

> **Goal:** Configure infection control zones, WHO checklist enforcement, sterilization schedules, biomedical waste management, and fire safety for the OT complex.

---

**OTS-052: Enable WHO Surgical Safety Checklist**

- **As a** Hospital Admin
- **I want to** enable and configure the WHO Surgical Safety Checklist (Sign-In, Time-Out, Sign-Out) for the OT Complex with mandatory enforcement
- **So that** every surgery follows the internationally recognized safety protocol, and compliance is tracked digitally
- **Acceptance Criteria:**
  1. WHO Checklist has 3 phases: SIGN_IN (before anesthesia), TIME_OUT (before incision), SIGN_OUT (before patient leaves OT)
  2. Each phase has standard items pre-loaded (non-editable) + hospital-specific items (admin-added)
  3. Enforcement level per phase: MANDATORY (cannot proceed without completion), ADVISORY (warning if skipped), or DISABLED (per hospital choice — but AI warns against disabling)
  4. Default: All three phases set to MANDATORY
  5. Completion requires digital sign-off by responsible role (Sign-In → Nurse, Time-Out → Surgeon, Sign-Out → Surgeon + Nurse)
  6. Non-completion is logged as a safety incident
- **Priority:** P0

---

**OTS-053: Configure Infection Control Zones**

- **As a** Hospital Admin / Infection Control Nurse
- **I want to** map each OT space to an infection control zone (Unrestricted / Semi-Restricted / Restricted) and configure zone-specific rules
- **So that** infection control policy is documented digitally and NABH Chapter 5 compliance is supported
- **Acceptance Criteria:**
  1. Zone mapping: Each OT space assigned to exactly one zone. Default mapping: Theatre/Scrub/Sterile/Induction → Restricted, Pre-op Holding/Recovery/Staff Change → Semi-Restricted, OT Reception/Corridors → Unrestricted
  2. Zone rules: Restricted → full surgical attire, shoe covers, cap, mask; Semi-Restricted → scrubs + shoe covers; Unrestricted → regular attire
  3. Zone rules are documentation only (no physical enforcement) but appear in printed OT Policy document
  4. Patient movement path documented: Unrestricted → Semi-Restricted (Pre-op) → Restricted (Theatre) → Semi-Restricted (Recovery)
- **Priority:** P0

---

**OTS-054: Configure Fumigation & Sterilization Schedule**

- **As a** Hospital Admin / OT In-Charge
- **I want to** configure the fumigation and terminal sterilization schedule for each theatre
- **So that** the scheduling system blocks theatre time for fumigation and the system tracks compliance
- **Acceptance Criteria:**
  1. Configuration per theatre: Fumigation frequency (weekly / bi-weekly / monthly), Fumigation day and time (e.g., Every Saturday 6 PM – Sunday 6 AM), Terminal cleaning after each case (duration included in turnaround time), Deep cleaning schedule (monthly / quarterly), Culture testing schedule (weekly / bi-weekly — swab tests)
  2. Fumigation slots auto-block the theatre calendar — no surgeries can be scheduled during fumigation
  3. System tracks: Last fumigation date, Next due date, Culture test results (Pass/Fail — manual entry), Fumigation certificate upload
  4. AI alert: "OT-1 fumigation overdue by 3 days" or "Culture test results pending for OT-2"
- **Priority:** P0

---

**OTS-055: Configure Biomedical Waste Management**

- **As a** Hospital Admin / Infection Control Officer
- **I want to** configure biomedical waste categories, color-coded bin mapping, and disposal frequency for the OT complex
- **So that** biomedical waste segregation rules are documented, and the system supports Biomedical Waste Management Rules, 2016 compliance
- **Acceptance Criteria:**
  1. Standard categories pre-loaded: Yellow (infectious/pathological), Red (contaminated recyclable), White (sharps), Blue (glassware), Black (general)
  2. Admin maps: bin locations within OT spaces, bin count per space, Collection frequency (after each case / twice daily / daily), Authorized waste handler (staff assignment), Disposal agency details
  3. System generates a waste log template for daily recording (manual entry or barcode-based)
  4. NABH compliance: At least one sharps container per theatre, segregation bins in all restricted and semi-restricted zones
- **Priority:** P1

---

**OTS-056: Configure Fire Safety & Emergency Exits**

- **As a** Hospital Admin
- **I want to** document fire safety equipment locations, emergency exit routes, and fire drill schedule for the OT complex
- **So that** NABH Chapter 8 (Facility Management & Safety) requirements for the OT are met
- **Acceptance Criteria:**
  1. Configuration: Fire extinguisher locations (mapped to OT spaces), Smoke detector locations, Fire alarm pull station locations, Emergency exit routes (upload floor plan image with marked exits), Assembly point, Fire drill frequency (quarterly — NABH recommended), Last fire drill date
  2. System tracks: fire extinguisher inspection dates, next service due, expiry
  3. Exportable as OT Fire Safety Plan (PDF with floor plan) for display and NABH file
  4. AI alert: "Fire extinguisher in OT corridor inspection overdue by 15 days"
- **Priority:** P1

---

**OTS-057: NABH Compliance Validation for OT**

- **As a** Hospital Admin
- **I want** the system to run a comprehensive NABH compliance validation specifically for the OT setup, checking against NABH 6th Edition requirements from Chapters 5 (Infection Control) and 8 (Facility Management)
- **So that** I have a clear gap analysis before the hospital goes for NABH accreditation
- **Acceptance Criteria:**
  1. Validation checks include: At least one emergency OT available 24×7, WHO Surgical Safety Checklist enabled, Infection control zones defined, Fumigation schedule configured, Minimum equipment per theatre present, OT In-Charge designated, Scrub stations adequate (1 per theatre minimum), Biomedical waste segregation configured, Fire safety documented, Consent templates configured, Controlled substance handling configured
  2. Results shown as: ✅ Compliant, ⚠️ Partially Compliant (with specific gaps), ❌ Non-Compliant
  3. Each check has a reference to the specific NABH standard clause
  4. Exportable as "OT NABH Readiness Report" (PDF)
  5. Report feeds into the overall Go-Live Validation (3.16.3) under the "Compliance" category
- **Priority:** P1

---

**OTS-058: Configure Surgical Site Infection (SSI) Surveillance Rules**

- **As a** Hospital Admin / Infection Control Officer
- **I want to** configure surgical site infection surveillance rules — which procedure categories require SSI tracking, follow-up duration, and reporting triggers
- **So that** the hospital can track SSI rates from Day 1 and meet NABH quality indicator requirements
- **Acceptance Criteria:**
  1. Configuration: Procedure categories for SSI surveillance (e.g., Clean, Clean-Contaminated, Contaminated, Dirty), Follow-up duration per category (default: 30 days post-surgery, 90 days for implant surgeries), SSI reporting trigger (surgeon self-report, nurse report, lab culture positive), SSI classification (Superficial, Deep, Organ/Space)
  2. Surveillance rules are templates — operational tracking happens in the clinical module
  3. Default rules pre-loaded per CDC/NHSN guidelines adapted for Indian context
  4. SSI rate is a configured quality indicator that feeds into the Reports module
- **Priority:** P2

---

### EPIC 10: Validation & Activation

> **Goal:** Run automated Go-Live validation, get reviewer sign-off, and activate the OT Complex for operational use.

---

**OTS-059: Run OT-Specific Go-Live Validation**

- **As a** Hospital Admin
- **I want to** run a comprehensive automated validation of the entire OT setup that checks for blockers and warnings across all configuration areas
- **So that** I have confidence the OT is ready for its first surgery and no critical configuration is missing
- **Acceptance Criteria:**
  1. Validation checks (minimum 25 checks):
     - **Blocker-level (must fix):** At least 1 theatre configured and active, At least 1 recovery bay configured, WHO Surgical Safety Checklist enabled, At least 1 surgeon with SURGICAL privilege mapped, At least 1 anesthetist mapped, OT Store linked (or pharmacy sub-store), Default OT charge components configured, Cash tariff rates for OT configured, Emergency OT policy defined, Minimum staffing rules set
     - **Warning-level (recommended):** All theatres have mandatory equipment, Fumigation schedule configured, Infection control zones defined, Pre-op checklist templates configured, Cancellation policy configured, OT operating hours defined for all active theatres, Specialty-day allocation configured, All surgical services have charge mappings, Fire safety documented, Biomedical waste configured, Staff change rooms configured, NABH checks passing
  2. Results displayed as a score card (similar to main Go-Live Validator)
  3. Blockers prevent activation; warnings allow activation with acknowledgment
  4. Each check shows: Status, Description, Fix Action (link to relevant config screen)
- **Priority:** P0

---

**OTS-060: Submit OT Setup for Review**

- **As a** Hospital Admin
- **I want to** submit the completed OT configuration for review by the Medical Director or Chief Surgeon
- **So that** a clinically qualified person validates the setup before it goes live
- **Acceptance Criteria:**
  1. Submit action changes OT Complex status from DRAFT → IN_REVIEW
  2. System sends notification to designated reviewers (Medical Director, Chief Surgeon — configurable)
  3. Reviewer sees a summary of the entire OT configuration across all phases
  4. Reviewer can: Approve (moves to VALIDATED), Reject with comments (moves back to DRAFT), Partially approve with conditions
  5. Review history is logged: reviewer, action, comments, timestamp
- **Priority:** P0

---

**OTS-061: Reviewer Approval Workflow**

- **As a** Medical Director / Chief Surgeon
- **I want to** review the OT setup configuration in a structured summary format, add comments on any section, and approve or send back for corrections
- **So that** clinical leadership validates that the OT is properly configured for safe surgical care
- **Acceptance Criteria:**
  1. Review screen shows all 10 phases as collapsible sections with section-level status
  2. Reviewer can add inline comments on any section (e.g., "OT-2 should be Laminar, not General — we do joint replacements here")
  3. Approve action requires: digital sign-off (name + timestamp), optional additional reviewer (e.g., Head of Anesthesia can co-sign)
  4. Rejection sends the entire config back to DRAFT with all comments visible to the admin
  5. Approval is recorded as a permanent audit event (non-deletable)
- **Priority:** P0

---

**OTS-062: Activate OT Complex**

- **As a** Hospital Admin
- **I want to** activate the OT Complex after it has passed Go-Live validation and received reviewer approval
- **So that** the OT becomes visible and usable in the operational OT module — surgeons can start booking, and all OT workflows become functional
- **Acceptance Criteria:**
  1. Activation requires: Status = VALIDATED, All blocker-level validation checks passing, At least one reviewer approval
  2. Activation changes status: VALIDATED → ACTIVE
  3. Upon activation: Theatres appear in OT scheduling calendar, OT Store becomes operational for indenting, OT-linked services become bookable, Notification sent to OT In-Charge and all mapped surgeons: "OT Complex [Name] is now active. You can begin scheduling."
  4. Activation timestamp and activating user recorded in audit log
  5. Post-activation, configuration changes require re-validation for critical fields (theatre type, engineering specs, emergency policy)
- **Priority:** P0

---

**OTS-063: Decommission Theatre or OT Complex**

- **As a** Hospital Admin
- **I want to** decommission a theatre or the entire OT Complex — either temporarily (for renovation) or permanently
- **So that** decommissioned theatres are removed from scheduling, but historical data is preserved
- **Acceptance Criteria:**
  1. Decommission types: TEMPORARY (Under Maintenance — expected return date) or PERMANENT (Decommissioned — no return)
  2. System checks for: Scheduled future cases — blocks decommission if active bookings exist unless admin reschedules/cancels them first, Equipment assigned — prompts admin to reassign or mark as unassigned
  3. Temporary decommission: Theatre removed from scheduling for the maintenance period; auto-reactivates on return date (or manual reactivation)
  4. Permanent decommission: Theatre moved to DECOMMISSIONED state; not deletable (audit trail preserved); all historical cases and data retained
  5. Decommission reason and approval recorded
- **Priority:** P1

---

**OTS-064: Generate OT Setup Completion Report**

- **As a** Hospital Admin
- **I want to** generate a comprehensive OT Setup Completion Report as a downloadable PDF that covers the entire configuration
- **So that** I have a single document for NABH audit files, hospital records, and implementation sign-off
- **Acceptance Criteria:**
  1. Report includes: OT Complex details (name, location, activation date), All spaces with their configurations, All theatres with engineering specs, specialty assignments, and scheduling rules, Equipment inventory per location, Staff assignments and privilege mappings, OT Store details, Compliance configurations (WHO checklist, infection control, fumigation), Validation results, Reviewer approvals with sign-off details
  2. Report format: Professional PDF with hospital logo, table of contents, section numbering
  3. Report is timestamped and version-marked
  4. Stored in Document Management for historical reference
  5. Regenerated on-demand (reflects current state at time of generation)
- **Priority:** P1

---

## 4. Dependency Map

| This Module Depends On | Dependency Type | Must Complete Before |
|---|---|---|
| 3.2/3.3 Organization & Branch Setup | Hard | OT Complex cannot be created without a branch |
| 3.4 Location Hierarchy | Hard | OT Complex must be placed within a floor/zone |
| 3.5 Departments & Units | Hard | OT unit type must exist; specialties must be loaded |
| 3.6 Staff & Privileges | Hard | Surgeons and anesthetists must be registered with privileges |
| 3.7 Service Catalog | Hard | Surgical services must exist for linking |
| 3.8 Pharmacy Infra | Soft | OT Store should be configured, but can be linked later |
| 3.12 Equipment Register | Soft | Equipment should exist for linking, but can be added later |
| 3.13 Financial Config | Soft | Tariff plans should exist for charge mapping |
| 3.14 Compliance (NABH) | Soft | NABH checklist feeds into validation, but is not blocking |

| Modules That Depend On OT Setup | Dependency Type |
|---|---|
| 4.7 OT Scheduling & Booking | Hard — cannot schedule without active theatres |
| 4.7 Surgical Safety Checklist | Hard — checklist templates come from OT Setup |
| 4.7 Anesthesia Documentation | Hard — induction room and anesthesia store config needed |
| 4.7 Intra-Op / Post-Op Notes | Hard — theatre and recovery bay config needed |
| 4.10 Billing & Revenue (OT component) | Hard — charge components and tariff mappings needed |
| 4.12 Reports (OT Utilization) | Soft — metrics configuration comes from OT Setup |

---

## 5. Non-Functional Requirements (OT Setup Specific)

| Requirement | Target |
|---|---|
| Page load time for OT Dashboard | < 2 seconds |
| Theatre configuration save time | < 1 second |
| Go-Live validation execution time | < 10 seconds (all 25+ checks) |
| Bulk import (10 theatres) processing time | < 15 seconds |
| Template application time | < 5 seconds |
| Concurrent admin users configuring OT | Support at least 5 simultaneous users |
| Offline support | Full OT configuration available offline; syncs when connected |
| Audit trail retention | 7 years (NABH requirement) |
| PDF report generation | < 30 seconds for full OT Setup Report |

---

## 6. AI Copilot Summary (OT Setup)

| AI Feature | Story Reference | Priority |
|---|---|---|
| Suggest OT count and types based on hospital profile | OTS-003 | P1 |
| Pre-fill mandatory spaces per NABH | OTS-006 | P0 |
| Validate engineering specs against theatre type | OTS-014 | P0 |
| Suggest specialties for laminar flow theatres | OTS-015 | P1 |
| Warn about scheduling parameter conflicts | OTS-016 | P0 |
| Flag missing mandatory equipment | OTS-024 | P0 |
| Detect surgeon/anesthetist privilege gaps | OTS-032 | P1 |
| Suggest consumable lists by specialty | OTS-035 | P2 |
| Validate billing completeness | OTS-051 | P1 |
| Run NABH compliance checks | OTS-057 | P1 |
| Generate readiness score | OTS-059 | P0 |
| Recovery capacity bottleneck warning | OTS-007 | P0 |

---

## 7. Release Plan Recommendation

| Sprint | Stories | Theme |
|---|---|---|
| Sprint 1 | OTS-001 to OTS-005 | OT Complex Registration + Template |
| Sprint 2 | OTS-006 to OTS-012 | Space Configuration |
| Sprint 3 | OTS-013 to OTS-017 | Theatre Core Configuration |
| Sprint 4 | OTS-018 to OTS-021 | Theatre Advanced + Bulk Import |
| Sprint 5 | OTS-022 to OTS-026 | Equipment Linking |
| Sprint 6 | OTS-027 to OTS-033 | Staff & Access |
| Sprint 7 | OTS-034 to OTS-038 | OT Store & Consumables |
| Sprint 8 | OTS-039 to OTS-046 | Scheduling Rules & Policies |
| Sprint 9 | OTS-047 to OTS-051 | Service & Billing Mapping |
| Sprint 10 | OTS-052 to OTS-058 | Compliance & Safety |
| Sprint 11 | OTS-059 to OTS-064 | Validation & Activation |

---

*This document defines the complete OT Setup infrastructure module for ZypoCare One HIMS. Once fully configured and activated, the OT Complex is handed over to the Operations team to run daily surgical workflows via the OT Operations Module (Section 4.7).*

**Document End**
