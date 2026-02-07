# ZypoCare One
# Complete Hospital Information Management System
# Unified Business Requirements Document (BRD)

**Document Type:** Unified Business Requirements Document (BRD + Infrastructure)  
**Version:** 2.0  
**Date:** February 6, 2026  
**Author:** Product Owner  
**Classification:** Strategic Document  
**Supersedes:** BRD v1.0 + Infrastructure PRD v1.0

---

# Executive Summary

## Vision Statement

**"Build India's first AI-native, device-connected Hospital Information Management System that delivers clinical intelligence at the point of care — from infrastructure setup to patient discharge — while maintaining minimal external dependencies."**

ZypoCare One will be a **complete, self-contained HIMS** that:
- Covers 100% of hospital operations — starting from day-zero infrastructure configuration through registration, clinical care, and discharge
- Embeds AI Copilot across every workflow, clinical and operational
- Connects seamlessly to bedside devices (basic monitors to ventilators)
- Treats Hospital Infrastructure Setup as a first-class product experience, not an afterthought
- Maintains data sovereignty with minimal third-party dependencies
- Achieves ABDM and NABH compliance as native capabilities
- Enables any hospital — from a 10-bed nursing home to a 1000-bed chain — to go digital within 48 hours

## Why This Matters

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MARKET PROBLEM                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  CURRENT HIMS LANDSCAPE IN INDIA                                        │
│  ═══════════════════════════════                                        │
│                                                                          │
│  ❌ Fragmented systems requiring 5-10 vendor integrations               │
│  ❌ AI is bolt-on, not native (if available at all)                     │
│  ❌ Device connectivity requires expensive middleware                    │
│  ❌ High dependency on external APIs and services                       │
│  ❌ Data scattered across multiple systems                               │
│  ❌ Poor offline capability                                              │
│  ❌ Complex, non-intuitive interfaces                                    │
│  ❌ Infrastructure setup is manual, scattered, and takes weeks          │
│  ❌ No guided onboarding or hospital templates                          │
│  ❌ Missing India-specific compliance (NABH, ABDM, AERB, PCPNDT)      │
│                                                                          │
│  ZYPOCARE ONE SOLUTION                                                  │
│  ════════════════════                                                   │
│                                                                          │
│  ✅ Single unified platform — one vendor, one system                    │
│  ✅ AI Copilot embedded in every workflow                               │
│  ✅ Native device connectivity — no middleware needed                   │
│  ✅ Self-contained with minimal external dependencies                   │
│  ✅ Single source of truth for all hospital data                        │
│  ✅ Works offline, syncs when connected                                 │
│  ✅ Intuitive, AI-assisted interface                                    │
│  ✅ 48-hour hospital onboarding via guided Setup Wizard                 │
│  ✅ Pre-built templates for Small, Medium, and Large hospitals          │
│  ✅ ABDM-native, NABH-ready from day one                               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Success Metrics

| Metric | Target | Industry Benchmark |
|--------|--------|-------------------|
| Time to configure new hospital | < 48 hours | 2-4 weeks |
| Time to deploy new hospital (full go-live) | < 2 weeks | 2-3 months |
| Setup wizard completion rate | > 95% | Not measured |
| Go-live validation pass rate | > 90% first attempt | ~50% |
| User training time | < 3 days | 1-2 weeks |
| System uptime | 99.9% | 95-98% |
| Offline capability | 100% core functions | Limited/None |
| AI suggestion accuracy | > 90% | N/A (no competitor) |
| Device data latency | < 5 seconds | 30-120 seconds |
| External dependencies | < 10 | 30-50 |
| Data entry reduction (via AI) | 60% | 0% |
| NABH-ready configuration | 100% | Partial |
| ABDM integration | Native | Retrofit |

---

# Part 1: Product Architecture

## 1.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      ZYPOCARE ONE — SYSTEM ARCHITECTURE                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                         ┌─────────────────┐                             │
│                         │   AI COPILOT    │                             │
│                         │   LAYER         │                             │
│                         │                 │                             │
│                         │ • Clinical AI   │                             │
│                         │ • Voice/NLP     │                             │
│                         │ • Predictions   │                             │
│                         │ • Auto-coding   │                             │
│                         │ • Setup Assist  │                             │
│                         └────────┬────────┘                             │
│                                  │                                       │
│  ┌───────────────────────────────┼───────────────────────────────────┐  │
│  │              INFRASTRUCTURE SETUP MODULE (Phase 0)                 │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │  │
│  │  │ Org &   │ │ Location│ │ Staff & │ │ Service │ │ Billing │    │  │
│  │  │ Branch  │ │ & Beds  │ │ Access  │ │ Catalog │ │ Config  │    │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │  │
│  │  │Pharmacy │ │ Blood   │ │ Diag    │ │ OT      │ │Compliance│   │  │
│  │  │ Infra   │ │ Bank    │ │ Config  │ │ Setup   │ │ ABDM/NABH│   │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │  │
│  └───────────────────────────────┼───────────────────────────────────┘  │
│                                  │                                       │
│  ┌───────────────────────────────┼───────────────────────────────────┐  │
│  │                     CORE HIMS MODULES                              │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │  │
│  │  │ Patient │ │ Clinical│ │ Billing │ │ Pharmacy│ │  Lab &  │    │  │
│  │  │ Mgmt    │ │ (EMR)   │ │ & Rev   │ │ & Stock │ │  Diag   │    │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │  │
│  │  │   OPD   │ │   IPD   │ │Emergency│ │   OT    │ │   ICU   │    │  │
│  │  │         │ │         │ │         │ │         │ │         │    │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │  │
│  │  │ Reports │ │  Admin  │ │  Queue  │ │  MRD    │ │ Nursing │    │  │
│  │  │         │ │         │ │         │ │         │ │         │    │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘    │  │
│  └───────────────────────────────┼───────────────────────────────────┘  │
│                                  │                                       │
│                         ┌────────┴────────┐                             │
│                         │ DEVICE CONNECT  │                             │
│                         │ LAYER           │                             │
│                         │                 │                             │
│                         │ • Vital Monitors│                             │
│                         │ • Infusion Pumps│                             │
│                         │ • Ventilators   │                             │
│                         │ • Lab Analyzers │                             │
│                         │ • Basic Devices │                             │
│                         └────────┬────────┘                             │
│                                  │                                       │
│                         ┌────────┴────────┐                             │
│                         │  INTEGRATION    │                             │
│                         │  LAYER          │                             │
│                         │                 │                             │
│                         │ • ABDM          │                             │
│                         │ • SMS/WhatsApp  │                             │
│                         │ • Payment       │                             │
│                         └─────────────────┘                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 1.2 Design Principles

| Principle | Description |
|-----------|-------------|
| **AI-First** | Every feature designed with AI assistance in mind |
| **Setup-First** | Infrastructure configuration is a first-class product experience |
| **Self-Contained** | Minimize external dependencies, maximize internal capability |
| **Offline-Ready** | Core functions work without internet |
| **Device-Native** | Direct device connectivity, no middleware |
| **Data Sovereignty** | All data stored locally, hospital owns data |
| **Progressive Enhancement** | Basic functions always work, AI enhances |
| **Mobile-First** | Works on any device, optimized for tablets |
| **Indian Context** | Built for Indian healthcare regulations and workflows |
| **Template-Driven** | Pre-built configurations reduce setup time dramatically |

---

# Part 2: Complete Module Map

## 2.1 Module Categories

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      COMPLETE MODULE MAP                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  INFRASTRUCTURE MODULES          PATIENT JOURNEY MODULES                │
│  ═══════════════════════         ═══════════════════════                │
│  □ Organization & Branch          □ Patient Registration                │
│  □ Location Hierarchy             □ Appointment Scheduling              │
│  □ Departments & Specialties      □ Queue Management                    │
│  □ Units, Rooms & Beds            □ OPD Management                      │
│  □ Staff Management               □ IPD/Admission                       │
│  □ User & Access Control          □ Emergency/Casualty                  │
│  □ Service Catalog                □ Discharge Management                │
│  □ Equipment Register             □ Follow-up Management                │
│  □ Setup Wizard                                                         │
│  □ Hospital Templates             CLINICAL MODULES                      │
│  □ Go-Live Validator              ════════════════                      │
│                                   □ Electronic Medical Records          │
│  CLINICAL INFRASTRUCTURE          □ Clinical Documentation              │
│  ═══════════════════════          □ Order Entry (CPOE)                  │
│  □ Diagnostics Configuration      □ Nursing Documentation               │
│  □ Pharmacy Infrastructure        □ Medication Administration           │
│  □ Blood Bank Setup               □ Clinical Decision Support           │
│  □ OT Setup                       □ Care Plans & Protocols              │
│  □ Order Sets & Packages          □ Consent Management                  │
│                                                                          │
│  FINANCIAL INFRASTRUCTURE        DIAGNOSTIC MODULES                     │
│  ════════════════════════        ══════════════════                     │
│  □ Charge Master                  □ Laboratory (LIS)                    │
│  □ Tax Configuration (GST)        □ Radiology (Basic)                   │
│  □ Payer Management               □ Cardiology (ECG)                    │
│  □ Tariff Plans                   □ Pathology                           │
│  □ Government Schemes             □ Point of Care Testing               │
│                                                                          │
│  COMPLIANCE INFRASTRUCTURE       THERAPEUTIC MODULES                    │
│  ═════════════════════════       ═══════════════════                    │
│  □ ABDM Integration (HFR/HPR)    □ Pharmacy Management                 │
│  □ NABH Readiness Checklist       □ Infusion Management                 │
│  □ Statutory Config (PCPNDT/AERB) □ Dialysis Management                │
│  □ Policy Governance              □ Physiotherapy                       │
│                                   □ Dietary Management                  │
│  SURGICAL MODULES                □ Blood Bank                          │
│  ════════════════                                                       │
│  □ OT Scheduling                  ICU/CRITICAL CARE                     │
│  □ Pre-op Assessment              ════════════════                      │
│  □ Anesthesia Records             □ ICU Dashboard                       │
│  □ Surgical Notes                 □ Ventilator Monitoring               │
│  □ Post-op Care                   □ Vital Signs Trending                │
│  □ Surgical Safety Checklist      □ Device Connectivity                 │
│                                   □ Early Warning Scores                │
│  REVENUE MODULES                 □ Intake/Output Monitoring            │
│  ═══════════════                                                        │
│  □ Billing & Invoicing            AI COPILOT MODULES                    │
│  □ Insurance & TPA                ══════════════════                    │
│  □ Government Schemes             □ Clinical AI Assistant               │
│  □ Payment Collection             □ Documentation AI                    │
│  □ Revenue Analytics              □ Coding AI (ICD/CPT)                 │
│  □ Package Management             □ Predictive Analytics                │
│                                   □ Voice-to-Text                       │
│  ADMINISTRATIVE MODULES          □ Smart Alerts                        │
│  ══════════════════════          □ Setup Intelligence                  │
│  □ User & Access Management                                             │
│  □ Staff Management               OPERATIONAL SUPPORT                   │
│  □ Roster & Scheduling            ═══════════════════                   │
│  □ Inventory Management           □ Queue Management                    │
│  □ Vendor Management              □ Ambulance Management                │
│  □ Asset Management               □ Housekeeping                        │
│                                   □ Food & Nutrition                    │
│  QUALITY & COMPLIANCE            □ Laundry Management                  │
│  ════════════════════                                                    │
│  □ NABH Compliance                PATIENT ENGAGEMENT                    │
│  □ ABDM Integration               ══════════════════                   │
│  □ Incident Reporting             □ Patient Portal                      │
│  □ Infection Control              □ Mobile App                          │
│  □ Audit Trail                    □ Appointment Booking                 │
│  □ Quality Indicators             □ Report Access                       │
│                                   □ Feedback System                     │
│  ANALYTICS & BI                                                         │
│  ══════════════                                                         │
│  □ Executive Dashboard                                                   │
│  □ Operational Reports                                                   │
│  □ Clinical Analytics                                                    │
│  □ Financial Analytics                                                   │
│  □ Custom Report Builder                                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Module Priority Matrix

