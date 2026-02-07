# ZypoCare One HIMS
# Phase 1: Hospital Infrastructure Setup Module
# Product Requirements Document (PRD)

**Document Type:** Product Vision & Requirements  
**Version:** 1.0  
**Date:** January 5, 2026  
**Author:** Product Owner  
**Classification:** Strategic Document

---

# Executive Vision

## The Goal

Build **India's most comprehensive, ABDM-native Hospital Infrastructure Setup Module** that enables any hospital—from a 10-bed nursing home to a 1000-bed multi-specialty chain—to be digitally configured and operational within **48 hours**.

## Why This Matters

Current competitors in India (Practo, KareXpert, MocDoc, Ezovion, Attune) offer fragmented infrastructure setup:
- Manual, scattered configuration screens
- No guided workflows
- Missing India-specific compliance (NABH, ABDM)
- Poor multi-branch support
- No pre-built templates

**ZypoCare One will be different.** We will build the first HMS that treats Infrastructure Setup as a **first-class product experience**, not an afterthought.

## Success Metrics

| Metric | Target | Industry Benchmark |
|--------|--------|-------------------|
| Time to configure new hospital | < 48 hours | 2-4 weeks |
| Setup wizard completion rate | > 95% | Not measured |
| Go-live validation pass rate | > 90% first attempt | ~50% |
| Ops team training time | 2 days | 1-2 weeks |
| NABH-ready configuration | 100% | Partial |
| ABDM integration | Native | Retrofit |

---

# Part 1: Infrastructure Module Scope

## 1.1 What "Hospital Infrastructure" Means

Hospital Infrastructure in HIMS encompasses **everything that must be configured before the first patient walks in**:

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
└─────────────────────────────────────────────────────────────────────┘
```

## 1.2 Module Categories

### Category A: Core Infrastructure (Must Have - Phase 1A)
These are **non-negotiable** for any hospital to function:

| # | Module | Description | Priority |
|---|--------|-------------|----------|
| 1 | Organization & Branch | Multi-hospital enterprise setup | P0 |
| 2 | Location Hierarchy | Physical structure mapping | P0 |
| 3 | Departments & Specialties | Clinical organization | P0 |
| 4 | Unit Types & Units | OPD, IPD, ICU, OT, ER, etc. | P0 |
| 5 | Rooms & Beds | Patient accommodation | P0 |
| 6 | Staff Management | Doctors, nurses, technicians | P0 |
| 7 | User & Access Control | IAM, roles, permissions | P0 |
| 8 | Service Catalog | All orderable services | P0 |
| 9 | Charge Master | Billing items | P0 |
| 10 | Tax Configuration | GST, exemptions | P0 |
| 11 | Payer Management | Cash, insurance, TPA, govt | P0 |
| 12 | Tariff Plans | Pricing by payer | P0 |

### Category B: Clinical Infrastructure (Must Have - Phase 1B)
Essential for clinical operations:

| # | Module | Description | Priority |
|---|--------|-------------|----------|
| 13 | Diagnostics Configuration | Lab tests, imaging, parameters | P0 |
| 14 | OT Setup | Theatres, tables, scheduling | P0 |
| 15 | Pharmacy Infrastructure | Stores, formulary, suppliers | P0 |
| 16 | Blood Bank Setup | Components, inventory, donors | P0 |
| 17 | Equipment Register | Assets, maintenance, compliance | P0 |
| 18 | Service Packages | Bundled offerings | P1 |
| 19 | Order Sets | Clinical presets | P1 |

### Category C: Compliance Infrastructure (Must Have - Phase 1C)
Mandatory for Indian hospitals:

| # | Module | Description | Priority |
|---|--------|-------------|----------|
| 20 | ABDM Integration | HFR, HPR, ABHA | P0 |
| 21 | NABH Readiness | Standards compliance | P1 |
| 22 | Statutory Configuration | MLC, PCPNDT, PNDT | P1 |
| 23 | Government Schemes | PMJAY, CGHS, ECHS, state | P1 |
| 24 | Policy Governance | Hospital policies, SOPs | P1 |

### Category D: Operational Infrastructure (Should Have - Phase 1D)
Enhanced operations support:

| # | Module | Description | Priority |
|---|--------|-------------|----------|
| 25 | Queue Management | OPD tokens, displays | P1 |
| 26 | Ambulance Management | Fleet, dispatch | P2 |
| 27 | Housekeeping | Task management, infection control | P2 |
| 28 | Food & Nutrition | Diet orders, kitchen | P2 |
| 29 | Laundry Management | Linen tracking | P2 |
| 30 | Vendor Management | Contracts, performance | P2 |

---

# Part 2: Detailed Requirements

## 2.1 Organization & Branch Management

### 2.1.1 Enterprise Structure

```
Enterprise (Organization)
├── Branch 1 (Hospital A - Main)
│   ├── Location Hierarchy
│   ├── Departments
│   ├── Staff
│   └── Services
├── Branch 2 (Hospital A - Satellite)
│   └── ... (inherits from main or custom)
└── Branch 3 (Hospital B - Acquired)
    └── ... (independent configuration)
```

### 2.1.2 Branch Configuration

**Required Fields:**
- Branch Code (unique identifier)
- Branch Name
- Legal Entity Name
- Address (full with PIN code)
- Contact Phone (primary, secondary)
- Contact Email
- GST Number (15-digit)
- PAN Number
- Clinical Establishment Registration Number
- ROHINI ID (if applicable)
- HFR ID (ABDM - auto-populated after registration)

**Optional Fields:**
- Logo (for reports, letterheads)
- Website
- Social Media Links
- Accreditation Status (NABH, JCI)
- Bed Count (for licensing)
- Established Date

**Branch Settings:**
- Default Currency (INR)
- Timezone (IST)
- Fiscal Year Start (April)
- Working Hours
- Emergency 24x7 Flag
- Multi-language Support

### 2.1.3 Branch Hierarchy

Support for complex organizational structures:

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

---

## 2.2 Location Hierarchy

### 2.2.1 Location Types

```
CAMPUS (Multi-building complexes)
└── BUILDING (Physical structures)
    └── FLOOR (Vertical divisions)
        └── ZONE/WING (Horizontal divisions)
            └── AREA (Functional spaces)