| Priority | Modules | Timeline |
|----------|---------|----------|
| **P0 — Foundation** | Infrastructure Setup: Organization, Location, Departments, Units, Rooms, Beds, Staff, Users, Service Catalog, Charge Master, Tax, Payers, Tariffs | Phase 0 |
| **P0 — Foundation** | Infrastructure Setup: Diagnostics Config, OT Setup, Pharmacy Infra, Blood Bank, Equipment Register | Phase 0 |
| **P0 — Foundation** | Compliance: ABDM (HFR/HPR/ABHA), NABH Checklist, Setup Wizard, Go-Live Validator, Templates | Phase 0 |
| **P0 — Core** | Registration, EMR, OPD, IPD, Billing, Pharmacy, Lab, Queue | Phase 1 |
| **P0 — Core** | Vital Monitoring, Device Connect, Basic AI | Phase 1 |
| **P1 — Essential** | Emergency, OT, ICU, Nursing, Insurance, ABDM Health Records | Phase 2 |
| **P1 — Essential** | Ventilator Connect, Advanced AI, Predictions | Phase 2 |
| **P2 — Important** | Blood Bank Operations, Dietary, Dialysis, Patient Portal | Phase 3 |
| **P3 — Nice to Have** | Advanced Analytics, Mobile App, Telemedicine | Phase 4 |

---

# Part 3: Hospital Infrastructure Setup Module

> **This is the foundation layer of ZypoCare One.** Everything in this Part must be configured before the first patient walks in. It is designed as a first-class product experience with guided wizards, pre-built templates, and AI-assisted configuration.

## 3.1 Infrastructure Scope

Hospital Infrastructure in ZypoCare One encompasses **everything that must be configured before go-live**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    HOSPITAL INFRASTRUCTURE                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ PHYSICAL    │  │ CLINICAL    │  │ FINANCIAL   │  │ COMPLIANCE │ │
│  │ INFRA       │  │ SERVICES    │  │ CONFIG      │  │ & LEGAL    │ │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├────────────┤ │
│  │• Locations  │  │• Service    │  │• Tax Codes  │  │• NABH      │ │
│  │• Buildings  │  │  Catalog    │  │• Payers     │  │• ABDM      │ │
│  │• Floors     │  │• Diagnostics│  │• Tariffs    │  │• AERB      │ │
│  │• Units      │  │• Pharmacy   │  │• Contracts  │  │• PCPNDT    │ │
│  │• Rooms      │  │• Blood Bank │  │• Discounts  │  │• State     │ │
│  │• Beds       │  │• OT Setup   │  │• Schemes    │  │  Licenses  │ │
│  │• Equipment  │  │• Packages   │  │             │  │            │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │ HUMAN       │  │ INVENTORY   │  │ OPERATIONS  │  │ DIGITAL    │ │
│  │ RESOURCES   │  │ & SUPPLY    │  │ SUPPORT     │  │ CHANNELS   │ │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤  ├────────────┤ │
│  │• Staff      │  │• Pharmacy   │  │• Queue Mgmt │  │• Patient   │ │
│  │• Doctors    │  │  Inventory  │  │• Ambulance  │  │  Portal    │ │
│  │• Nurses     │  │• Consumables│  │• Housekeep  │  │• Mobile    │ │
│  │• Credentials│  │• Blood Stock│  │• Food &     │  │  App       │ │
│  │• Privileges │  │• Vendors    │  │  Nutrition  │  │• Kiosk     │ │
│  │• Schedules  │  │• Contracts  │  │• Laundry    │  │• IVR       │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
│                                                                     │
│  🤖 AI COPILOT: Setup Intelligence                                  │
│     • Smart defaults based on hospital size                         │
│     • Auto-suggest departments, services, and tariffs               │
│     • Validate configurations for NABH compliance                   │
│     • Detect missing or inconsistent setup                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 3.2 Infrastructure Module Categories

### Category A: Core Infrastructure (Phase 0A — Non-Negotiable)

| # | Module | Description | Priority |
|---|--------|-------------|----------|
| 1 | Organization & Branch | Multi-hospital enterprise setup | P0 |
| 2 | Location Hierarchy | Physical structure mapping (Campus → Building → Floor → Zone) | P0 |
| 3 | Departments & Specialties | Clinical organization with MCI-recognized specialty master | P0 |
| 4 | Unit Types & Units | OPD, IPD, ICU, OT, ER, Dialysis, Cath Lab, etc. | P0 |
| 5 | Rooms & Beds | Patient accommodation, resource state management | P0 |
| 6 | Staff Management | Doctors, nurses, technicians with credential tracking | P0 |
| 7 | User & Access Control | IAM, roles, permissions, RBAC | P0 |
| 8 | Service Catalog | All orderable services with standard codes | P0 |
| 9 | Charge Master | Billing items | P0 |
| 10 | Tax Configuration | GST structure, healthcare exemptions | P0 |
| 11 | Payer Management | Cash, Insurance, TPA, Government, Corporate | P0 |
| 12 | Tariff Plans | Pricing by payer, contract-based rates | P0 |

### Category B: Clinical Infrastructure (Phase 0B)

| # | Module | Description | Priority |
|---|--------|-------------|----------|
| 13 | Diagnostics Configuration | Lab tests, imaging, parameters, reference ranges, LOINC | P0 |
| 14 | OT Setup | Theatres, tables, scheduling, space configuration | P0 |
| 15 | Pharmacy Infrastructure | Stores, formulary, drug master, suppliers | P0 |
| 16 | Blood Bank Setup | Components, inventory, donors, licensing | P0 |
| 17 | Equipment Register | Assets, maintenance, AERB/PCPNDT compliance | P0 |
| 18 | Service Packages | Bundled offerings (health checkups, maternity, surgical) | P1 |
| 19 | Order Sets | Clinical presets by specialty | P1 |

### Category C: Compliance Infrastructure (Phase 0C)

| # | Module | Description | Priority |
|---|--------|-------------|----------|
| 20 | ABDM Integration | HFR, HPR, ABHA configuration | P0 |
| 21 | NABH Readiness | 10-chapter compliance checklist | P1 |
| 22 | Statutory Configuration | MLC, PCPNDT, AERB, Clinical Establishments Act | P1 |
| 23 | Government Schemes | PMJAY, CGHS, ECHS, state schemes | P1 |
| 24 | Policy Governance | Hospital policies, SOPs | P1 |

### Category D: Operational Infrastructure (Phase 0D)

| # | Module | Description | Priority |
|---|--------|-------------|----------|
| 25 | Queue Management | OPD tokens, displays, wait-time estimation | P1 |
| 26 | Ambulance Management | Fleet, dispatch | P2 |
| 27 | Housekeeping | Task management, infection control | P2 |
| 28 | Food & Nutrition | Diet orders, kitchen management | P2 |
| 29 | Laundry Management | Linen tracking | P2 |
| 30 | Vendor Management | Contracts, performance | P2 |

---

## 3.3 Organization & Branch Management

### 3.3.1 Enterprise Structure

```
Enterprise (Organization)
├── Branch 1 (Hospital A — Main)
│   ├── Location Hierarchy
│   ├── Departments
│   ├── Staff
│   └── Services
├── Branch 2 (Hospital A — Satellite)
│   └── ... (inherits from main or custom)
└── Branch 3 (Hospital B — Acquired)
    └── ... (independent configuration)
```

Support for complex organizational hierarchies:

```
Corporate Office (HQ)
├── Region: North India
│   ├── Cluster: Delhi NCR
│   │   ├── Branch: Delhi Main Hospital
│   │   ├── Branch: Gurgaon Unit
│   │   └── Branch: Noida Clinic
│   └── Cluster: Punjab
│       ├── Branch: Ludhiana Hospital
│       └── Branch: Chandigarh Clinic
└── Region: South India
    └── Cluster: Karnataka
        ├── Branch: Bangalore Main
        └── Branch: Mysore Unit
```

### 3.3.2 Branch Configuration

**Required Fields:**
- Branch Code (unique identifier), Branch Name, Legal Entity Name
- Full Address with PIN code, Contact Phone/Email
- GST Number (15-digit), PAN Number
- Clinical Establishment Registration Number
- ROHINI ID (if applicable)
- HFR ID (ABDM — auto-populated after registration)

**Optional Fields:**
- Logo, Website, Social Media, Accreditation Status (NABH/JCI), Bed Count, Established Date

**Branch Settings:**
- Default Currency (INR), Timezone (IST), Fiscal Year Start (April)
- Working Hours, Emergency 24×7 Flag, Multi-language Support

### 3.3.3 AI Copilot in Branch Setup

| AI Feature | Description |
|------------|-------------|
| 🤖 Auto-suggest settings | Based on hospital size and type |
| 🤖 GST/PAN validation | Real-time format and checksum validation |
| 🤖 HFR pre-fill | Auto-populate fields from ABDM HFR data |
| 🤖 Compliance gap detection | Flag missing mandatory registrations |

---

## 3.4 Location Hierarchy

### 3.4.1 Location Types

```
CAMPUS (Multi-building complexes)
└── BUILDING (Physical structures)
    └── FLOOR (Vertical divisions)
        └── ZONE/WING (Horizontal divisions)
            └── AREA (Functional spaces)
```

### 3.4.2 Location Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| Code | String | Unique within branch |
| Name | String | Display name |
| Kind | Enum | CAMPUS/BUILDING/FLOOR/ZONE/AREA |
| Parent | Reference | Parent location |
| GPS Coordinates | LatLng | For campus mapping |
| Floor Number | Integer | For buildings |
| Accessibility | Flags | Wheelchair, stretcher access |
| Emergency Exit | Boolean | Emergency route marker |
| Fire Zone | String | Fire safety zoning |

### 3.4.3 Example Configuration

```
Main Campus (CAMPUS)
├── Main Building (BUILDING)
│   ├── Ground Floor (FLOOR)
│   │   ├── Reception Area (ZONE)
│   │   ├── Emergency Wing (ZONE)
│   │   └── Pharmacy Block (ZONE)
│   ├── First Floor (FLOOR)
│   │   ├── OPD Wing A (ZONE)
│   │   ├── OPD Wing B (ZONE)
│   │   └── Diagnostics Block (ZONE)
│   ├── Second Floor (FLOOR)
│   │   ├── Ward A (ZONE)
│   │   └── Ward B (ZONE)
│   └── Third Floor (FLOOR)
│       ├── ICU Complex (ZONE)
│       └── OT Complex (ZONE)
└── Diagnostic Block (BUILDING)
    ├── Ground Floor (FLOOR)
    │   ├── Sample Collection (ZONE)
    │   └── Laboratory (ZONE)
    └── First Floor (FLOOR)
        └── Radiology (ZONE)
```

---

## 3.5 Departments, Units, Rooms & Beds

### 3.5.1 Pre-loaded Specialty Master (MCI Recognized)

**Clinical Specialties:** General Medicine, General Surgery, Obstetrics & Gynaecology, Pediatrics, Orthopedics, Ophthalmology, ENT, Dermatology, Psychiatry, Cardiology, Neurology, Nephrology, Gastroenterology, Pulmonology, Urology, Oncology (Medical/Surgical/Radiation), Emergency Medicine, Anesthesiology, Radiology, Pathology, Critical Care Medicine, Neonatology, and 100+ more.

**Super-Specialties:** Cardiothoracic Surgery, Neurosurgery, Plastic Surgery, Pediatric Surgery, Surgical Gastroenterology, and 50+ more.

### 3.5.2 Pre-configured Unit Types