```

### 2.2.2 Location Attributes

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

### 2.2.3 Example Configuration

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

## 2.3 Departments & Specialties

### 2.3.1 Specialty Master

Pre-loaded medical specialties (MCI recognized):

**Clinical Specialties:**
- General Medicine
- General Surgery
- Obstetrics & Gynaecology
- Pediatrics
- Orthopedics
- Ophthalmology
- ENT (Otorhinolaryngology)
- Dermatology
- Psychiatry
- Cardiology
- Neurology
- Nephrology
- Gastroenterology
- Pulmonology
- Urology
- Oncology (Medical, Surgical, Radiation)
- Emergency Medicine
- Anesthesiology
- Radiology
- Pathology
- Critical Care Medicine
- Neonatology
- ... (100+ specialties)

**Super-Specialties:**
- Cardiothoracic Surgery
- Neurosurgery
- Plastic Surgery
- Pediatric Surgery
- Surgical Gastroenterology
- ... (50+ super-specialties)

### 2.3.2 Department Configuration

```typescript
interface Department {
  id: string;
  branchId: string;
  code: string;
  name: string;
  facilityType: FacilityType; // CLINICAL, SERVICE, SUPPORT
  specialties: Specialty[];   // Can have multiple
  headOfDepartment: Staff;
  location: LocationNode;
  contactExtension: string;
  operatingHours: OperatingHours;
  isActive: boolean;
}
```

**Standard Departments:**
- Emergency Department
- Outpatient Department
- Inpatient Department
- Intensive Care Unit
- Operation Theatre
- Laboratory
- Radiology
- Pharmacy
- Blood Bank
- Physiotherapy
- Dietary Services
- Central Sterile Supply
- Medical Records
- Billing & Accounts
- Administration
- Human Resources
- Maintenance & Engineering

---

## 2.4 Units, Rooms & Resources

### 2.4.1 Unit Type Catalog

**Pre-configured Unit Types:**

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
| TRIAGE | Triage Area | ✗ | ✗ | ✗ |
| DIALYSIS | Dialysis Unit | ✓ | ✓ | ✗ |
| DAYCARE | Day Care Center | ✓ | ✓ | ✓ |
| CHEMO | Chemotherapy Unit | ✓ | ✓ | ✓ |
| ENDO | Endoscopy Suite | ✓ | ✓ | ✗ |
| CATH_LAB | Cath Lab | ✓ | ✓ | ✗ |
| LAB | Laboratory | ✓ | ✗ | ✗ |
| RAD_XRAY | X-Ray Room | ✓ | ✓ | ✗ |
| RAD_CT | CT Scan Room | ✓ | ✓ | ✗ |
| RAD_MRI | MRI Room | ✓ | ✓ | ✗ |
| RAD_USG | Ultrasound Room | ✓ | ✓ | ✗ |
| PHYSIO | Physiotherapy | ✓ | ✓ | ✗ |
| PHARMACY | Pharmacy | ✗ | ✗ | ✗ |
| BLOOD_BANK | Blood Bank | ✗ | ✗ | ✗ |
| CSSD | Central Sterile Supply | ✗ | ✗ | ✗ |
| MORTUARY | Mortuary | ✓ | ✗ | ✗ |
| LABOR | Labor Room | ✓ | ✗ | ✓ |
| NURSERY | Newborn Nursery | ✓ | ✗ | ✓ |

### 2.4.2 Room Configuration

```typescript
interface Room {
  id: string;
  unitId: string;
  code: string;
  name: string;
  roomType: RoomType;
  
  // Physical attributes
  areaSqFt: number;
  hasAttachedBathroom: boolean;
  hasAC: boolean;
  hasTV: boolean;
  hasOxygen: boolean;
  hasSuction: boolean;
  
  // Capacity
  maxOccupancy: number;
  
  // Pricing tier
  pricingTier: 'ECONOMY' | 'STANDARD' | 'DELUXE' | 'SUITE' | 'VIP';
  
  isActive: boolean;
}

enum RoomType {
  CONSULTATION = 'CONSULTATION',
  PROCEDURE = 'PROCEDURE',
  EXAMINATION = 'EXAMINATION',
  PATIENT_ROOM = 'PATIENT_ROOM',
  ISOLATION = 'ISOLATION',
  NEGATIVE_PRESSURE = 'NEGATIVE_PRESSURE',
  POSITIVE_PRESSURE = 'POSITIVE_PRESSURE',
  NURSING_STATION = 'NURSING_STATION',
  WAITING = 'WAITING',
  STORAGE = 'STORAGE',
  UTILITY = 'UTILITY'
}
```

### 2.4.3 Resource Types

**Bed Resources:**
- General Bed
- ICU Bed (with monitoring hookup)
- NICU Incubator
- Crib
- Trolley/Stretcher
- Wheelchair Position

**Procedure Resources:**
- OT Table
- Dialysis Station
- Chemotherapy Chair
- Procedure Chair
- Recovery Bay

**Diagnostic Resources:**
- X-Ray Machine Slot
- CT Scanner Slot
- MRI Scanner Slot
- USG Machine Slot
- ECG Machine Slot
- Sample Collection Counter

### 2.4.4 Resource State Management

```
┌─────────────────────────────────────────────────────────┐
│                    RESOURCE STATES                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   ┌──────────┐        ┌──────────┐        ┌──────────┐  │
│   │ AVAILABLE│───────▶│ OCCUPIED │───────▶│ CLEANING │  │
│   └──────────┘        └──────────┘        └──────────┘  │
│        ▲                                       │         │
│        │                                       │         │
│        └───────────────────────────────────────┘         │
│                                                          │
│   ┌─────────────┐     ┌──────────┐                      │
│   │ MAINTENANCE │     │ RESERVED │                      │
│   └─────────────┘     └──────────┘                      │
│                                                          │
│   ┌──────────┐        ┌──────────┐                      │
│   │ INACTIVE │        │ BLOCKED  │                      │
│   └──────────┘        └──────────┘                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 2.5 Staff Management

### 2.5.1 Staff Categories

**Clinical Staff:**
- Doctors (Consultants, Residents, Interns)
- Nurses (Head Nurse, Staff Nurse, Trainee)
- Technicians (Lab, Radiology, OT, Dialysis)
- Pharmacists
- Physiotherapists
- Dietitians
- Counselors

**Non-Clinical Staff:**
- Administrative Staff
- Billing Staff
- Reception Staff
- Security
- Housekeeping
- Maintenance
- Drivers

### 2.5.2 Staff Profile

```typescript
interface Staff {
  id: string;
  
  // Personal Information
  title: 'Dr.' | 'Mr.' | 'Mrs.' | 'Ms.';
  firstName: string;
  lastName: string;
  gender: 'M' | 'F' | 'O';
  dateOfBirth: Date;
  nationality: string;
  
  // Contact
  personalEmail: string;
  officialEmail: string;
  mobileNumber: string;
  emergencyContact: EmergencyContact;
  currentAddress: Address;
  permanentAddress: Address;
  
  // Professional
  staffType: StaffType;
  designation: string;
  specialties: Specialty[];
  qualifications: Qualification[];
  experience: Experience[];
  
  // Employment
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'VISITING' | 'CONTRACT';
  joiningDate: Date;
  reportingTo: Staff;
  
  // Registration & Credentials
  registrationNumber: string;  // MCI/State Council
  registrationCouncil: string;
  registrationExpiry: Date;
  hprId: string;              // ABDM HPR ID
  
  // Documents
  documents: StaffDocument[];
  
  // Assignments
  homeBranch: Branch;
  assignments: StaffAssignment[];
  
  // Provider Profile (for clinical staff)
  providerProfile: ProviderProfile;
  
  // Privileges (for doctors)
  privileges: Privilege[];
  
  // Compliance
  compliancePacks: CompliancePack[];
  
  isActive: boolean;
}
```