| Code | Name | Uses Rooms | Schedulable | Bed-based |
|------|------|------------|-------------|-----------|
| OPD | Outpatient Department | ✓ | ✓ | ✗ |
| IPD_GEN | General Ward | ✓ | ✗ | ✓ |
| IPD_PVT | Private Ward | ✓ | ✗ | ✓ |
| IPD_SEMI | Semi-Private Ward | ✓ | ✗ | ✓ |
| ICU | Intensive Care Unit | ✓ | ✗ | ✓ |
| ICCU | Coronary Care Unit | ✓ | ✗ | ✓ |
| NICU | Neonatal ICU | ✓ | ✗ | ✓ |
| PICU | Pediatric ICU | ✓ | ✗ | ✓ |
| HDU | High Dependency Unit | ✓ | ✗ | ✓ |
| OT | Operation Theatre | ✓ | ✓ | ✗ |
| ER | Emergency Room | ✓ | ✗ | ✓ |
| DIALYSIS | Dialysis Unit | ✓ | ✓ | ✗ |
| DAYCARE | Day Care Center | ✓ | ✓ | ✓ |
| CATH_LAB | Cath Lab | ✓ | ✓ | ✗ |
| LAB | Laboratory | ✓ | ✗ | ✗ |
| RAD_XRAY | X-Ray Room | ✓ | ✓ | ✗ |
| RAD_CT | CT Scan Room | ✓ | ✓ | ✗ |
| RAD_MRI | MRI Room | ✓ | ✓ | ✗ |
| LABOR | Labor Room | ✓ | ✗ | ✓ |
| MORTUARY | Mortuary | ✓ | ✗ | ✗ |

### 3.5.3 Room Types

CONSULTATION, PROCEDURE, EXAMINATION, PATIENT_ROOM, ISOLATION, NEGATIVE_PRESSURE, POSITIVE_PRESSURE, NURSING_STATION, WAITING, STORAGE, UTILITY

**Room Attributes:** Area (sq ft), attached bathroom, AC, TV, oxygen supply, suction, max occupancy, pricing tier (Economy/Standard/Deluxe/Suite/VIP).

### 3.5.4 Resource State Management

```
┌─────────────────────────────────────────────────────────┐
│                    RESOURCE STATES                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   ┌──────────┐        ┌──────────┐        ┌──────────┐  │
│   │ AVAILABLE│───────▶│ OCCUPIED │───────▶│ CLEANING │  │
│   └──────────┘        └──────────┘        └──────────┘  │
│        ▲                                       │         │
│        └───────────────────────────────────────┘         │
│                                                          │
│   ┌─────────────┐     ┌──────────┐     ┌──────────┐     │
│   │ MAINTENANCE │     │ RESERVED │     │ BLOCKED  │     │
│   └─────────────┘     └──────────┘     └──────────┘     │
│                                                          │
│   ┌──────────┐                                           │
│   │ INACTIVE │                                           │
│   └──────────┘                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 3.6 Staff Management & Credentials

### 3.6.1 Staff Categories

**Clinical:** Doctors (Consultants, Residents, Interns), Nurses (Head Nurse, Staff Nurse, Trainee), Technicians (Lab, Radiology, OT, Dialysis), Pharmacists, Physiotherapists, Dietitians, Counselors.

**Non-Clinical:** Administrative, Billing, Reception, Security, Housekeeping, Maintenance, Drivers.

### 3.6.2 Credential Tracking

| Staff Type | Required Credentials |
|------------|---------------------|
| Doctor | MCI/State Registration, Degree Certificate, ABDM HPR |
| Nurse | Nursing Council Registration, BSc/GNM Certificate |
| Lab Technician | DMLT/BMLT Certificate |
| Pharmacist | Pharmacy Council Registration, B.Pharm/D.Pharm |
| Radiographer | DMRT/BSc Certificate |

**System tracks:** Credential Type, Number, Issuing Authority, Issue/Expiry Dates, Document Upload, Verification Status, Auto-renewal Alerts.

### 3.6.3 Privilege Management (Doctors)

Privilege Types: ADMITTING, SURGICAL, ANESTHESIA, PRESCRIPTION, PROCEDURE, SUPERVISION, TEACHING, TELEMEDICINE.

Each privilege is scoped to departments and procedures, granted by authorized users, with validity dates and periodic review cycles.

### 3.6.4 AI Copilot in Staff Setup

| AI Feature | Description |
|------------|-------------|
| 🤖 Credential expiry alerts | Proactive notifications 90/60/30 days before expiry |
| 🤖 HPR auto-verification | Verify doctor registrations against ABDM HPR |
| 🤖 Schedule optimization | Suggest optimal staff schedules based on OPD load |
| 🤖 Privilege gap detection | Flag doctors without required privileges for their specialty |

---

## 3.7 Service Catalog & Charge Master

### 3.7.1 Service Categories

**Diagnostic Services:** Laboratory Tests (Biochemistry, Hematology, Microbiology, etc.), Imaging Services (X-Ray, CT, MRI, USG), Cardiac Diagnostics (ECG, Echo, TMT), Neurological/Pulmonary diagnostics.

**Procedure Services:** Minor Procedures (Dressing, Injection, Catheterization), Major Procedures (Surgeries, Endoscopies), Therapeutic Procedures (Dialysis, Chemotherapy).

**Consultation Services:** OPD (New/Follow-up), Specialist, Teleconsultation, Emergency, Home Visit.

**Nursing Services, Room & Bed Charges, Consumables & Supplies, Package Services.**

### 3.7.2 Service Item Configuration

Each service item includes: Internal Code, Display Name, Search Aliases, Classification (type/category/subcategory), Standard Codes (LOINC, CPT, ICD-10-PCS, SNOMED, NABH), Care Context (OPD/IPD/ER), Clinical Rules (order/consent/scheduling requirements), TAT (routine/stat), Resource Requirements, Default Price, Tax Applicability, Lifecycle Status.

### 3.7.3 Catalog Structure

```
Service Catalog
├── Default Catalog (All services)
├── OPD Catalog (OPD-relevant services)
├── Emergency Catalog (ER quick-order items)
├── Quick Order Catalog (Frequently ordered)
├── Package Catalog (Bundled services)
└── Payer-Specific Catalogs
    ├── Insurance Catalog
    ├── CGHS Catalog
    └── PMJAY Catalog
```

---

## 3.8 Pharmacy Infrastructure

### 3.8.1 Store Hierarchy

```
Main Pharmacy (Central Store)
├── IP Pharmacy (Inpatient dispensing)
├── OP Pharmacy (Outpatient dispensing)
├── Emergency Pharmacy (24x7)
├── OT Store (Surgical supplies)
├── ICU Sub-store
├── Ward Sub-stores
│   ├── Ward A Sub-store
│   └── Ward B Sub-store
└── Narcotics Vault (Controlled substances)
```

Store Types: MAIN, IP_PHARMACY, OP_PHARMACY, EMERGENCY, OT_STORE, WARD_STORE, NARCOTICS.

Each store tracks: Drug License Number & Expiry, Pharmacist in Charge, 24×7 flag, Dispensing/Indenting capabilities.

### 3.8.2 Drug Master

Each drug entry includes: Generic Name, Brand Name, Manufacturer, Category, Therapeutic/Pharmacological Class, Dosage Form, Strength, Route, Schedule Class (General/H/H1/X/G), Narcotic/Controlled/Psychotropic/Antibiotic flags, MRP, Purchase Price, HSN Code, GST Rate, Pack Size, Default Dosage, Max Daily Dose, Contraindications, Drug Interactions, Formulary status.

### 3.8.3 Inventory Configuration

**Stock Levels:** Minimum, Maximum, Reorder Level, Reorder Quantity, Safety Stock.

**Expiry Management:** FEFO (First Expiry First Out), alerts at 90/60/30 days, near-expiry return policy.

**ABC-VED Analysis:** A (High Value), B (Medium), C (Low) combined with V (Vital), E (Essential), D (Desirable) for inventory prioritization.

---

## 3.9 Blood Bank Infrastructure

### 3.9.1 Blood Bank Configuration

Each blood bank unit tracks: License Number & Authority (SBTC/CDSCO), License Expiry, Storage Capacity, Components Handled, Service Capabilities (collect/process/store/issue), Medical Officer, Emergency Contact.

### 3.9.2 Blood Components

| Component | Code | Shelf Life | Storage Temp |
|-----------|------|------------|--------------|
| Whole Blood | WB | 35 days | 2-6°C |
| Packed Red Blood Cells | PRBC | 42 days | 2-6°C |
| Fresh Frozen Plasma | FFP | 1 year | -18°C or below |
| Platelet Concentrate | PC | 5 days | 20-24°C (agitation) |
| Cryoprecipitate | CRYO | 1 year | -18°C or below |
| Single Donor Platelets | SDP | 5 days | 20-24°C (agitation) |

### 3.9.3 Blood Bag Lifecycle

QUARANTINE → AVAILABLE → RESERVED → CROSSMATCHED → ISSUED → TRANSFUSED  
(Side states: EXPIRED, DISCARDED, RETURNED)

Full traceability: Bag Number, Segment Number, Blood Group/Rh, Component Type, Volume, Source (donor/camp), Collection/Expiry Date, Screening Status, Storage Location, Parent/Child bag linkage.

---

## 3.10 Diagnostics Configuration

### 3.10.1 Diagnostic Sections

**Laboratory:** Biochemistry, Hematology, Clinical Pathology, Microbiology, Serology/Immunology, Histopathology, Cytopathology, Molecular Diagnostics.

**Imaging:** General Radiology (X-Ray), Ultrasound, CT Scan, MRI, Mammography, Fluoroscopy, Interventional Radiology.

**Cardiology:** ECG, 2D Echocardiography, Stress Test (TMT), Holter Monitoring, Ambulatory BP.

**Neurology:** EEG, EMG/NCV, Evoked Potentials.

**Pulmonology:** PFT, Sleep Study.

### 3.10.2 Reference Ranges

Each diagnostic parameter supports: Data Type (Numeric/Text/Choice), Unit, Precision, Critical Low/High, and age/gender-specific reference ranges (Normal Low/High, interpretation notes). Reference ranges use age in days for precision (neonatal, pediatric, adult, geriatric).

---

## 3.11 OT Setup

### 3.11.1 OT Suite Spaces

THEATRE, RECOVERY_BAY, PREOP_HOLDING, INDUCTION_ROOM, SCRUB_ROOM, STERILE_STORE, ANESTHESIA_STORE, STAFF_CHANGE.

### 3.11.2 Theatre Configuration

Theatre Types: GENERAL, MODULAR, LAMINAR, HYBRID.  
Engineering: Airflow (Standard/Laminar), Pressure (Positive/Negative/Neutral), ISO Cleanliness Class.  
Scheduling: Turnaround minutes, cleaning time, max cases per day, specialty assignment.

---

## 3.12 Equipment Register

### 3.12.1 Equipment Categories

**Diagnostic:** X-Ray, CT Scanner, MRI, Ultrasound, Mammography, C-Arm, Bone Densitometer.  
**Therapeutic:** Dialysis Machine, Ventilator, Defibrillator, Infusion/Syringe Pump, Patient Monitor, ECG.  
**Surgical:** OT Table, OT Light, Cautery, Anesthesia Workstation, Laparoscopy Tower.  
**Laboratory:** Biochemistry/Hematology/Blood Gas/Coagulation Analyzers, ELISA Reader, PCR Machine.  
**Support:** Autoclave, Washer Disinfector, Blood Bank Refrigerator.

### 3.12.2 Compliance Requirements

**AERB (Atomic Energy Regulatory Board):** Required for X-Ray, CT, Fluoroscopy, Cath Lab, Linear Accelerator. Layout approval + Operating license, annual renewal, Radiation Safety Officer mandatory.

**PCPNDT (Pre-Conception and Pre-Natal Diagnostic Techniques Act):** Required for Ultrasound machines. State/District registration, Form F maintenance, quarterly returns.

---

## 3.13 Financial Configuration

### 3.13.1 Indian GST Structure

| Tax Code | Description | Rate | Applicability |
|----------|-------------|------|---------------|
| GST_EXEMPT | Healthcare Exemption | 0% | Most clinical services |
| GST_5 | Reduced Rate | 5% | Some consumables |
| GST_12 | Standard (Lower) | 12% | Medical equipment |
| GST_18 | Standard | 18% | Non-clinical services |
| GST_28 | Higher Rate | 28% | Luxury items |

**Healthcare GST Exemptions:** Inpatient services, Diagnostic services, Doctor consultations, Room rent (up to ₹5000/day), ICU charges — all exempt.

### 3.13.2 Payer Management

Payer Types: CASH, INSURANCE, TPA, CORPORATE, GOVERNMENT, TRUST, EMPLOYEE.

Each payer tracks: Contact information, TPA License / IRDAI Registration, Scheme Code (PMJAY/CGHS/ECHS), Credit Days & Limit, Default Discount, Documents.

### 3.13.3 Tariff Plans

Tariff Plan Types: PRICE_LIST, PAYER_CONTRACT.

Each plan includes: Payer linkage, Validity period, Global/Category discounts, Individual service rates with min/max caps.

---

## 3.14 Compliance Infrastructure

### 3.14.1 ABDM Integration

**HFR (Health Facility Registry):** Facility registration, ownership type, services, systems of medicine, verification status.

**HPR (Health Professional Registry):** Staff HPR IDs, professional category, registration verification.

**ABHA:** Client credentials (sandbox/production), callback URLs, feature toggles (creation, linking, Scan & Share, consent management, health record sharing).

### 3.14.2 Government Schemes

**PMJAY (Ayushman Bharat):** Empanelment details, SHA code, empaneled packages, package rates, API credentials.

**CGHS/ECHS:** Empanelment number, category (A/B/C city-based), CGHS rate card, empaneled services.

### 3.14.3 NABH Readiness Checklist (10 Chapters)

Based on NABH 6th Edition (2025):

1. **Access, Assessment & Continuity of Care** — Registration counters, triage, patient ID, transfer protocols
2. **Care of Patients** — Care pathways, consent forms, clinical protocols, discharge planning
3. **Management of Medication** — Pharmacy stores, formulary, high-risk/LASA alerts, narcotics register
4. **Patient Rights & Education** — Rights policy, consent templates, education materials
5. **Hospital Infection Control** — Infection zones, housekeeping schedules, biomedical waste, isolation rooms
6. **Continuous Quality Improvement** — Incident reporting, quality indicators, audit checklists
7. **Responsibilities of Management** — Org structure, department heads, committee structures
8. **Facility Management & Safety** — Fire zones, emergency exits, equipment maintenance, disaster plan
9. **Human Resource Management** — Staff records, credentials verified, training records
10. **Information Management System** — Medical records config, data backup, audit trail

---

## 3.15 Queue Management Configuration

Queue Types: OPD_CONSULTATION, OPD_REGISTRATION, PHARMACY, LAB_COLLECTION, RADIOLOGY, BILLING, DISCHARGE, EMERGENCY_TRIAGE.

**Configuration per queue:** Token prefix, daily reset, average service minutes (for wait-time AI), max queue size, VIP priority, appointment priority, SMS/WhatsApp/push notifications, call-ahead tokens, display mapping.

---

## 3.16 Setup Wizard & Templates

### 3.16.1 Setup Wizard Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOSPITAL SETUP WIZARD                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [1]──▶[2]──▶[3]──▶[4]──▶[5]──▶[6]──▶[7]──▶[8]──▶[9]──▶[10]    │
│   │     │     │     │     │     │     │     │     │     │       │
│  Org  Loc  Units Staff Dept Svcs Diag Pharm Bill  Go            │
│                                                   Live           │
│                                                                  │
│  Progress: ████████░░░░░░░░░░░░ 40%                             │
│                                                                  │
│  🤖 AI Copilot: "Based on your 75-bed multi-specialty setup,    │
│  I've pre-configured 12 departments, 850 services, and 3 OT     │
│  suites. Review and customize as needed."                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.16.2 Hospital Templates

| Template | Beds | Pre-configured Services | Setup Time |
|----------|------|------------------------|------------|
| Small Clinic | < 25 | ~200 | 2 hours |
| Medium Hospital | 25-100 | ~1000 | 4 hours |
| Large Hospital | 100+ | ~3000 | 8 hours |
| Clone from Branch | Variable | Full copy | 1 hour |
| Blank | — | Manual | Variable |

### 3.16.3 Go-Live Validation

The Go-Live Validator runs 50+ automated checks across all infrastructure categories:

```
┌─────────────────────────────────────────────────────────────────┐
│              GO-LIVE READINESS REPORT                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  OVERALL SCORE: 87/100  ████████████████░░░░                    │
│                                                                  │
│  BLOCKERS (Must Fix): 3                                         │
│  ❌ No pharmacy store configured                                │
│  ❌ Cash payer not configured                                   │
│  ❌ Default tariff plan missing                                 │
│                                                                  │
│  WARNINGS (Recommended): 8                                      │
│  ⚠️ 15 service items missing charge mapping                     │
│  ⚠️ HFR registration not completed                              │
│  ⚠️ Staff credentials expiring within 30 days (3)               │
│                                                                  │
│  CATEGORY SCORES                                                │
│  Infrastructure     ████████████████████  100%   ✓              │
│  Services           ████████████████░░░░   85%   ⚠️             │
│  Billing            ████████████░░░░░░░░   60%   ❌             │
│  Staff              ████████████████████   95%   ✓              │
│  Diagnostics        ████████████████░░░░   80%   ⚠️             │
│  Compliance         ████████████████░░░░   75%   ⚠️             │
│                                                                  │
│  [Fix All Blockers]  [Download Report]  [Schedule Go-Live]      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.16.4 Infrastructure Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| INF-001 | System shall provide guided Setup Wizard for hospital configuration | P0 |
| INF-002 | System shall provide pre-built templates for Small, Medium, and Large hospitals | P0 |
| INF-003 | System shall support multi-branch enterprise hierarchy | P0 |
| INF-004 | System shall support branch cloning (copy all config from existing branch) | P0 |
| INF-005 | System shall support location hierarchy (Campus → Building → Floor → Zone → Area) | P0 |
| INF-006 | System shall pre-load MCI-recognized specialty master (100+ specialties) | P0 |
| INF-007 | System shall support 30+ pre-configured unit types | P0 |
| INF-008 | System shall track resource states (Available/Occupied/Cleaning/Maintenance/Reserved/Blocked/Inactive) | P0 |
| INF-009 | System shall track staff credentials with auto-expiry alerts | P0 |
| INF-010 | System shall support doctor privilege management (Admitting/Surgical/Anesthesia/Prescription) | P0 |
| INF-011 | System shall support comprehensive service catalog with LOINC/CPT/SNOMED/ICD-10-PCS codes | P0 |
| INF-012 | System shall support pharmacy store hierarchy with drug license tracking | P0 |
| INF-013 | System shall support drug master with Schedule H/H1/X/G classification | P0 |
| INF-014 | System shall support blood bank configuration with component shelf-life tracking | P0 |
| INF-015 | System shall support diagnostic parameters with age/gender-specific reference ranges | P0 |
| INF-016 | System shall support OT suite configuration with theatre types and scheduling | P0 |
| INF-017 | System shall support equipment register with AERB/PCPNDT compliance tracking | P0 |
| INF-018 | System shall support Indian GST tax configuration with healthcare exemptions | P0 |
| INF-019 | System shall support multi-payer management (Cash/Insurance/TPA/Government/Corporate) | P0 |
| INF-020 | System shall support tariff plans with payer-specific contract rates | P0 |
| INF-021 | System shall support ABDM integration (HFR/HPR/ABHA) during setup | P0 |
| INF-022 | System shall provide NABH readiness checklist (10 chapters) | P1 |
| INF-023 | System shall support PMJAY/CGHS/ECHS scheme configuration | P1 |
| INF-024 | System shall provide Go-Live Validator with 50+ automated checks | P0 |
| INF-025 | System shall support bulk import of services, drugs, and staff (1000 items in < 30 seconds) | P0 |
| INF-026 | AI shall provide smart defaults based on hospital size and type during setup | P1 |
| INF-027 | AI shall validate configurations for NABH compliance gaps | P1 |
| INF-028 | AI shall detect missing or inconsistent setup across modules | P1 |

---

# Part 4: Clinical & Operational Functional Requirements

## 4.1 Patient Management Module

### 4.1.1 Patient Registration

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PATIENT REGISTRATION                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  CORE FEATURES                        AI COPILOT FEATURES               │
│  ═════════════                        ═══════════════════               │
│                                                                          │
│  ✓ Quick Registration (< 2 min)       🤖 Auto-fill from ID scan         │
│  ✓ UHID Generation                    🤖 Duplicate detection            │
│  ✓ Demographics capture               🤖 Address auto-complete          │
│  ✓ Photo capture                      🤖 Voice-based registration       │
│  ✓ ID proof upload                    🤖 OCR from Aadhaar/documents     │
│  ✓ Emergency contact                  🤖 Smart field suggestions        │
│  ✓ ABHA linking (optional)                                              │
│  ✓ Biometric enrollment                                                 │
│  ✓ Wristband printing                                                   │
│                                                                          │
│  OFFLINE CAPABILITY: ✅ Full (syncs when online)                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Functional Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| PR-001 | System shall generate unique UHID for each patient | P0 |
| PR-002 | System shall capture minimum mandatory fields (Name, Age, Gender, Mobile) | P0 |
| PR-003 | System shall support Aadhaar-based e-KYC (optional) | P1 |
| PR-004 | System shall detect potential duplicate patients before registration | P0 |
| PR-005 | System shall support photo capture via webcam/mobile | P0 |
| PR-006 | System shall print patient wristband with barcode/QR | P0 |
| PR-007 | System shall support offline registration with auto-sync | P0 |
| PR-008 | AI shall auto-fill fields from scanned ID documents | P1 |
| PR-009 | AI shall suggest corrections for invalid/incomplete data | P1 |
| PR-010 | System shall support ABHA creation and linking | P1 |

### 4.1.2 Appointment Scheduling

| ID | Requirement | Priority |
|----|-------------|----------|
| AP-001 | System shall display doctor availability calendar | P0 |
| AP-002 | System shall support slot-based and token-based scheduling | P0 |
| AP-003 | System shall send appointment reminders (SMS/WhatsApp) | P0 |
| AP-004 | System shall support online appointment booking (patient self-service) | P1 |
| AP-005 | System shall handle rescheduling and cancellation | P0 |
| AP-006 | System shall block slots for doctor leaves/holidays | P0 |
| AP-007 | AI shall suggest optimal appointment time based on patient history | P1 |
| AP-008 | AI shall predict no-shows and suggest overbooking | P2 |
| AP-009 | System shall support recurring appointments | P1 |
| AP-010 | System shall integrate with queue management | P0 |

### 4.1.3 Queue Management

| ID | Requirement | Priority |
|----|-------------|----------|
| QM-001 | System shall generate queue tokens (walk-in and appointment) | P0 |
| QM-002 | System shall display queue status on TV/LED displays | P0 |
| QM-003 | System shall support multiple queue types | P0 |
| QM-004 | System shall support priority queuing (emergency, VIP, elderly) | P0 |
| QM-005 | AI shall predict wait times | P1 |
| QM-006 | System shall notify patients via SMS when turn approaches | P1 |
| QM-007 | System shall support doctor-called-next workflow | P0 |
| QM-008 | System shall track average wait and service times | P0 |

---

## 4.2 Clinical Module (EMR)

### 4.2.1 Electronic Medical Records

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ELECTRONIC MEDICAL RECORDS                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  CORE EMR COMPONENTS                  AI COPILOT FEATURES               │
│  ═══════════════════                  ═══════════════════               │
│                                                                          │
│  ✓ Patient Summary Dashboard          🤖 Auto-generate clinical summary │
│  ✓ Encounter Documentation            🤖 Voice-to-text for notes        │
│  ✓ Problem List                       🤖 ICD-10 auto-coding             │
│  ✓ Medication List                    🤖 Drug interaction alerts        │
│  ✓ Allergy Documentation              🤖 Allergy cross-check            │
│  ✓ Vital Signs Entry                  🤖 Abnormal value alerts          │
│  ✓ Clinical Notes (SOAP)              🤖 SOAP note generation           │
│  ✓ Order Entry (CPOE)                 🤖 Order suggestions              │
│  ✓ Results Review                     🤖 Result interpretation          │
│  ✓ Diagnosis Entry                    🤖 Differential diagnosis         │
│  ✓ Treatment Plans                    🤖 Treatment recommendations      │
│  ✓ Referrals                          🤖 Specialist suggestions         │
│  ✓ Patient Education                  🤖 Auto-generate handouts         │
│                                                                          │
│  OFFLINE CAPABILITY: ✅ Full read, limited write (syncs when online)    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