### 2.5.3 Credential Management

**Required Credentials (by Staff Type):**

| Staff Type | Required Credentials |
|------------|---------------------|
| Doctor | MCI/State Registration, Degree Certificate, ABDM HPR |
| Nurse | Nursing Council Registration, BSc/GNM Certificate |
| Lab Technician | DMLT/BMLT Certificate |
| Pharmacist | Pharmacy Council Registration, B.Pharm/D.Pharm |
| Radiographer | DMRT/BSc Certificate |

**Credential Tracking:**
- Credential Type
- Credential Number
- Issuing Authority
- Issue Date
- Expiry Date
- Document Upload
- Verification Status
- Auto-renewal Alerts

### 2.5.4 Privilege Management (for Doctors)

```typescript
interface Privilege {
  id: string;
  staffId: string;
  
  privilegeType: PrivilegeType;
  description: string;
  
  // Scope
  departments: Department[];
  procedures: ServiceItem[];
  
  // Approval
  grantedBy: User;
  grantedAt: Date;
  
  // Validity
  validFrom: Date;
  validTo: Date;
  
  // Review
  lastReviewedAt: Date;
  nextReviewAt: Date;
  
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';
}

enum PrivilegeType {
  ADMITTING = 'ADMITTING',           // Can admit patients
  SURGICAL = 'SURGICAL',             // Can perform surgery
  ANESTHESIA = 'ANESTHESIA',         // Can administer anesthesia
  PRESCRIPTION = 'PRESCRIPTION',      // Can prescribe medications
  PROCEDURE = 'PROCEDURE',           // Can perform procedures
  SUPERVISION = 'SUPERVISION',       // Can supervise juniors
  TEACHING = 'TEACHING',             // Can teach/train
  TELEMEDICINE = 'TELEMEDICINE'      // Can do teleconsults
}
```

---

## 2.6 Service Catalog

### 2.6.1 Service Item Categories

**Diagnostic Services:**
- Laboratory Tests (Biochemistry, Hematology, Microbiology, etc.)
- Imaging Services (X-Ray, CT, MRI, USG, etc.)
- Cardiac Diagnostics (ECG, Echo, TMT, Holter)
- Neurological Diagnostics (EEG, EMG, NCV)
- Pulmonary Function Tests

**Procedure Services:**
- Minor Procedures (Dressing, Injection, Catheterization)
- Major Procedures (Surgeries, Endoscopies)
- Therapeutic Procedures (Dialysis, Chemotherapy)

**Consultation Services:**
- OPD Consultation (New, Follow-up)
- Specialist Consultation
- Teleconsultation
- Emergency Consultation
- Home Visit

**Nursing Services:**
- Nursing Care (General, ICU, Special)
- Dressing Changes
- Injection Administration
- Vital Monitoring

**Room & Bed Charges:**
- General Ward
- Semi-Private Room
- Private Room
- Deluxe Room
- Suite
- ICU/ICCU/NICU Bed

**Consumables & Supplies:**
- Surgical Consumables
- Medical Consumables
- Implants
- Prosthetics

**Package Services:**
- Health Checkup Packages
- Maternity Packages
- Surgical Packages
- Dialysis Packages

### 2.6.2 Service Item Configuration

```typescript
interface ServiceItem {
  id: string;
  branchId: string;
  
  // Identification
  code: string;               // Internal code
  name: string;               // Display name
  aliases: string[];          // Search aliases
  
  // Classification
  type: ServiceItemType;
  category: string;
  subcategory: string;
  
  // Standard Codes (for interoperability)
  loincCode: string;          // For lab tests
  cptCode: string;            // Procedure code
  icd10PcsCode: string;       // For procedures
  snomedCode: string;         // Clinical terms
  nabhhCode: string;          // NABH classification
  
  // Care Context
  applicableContexts: CareContext[];  // OPD, IPD, ER, etc.
  
  // Clinical Rules
  requiresOrder: boolean;
  requiresConsent: boolean;
  requiresScheduling: boolean;
  requiresPreparation: boolean;
  preparationInstructions: string;
  
  // Turnaround Time
  tatMinutesRoutine: number;
  tatMinutesStat: number;
  
  // Resource Requirements
  resourceRequirements: ResourceRequirement[];
  
  // Pricing
  defaultPrice: Decimal;
  isPackage: boolean;
  
  // Billing
  chargeUnit: ChargeUnit;
  taxApplicability: TaxApplicability;
  
  // Lifecycle
  status: ServiceLifecycleStatus;
  effectiveFrom: Date;
  effectiveTo: Date;
  
  isActive: boolean;
}
```

### 2.6.3 Service Catalog Structure

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

## 2.7 Pharmacy Infrastructure

### 2.7.1 Pharmacy Store Hierarchy

```
Main Pharmacy (Central Store)
├── IP Pharmacy (Inpatient dispensing)
├── OP Pharmacy (Outpatient dispensing)
├── Emergency Pharmacy (24x7)
├── OT Store (Surgical supplies)
├── ICU Sub-store
├── Ward Sub-stores
│   ├── Ward A Sub-store
│   ├── Ward B Sub-store
│   └── ICU Sub-store
└── Narcotics Vault (Controlled substances)
```

### 2.7.2 Drug Master

```typescript
interface DrugMaster {
  id: string;
  
  // Identification
  code: string;
  genericName: string;
  brandName: string;
  manufacturer: string;
  
  // Classification
  category: DrugCategory;
  therapeuticClass: string;
  pharmacologicalClass: string;
  
  // Formulation
  dosageForm: DosageForm;
  strength: string;
  strengthUnit: string;
  route: AdministrationRoute;
  
  // Regulatory
  scheduleClass: ScheduleClass;    // H, H1, X, G, etc.
  isNarcotic: boolean;
  isControlled: boolean;
  isPsychotropic: boolean;
  isAntibiotic: boolean;
  
  // Pricing
  mrp: Decimal;
  purchasePrice: Decimal;
  
  // Inventory
  hsnCode: string;
  gstRate: Decimal;
  unitOfMeasure: string;
  packSize: number;
  
  // Clinical
  defaultDosage: string;
  maxDailyDose: string;
  contraindications: string[];
  interactions: DrugInteraction[];
  
  // Formulary
  isFormulary: boolean;           // On hospital formulary
  requiresApproval: boolean;      // Non-formulary approval needed
  
  isActive: boolean;
}

enum ScheduleClass {
  GENERAL = 'GENERAL',            // No restriction
  H = 'H',                        // Prescription only
  H1 = 'H1',                      // Strict prescription (antibiotics)
  X = 'X',                        // Narcotics/Psychotropics
  G = 'G'                         // Caution required
}
```

### 2.7.3 Pharmacy Store Configuration

```typescript
interface PharmacyStore {
  id: string;
  branchId: string;
  
  code: string;
  name: string;
  storeType: PharmacyStoreType;
  
  // Location
  locationNodeId: string;
  
  // Hierarchy
  parentStoreId: string;
  
  // Operational
  isDispensing: boolean;          // Can dispense to patients
  isIndenting: boolean;           // Can request from main store
  is24x7: boolean;
  
  // Drug License
  drugLicenseNumber: string;
  drugLicenseExpiry: Date;
  
  // Responsible Person
  pharmacistInChargeId: string;
  
  // Contact
  contactExtension: string;
  
  isActive: boolean;
}

enum PharmacyStoreType {
  MAIN = 'MAIN',                  // Central store
  IP_PHARMACY = 'IP_PHARMACY',    // Inpatient
  OP_PHARMACY = 'OP_PHARMACY',    // Outpatient
  EMERGENCY = 'EMERGENCY',        // Emergency
  OT_STORE = 'OT_STORE',          // OT supplies
  WARD_STORE = 'WARD_STORE',      // Ward sub-store
  NARCOTICS = 'NARCOTICS'         // Controlled substances
}
```

### 2.7.4 Inventory Configuration

**Stock Levels:**
- Minimum Stock Level
- Maximum Stock Level
- Reorder Level
- Reorder Quantity
- Safety Stock

**Expiry Management:**
- Expiry Alert Days (90, 60, 30 days)
- FEFO (First Expiry First Out)
- Near-Expiry Return Policy

**ABC-VED Analysis:**
- ABC (Value-based): A (High), B (Medium), C (Low)
- VED (Criticality): Vital, Essential, Desirable
- Combined matrix for inventory priority

---

## 2.8 Blood Bank Infrastructure

### 2.8.1 Blood Bank Configuration

```typescript
interface BloodBankUnit {
  id: string;
  branchId: string;
  
  code: string;
  name: string;
  
  // License
  licenseNumber: string;
  licenseAuthority: string;        // SBTC, CDSCO
  licenseExpiry: Date;
  
  // Capacity
  storageCapacity: number;         // Total units
  
  // Components handled
  componentsHandled: BloodComponentType[];
  
  // Services offered
  canCollect: boolean;             // Blood collection
  canProcess: boolean;             // Component separation
  canStore: boolean;               // Storage only
  canIssue: boolean;               // Issue to patients
  
  // Location
  locationNodeId: string;
  
  // Responsible Person
  medicalOfficerId: string;
  
  // Contact
  contactPhone: string;
  emergencyPhone: string;          // 24x7 emergency
  
  isActive: boolean;
}
```

### 2.8.2 Blood Components

| Component | Code | Shelf Life | Storage Temp |
|-----------|------|------------|--------------|
| Whole Blood | WB | 35 days | 2-6°C |
| Packed Red Blood Cells | PRBC | 42 days | 2-6°C |
| Fresh Frozen Plasma | FFP | 1 year | -18°C or below |
| Platelet Concentrate | PC | 5 days | 20-24°C (agitation) |
| Cryoprecipitate | CRYO | 1 year | -18°C or below |
| Single Donor Platelets | SDP | 5 days | 20-24°C (agitation) |

### 2.8.3 Blood Inventory Management

```typescript
interface BloodBag {
  id: string;
  bloodBankId: string;
  
  // Identification
  bagNumber: string;               // Unique bag number
  segmentNumber: string;           // For testing
  
  // Blood Type
  bloodGroup: BloodGroup;          // A, B, AB, O
  rhFactor: RhFactor;              // Positive, Negative
  
  // Component
  componentType: BloodComponentType;
  volume: number;                  // in ml
  
  // Source
  sourceType: BloodSourceType;
  donorId: string;                 // If from donor
  campId: string;                  // If from camp
  
  // Dates
  collectionDate: Date;
  expiryDate: Date;
  
  // Status
  status: BloodBagStatus;
  
  // Testing
  screeningStatus: ScreeningStatus;
  screeningTests: BloodScreeningTest[];
  
  // Location
  storageUnitId: string;
  shelfLocation: string;
  
  // Traceability
  parentBagId: string;             // If component separated
  childBagIds: string[];           // Separated components
}

enum BloodBagStatus {
  QUARANTINE = 'QUARANTINE',       // Awaiting screening
  AVAILABLE = 'AVAILABLE',         // Ready for use
  RESERVED = 'RESERVED',           // Reserved for patient
  CROSSMATCHED = 'CROSSMATCHED',   // Cross-match done
  ISSUED = 'ISSUED',               // Issued to patient
  TRANSFUSED = 'TRANSFUSED',       // Transfusion complete
  EXPIRED = 'EXPIRED',             // Past expiry
  DISCARDED = 'DISCARDED',         // Discarded
  RETURNED = 'RETURNED'            // Returned unused
}
```

---

## 2.9 Diagnostics Configuration

### 2.9.1 Diagnostic Sections

**Laboratory:**
- Biochemistry
- Hematology
- Clinical Pathology
- Microbiology
- Serology/Immunology
- Histopathology
- Cytopathology
- Molecular Diagnostics

**Imaging:**
- General Radiology (X-Ray)
- Ultrasound
- CT Scan
- MRI
- Mammography
- Fluoroscopy
- Interventional Radiology

**Cardiology:**
- ECG
- 2D Echocardiography
- Stress Test (TMT)
- Holter Monitoring
- Ambulatory BP Monitoring

**Neurology:**
- EEG
- EMG/NCV
- Evoked Potentials

**Pulmonology:**
- Pulmonary Function Test
- Sleep Study

### 2.9.2 Diagnostic Item Configuration

```typescript
interface DiagnosticItem {
  id: string;
  branchId: string;
  
  // Identification
  code: string;
  name: string;
  aliases: string[];
  
  // Classification
  sectionId: string;
  categoryId: string;
  kind: DiagnosticKind;           // LAB, IMAGING, PROCEDURE
  
  // Standard Codes
  loincCode: string;              // LOINC for lab
  cptCode: string;                // CPT for procedures
  
  // Specimen (for lab tests)
  specimenTypeId: string;
  specimenVolume: number;
  containerType: string;
  
  // Timing
  tatMinutesRoutine: number;
  tatMinutesStat: number;
  
  // Preparation
  requiresFasting: boolean;
  fastingHours: number;
  preparationInstructions: string;
  
  // Consent
  requiresConsent: boolean;
  consentFormId: string;
  
  // Scheduling
  requiresAppointment: boolean;
  defaultDurationMinutes: number;
  
  // Panel/Profile
  isPanel: boolean;
  panelItems: DiagnosticPanelItem[];
  
  // Parameters (for lab tests)
  parameters: DiagnosticParameter[];
  
  // Report Template
  reportTemplateId: string;
  
  // Pricing
  serviceItemId: string;          // Link to service catalog
  
  isActive: boolean;
}
```