| ID | Requirement | Priority |
|----|-------------|----------|
| EMR-001 | System shall display comprehensive patient summary on single screen | P0 |
| EMR-002 | System shall maintain complete problem list with onset dates | P0 |
| EMR-003 | System shall track current and past medications | P0 |
| EMR-004 | System shall document allergies with severity and reaction type | P0 |
| EMR-005 | System shall support structured clinical note templates | P0 |
| EMR-006 | System shall support free-text clinical documentation | P0 |
| EMR-007 | System shall support ICD-10 diagnosis coding | P0 |
| EMR-008 | System shall maintain complete audit trail of all changes | P0 |
| EMR-009 | AI shall suggest diagnoses based on symptoms and history | P0 |
| EMR-010 | AI shall auto-code diagnoses to ICD-10 | P1 |
| EMR-011 | AI shall generate clinical summary from encounter data | P1 |
| EMR-012 | AI shall convert voice notes to structured documentation | P1 |
| EMR-013 | System shall support clinical document templates by specialty | P0 |
| EMR-014 | System shall display lab/diagnostic results inline | P0 |
| EMR-015 | System shall support document scanning and attachment | P0 |

### 4.2.2 Clinical Decision Support (CDSS)

| ID | Requirement | Priority |
|----|-------------|----------|
| CDS-001 | System shall alert for drug-drug interactions | P0 |
| CDS-002 | System shall alert for drug-allergy conflicts | P0 |
| CDS-003 | System shall alert for duplicate orders | P0 |
| CDS-004 | System shall alert for dose range violations | P0 |
| CDS-005 | System shall alert for critical lab values | P0 |
| CDS-006 | System shall suggest age/weight-based dosing for pediatrics | P0 |
| CDS-007 | System shall suggest renal dose adjustments | P1 |
| CDS-008 | AI shall suggest differential diagnoses | P0 |
| CDS-009 | AI shall recommend relevant investigations | P1 |
| CDS-010 | AI shall flag potential deterioration based on trends | P1 |
| CDS-011 | System shall support clinical protocols/order sets | P0 |
| CDS-012 | System shall integrate national treatment guidelines | P1 |

### 4.2.3 Order Entry (CPOE)

| ID | Requirement | Priority |
|----|-------------|----------|
| ORD-001 | System shall support medication orders with dosing | P0 |
| ORD-002 | System shall support laboratory test orders | P0 |
| ORD-003 | System shall support diagnostic imaging orders | P0 |
| ORD-004 | System shall support procedure orders | P0 |
| ORD-005 | System shall support nursing orders | P0 |
| ORD-006 | System shall support diet orders | P1 |
| ORD-007 | System shall support referral orders | P0 |
| ORD-008 | System shall route orders to appropriate departments | P0 |
| ORD-009 | System shall support order sets/protocols | P0 |
| ORD-010 | System shall track order status (pending/completed/cancelled) | P0 |
| ORD-011 | AI shall suggest orders based on diagnosis | P1 |
| ORD-012 | AI shall flag incomplete order sets | P1 |

---

## 4.3 OPD Management

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    OPD WORKFLOW                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   REGISTRATION      VITALS         CONSULTATION      CHECKOUT           │
│   ════════════      ══════         ════════════      ════════           │
│                                                                          │
│   ┌─────────┐      ┌─────────┐     ┌─────────┐      ┌─────────┐        │
│   │ Register│      │ Nurse   │     │ Doctor  │      │ Billing │        │
│   │ Patient │─────▶│ Station │────▶│ Consult │─────▶│ & Pharm │        │
│   │ + Queue │      │ Vitals  │     │         │      │         │        │
│   └─────────┘      └─────────┘     └─────────┘      └─────────┘        │
│       │                │                │                │              │
│       ▼                ▼                ▼                ▼              │
│   🤖 AI: Triage      🤖 AI: Alert    🤖 AI: Suggest   🤖 AI: Auto      │
│   suggestion         abnormal        diagnosis &      bill + coding    │
│                      values          treatment                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

| ID | Requirement | Priority |
|----|-------------|----------|
| OPD-001 | System shall support walk-in and appointment patients | P0 |
| OPD-002 | System shall capture vitals before consultation | P0 |
| OPD-003 | System shall display patient queue to doctor | P0 |
| OPD-004 | System shall support consultation documentation | P0 |
| OPD-005 | System shall generate prescription | P0 |
| OPD-006 | System shall support follow-up scheduling | P0 |
| OPD-007 | System shall support consultation billing | P0 |
| OPD-008 | System shall track consultation duration | P1 |
| OPD-009 | AI shall pre-populate likely complaints based on history | P1 |
| OPD-010 | AI shall suggest follow-up timing based on condition | P1 |

---

## 4.4 IPD Management

### 4.4.1 Admission & Bed Management

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    IPD WORKFLOW                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ADMISSION         STAY                DISCHARGE        POST-DISCHARGE  │
│  ═════════         ════                ═════════        ══════════════  │
│                                                                          │
│  ┌─────────┐      ┌─────────────┐     ┌─────────┐      ┌─────────┐     │
│  │ Admit   │      │ Daily Care  │     │ Discharge│     │ Follow  │     │
│  │ Patient │─────▶│ • Rounds    │────▶│ Process  │────▶│ Up      │     │
│  │         │      │ • Orders    │     │          │     │         │     │
│  │ • Bed   │      │ • Vitals    │     │ • Summary│     │ • Appt  │     │
│  │   Alloc │      │ • Nursing   │     │ • Bill   │     │ • Recall│     │
│  │ • Consent│     │ • Meds      │     │ • Advice │     │         │     │
│  └─────────┘      └─────────────┘     └─────────┘      └─────────┘     │
│       │                  │                  │                │          │
│       ▼                  ▼                  ▼                ▼          │
│  🤖 AI: Bed         🤖 AI: Monitor    🤖 AI: Auto       🤖 AI: Predict │
│  recommendation     deterioration     summary          readmission     │
│                                                                          │
│  CONTINUOUS MONITORING (Device Connected)                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Vital    │  │ Infusion │  │ O2       │  │ Ventilator│               │
│  │ Monitor  │  │ Pump     │  │ Monitor  │  │ (ICU)    │               │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘               │
│       └─────────────┴─────────────┴─────────────┘                       │
│                          │                                               │
│                   AUTO-DOCUMENTED IN EMR                                │
│                   🤖 AI: Early Warning Score + Deterioration Prediction │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

| ID | Requirement | Priority |
|----|-------------|----------|
| IPD-001 | System shall support admission request and approval workflow | P0 |
| IPD-002 | System shall display real-time bed availability | P0 |
| IPD-003 | System shall support bed allocation and transfer | P0 |
| IPD-004 | System shall capture admission assessment | P0 |
| IPD-005 | System shall manage consent forms (digital signature) | P0 |
| IPD-006 | System shall support daily progress notes | P0 |
| IPD-007 | System shall track treatment plans | P0 |
| IPD-008 | System shall support discharge planning | P0 |
| IPD-009 | System shall generate discharge summary | P0 |
| IPD-010 | AI shall suggest bed based on diagnosis and requirements | P1 |
| IPD-011 | AI shall predict length of stay | P2 |
| IPD-012 | AI shall auto-generate discharge summary | P1 |
| IPD-013 | System shall track bed turnaround time | P1 |
| IPD-014 | System shall support bed blocking/reservation | P0 |
| IPD-015 | System shall integrate with housekeeping for bed cleaning status | P1 |

### 4.4.2 Nursing Documentation

| ID | Requirement | Priority |
|----|-------------|----------|
| NRS-001 | System shall support nursing assessment on admission | P0 |
| NRS-002 | System shall support vital signs charting | P0 |
| NRS-003 | System shall support medication administration record (MAR) | P0 |
| NRS-004 | System shall support intake/output charting | P0 |
| NRS-005 | System shall support nursing care plans | P1 |
| NRS-006 | System shall support nursing handoff notes | P0 |
| NRS-007 | System shall support fall risk assessment | P0 |
| NRS-008 | System shall support pressure ulcer assessment | P0 |
| NRS-009 | System shall support pain assessment | P0 |
| NRS-010 | Device data shall auto-populate vital signs | P0 |
| NRS-011 | AI shall calculate Early Warning Score (NEWS/MEWS) | P0 |
| NRS-012 | AI shall alert nursing staff of deterioration | P0 |

---

## 4.5 Emergency/Casualty Module

| ID | Requirement | Priority |
|----|-------------|----------|
| ER-001 | System shall support emergency triage (color coding) | P0 |
| ER-002 | System shall support quick registration (minimal data) | P0 |
| ER-003 | System shall prioritize queue by acuity | P0 |
| ER-004 | System shall support trauma documentation | P0 |
| ER-005 | System shall support MLC (Medico-Legal Case) documentation | P0 |
| ER-006 | System shall track patient location in ER | P0 |
| ER-007 | System shall support ER-to-IPD/OT transfer | P0 |
| ER-008 | AI shall suggest triage level based on presenting complaints | P1 |
| ER-009 | AI shall alert for potential critical conditions | P0 |
| ER-010 | System shall maintain ER dashboard with real-time status | P0 |

---

## 4.6 ICU & Critical Care Module

### 4.6.1 ICU Dashboard & Monitoring

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    ICU DASHBOARD                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  BED 1        BED 2        BED 3        BED 4        BED 5             │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐          │
│  │ Ramesh │  │ Suresh │  │ Priya  │  │ Empty  │  │ Amit   │          │
│  │ M/45   │  │ M/62   │  │ F/38   │  │        │  │ M/55   │          │
│  │ HR: 78 │  │ HR: 92 │  │ HR: 88 │  │        │  │ HR:110⚠│          │
│  │ BP:120 │  │ BP:145⚠│  │ BP:118 │  │        │  │ BP:90 ⚠│          │
│  │SpO2:98 │  │SpO2:94 │  │SpO2:99 │  │        │  │SpO2:88⚠│          │
│  │NEWS: 2 │  │NEWS: 5⚠│  │NEWS: 4 │  │        │  │NEWS: 7🔴│         │
│  │ 🟢     │  │ 🟡     │  │ 🟡     │  │ ⚪     │  │ 🔴     │          │
│  └────────┘  └────────┘  └────────┘  └────────┘  └────────┘          │
│                                                                          │
│  🤖 AI ALERTS:                                                          │
│  🔴 Bed 5 (Amit): Deteriorating — SpO2 trending down, NEWS 7           │
│  🟡 Bed 2 (Suresh): Elevated BP + Fever — consider sepsis workup       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

| ID | Requirement | Priority |
|----|-------------|----------|
| ICU-001 | System shall display real-time vital signs from connected monitors | P0 |
| ICU-002 | System shall display ventilator parameters | P0 |
| ICU-003 | System shall support NEWS/MEWS scoring | P0 |
| ICU-004 | System shall support APACHE and SOFA scoring | P1 |
| ICU-005 | System shall track infusion rates from connected pumps | P1 |
| ICU-006 | System shall support intake/output monitoring | P0 |
| ICU-007 | System shall display vital trends over configurable time periods | P0 |
| ICU-008 | System shall support flowsheet documentation | P0 |
| ICU-009 | System shall generate alerts based on configurable thresholds | P0 |
| ICU-010 | System shall support ICU-specific nursing documentation | P0 |
| ICU-011 | AI shall predict patient deterioration | P0 |
| ICU-012 | AI shall suggest ventilator weaning readiness | P1 |
| ICU-013 | AI shall calculate severity scores (APACHE, SOFA) | P1 |
| ICU-014 | System shall support ICU handoff documentation | P0 |
| ICU-015 | System shall track sedation scores | P1 |