### 2.9.3 Parameter & Reference Ranges

```typescript
interface DiagnosticParameter {
  id: string;
  testId: string;
  
  code: string;
  name: string;
  
  // Result Type
  dataType: ResultDataType;       // NUMERIC, TEXT, CHOICE, etc.
  unit: string;
  precision: number;              // Decimal places
  
  // For CHOICE type
  allowedValues: string[];
  
  // Critical Values
  criticalLow: number;
  criticalHigh: number;
  
  // Reference Ranges
  referenceRanges: ReferenceRange[];
  
  sortOrder: number;
  isActive: boolean;
}

interface ReferenceRange {
  id: string;
  parameterId: string;
  
  // Demographics
  gender: 'M' | 'F' | 'ALL';
  ageMinDays: number;
  ageMaxDays: number;
  
  // Range
  normalLow: number;
  normalHigh: number;
  unit: string;
  
  // Text (for non-numeric)
  normalText: string;
  
  // Notes
  interpretationNotes: string;
}
```

---

## 2.10 OT Setup

### 2.10.1 OT Suite Configuration

```typescript
interface OtSuite {
  id: string;
  branchId: string;
  
  code: string;
  name: string;
  
  // Location
  locationNodeId: string;
  
  // Configuration
  config: {
    turnaroundMinutes: number;     // Between cases
    cleaningMinutes: number;       // Cleaning time
    minRecoveryBays: number;       // Minimum recovery bays
    maxCasesPerDay: number;        // Capacity limit
  };
  
  // Spaces
  spaces: OtSpace[];
  
  // Equipment
  equipment: OtEquipment[];
  
  // Status
  status: OtSuiteStatus;
  
  isActive: boolean;
}

interface OtSpace {
  id: string;
  suiteId: string;
  
  code: string;
  name: string;
  spaceType: OtSpaceType;
  
  // Location mapping
  locationNodeId: string;
  
  // For THEATRE type
  theatre: OtTheatre;
  
  // For RECOVERY_BAY type
  recoveryBay: OtRecoveryBay;
  
  isActive: boolean;
}

enum OtSpaceType {
  THEATRE = 'THEATRE',
  RECOVERY_BAY = 'RECOVERY_BAY',
  PREOP_HOLDING = 'PREOP_HOLDING',
  INDUCTION_ROOM = 'INDUCTION_ROOM',
  SCRUB_ROOM = 'SCRUB_ROOM',
  STERILE_STORE = 'STERILE_STORE',
  ANESTHESIA_STORE = 'ANESTHESIA_STORE',
  STAFF_CHANGE = 'STAFF_CHANGE'
}
```

### 2.10.2 OT Theatre Configuration

```typescript
interface OtTheatre {
  id: string;
  spaceId: string;
  
  // Type
  theatreType: OtTheatreType;      // GENERAL, MODULAR, LAMINAR, HYBRID
  
  // Engineering
  airflow: OtAirflowType;          // STANDARD, LAMINAR
  pressure: OtPressureType;        // POSITIVE, NEGATIVE, NEUTRAL
  isoClass: string;                // ISO cleanliness class
  
  // Specialties
  specialtyCodes: string[];        // Which specialties can use
  
  // Equipment
  tables: OtTable[];
  
  // Compliance
  aeraRegistration: string;        // If radiation equipment
  
  isActive: boolean;
}
```

---

## 2.11 Equipment Register

### 2.11.1 Equipment Categories

**Diagnostic Equipment:**
- X-Ray Machine
- CT Scanner
- MRI Scanner
- Ultrasound Machine
- Mammography Unit
- C-Arm
- Bone Densitometer

**Therapeutic Equipment:**
- Dialysis Machine
- Ventilator
- Defibrillator
- Infusion Pump
- Syringe Pump
- Patient Monitor
- ECG Machine

**Surgical Equipment:**
- OT Table
- OT Light
- Cautery Machine
- Anesthesia Workstation
- Laparoscopy Tower
- Surgical Microscope

**Laboratory Equipment:**
- Biochemistry Analyzer
- Hematology Analyzer
- Blood Gas Analyzer
- Coagulation Analyzer
- ELISA Reader
- PCR Machine

**Support Equipment:**
- Autoclave
- Washer Disinfector
- Ultrasonic Cleaner
- Ice Flaker
- Blood Bank Refrigerator

### 2.11.2 Equipment Asset Configuration

```typescript
interface EquipmentAsset {
  id: string;
  branchId: string;
  
  // Identification
  assetCode: string;
  assetTag: string;               // Physical tag/barcode
  name: string;
  
  // Classification
  category: EquipmentCategory;
  subcategory: string;
  
  // Specifications
  manufacturer: string;
  model: string;
  serialNumber: string;
  
  // Acquisition
  purchaseDate: Date;
  purchasePrice: Decimal;
  vendorId: string;
  warrantyExpiry: Date;
  
  // Location
  currentPlacement: EquipmentPlacement;
  movementHistory: EquipmentMovement[];
  
  // Operational
  status: EquipmentStatus;
  
  // Maintenance
  nextPmDueAt: Date;              // Preventive maintenance
  lastPmAt: Date;
  maintenanceTasks: MaintenanceTask[];
  
  // Compliance (for regulated equipment)
  requiresAerbLicense: boolean;   // Radiation equipment
  aerbLicenseNumber: string;
  aerbLicenseExpiry: Date;
  
  requiresPcpndtRegistration: boolean;  // USG machines
  pcpndtRegistrationNumber: string;
  pcpndtRegistrationExpiry: Date;
  
  // Contracts
  contracts: EquipmentContract[];
  
  // Documents
  documents: EquipmentDocument[];
  
  // Depreciation
  usefulLifeYears: number;
  depreciationMethod: DepreciationMethod;
  currentBookValue: Decimal;
  
  isActive: boolean;
}
```

### 2.11.3 Compliance Requirements

**AERB (Atomic Energy Regulatory Board):**
- Required for: X-Ray, CT, Fluoroscopy, Cath Lab, Linear Accelerator
- License Types: Layout approval, Operating license
- Annual renewal required
- Radiation safety officer mandatory

**PCPNDT (Pre-Conception and Pre-Natal Diagnostic Techniques Act):**
- Required for: Ultrasound machines
- Registration with State/District authority
- Form F maintenance mandatory
- Quarterly returns submission

---

## 2.12 Financial Configuration

### 2.12.1 Tax Configuration

**Indian GST Structure:**

| Tax Code | Description | Rate | Applicability |
|----------|-------------|------|---------------|
| GST_EXEMPT | Healthcare Exemption | 0% | Most clinical services |
| GST_5 | Reduced Rate | 5% | Some consumables |
| GST_12 | Standard (Lower) | 12% | Medical equipment |
| GST_18 | Standard | 18% | Non-clinical services |
| GST_28 | Higher Rate | 28% | Luxury items |

**Healthcare GST Exemptions:**
- Inpatient services: Exempt
- Diagnostic services: Exempt
- Doctor consultations: Exempt
- Room rent (up to ₹5000/day): Exempt
- ICU charges: Exempt

### 2.12.2 Payer Configuration

```typescript
interface Payer {
  id: string;
  branchId: string;
  
  code: string;
  name: string;
  kind: PayerKind;
  
  // Contact
  address: Address;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  
  // For Insurance/TPA
  tpaLicenseNumber: string;
  irdaiRegistration: string;
  
  // For Government
  schemeCode: string;              // PMJAY, CGHS, ECHS, etc.
  schemeName: string;
  
  // Credit Terms
  creditDays: number;
  creditLimit: Decimal;
  
  // Discount
  defaultDiscountPercent: Decimal;
  
  // Documents
  documents: PayerDocument[];
  
  isActive: boolean;
}

enum PayerKind {
  CASH = 'CASH',
  INSURANCE = 'INSURANCE',
  TPA = 'TPA',
  CORPORATE = 'CORPORATE',
  GOVERNMENT = 'GOVERNMENT',
  TRUST = 'TRUST',
  EMPLOYEE = 'EMPLOYEE'
}
```

### 2.12.3 Tariff Plans

```typescript
interface TariffPlan {
  id: string;
  branchId: string;
  
  code: string;
  name: string;
  
  kind: TariffPlanKind;           // PRICE_LIST, PAYER_CONTRACT
  
  // For PAYER_CONTRACT
  payerId: string;
  contractId: string;
  
  // Validity
  effectiveFrom: Date;
  effectiveTo: Date;
  
  // Discount Structure
  globalDiscountPercent: Decimal;
  categoryDiscounts: CategoryDiscount[];
  
  // Status
  status: TariffPlanStatus;
  
  // Rates
  rates: TariffRate[];
  
  isActive: boolean;
}

interface TariffRate {
  id: string;
  tariffPlanId: string;
  
  // Service Reference
  serviceItemId: string;
  chargeMasterItemId: string;
  
  // Pricing
  rate: Decimal;
  
  // Overrides
  discountPercent: Decimal;
  
  // Caps
  minRate: Decimal;
  maxRate: Decimal;
  
  // Validity
  effectiveFrom: Date;
  effectiveTo: Date;
}
```

---

## 2.13 ABDM Integration

### 2.13.1 HFR (Health Facility Registry)

```typescript
interface HfrRegistration {
  id: string;
  branchId: string;
  
  // HFR ID (from ABDM)
  hfrId: string;
  
  // Facility Details (synced with ABDM)
  facilityName: string;
  ownershipType: OwnershipType;
  facilityType: FacilityType;
  
  // Location
  address: Address;
  geoLocation: GeoLocation;
  
  // Services
  systemsOfMedicine: SystemOfMedicine[];
  specialties: string[];
  servicesOffered: string[];
  
  // Registration
  clinicalEstablishmentNumber: string;
  rohiniId: string;
  
  // Status
  registrationStatus: HfrRegistrationStatus;
  verificationStatus: HfrVerificationStatus;
  
  // Timestamps
  registeredAt: Date;
  verifiedAt: Date;
  lastSyncedAt: Date;
}
```

### 2.13.2 HPR (Health Professional Registry)

```typescript
interface HprRegistration {
  id: string;
  staffId: string;
  
  // HPR ID (from ABDM)
  hprId: string;
  hprAddress: string;             // name@hpr.abdm
  
  // Professional Details
  category: HealthProfessionalCategory;
  subCategory: string;
  
  // Registration
  registrationNumber: string;
  registrationCouncil: string;
  
  // Qualification
  qualifications: Qualification[];
  
  // Status
  registrationStatus: HprRegistrationStatus;
  verificationStatus: HprVerificationStatus;
  
  // Timestamps
  registeredAt: Date;
  verifiedAt: Date;
  lastSyncedAt: Date;
}
```

### 2.13.3 ABHA Integration

```typescript
interface AbhaConfiguration {
  id: string;
  branchId: string;
  
  // ABDM Credentials
  clientId: string;
  clientSecret: string;           // Encrypted
  
  // Callback URLs
  consentCallbackUrl: string;
  dataCallbackUrl: string;
  
  // Environment
  environment: 'SANDBOX' | 'PRODUCTION';
  
  // Features enabled
  abhaCreationEnabled: boolean;
  abhaLinkingEnabled: boolean;
  scanAndShareEnabled: boolean;
  consentManagementEnabled: boolean;
  healthRecordSharingEnabled: boolean;
  
  isActive: boolean;
}
```

---

## 2.14 Government Schemes

### 2.14.1 PMJAY (Ayushman Bharat)

```typescript
interface PmjayConfiguration {
  id: string;
  branchId: string;
  
  // Empanelment
  hospitalId: string;             // SHA assigned
  stateShaCode: string;
  empanelmentDate: Date;
  empanelmentExpiry: Date;
  
  // Packages
  empaneledPackages: PmjayPackage[];
  
  // Rates
  packageRates: PmjayPackageRate[];
  
  // Credentials
  apiCredentials: ApiCredentials;
  
  // Status
  status: EmpanelmentStatus;
  
  isActive: boolean;
}
```

### 2.14.2 CGHS/ECHS

```typescript
interface CghsConfiguration {
  id: string;
  branchId: string;
  
  // Empanelment
  empanelmentNumber: string;
  empanelmentType: 'CGHS' | 'ECHS' | 'BOTH';
  category: CghsCategory;         // A, B, C (city-based)
  
  // Rates
  cgshRates: CghsRateCard;
  
  // Services
  empaneledServices: CghsService[];
  
  // Status
  status: EmpanelmentStatus;
  
  isActive: boolean;
}
```

---

## 2.15 Queue Management

### 2.15.1 Queue Configuration

```typescript
interface QueueConfiguration {
  id: string;
  branchId: string;
  
  code: string;
  name: string;
  
  // Type
  queueType: QueueType;           // OPD, PHARMACY, LAB, BILLING, etc.
  
  // Location
  locationNodeId: string;
  departmentId: string;
  
  // Counters
  counters: QueueCounter[];
  
  // Operating Hours
  operatingHours: OperatingHours;
  
  // Configuration
  config: {
    tokenPrefix: string;          // e.g., 'A', 'B', 'OPD'
    dailyReset: boolean;          // Reset token numbers daily
    avgServiceMinutes: number;    // For wait time estimation
    maxQueueSize: number;         // Max tokens per day
    vipPriority: boolean;         // Support VIP queue
    appointmentPriority: boolean; // Scheduled vs walk-in priority
  };
  
  // Notifications
  notifications: {
    smsEnabled: boolean;
    whatsappEnabled: boolean;
    appPushEnabled: boolean;
    callAheadTokens: number;      // Notify X tokens before
  };
  
  // Display
  displays: QueueDisplay[];
  
  isActive: boolean;
}

enum QueueType {
  OPD_CONSULTATION = 'OPD_CONSULTATION',
  OPD_REGISTRATION = 'OPD_REGISTRATION',
  PHARMACY = 'PHARMACY',
  LAB_COLLECTION = 'LAB_COLLECTION',
  RADIOLOGY = 'RADIOLOGY',
  BILLING = 'BILLING',
  DISCHARGE = 'DISCHARGE',
  EMERGENCY_TRIAGE = 'EMERGENCY_TRIAGE'
}
```