### 4.6.2 Device Connectivity

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DEVICE CONNECTIVITY ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  BEDSIDE DEVICES                    ZYPOCARE DEVICE SERVER              │
│  ═══════════════                    ══════════════════════              │
│                                                                          │
│  BASIC DEVICES                      ┌────────────────────────────────┐  │
│  (All Patients)                     │ Protocol Handlers              │  │
│  • Pulse Oximeter  ───────────────▶│ • Serial (RS232)               │  │
│  • Vital Monitor   ───────────────▶│ • HL7 v2                       │  │
│  • O2 Flow Meter   ───────────────▶│ • TCP/IP Socket                │  │
│                                     │ • Modbus                       │  │
│  ADVANCED DEVICES                   │ • BLE (Bluetooth)              │  │
│  (ICU Patients)                     └──────────┬─────────────────────┘  │
│  • Multi-para Monitor ──────────▶              │                        │
│  • Infusion Pump      ──────────▶   Data Normalizer → Real-time        │
│  • Ventilator         ──────────▶   Processor → EMR + AI Analysis      │
│                                                                          │
│  SUPPORTED PARAMETERS:                                                  │
│  Basic: HR, SpO2, BP (Sys/Dia/Mean), Temperature, Respiratory Rate     │
│  O2: Flow Rate, FiO2, Delivery Device                                  │
│  Ventilator: Mode, Vt, RR, PEEP, FiO2, PIP, Pplat, I:E, MV, EtCO2   │
│  Infusion: Drug Name, Rate, Volume Infused, Volume Remaining           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

| ID | Requirement | Priority |
|----|-------------|----------|
| DEV-001 | System shall connect to pulse oximeters via serial/BLE | P0 |
| DEV-002 | System shall connect to basic vital monitors (HR, BP, Temp) | P0 |
| DEV-003 | System shall capture O2 flow rate from flow meters | P0 |
| DEV-004 | System shall connect to multi-parameter monitors (HL7) | P0 |
| DEV-005 | System shall connect to infusion pumps | P1 |
| DEV-006 | System shall connect to ventilators | P1 |
| DEV-007 | System shall auto-associate device data with correct patient | P0 |
| DEV-008 | System shall store device data at configurable intervals | P0 |
| DEV-009 | System shall handle device disconnection gracefully | P0 |
| DEV-010 | System shall support manual vital entry as fallback | P0 |
| DEV-011 | System shall display real-time waveforms (optional) | P2 |
| DEV-012 | System shall alert for device communication failure | P0 |

---

## 4.7 Operation Theatre Module

| ID | Requirement | Priority |
|----|-------------|----------|
| OT-001 | System shall support OT scheduling and booking | P0 |
| OT-002 | System shall manage OT availability calendar | P0 |
| OT-003 | System shall support pre-operative assessment documentation | P0 |
| OT-004 | System shall support WHO Surgical Safety Checklist | P0 |
| OT-005 | System shall support anesthesia documentation | P0 |
| OT-006 | System shall support intra-operative notes | P0 |
| OT-007 | System shall track surgical consumables and implants | P0 |
| OT-008 | System shall support post-operative notes | P0 |
| OT-009 | System shall calculate OT utilization metrics | P1 |
| OT-010 | System shall integrate with sterilization tracking | P2 |
| OT-011 | AI shall suggest optimal OT scheduling based on case mix | P2 |
| OT-012 | System shall support emergency OT booking | P0 |

---

## 4.8 Laboratory Module (LIS)

| ID | Requirement | Priority |
|----|-------------|----------|
| LAB-001 | System shall support lab test ordering from EMR | P0 |
| LAB-002 | System shall generate barcode labels for samples | P0 |
| LAB-003 | System shall track sample collection and transport | P0 |
| LAB-004 | System shall connect to lab analyzers (ASTM/HL7) | P0 |
| LAB-005 | System shall auto-populate results from analyzers | P0 |
| LAB-006 | System shall support manual result entry | P0 |
| LAB-007 | System shall support result validation workflow | P0 |
| LAB-008 | System shall flag abnormal results | P0 |
| LAB-009 | System shall flag critical/panic values with alerts | P0 |
| LAB-010 | System shall support reference range configuration | P0 |
| LAB-011 | System shall generate lab reports | P0 |
| LAB-012 | System shall support test panels/profiles | P0 |
| LAB-013 | AI shall suggest likely diagnoses based on results | P1 |
| LAB-014 | AI shall detect delta check failures | P1 |
| LAB-015 | System shall support QC tracking | P1 |

---

## 4.9 Pharmacy Module

| ID | Requirement | Priority |
|----|-------------|----------|
| PHR-001 | System shall maintain drug master with formulations | P0 |
| PHR-002 | System shall receive prescriptions electronically | P0 |
| PHR-003 | System shall check drug interactions before dispensing | P0 |
| PHR-004 | System shall manage pharmacy inventory | P0 |
| PHR-005 | System shall track batch and expiry | P0 |
| PHR-006 | System shall support barcode-based dispensing | P0 |
| PHR-007 | System shall support store/sub-store hierarchy | P0 |
| PHR-008 | System shall support indenting between stores | P0 |
| PHR-009 | System shall manage controlled substances register | P0 |
| PHR-010 | System shall generate purchase orders | P0 |
| PHR-011 | System shall support goods receipt | P0 |
| PHR-012 | System shall track near-expiry drugs | P0 |
| PHR-013 | System shall support return to vendor | P1 |
| PHR-014 | AI shall suggest reorder quantities | P1 |
| PHR-015 | AI shall detect prescription anomalies | P1 |

---

## 4.10 Billing & Revenue Module

| ID | Requirement | Priority |
|----|-------------|----------|
| BIL-001 | System shall generate itemized bills | P0 |
| BIL-002 | System shall support multiple payment modes | P0 |
| BIL-003 | System shall support advance and deposit | P0 |
| BIL-004 | System shall support interim billing | P0 |
| BIL-005 | System shall support package billing | P0 |
| BIL-006 | System shall support discount and concession | P0 |
| BIL-007 | System shall support refund processing | P0 |
| BIL-008 | System shall generate GST-compliant invoices | P0 |
| BIL-009 | System shall support insurance/TPA billing | P0 |
| BIL-010 | System shall support government scheme billing (PMJAY) | P0 |
| BIL-011 | System shall track receivables and collections | P0 |
| BIL-012 | System shall support tariff management | P0 |
| BIL-013 | AI shall auto-code procedures for billing | P1 |
| BIL-014 | AI shall detect billing anomalies | P1 |
| BIL-015 | System shall generate revenue analytics | P1 |

---

## 4.11 ABDM Integration Module

| ID | Requirement | Priority |
|----|-------------|----------|
| ABDM-001 | System shall support ABHA number creation | P0 |
| ABDM-002 | System shall support ABHA number linking | P0 |
| ABDM-003 | System shall register facility with HFR | P0 |
| ABDM-004 | System shall verify doctors via HPR | P0 |
| ABDM-005 | System shall support health record push to ABDM | P0 |
| ABDM-006 | System shall support health record pull (with consent) | P1 |
| ABDM-007 | System shall support Scan & Share workflow | P0 |
| ABDM-008 | System shall generate FHIR-compliant documents | P0 |
| ABDM-009 | System shall manage consent artifacts | P0 |
| ABDM-010 | System shall work without ABDM (fallback mode) | P0 |

---

## 4.12 Reports & Analytics Module

| ID | Requirement | Priority |
|----|-------------|----------|
| RPT-001 | System shall generate MIS reports | P0 |
| RPT-002 | System shall generate patient census reports | P0 |
| RPT-003 | System shall generate revenue reports | P0 |
| RPT-004 | System shall generate clinical reports | P0 |
| RPT-005 | System shall generate statutory reports | P0 |
| RPT-006 | System shall support custom report builder | P1 |
| RPT-007 | System shall support dashboard visualizations | P0 |
| RPT-008 | System shall support report scheduling | P1 |
| RPT-009 | System shall export reports to Excel/PDF | P0 |
| RPT-010 | AI shall provide insights and anomaly detection | P1 |

---

# Part 5: AI Copilot — The Mandatory Intelligence Layer

> **AI Copilot is not optional in ZypoCare One. It is a mandatory, deeply embedded intelligence layer that operates across every module — from infrastructure setup to critical care.**

## 5.1 AI Capabilities Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AI COPILOT CAPABILITIES                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  CLINICAL AI                          OPERATIONAL AI                    │
│  ═══════════                          ══════════════                    │
│                                                                          │
│  🤖 Diagnosis Assistance              🤖 Queue Optimization             │
│     • Differential diagnosis             • Wait time prediction          │
│     • Symptom-based suggestions          • Load balancing                │
│     • Pattern recognition                                                │
│                                       🤖 Resource Planning               │
│  🤖 Treatment Recommendations            • Bed demand forecast           │
│     • Drug suggestions                   • Staff scheduling              │
│     • Dosing calculations                                                │
│     • Protocol adherence              🤖 Inventory Intelligence          │
│                                          • Reorder prediction            │
│  🤖 Documentation AI                     • Expiry management             │
│     • Voice-to-text                                                      │
│     • Note generation                 🤖 Revenue Optimization            │
│     • Summary creation                   • Coding accuracy               │
│     • Template filling                   • Denial prediction             │
│                                                                          │
│  🤖 Clinical Coding                   PREDICTIVE AI                     │
│     • ICD-10 auto-coding              ══════════════                    │
│     • CPT suggestion                                                     │
│     • DRG assignment                  🤖 Patient Deterioration           │
│                                          • Early warning                 │
│  🤖 Alert Intelligence                   • Sepsis prediction             │
│     • Smart alert filtering              • Readmission risk              │
│     • Priority ranking                                                   │
│     • Fatigue reduction               🤖 Outcome Prediction              │
│                                          • Length of stay                │
│  🤖 Drug Safety                          • Mortality risk                │
│     • Interaction checking               • Complication risk             │
│     • Allergy cross-ref                                                  │
│     • Dose validation                 SETUP INTELLIGENCE                │
│                                       ══════════════════                │
│                                       🤖 Smart Setup Defaults            │
│                                       🤖 Compliance Gap Detection        │
│                                       🤖 Configuration Validation        │
│                                       🤖 Template Recommendation         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 5.2 AI Requirements

| ID | Requirement | Priority | Local/Cloud |
|----|-------------|----------|-------------|
| AI-001 | System shall provide differential diagnosis suggestions | P0 | Local |
| AI-002 | System shall calculate clinical scores (NEWS, APACHE, etc.) | P0 | Local |
| AI-003 | System shall provide drug-drug interaction alerts | P0 | Local |
| AI-004 | System shall provide drug-allergy alerts | P0 | Local |
| AI-005 | System shall suggest ICD-10 codes from clinical notes | P1 | Local |
| AI-006 | System shall predict patient deterioration | P0 | Local |
| AI-007 | System shall generate clinical summaries | P1 | Local/Cloud |
| AI-008 | System shall convert voice to text | P1 | Cloud |
| AI-009 | System shall predict wait times | P1 | Local |
| AI-010 | System shall suggest optimal scheduling | P2 | Local |
| AI-011 | System shall detect documentation gaps | P1 | Local |
| AI-012 | System shall prioritize alerts by clinical relevance | P0 | Local |
| AI-013 | System shall predict readmission risk | P2 | Local |
| AI-014 | System shall suggest reorder quantities | P1 | Local |
| AI-015 | System shall flag billing anomalies | P1 | Local |
| AI-016 | System shall provide smart defaults during hospital setup | P1 | Local |
| AI-017 | System shall validate infrastructure for compliance gaps | P1 | Local |
| AI-018 | System shall recommend hospital template based on inputs | P1 | Local |