---

## 2.16 Compliance Checklist (NABH)

### 2.16.1 Infrastructure Standards

Based on NABH 6th Edition (2025):

**Chapter 1: Access, Assessment and Continuity of Care**
- [ ] Registration counters configured
- [ ] Triage area defined for Emergency
- [ ] Patient identification system active
- [ ] Transfer protocols configured

**Chapter 2: Care of Patients**
- [ ] Care pathways defined
- [ ] Consent forms configured
- [ ] Clinical protocols uploaded
- [ ] Discharge planning configured

**Chapter 3: Management of Medication**
- [ ] Pharmacy stores configured
- [ ] Formulary defined
- [ ] High-risk medication alerts
- [ ] Look-alike sound-alike (LASA) alerts
- [ ] Narcotics register configured

**Chapter 4: Patient Rights and Education**
- [ ] Patient rights policy uploaded
- [ ] Consent templates configured
- [ ] Patient education materials

**Chapter 5: Hospital Infection Control**
- [ ] Infection zones defined
- [ ] Housekeeping schedules configured
- [ ] Biomedical waste zones mapped
- [ ] Isolation rooms identified

**Chapter 6: Continuous Quality Improvement**
- [ ] Incident reporting configured
- [ ] Quality indicators defined
- [ ] Audit checklists created

**Chapter 7: Responsibilities of Management**
- [ ] Organization structure defined
- [ ] Department heads assigned
- [ ] Committee structures configured

**Chapter 8: Facility Management and Safety**
- [ ] Fire zones mapped
- [ ] Emergency exits marked
- [ ] Equipment maintenance configured
- [ ] Disaster plan uploaded

**Chapter 9: Human Resource Management**
- [ ] Staff records complete
- [ ] Credentials verified
- [ ] Training records configured

**Chapter 10: Information Management System**
- [ ] Medical records configuration
- [ ] Data backup configured
- [ ] Audit trail enabled

---

# Part 3: User Experience

## 3.1 Setup Wizard Flow

### 3.1.1 Wizard Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    HOSPITAL SETUP WIZARD                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [1]──▶[2]──▶[3]──▶[4]──▶[5]──▶[6]──▶[7]──▶[8]──▶[9]──▶[10]    │
│   │     │     │     │     │     │     │     │     │     │       │
│  Org  Loc  Units Staff Dept Svcs Diag Pharm Bill  Go   │
│                                                   Live           │
│                                                                  │
│  Progress: ████████░░░░░░░░░░░░ 40%                             │
│                                                                  │
│  Current Step: 5 - Department Configuration                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │   Configure your hospital departments                    │    │
│  │                                                          │    │
│  │   ┌────────────────────────────────────────────────┐    │    │
│  │   │ Department Name: [Emergency Department    ]    │    │    │
│  │   │ Department Code: [ER                      ]    │    │    │
│  │   │ Facility Type:   [Clinical             ▼]    │    │    │
│  │   │ Specialties:     [Emergency Medicine   ▼]    │    │    │
│  │   │ Location:        [Ground Floor, Main   ▼]    │    │    │
│  │   │ Head of Dept:    [Dr. Sharma           ▼]    │    │    │
│  │   └────────────────────────────────────────────────┘    │    │
│  │                                                          │    │
│  │   Departments Added: 8                                   │    │
│  │   ┌────┬──────────────────┬────────────┬───────────┐    │    │
│  │   │ #  │ Name             │ Type       │ Status    │    │    │
│  │   ├────┼──────────────────┼────────────┼───────────┤    │    │
│  │   │ 1  │ Emergency        │ Clinical   │ ✓ Active  │    │    │
│  │   │ 2  │ General Medicine │ Clinical   │ ✓ Active  │    │    │
│  │   │ 3  │ Surgery          │ Clinical   │ ✓ Active  │    │    │
│  │   │ 4  │ Pediatrics       │ Clinical   │ ✓ Active  │    │    │
│  │   │ ...                                              │    │    │
│  │   └────┴──────────────────┴────────────┴───────────┘    │    │
│  │                                                          │    │
│  │   [+ Add Department]  [Import from Template]             │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [◀ Previous]                              [Next ▶] [Skip]       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.1.2 Template Selection

At the start of wizard, user selects a template:

```
┌─────────────────────────────────────────────────────────────────┐
│              SELECT HOSPITAL TEMPLATE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Choose a template to pre-populate your configuration:          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ○ SMALL CLINIC (< 25 beds)                              │    │
│  │   • 1 OPD, Basic Ward, Emergency                        │    │
│  │   • Lab, Pharmacy                                       │    │
│  │   • ~200 pre-configured services                        │    │
│  │   • Estimated setup time: 2 hours                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ● MEDIUM HOSPITAL (25-100 beds)                         │    │
│  │   • Multiple OPDs, Wards, ICU, OT                       │    │
│  │   • Lab, Radiology, Pharmacy, Blood Bank               │    │
│  │   • ~1000 pre-configured services                       │    │
│  │   • Estimated setup time: 4 hours                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ○ LARGE HOSPITAL (100+ beds)                            │    │
│  │   • Full department coverage                             │    │
│  │   • Multiple OT suites, Advanced diagnostics            │    │
│  │   • ~3000 pre-configured services                       │    │
│  │   • Estimated setup time: 8 hours                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ○ CLONE FROM EXISTING BRANCH                            │    │
│  │   Select branch: [Bangalore Main Hospital        ▼]     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ○ BLANK (Start from scratch)                            │    │
│  │   Manual configuration only                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│                                    [Continue with Selected ▶]    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 3.2 Go-Live Validation

### 3.2.1 Validation Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│              GO-LIVE READINESS REPORT                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Branch: Delhi Main Hospital                                     │
│  Generated: February 5, 2026 at 10:30 AM                        │
│                                                                  │
│  OVERALL SCORE: 87/100  ████████████████░░░░                    │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  BLOCKERS (Must Fix Before Go-Live): 3                    │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  ❌ No pharmacy store configured                          │  │
│  │     → Go to: Setup > Pharmacy > Stores                    │  │
│  │                                                           │  │
│  │  ❌ Cash payer not configured                             │  │
│  │     → Go to: Setup > Billing > Payers                     │  │
│  │                                                           │  │
│  │  ❌ Default tariff plan missing                           │  │
│  │     → Go to: Setup > Billing > Tariff Plans               │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  WARNINGS (Recommended to Fix): 8                         │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  ⚠️ 15 service items missing charge mapping               │  │
│  │  ⚠️ HFR registration not completed                        │  │
│  │  ⚠️ No diagnostic reference ranges configured             │  │
│  │  ⚠️ Equipment maintenance schedules not set               │  │
│  │  ⚠️ Staff credentials expiring within 30 days (3)         │  │
│  │  ... [View All]                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  CATEGORY SCORES                                          │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │  Infrastructure     ████████████████████  100%   ✓        │  │
│  │  Services           ████████████████░░░░   85%   ⚠️       │  │
│  │  Billing            ████████████░░░░░░░░   60%   ❌       │  │
│  │  Staff              ████████████████████   95%   ✓        │  │
│  │  Diagnostics        ████████████████░░░░   80%   ⚠️       │  │
│  │  Compliance         ████████████████░░░░   75%   ⚠️       │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  [Fix All Blockers]  [Download Report]  [Schedule Go-Live]      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

# Part 4: Technical Architecture

## 4.1 Module Structure

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
│   ├── staff/                  # Staff management (existing)
│   ├── equipment/              # Equipment register (existing)
│   ├── ot/                     # OT setup (existing)
│   ├── pharmacy/               # NEW: Pharmacy infrastructure
│   │   ├── stores/
│   │   ├── formulary/
│   │   └── suppliers/
│   ├── blood-bank/             # NEW: Blood bank setup
│   │   ├── configuration/
│   │   ├── components/
│   │   └── donors/
│   ├── diagnostics/            # Diagnostics (existing, enhanced)
│   │   ├── sections/
│   │   ├── items/
│   │   ├── parameters/
│   │   └── service-points/
│   ├── service-catalog/        # Service catalog (existing)
│   ├── billing/                # Billing configuration
│   │   ├── tax-codes/
│   │   ├── payers/             # NEW: Enhanced payer management
│   │   ├── contracts/
│   │   └── tariffs/
│   ├── compliance/             # NEW: Compliance configuration
│   │   ├── abdm/
│   │   ├── nabh/
│   │   └── statutory/
│   ├── queue/                  # NEW: Queue management
│   ├── templates/              # NEW: Hospital templates
│   ├── seeding/                # NEW: Master data seeding
│   ├── clone/                  # NEW: Configuration cloning
│   ├── import/                 # Bulk import (existing, enhanced)
│   └── golive/                 # Go-live validation (existing, enhanced)
```

## 4.2 Database Schema Summary

**New Tables Required:**
- PharmacyStore
- DrugMaster
- DrugCategory
- DrugInteraction
- Supplier
- BloodBankUnit
- BloodComponent
- BloodStorageUnit
- DonorMaster
- QueueConfiguration
- QueueCounter
- QueueDisplay
- HfrRegistration
- HprRegistration
- AbhaConfiguration
- PmjayConfiguration
- CghsConfiguration
- HospitalTemplate
- BranchSetupProgress

**Enhanced Tables:**
- Payer (add more fields)
- PayerContract (add more fields)
- EquipmentAsset (add compliance fields)
- DiagnosticItem (add LOINC, more parameters)

---

# Part 5: Implementation Roadmap

## 5.1 Phase 1A: Core Foundation (Weeks 1-4)

| Week | Deliverables |
|------|--------------|
| 1 | Setup Wizard framework, Organization/Branch enhancements |
| 2 | Location hierarchy enhancements, Department/Specialty seeding |
| 3 | Unit/Room/Resource polish, Bed management |
| 4 | Staff module polish, User/Access control |

## 5.2 Phase 1B: Clinical Infrastructure (Weeks 5-8)

| Week | Deliverables |
|------|--------------|
| 5 | Pharmacy stores, Drug master, Formulary |
| 6 | Blood bank configuration, Component setup |
| 7 | Diagnostics enhancement, Reference ranges |
| 8 | OT setup polish, Equipment compliance |

## 5.3 Phase 1C: Financial & Billing (Weeks 9-10)

| Week | Deliverables |
|------|--------------|
| 9 | Tax codes, Payer management, Contracts |
| 10 | Tariff plans, Service-charge mapping |

## 5.4 Phase 1D: Compliance & Go-Live (Weeks 11-12)

| Week | Deliverables |
|------|--------------|
| 11 | ABDM integration (HFR, HPR), NABH checklist |
| 12 | Go-live validator enhancement, Templates, Documentation |

---

# Part 6: Success Criteria

## 6.1 Functional Completeness

- [ ] All 30 infrastructure modules implemented
- [ ] Setup wizard end-to-end functional
- [ ] 3 hospital templates available (Small, Medium, Large)
- [ ] Branch cloning operational
- [ ] Go-live validator with 50+ checks

## 6.2 Performance Metrics

- [ ] Setup wizard completes in < 4 hours (medium hospital)
- [ ] Page load time < 2 seconds
- [ ] Bulk import 1000 services in < 30 seconds
- [ ] Go-live validation in < 10 seconds

## 6.3 Quality Metrics

- [ ] 90%+ unit test coverage on core modules
- [ ] 0 critical bugs in release
- [ ] API documentation 100% complete
- [ ] User documentation for all modules

## 6.4 Business Metrics

- [ ] First hospital configured using wizard
- [ ] Ops team trained and certified
- [ ] Competitor feature parity achieved
- [ ] ABDM integration certified

---

# Appendix A: Competitor Analysis

| Feature | ZypoCare (Target) | KareXpert | Practo | MocDoc | Ezovion |
|---------|-------------------|-----------|--------|--------|---------|
| Setup Wizard | ✅ Guided | ❌ | ❌ | ❌ | ❌ |
| Hospital Templates | ✅ 3+ | ❌ | ❌ | ❌ | ❌ |
| Branch Cloning | ✅ | Partial | ❌ | ❌ | ❌ |
| Multi-branch | ✅ Native | ✅ | ❌ | Partial | Partial |
| Pharmacy Infra | ✅ Complete | ✅ | ❌ | ✅ | ✅ |
| Blood Bank | ✅ Complete | Partial | ❌ | ❌ | ❌ |
| ABDM Native | ✅ | Retrofit | Partial | Partial | Partial |
| NABH Checklist | ✅ | Partial | ❌ | ❌ | Partial |
| Go-Live Validator | ✅ | ❌ | ❌ | ❌ | ❌ |
| Policy Governance | ✅ | ❌ | ❌ | ❌ | ❌ |

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

**Document End**

*This PRD defines the complete vision for ZypoCare's Infrastructure Setup Module. Implementation should follow the phased approach outlined in Part 5.*

---

**Approval:**

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | |
| Tech Lead | | | |
| Engineering Manager | | | |
| Business Sponsor | | | |