## 5.3 AI Implementation Strategy (Minimal Dependency)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AI IMPLEMENTATION — MINIMAL DEPENDENCY                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  TIER 1: RULE-BASED AI (Zero External Dependency)                       │
│  ═══════════════════════════════════════════════                        │
│  ✓ Drug interaction checking (internal database)                        │
│  ✓ Clinical scoring (NEWS, MEWS, APACHE, SOFA)                         │
│  ✓ Alert rules and thresholds                                           │
│  ✓ Order set suggestions                                                │
│  ✓ Protocol-based recommendations                                       │
│  ✓ Basic auto-coding (keyword matching)                                 │
│  ✓ Infrastructure validation rules                                      │
│  ✓ NABH compliance gap detection                                        │
│                                                                          │
│  TIER 2: ON-PREMISE ML (Minimal Dependency)                             │
│  ═══════════════════════════════════════════                            │
│  ✓ Pre-trained models deployed locally                                  │
│  ✓ Deterioration prediction model                                       │
│  ✓ Diagnosis suggestion model                                           │
│  ✓ Wait time prediction model                                           │
│  ✓ Works completely offline                                             │
│  Dependency: One-time model download                                    │
│                                                                          │
│  TIER 3: CLOUD AI (Optional — User Choice)                              │
│  ═════════════════════════════════════════                              │
│  ○ Advanced NLP for note generation                                     │
│  ○ Voice transcription                                                  │
│  ○ Complex pattern recognition                                          │
│  ○ Image analysis                                                       │
│  Dependency: Internet + API key                                         │
│                                                                          │
│  DEFAULT CONFIGURATION:                                                 │
│  ═════════════════════                                                  │
│  Tier 1 + Tier 2 ENABLED (works offline)                               │
│  Tier 3 OPTIONAL (user can enable if needed)                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# Part 6: Non-Functional Requirements

## 6.1 Performance Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | Page load time | < 2 seconds |
| NFR-002 | Search response time | < 1 second |
| NFR-003 | Device data latency | < 5 seconds |
| NFR-004 | Concurrent users | 500+ per hospital |
| NFR-005 | Transaction throughput | 100 TPS |
| NFR-006 | Report generation | < 30 seconds |
| NFR-007 | System availability | 99.9% |
| NFR-008 | Setup wizard page load | < 2 seconds |
| NFR-009 | Bulk import (1000 services) | < 30 seconds |
| NFR-010 | Go-live validation | < 10 seconds |

## 6.2 Security Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-011 | Role-based access control (RBAC) | P0 |
| NFR-012 | Audit trail for all PHI access | P0 |
| NFR-013 | Data encryption at rest (AES-256) | P0 |
| NFR-014 | Data encryption in transit (TLS 1.2+) | P0 |
| NFR-015 | Session timeout and auto-logout | P0 |
| NFR-016 | Two-factor authentication (optional) | P1 |
| NFR-017 | IP-based access restriction | P1 |
| NFR-018 | Password policy enforcement | P0 |

## 6.3 Scalability Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-019 | Support hospital sizes | 10 to 1000 beds |
| NFR-020 | Support multi-branch deployment | Up to 50 branches |
| NFR-021 | Patient records capacity | 10 million+ |
| NFR-022 | Data retention | 10+ years |
| NFR-023 | Horizontal scaling capability | Yes |

## 6.4 Offline Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-024 | Core functions must work offline | P0 |
| NFR-025 | Offline data sync when connected | P0 |
| NFR-026 | Conflict resolution for offline edits | P0 |
| NFR-027 | Maximum offline duration | 48 hours |
| NFR-028 | Local data storage encryption | P0 |

---

# Part 7: External Dependencies (Minimized)

## 7.1 Dependency Philosophy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    DEPENDENCY MINIMIZATION STRATEGY                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PRINCIPLE: Build In-House First, Integrate Only When Necessary         │
│                                                                          │
│  CATEGORY A: ZERO EXTERNAL DEPENDENCY (Built In-House)                  │
│  ✓ Core HIMS functionality + Infrastructure Setup                       │
│  ✓ EMR/Clinical documentation                                          │
│  ✓ Billing & Revenue                                                    │
│  ✓ Pharmacy inventory                                                   │
│  ✓ Laboratory workflow                                                  │
│  ✓ Device connectivity (direct serial/network)                          │
│  ✓ Queue management                                                     │
│  ✓ Reports & Analytics                                                  │
│  ✓ Rule-based AI/CDSS + On-premise ML models                           │
│  ✓ Drug interaction database + ICD-10 codes (bundled)                   │
│  ✓ Setup Wizard, Templates, Go-Live Validator                           │
│                                                                          │
│  CATEGORY B: MANDATORY EXTERNAL (Cannot Avoid)                          │
│  ◆ ABDM APIs (Government mandate)                                      │
│  ◆ SMS Gateway (Patient communication)                                  │
│  ◆ DSC Provider (e-Prescription signing)                                │
│                                                                          │
│  CATEGORY C: OPTIONAL EXTERNAL (User Choice)                            │
│  ○ WhatsApp Business API (enhanced notifications)                       │
│  ○ Payment Gateway (online payment)                                     │
│  ○ Cloud AI APIs (advanced NLP, voice transcription)                    │
│  ○ Cloud TTS (voice announcements)                                      │
│  ○ Cloud backup (optional redundancy)                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 7.2 Complete Dependency List

### Category A: Zero External Dependency

| Component | In-House Solution | External Alternative Avoided |
|-----------|-------------------|------------------------------|
| Database | PostgreSQL (self-hosted) | Cloud databases |
| Application Server | Node.js/Java (self-hosted) | Cloud compute |
| File Storage | Local NAS/SAN | Cloud storage |
| Queue System | Redis/RabbitMQ (local) | Cloud queues |
| Search | PostgreSQL Full-text / Elasticsearch (local) | Cloud search |
| Caching | Redis (local) | Cloud cache |
| Drug Database | Bundled database (included) | CIMS/MIMS subscription |
| ICD-10 Codes | Bundled database (WHO public) | Commercial databases |
| Integration Engine | Built-in HL7 parser | Mirth/Rhapsody license |
| Device Connectivity | Direct serial/TCP | Middleware gateways |
| Biometric SDK | Aadhaar RD Service (free) | Commercial SDKs |
| PDF Generation | Built-in (PDFKit/Puppeteer) | Cloud PDF services |
| Charts/Graphs | Built-in (Chart.js/D3) | Commercial BI tools |
| AI/ML (Basic) | TensorFlow.js / ONNX (local) | Cloud AI APIs |

### Category B: Mandatory External Dependencies

| Dependency | Purpose | Provider | Cost | Avoidable? |
|------------|---------|----------|------|------------|
| ABDM Gateway | Health data exchange | NHA (Govt) | Free | No (Mandate) |
| SMS Gateway | OTP, Notifications | MSG91, Kaleyra | ₹0.15-0.25/SMS | No |
| DSC Provider | e-Prescription signing | eMudhra | ₹2-3K/doctor | No (for e-Rx) |

**Total Mandatory Dependencies: 3**

### Category C: Optional External Dependencies

| Dependency | Purpose | Provider | Cost | Default |
|------------|---------|----------|------|---------|
| WhatsApp API | Enhanced notifications | Meta BSP | ₹0.50-1.50/msg | OFF |
| Payment Gateway | Online payment | Razorpay | 2%/txn | OFF |
| Cloud TTS | Voice announcements | Google/Azure | ~₹5K/month | OFF |
| Cloud AI | Advanced NLP | OpenAI/Azure | Variable | OFF |
| Cloud Backup | Redundancy | AWS/Azure | Per GB | OFF |

## 7.3 Dependency Comparison

| Metric | Industry Average | ZypoCare One |
|--------|------------------|--------------|
| External APIs | 15-30 | **3** (mandatory) |
| Software Licenses | 10-20 | **0** (all open-source/built-in) |
| Middleware Products | 3-5 | **0** |
| Cloud Dependencies | 5-10 | **0** (optional add-on) |
| Vendor Lock-in Risk | High | **Minimal** |
| Offline Capability | Limited | **Full** |

---

# Part 8: Hardware Requirements (Self-Contained)

## 8.1 Server Requirements

### Small Hospital (10-50 beds)

| Component | Specification | Qty | Est. Cost |
|-----------|---------------|-----|-----------|
| Application Server | 8 Core, 32GB RAM, 500GB SSD | 1 | ₹2-3L |
| Database (same server) | Included above | - | - |
| Network Switch | 24-port PoE | 1 | ₹30-50K |
| UPS | 3 KVA Online | 1 | ₹50-80K |
| **Total** | | | **₹3-4.5L** |

### Medium Hospital (50-200 beds)

| Component | Specification | Qty | Est. Cost |
|-----------|---------------|-----|-----------|
| Application Server | 16 Core, 64GB RAM, 1TB SSD | 1 | ₹4-6L |
| Database Server | 16 Core, 128GB RAM, 2TB SSD | 1 | ₹5-8L |
| Network Switch | 48-port PoE | 2 | ₹1-2L |
| UPS | 5 KVA Online | 1 | ₹1-1.5L |
| Backup NAS | 8TB | 1 | ₹80K-1L |
| **Total** | | | **₹12-18L** |

### Large Hospital (200+ beds)

| Component | Specification | Qty | Est. Cost |
|-----------|---------------|-----|-----------|
| Application Server | 32 Core, 128GB RAM, 2TB SSD | 2 | ₹8-12L each |
| Database Server | 32 Core, 256GB RAM, 4TB SSD | 1 | ₹10-15L |
| Network Core | Managed L3 Switch | 1 | ₹3-5L |
| Network Access | 48-port PoE | 4-6 | ₹1-2L each |
| Firewall | UTM | 1 | ₹2-4L |
| UPS | 10 KVA Online | 1 | ₹2-3L |
| Backup NAS | 20TB | 1 | ₹2-3L |
| **Total** | | | **₹35-55L** |

## 8.2 Client Devices

| Device | Purpose | Qty (per 50 beds) | Est. Cost |
|--------|---------|-------------------|-----------|
| Desktop PC | Nursing station, billing | 10-15 | ₹40-50K each |
| Laptop | Doctors | 5-10 | ₹50-70K each |
| Tablet | Bedside, ward rounds | 10-20 | ₹15-25K each |
| Barcode Scanner | Patient ID, pharmacy | 10-15 | ₹8-12K each |
| Wristband Printer | Registration | 2-3 | ₹30-50K each |
| Label Printer | Lab, pharmacy | 3-5 | ₹15-25K each |
| Queue Display | LED/TV | 3-5 | ₹10-25K each |
| Token Printer | Queue kiosk | 2-3 | ₹10-15K each |

## 8.3 Medical Device Connectivity Hardware

| Device | Purpose | Qty (per ICU bed) | Est. Cost |
|--------|---------|-------------------|-----------|
| Serial-to-Ethernet | Legacy device connect | 1-2 | ₹5-10K each |
| USB-to-Serial | Pulse oximeter connect | 1 | ₹500-1K each |
| Network Port | Monitor/Ventilator | 1-2 | Infrastructure |

**Total Medical Device Hardware per ICU bed: ₹5-15K**

---

# Part 9: Implementation Approach

## 9.1 Phased Rollout

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION PHASES                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PHASE 0: INFRASTRUCTURE SETUP (Weeks 1-12)                            │
│  ═══════════════════════════════════════════                            │
│  Phase 0A — Core Foundation (Weeks 1-4):                                │
│    ✓ Setup Wizard framework                                             │
│    ✓ Organization/Branch management                                     │
│    ✓ Location hierarchy                                                 │
│    ✓ Departments/Specialties with seeding                               │
│    ✓ Units/Rooms/Beds with resource states                              │
│    ✓ Staff management with credentials                                  │
│    ✓ User & Access control                                              │
│                                                                          │
│  Phase 0B — Clinical Infrastructure (Weeks 5-8):                        │
│    ✓ Pharmacy stores, Drug master, Formulary                            │
│    ✓ Blood bank configuration                                           │
│    ✓ Diagnostics enhancement, Reference ranges                          │
│    ✓ OT setup, Equipment compliance (AERB/PCPNDT)                      │
│    ✓ Service Catalog with standard codes                                │
│                                                                          │
│  Phase 0C — Financial & Billing Config (Weeks 9-10):                    │
│    ✓ Tax codes (GST), Charge Master                                     │
│    ✓ Payer management, Contracts                                        │
│    ✓ Tariff plans, Service-charge mapping                               │
│    ✓ Government schemes (PMJAY/CGHS/ECHS)                              │
│                                                                          │
│  Phase 0D — Compliance & Go-Live (Weeks 11-12):                        │
│    ✓ ABDM integration (HFR, HPR, ABHA)                                 │
│    ✓ NABH readiness checklist                                           │
│    ✓ Go-Live Validator (50+ checks)                                     │
│    ✓ Hospital Templates (Small/Medium/Large)                            │
│    ✓ Branch cloning                                                     │
│                                                                          │
│  PHASE 1: FOUNDATION (Months 4-7)                                      │
│  ════════════════════════════════                                       │
│  ✓ Core Registration & Patient Management                               │
│  ✓ Appointment & Queue Management                                       │
│  ✓ OPD Module                                                           │
│  ✓ Basic EMR                                                            │
│  ✓ Billing (Cash)                                                       │
│  ✓ Pharmacy (Basic)                                                     │
│  ✓ Laboratory (Basic)                                                   │
│  ✓ Basic Vital Signs Integration                                        │
│  ✓ AI: Drug interactions, Basic alerts, Setup Intelligence              │
│                                                                          │
│  PHASE 2: CLINICAL DEPTH (Months 8-11)                                 │
│  ════════════════════════════════════                                   │
│  ✓ IPD Module                                                           │
│  ✓ Nursing Documentation                                                │
│  ✓ Full EMR with CPOE                                                   │
│  ✓ Emergency Module                                                     │
│  ✓ Advanced Device Connectivity (Monitors, Pumps)                       │
│  ✓ Insurance/TPA Billing                                                │
│  ✓ ABDM Health Records                                                  │
│  ✓ AI: Diagnosis suggestions, Documentation AI                         │
│                                                                          │
│  PHASE 3: CRITICAL CARE (Months 12-15)                                 │
│  ═════════════════════════════════════                                  │
│  ✓ ICU Module & Dashboard                                               │
│  ✓ Ventilator Connectivity                                              │
│  ✓ OT Module                                                            │
│  ✓ Advanced AI: Deterioration prediction                                │
│  ✓ Blood Bank Operations                                                │
│  ✓ Full Reporting Suite                                                 │
│                                                                          │
│  PHASE 4: ENHANCEMENT (Months 16+)                                     │
│  ═════════════════════════════════                                      │
│  ○ Patient Portal                                                       │
│  ○ Mobile App                                                           │
│  ○ Telemedicine                                                         │
│  ○ Advanced Analytics                                                   │
│  ○ Multi-branch Support                                                 │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 9.2 Success Criteria by Phase

| Phase | Duration | Key Deliverables | Success Metric |
|-------|----------|------------------|----------------|
| Phase 0 | 12 weeks | Infrastructure module complete | Hospital configured in < 48 hours via wizard |
| Phase 1 | 4 months | OPD operational | 100 patients/day processed |
| Phase 2 | 4 months | IPD operational | 50 admissions managed |
| Phase 3 | 4 months | ICU connected | Real-time vitals from 10 beds |
| Phase 4 | Ongoing | Patient engagement | 1000 portal registrations |

## 9.3 Infrastructure Module Internal Roadmap

| Week | Deliverables |
|------|--------------|
| 1 | Setup Wizard framework, Organization/Branch enhancements |
| 2 | Location hierarchy, Department/Specialty seeding |
| 3 | Unit/Room/Resource management, Bed state machine |
| 4 | Staff module with credentials, User/Access control |
| 5 | Pharmacy stores, Drug master, Formulary |
| 6 | Blood bank configuration, Component setup |
| 7 | Diagnostics enhancement, Reference ranges |
| 8 | OT setup, Equipment register with compliance |
| 9 | Tax codes, Payer management, Contracts |
| 10 | Tariff plans, Service-charge mapping |
| 11 | ABDM integration (HFR, HPR), NABH checklist |
| 12 | Go-Live Validator, Templates, Documentation |

---

# Part 10: Competitive Differentiation

## 10.1 Feature Comparison

| Feature | ZypoCare One | KareXpert | Practo | MocDoc | Ezovion |
|---------|--------------|-----------|--------|--------|---------|
| AI Copilot (Native) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Guided Setup Wizard | ✅ | ❌ | ❌ | ❌ | ❌ |
| Hospital Templates | ✅ 3+ | ❌ | ❌ | ❌ | ❌ |
| Branch Cloning | ✅ | Partial | ❌ | ❌ | ❌ |
| Go-Live Validator | ✅ | ❌ | ❌ | ❌ | ❌ |
| Device Connectivity | ✅ Native | Middleware | ❌ | Limited | Limited |
| Ventilator Integration | ✅ | Limited | ❌ | ❌ | ❌ |
| Offline Capability | ✅ Full | Limited | ❌ | Limited | Limited |
| ABDM Native | ✅ | Retrofit | Partial | Partial | Partial |
| NABH Checklist | ✅ | Partial | ❌ | ❌ | Partial |
| Blood Bank (Complete) | ✅ | Partial | ❌ | ❌ | ❌ |
| Self-Contained | ✅ | ❌ | ❌ | ❌ | ❌ |
| External Dependencies | 3 | 20+ | 15+ | 15+ | 15+ |
| On-Premise Option | ✅ | Cloud-first | Cloud | Cloud | Cloud |
| Open Standards (HL7/FHIR) | ✅ | Partial | Limited | Limited | Limited |
| Policy Governance | ✅ | ❌ | ❌ | ❌ | ❌ |
| Multi-branch | ✅ Native | ✅ | ❌ | Partial | Partial |

## 10.2 Unique Selling Propositions

1. **AI-Native**: Only HIMS with embedded AI Copilot in every workflow — clinical, operational, and setup
2. **Setup-First**: Only HIMS that treats infrastructure setup as a first-class product with guided wizard, templates, and go-live validation
3. **Device-Native**: Direct connectivity to bedside devices, no middleware
4. **Self-Contained**: Minimal external dependencies (only 3 mandatory), full data sovereignty
5. **Offline-First**: Complete offline capability, not an afterthought
6. **India-First**: Built for Indian regulations — ABDM-native, NABH-ready, GST-compliant, AERB/PCPNDT aware
7. **48-Hour Onboarding**: Any hospital from 10 to 1000 beds can be digitally configured in under 48 hours
8. **Transparent Pricing**: No per-user, per-transaction hidden costs

---

# Part 11: Risk Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Device compatibility | High | Medium | Support major protocols, adapter approach |
| AI accuracy concerns | Medium | Medium | Start with rule-based, add ML gradually |
| ABDM API changes | Medium | High | Abstract ABDM layer, quick adaptation |
| Offline sync conflicts | Medium | Low | Last-write-wins with conflict UI |
| Performance at scale | High | Low | Load testing, horizontal scaling |
| User adoption | High | Medium | Intuitive UI, extensive training, Setup Wizard |
| Infrastructure setup complexity | High | Medium | Templates, guided wizard, AI-assisted defaults |
| Regulatory changes (NABH/GST) | Medium | Medium | Configurable compliance engine, version-controlled checklists |
| Multi-branch data consistency | Medium | Low | Centralized config with branch overrides |
| Template accuracy | Medium | Low | Validate with 3+ real hospitals before release |

---

# Part 12: Technical Architecture (Infrastructure Module)

## 12.1 Module Structure

```
services/core-api/src/modules/
├── infrastructure/
│   ├── setup-wizard/           # Guided setup flow
│   ├── organization/           # Enterprise & branch management
│   ├── location/               # Location hierarchy
│   ├── departments/            # Department & specialty management
│   ├── units/                  # Unit management
│   ├── rooms/                  # Room management
│   ├── resources/              # Bed & resource management
│   ├── staff/                  # Staff management
│   ├── equipment/              # Equipment register
│   ├── ot/                     # OT setup
│   ├── pharmacy/               # Pharmacy infrastructure
│   │   ├── stores/
│   │   ├── formulary/
│   │   └── suppliers/
│   ├── blood-bank/             # Blood bank setup
│   │   ├── configuration/
│   │   ├── components/
│   │   └── donors/
│   ├── diagnostics/            # Diagnostics configuration
│   │   ├── sections/
│   │   ├── items/
│   │   ├── parameters/
│   │   └── service-points/
│   ├── service-catalog/        # Service catalog
│   ├── billing/                # Billing configuration
│   │   ├── tax-codes/
│   │   ├── payers/
│   │   ├── contracts/
│   │   └── tariffs/
│   ├── compliance/             # Compliance configuration
│   │   ├── abdm/
│   │   ├── nabh/
│   │   └── statutory/
│   ├── queue/                  # Queue management config
│   ├── templates/              # Hospital templates
│   ├── seeding/                # Master data seeding
│   ├── clone/                  # Configuration cloning
│   ├── import/                 # Bulk import
│   └── golive/                 # Go-live validation
```

## 12.2 Database Schema — New Tables

PharmacyStore, DrugMaster, DrugCategory, DrugInteraction, Supplier, BloodBankUnit, BloodComponent, BloodStorageUnit, DonorMaster, QueueConfiguration, QueueCounter, QueueDisplay, HfrRegistration, HprRegistration, AbhaConfiguration, PmjayConfiguration, CghsConfiguration, HospitalTemplate, BranchSetupProgress.

**Enhanced Tables:** Payer, PayerContract, EquipmentAsset, DiagnosticItem.

---

# Appendix A: Glossary

| Term | Definition |
|------|------------|
| ABDM | Ayushman Bharat Digital Mission |
| ABHA | Ayushman Bharat Health Account |
| AERB | Atomic Energy Regulatory Board |
| AI Copilot | AI assistant embedded in clinical and operational workflows |
| CGHS | Central Government Health Scheme |
| CPOE | Computerized Provider Order Entry |
| CDSS | Clinical Decision Support System |
| ECHS | Ex-Servicemen Contributory Health Scheme |
| EMR | Electronic Medical Record |
| FEFO | First Expiry First Out |
| FHIR | Fast Healthcare Interoperability Resources |
| HFR | Health Facility Registry |
| HL7 | Health Level Seven International |
| HPR | Healthcare Professionals Registry |
| ICU | Intensive Care Unit |
| LIS | Laboratory Information System |
| LOINC | Logical Observation Identifiers Names and Codes |
| MLC | Medico-Legal Case |
| NABH | National Accreditation Board for Hospitals |
| NEWS | National Early Warning Score |
| OPD | Outpatient Department |
| PCPNDT | Pre-Conception and Pre-Natal Diagnostic Techniques Act |
| PMJAY | Pradhan Mantri Jan Arogya Yojana |
| SNOMED | Systematized Nomenclature of Medicine |
| UHID | Unique Health Identification |

---

# Appendix B: Reference Standards

## Indian Healthcare Standards
- NABH 6th Edition (2025)
- ABDM Guidelines
- Drugs and Cosmetics Act, 1940
- PCPNDT Act, 1994
- AERB Safety Codes
- Clinical Establishments Act, 2010

## International Standards
- HL7 FHIR R4
- SNOMED CT
- LOINC
- ICD-10
- DICOM

---

# Appendix C: Document Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| CEO/Sponsor | | | |
| CTO | | | |
| Medical Director | | | |
| CFO | | | |
| Tech Lead | | | |
| Engineering Manager | | | |

---

**Document End**

*This Unified BRD defines the complete vision for ZypoCare One HIMS — from infrastructure setup to clinical operations to critical care. Every module is designed with AI Copilot as a mandatory, deeply embedded intelligence layer, minimal external dependencies, and India-first compliance. The goal: build the best HIMS system in India.*
