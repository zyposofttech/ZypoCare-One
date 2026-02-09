# ZypoCare One - Service Catalog & Financial Configuration
# Complete Development Specification Document

**Version:** 1.0  
**Date:** February 8, 2026  
**Document Type:** Development Specification  
**Modules Covered:** 3.7 Service Catalog & Charge Master | 3.13 Financial Configuration

---

# Table of Contents

1. [Executive Overview](#executive-overview)
2. [Module 3.7: Service Catalog & Charge Master](#module-37-service-catalog--charge-master)
3. [Module 3.13: Financial Configuration](#module-313-financial-configuration)
4. [Integration Points](#integration-points)
5. [AI Copilot Integration](#ai-copilot-integration)
6. [Data Models & Schema](#data-models--schema)
7. [API Specifications](#api-specifications)
8. [Testing Strategy](#testing-strategy)
9. [Deployment & Migration](#deployment--migration)

---

# Executive Overview

## Purpose
This document provides complete development specifications for two critical infrastructure modules that form the financial backbone of ZypoCare One HIMS:

- **Service Catalog & Charge Master**: Master data for all billable and non-billable services
- **Financial Configuration**: Tax structures, payer management, tariff plans, and pricing rules

## Success Criteria
✅ Support 10,000+ service items per hospital  
✅ Handle complex pricing scenarios (packages, discounts, multi-tier pricing)  
✅ 100% GST compliance for Indian healthcare  
✅ Support 50+ simultaneous payer contracts  
✅ AI-assisted service search and pricing recommendations  
✅ Sub-100ms service catalog lookups  
✅ Zero-downtime pricing updates  
✅ Complete audit trail for all pricing changes

## Technical Stack
- **Backend:** Node.js/TypeScript, NestJS framework
- **Database:** PostgreSQL 15+ with JSONB for flexible attributes
- **Cache:** Redis for service catalog and pricing rules
- **Search:** Elasticsearch for fuzzy service search
- **Queue:** BullMQ for async operations
- **AI:** Custom NLP model for service search and classification

---

# Module 3.7: Service Catalog & Charge Master

## 1. Module Overview

### 1.1 Business Context
The Service Catalog is the central registry of all services offered by the hospital - from a simple consultation to complex surgical procedures. It serves as:

- **Clinical Reference**: What services can be ordered
- **Billing Foundation**: What can be charged
- **Insurance Mapping**: What can be claimed
- **Operational Planning**: Resource and scheduling requirements
- **Analytics Base**: Service utilization and revenue analysis

### 1.2 Key Challenges in Indian Healthcare
1. **Service Name Variations**: Same service called differently across departments
2. **Complex Packages**: Surgery packages with 20+ components
3. **Dynamic Pricing**: Different prices for different payers
4. **Regulatory Mapping**: LOINC, CPT, ICD-10-PCS, SNOMED codes
5. **Government Schemes**: PMJAY package codes, CGHS rates
6. **Multi-branch Consistency**: Same service codes across branches

### 1.3 Module Boundaries

**In Scope:**
- Service master data management
- Service categorization and hierarchy
- Standard code mapping (LOINC, CPT, SNOMED, ICD-10-PCS)
- Service catalog views (OPD, Emergency, Package, Payer-specific)
- Package/bundle creation
- Service lifecycle management
- Base pricing (charge master)
- Service search and discovery
- Bulk import/export
- Template management

**Out of Scope (handled by other modules):**
- Actual billing and invoicing (Billing module)
- Payer-specific contract rates (Financial Configuration)
- Stock management (Pharmacy/Inventory modules)
- Clinical protocols (Clinical module)

---

## 2. User Personas

| Persona | Role | Key Goals | Pain Points |
|---------|------|-----------|-------------|
| **Dr. Meera** | Medical Director | Ensure all services properly configured for clinical use | Too many duplicate services, missing clinical details |
| **Rajesh** | Billing Manager | Accurate pricing, minimal billing errors | Pricing inconsistencies, manual rate updates |
| **Priya** | Admin Officer | Quick setup of new hospital | Overwhelming number of services to configure |
| **Sanjay** | IT Administrator | Maintain service master data | No standardized codes, difficult to update |
| **Anita** | TPA Coordinator | Map services to insurance codes | Missing CPT/standard codes, claim rejections |

---

## 3. Complete Workflows

### Workflow 1: Creating a New Service Item

```
┌─────────────────────────────────────────────────────────────────┐
│                    CREATE NEW SERVICE ITEM                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Actor: Admin Officer / Billing Manager                         │
│                                                                  │
│  [1] Navigate to Service Catalog                                │
│       └─> Select "Add New Service"                              │
│                                                                  │
│  [2] Basic Information                                           │
│       ├─> Service Name (required)                               │
│       ├─> Short Name (for billing)                              │
│       ├─> Service Code (auto-generated or manual)               │
│       ├─> Search Aliases (comma-separated)                      │
│       └─> Description                                            │
│                                                                  │
│  [3] Classification                                              │
│       ├─> Service Type (Diagnostic/Procedure/Consultation/etc)  │
│       ├─> Category (Lab/Imaging/Surgery/etc)                    │
│       ├─> Sub-category                                           │
│       └─> Specialty (Cardiology/Ortho/etc)                      │
│                                                                  │
│  [4] Clinical Configuration                                      │
│       ├─> Care Context (OPD/IPD/ER - multi-select)              │
│       ├─> Requires Order (Yes/No)                               │
│       ├─> Requires Consent (None/Verbal/Written)                │
│       ├─> Default TAT (hours)                                    │
│       ├─> STAT Available (Yes/No)                               │
│       └─> Scheduling Required (Yes/No)                          │
│                                                                  │
│  [5] Standard Code Mapping                                       │
│       ├─> LOINC Code (for lab tests)                            │
│       ├─> CPT Code (for procedures)                             │
│       ├─> ICD-10-PCS Code (for procedures)                      │
│       ├─> SNOMED Code                                            │
│       └─> NABH Code                                              │
│       │                                                           │
│       └─> 🤖 AI Assist: Suggests codes based on service name    │
│                                                                  │
│  [6] Resource Requirements (Optional)                            │
│       ├─> Equipment Required                                     │
│       ├─> Staff Required (Doctor/Nurse/Technician)              │
│       ├─> Room Type Required                                     │
│       └─> Consumables Required                                   │
│                                                                  │
│  [7] Financial Details                                           │
│       ├─> Base Price (Charge Master Rate)                       │
│       ├─> Cost Price (for margin analysis)                      │
│       ├─> Tax Code (GST_EXEMPT/GST_5/GST_12/GST_18)            │
│       ├─> Allow Discount (Yes/No)                               │
│       ├─> Max Discount % (if allowed)                           │
│       └─> Billable (Yes/No)                                      │
│                                                                  │
│  [8] Catalog Assignment                                          │
│       ├─> Default Catalog ☑                                     │
│       ├─> OPD Catalog ☐                                         │
│       ├─> Emergency Catalog ☐                                   │
│       ├─> Quick Order Catalog ☐                                 │
│       └─> Package Catalog ☐                                     │
│                                                                  │
│  [9] Status & Validity                                           │
│       ├─> Status (Active/Inactive/Discontinued)                 │
│       ├─> Effective From Date                                    │
│       └─> Effective Till Date (optional)                        │
│                                                                  │
│  [10] Review & Save                                              │
│        └─> Validation Rules Applied                             │
│            ├─ Duplicate service name check                      │
│            ├─ Required fields validation                        │
│            ├─ Price cannot be negative                          │
│            └─ Code uniqueness validation                        │
│                                                                  │
│  [11] Confirmation                                               │
│        └─> Service created successfully                         │
│        └─> Auto-sync to Redis cache                            │
│        └─> Audit log entry created                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Workflow 2: Creating a Service Package

```
┌─────────────────────────────────────────────────────────────────┐
│                    CREATE SERVICE PACKAGE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Use Case: Create "Normal Delivery Package" bundling multiple   │
│  services at a fixed package rate                               │
│                                                                  │
│  [1] Navigate to Packages                                        │
│       └─> Select "Create New Package"                           │
│                                                                  │
│  [2] Package Details                                             │
│       ├─> Package Name: "Normal Delivery Package"               │
│       ├─> Package Code: PKG-NVD-001                             │
│       ├─> Category: Obstetrics                                   │
│       ├─> Duration: 2 days                                       │
│       └─> Description                                            │
│                                                                  │
│  [3] Add Package Components                                      │
│       │                                                           │
│       ├─> [Add Component 1]                                      │
│       │    ├─ Service: Room Charges (General Ward)              │
│       │    ├─ Quantity: 2 days                                  │
│       │    ├─ Unit Price: ₹2,000/day                            │
│       │    ├─ Total: ₹4,000                                     │
│       │    └─ Required: Yes                                     │
│       │                                                           │
│       ├─> [Add Component 2]                                      │
│       │    ├─ Service: Doctor Consultation                      │
│       │    ├─ Quantity: 3 visits                                │
│       │    ├─ Unit Price: ₹800/visit                            │
│       │    ├─ Total: ₹2,400                                     │
│       │    └─ Required: Yes                                     │
│       │                                                           │
│       ├─> [Add Component 3]                                      │
│       │    ├─ Service: Normal Delivery Procedure                │
│       │    ├─ Quantity: 1                                       │
│       │    ├─ Unit Price: ₹15,000                               │
│       │    ├─ Total: ₹15,000                                    │
│       │    └─ Required: Yes                                     │
│       │                                                           │
│       ├─> [Add Component 4]                                      │
│       │    ├─ Service: Nursing Care                             │
│       │    ├─ Quantity: 2 days                                  │
│       │    ├─ Unit Price: ₹1,500/day                            │
│       │    ├─ Total: ₹3,000                                     │
│       │    └─ Required: Yes                                     │
│       │                                                           │
│       ├─> [Add Component 5]                                      │
│       │    ├─ Service: Lab Tests (Complete Blood Count)         │
│       │    ├─ Quantity: 1                                       │
│       │    ├─ Unit Price: ₹300                                  │
│       │    ├─ Total: ₹300                                       │
│       │    └─ Required: Yes                                     │
│       │                                                           │
│       └─> [Add Component 6]                                      │
│            ├─ Service: Epidural Anesthesia                      │
│            ├─ Quantity: 1                                       │
│            ├─ Unit Price: ₹5,000                                │
│            ├─ Total: ₹5,000                                     │
│            └─ Required: No (Optional component)                 │
│                                                                  │
│  [4] Pricing Calculation                                         │
│       ├─> Component Total: ₹29,700                              │
│       ├─> Package Discount: 15% (₹4,455)                        │
│       ├─> Package Rate: ₹25,245                                 │
│       └─> Savings: ₹4,455                                       │
│                                                                  │
│  [5] Package Rules                                               │
│       ├─> Allow Component Addition: Yes                         │
│       ├─> Allow Component Removal: Only optional items          │
│       ├─> Allow Quantity Change: Yes (within limits)            │
│       ├─> Over-utilization Billing: Charge additional           │
│       └─> Under-utilization: No refund                          │
│                                                                  │
│  [6] Eligibility Criteria                                        │
│       ├─> Age Range: 18-45 years                                │
│       ├─> Applicable Payers: All except PMJAY                   │
│       ├─> Department: Obstetrics & Gynecology                   │
│       └─> Pre-authorization Required: Yes for insurance         │
│                                                                  │
│  [7] Save & Activate                                             │
│       └─> Package ready for billing                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Workflow 3: Bulk Service Import

```
┌─────────────────────────────────────────────────────────────────┐
│                    BULK SERVICE IMPORT                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Use Case: Import 1000+ services from Excel/CSV                │
│                                                                  │
│  [1] Download Template                                           │
│       └─> Excel template with all required columns              │
│           ├─ service_code, service_name, short_name            │
│           ├─ service_type, category, sub_category              │
│           ├─ care_context, requires_order, requires_consent    │
│           ├─ default_tat, base_price, tax_code                 │
│           └─ loinc_code, cpt_code, snomed_code                 │
│                                                                  │
│  [2] Fill Template                                               │
│       └─> User fills service data in Excel                      │
│                                                                  │
│  [3] Upload File                                                 │
│       ├─> Drag-drop or browse to select file                   │
│       ├─> File size limit: 10 MB                               │
│       └─> Supported formats: .xlsx, .csv                       │
│                                                                  │
│  [4] Validation Phase                                            │
│       ├─> Parse file structure                                  │
│       ├─> Validate mandatory columns                            │
│       ├─> Validate data types                                   │
│       ├─> Check for duplicates within file                      │
│       ├─> Check for duplicates in database                      │
│       ├─> Validate foreign key references                       │
│       ├─> Validate price ranges                                 │
│       └─> Generate validation report                            │
│           │                                                      │
│           └─> Show Results:                                     │
│               ├─ Total Rows: 1,250                             │
│               ├─ Valid Rows: 1,180                             │
│               ├─ Rows with Errors: 70                          │
│               └─ Download Error Report                         │
│                                                                  │
│  [5] Review Errors (if any)                                      │
│       └─> User downloads error report                           │
│       └─> Fixes errors in Excel                                │
│       └─> Re-uploads corrected file                            │
│                                                                  │
│  [6] Import Options                                              │
│       ├─> Import Mode:                                          │
│       │    ├─ Create New (skip existing codes)                 │
│       │    ├─ Update Existing (by service_code)                │
│       │    └─ Upsert (create if new, update if exists)         │
│       │                                                          │
│       ├─> Conflict Resolution:                                  │
│       │    ├─ Skip conflicts                                    │
│       │    └─ Overwrite with import data                       │
│       │                                                          │
│       └─> Catalog Assignment:                                   │
│            ├─ Default Catalog ☑                                │
│            └─ Additional catalogs from column                   │
│                                                                  │
│  [7] Execute Import                                              │
│       ├─> Show progress bar                                     │
│       ├─> Process in batches of 100                            │
│       ├─> Real-time status updates                             │
│       └─> Transaction-based (rollback on critical errors)      │
│                                                                  │
│  [8] Import Summary                                              │
│       └─> Results:                                              │
│           ├─ Successfully Imported: 1,180                       │
│           ├─ Skipped (duplicates): 50                          │
│           ├─ Failed: 20                                         │
│           ├─ Duration: 2 minutes 15 seconds                    │
│           └─ Download detailed log                             │
│                                                                  │
│  [9] Post-Import Actions                                         │
│       ├─> Cache refresh triggered automatically                │
│       ├─> Elasticsearch index updated                          │
│       ├─> Audit trail created                                  │
│       └─> Email notification sent to admin                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Workflow 4: Service Search & Discovery

```
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICE SEARCH & DISCOVERY                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Use Case: Doctor searching for "sugar test" during order entry │
│                                                                  │
│  [1] Search Interface                                            │
│       └─> Search Box with Auto-complete                         │
│           User types: "sugar"                                   │
│                                                                  │
│  [2] 🤖 AI-Powered Search                                        │
│       │                                                           │
│       ├─> Fuzzy Matching                                        │
│       │    └─ Matches: "sugar", "suger", "shugar"              │
│       │                                                           │
│       ├─> Synonym Recognition                                   │
│       │    └─ sugar = glucose = blood sugar = RBS = FBS        │
│       │                                                           │
│       ├─> Context Awareness                                     │
│       │    └─ If in OPD context, prioritize OPD catalog        │
│       │    └─ If in Emergency, show STAT-capable tests         │
│       │                                                           │
│       └─> Usage Frequency                                       │
│            └─ Boost frequently ordered tests                    │
│                                                                  │
│  [3] Search Results (Instant - <100ms)                          │
│       │                                                           │
│       ├─> [Result 1] ⭐ Most Relevant                           │
│       │    ├─ Service: Fasting Blood Sugar (FBS)               │
│       │    ├─ Code: LAB-BIO-001                                │
│       │    ├─ Category: Biochemistry                            │
│       │    ├─ TAT: 2 hours                                      │
│       │    ├─ Price: ₹80                                        │
│       │    └─ LOINC: 1558-6                                    │
│       │                                                           │
│       ├─> [Result 2]                                            │
│       │    ├─ Service: Random Blood Sugar (RBS)                │
│       │    ├─ Code: LAB-BIO-002                                │
│       │    ├─ Price: ₹70                                        │
│       │    └─ LOINC: 2345-7                                    │
│       │                                                           │
│       ├─> [Result 3]                                            │
│       │    ├─ Service: HbA1c (Glycated Hemoglobin)             │
│       │    ├─ Code: LAB-BIO-005                                │
│       │    ├─ Price: ₹500                                       │
│       │    └─ LOINC: 4548-4                                    │
│       │                                                           │
│       ├─> [Result 4]                                            │
│       │    ├─ Service: Glucose Tolerance Test (GTT)            │
│       │    ├─ Code: LAB-BIO-010                                │
│       │    ├─ Price: ₹200                                       │
│       │    └─ LOINC: 1518-0                                    │
│       │                                                           │
│       └─> [Result 5] Package                                    │
│            ├─ Package: Diabetes Screening Panel                 │
│            ├─ Includes: FBS + HbA1c + Lipid Profile            │
│            ├─ Package Price: ₹800                               │
│            └─ Individual Total: ₹1,100 (Save ₹300)             │
│                                                                  │
│  [4] Filters (Optional)                                          │
│       ├─> Service Type: [All] [Lab] [Imaging] [Procedure]      │
│       ├─> Price Range: ₹0 - ₹10,000                            │
│       ├─> TAT: [All] [STAT] [Same Day] [Next Day]              │
│       └─> Catalog: [OPD] [IPD] [Emergency]                     │
│                                                                  │
│  [5] Service Details Quick View                                 │
│       └─> Hover over any result to see:                        │
│           ├─ Full description                                   │
│           ├─ Clinical notes                                     │
│           ├─ Sample requirements                                │
│           ├─ Patient preparation instructions                   │
│           └─ Payer-specific pricing (if applicable)            │
│                                                                  │
│  [6] Selection & Action                                          │
│       └─> User clicks on "Fasting Blood Sugar"                 │
│       └─> Service added to order basket                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Workflow 5: Service Price Update

```
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICE PRICE UPDATE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Use Case: Annual price revision for 500+ lab tests             │
│                                                                  │
│  [1] Price Revision Initiation                                   │
│       ├─> Navigate to "Service Pricing"                         │
│       ├─> Select "Bulk Price Update"                            │
│       └─> Reason: "Annual Price Revision 2026"                  │
│                                                                  │
│  [2] Select Services                                             │
│       ├─> Option A: Filter & Select                             │
│       │    ├─ Category: Laboratory                              │
│       │    ├─ Sub-category: Biochemistry                        │
│       │    └─ Selected: 247 services                            │
│       │                                                           │
│       └─> Option B: Upload Excel List                           │
│            └─ Service codes with new prices                     │
│                                                                  │
│  [3] Price Update Strategy                                       │
│       ├─> Increase Type:                                        │
│       │    ├─ Fixed Amount (e.g., +₹50 per service)            │
│       │    ├─ Percentage (e.g., +10%)                           │
│       │    └─ Individual Pricing (from Excel)                   │
│       │                                                           │
│       ├─> Rounding Rules:                                       │
│       │    ├─ Round to nearest ₹10                              │
│       │    ├─ Round to nearest ₹50                              │
│       │    └─ No rounding                                       │
│       │                                                           │
│       └─> Apply Ceiling/Floor:                                  │
│            ├─ Maximum price: ₹5,000                             │
│            └─ Minimum price: ₹50                                │
│                                                                  │
│  [4] Effective Date Configuration                                │
│       ├─> Effective From: 01-April-2026                         │
│       ├─> Effective Till: 31-March-2027                         │
│       └─> Grace Period: 7 days (old price honored)             │
│                                                                  │
│  [5] Impact Analysis                                             │
│       └─> System shows:                                         │
│           ├─ Services affected: 247                             │
│           ├─ Average price increase: 12.5%                      │
│           ├─ Highest increase: ₹500 (Advanced Lipid Profile)   │
│           ├─ Lowest increase: ₹25 (Basic CBC)                  │
│           ├─ Payer contracts to update: 12                      │
│           ├─ Active bills affected: 15 (will use old price)    │
│           └─ Estimated monthly revenue impact: +₹3.5L           │
│                                                                  │
│  [6] Approval Workflow                                           │
│       ├─> Submit for Approval                                   │
│       ├─> Notification sent to:                                 │
│       │    ├─ Billing Manager ✓                                │
│       │    ├─ Finance Head ✓                                   │
│       │    └─ Medical Director (for info)                      │
│       │                                                           │
│       └─> Approval Status:                                      │
│            ├─ Billing Manager: Approved (2h ago)                │
│            └─ Finance Head: Pending                             │
│                                                                  │
│  [7] Execution (After Approval)                                  │
│       ├─> Create price history records                          │
│       ├─> Update service master                                 │
│       ├─> Flag affected payer contracts                         │
│       ├─> Update cache (Redis)                                  │
│       ├─> Send notifications:                                   │
│       │    ├─ Billing team                                      │
│       │    ├─ Front desk staff                                  │
│       │    └─ Department heads                                  │
│       └─> Generate price change report                          │
│                                                                  │
│  [8] Rollback Capability                                         │
│       └─> If issues found within 48 hours:                      │
│           ├─ One-click rollback to previous prices             │
│           ├─ All bills maintain historical prices              │
│           └─ Audit trail preserved                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. User Stories with Acceptance Criteria

### Epic 1: Service Master Management

#### Story 1.1: Create Individual Service
```
As a Billing Manager
I want to create a new service item in the catalog
So that it can be ordered and billed

Acceptance Criteria:
✓ Can enter all required fields (name, code, type, category, price)
✓ System auto-generates unique service code if not provided
✓ Can add multiple search aliases for easier discovery
✓ Can map standard codes (LOINC, CPT, SNOMED, ICD-10-PCS)
✓ AI suggests standard codes based on service name
✓ Can set care context (OPD/IPD/ER) with multi-select
✓ Can configure clinical rules (requires order, consent, TAT)
✓ Can set GST tax code based on service type
✓ System validates duplicate service names and codes
✓ Audit trail captures who created the service and when
✓ Service immediately available in search (cache updated)
✓ Operation completes in <2 seconds

Technical Notes:
- Use transaction to ensure data consistency
- Update Redis cache asynchronously
- Index in Elasticsearch for search
- Emit event for other modules (billing, clinical)
```

#### Story 1.2: Edit Service Details
```
As a Billing Manager
I want to edit an existing service's details
So that information stays current and accurate

Acceptance Criteria:
✓ Can edit all fields except service code (protected)
✓ System shows warning if editing active service
✓ Price changes require approval based on role permissions
✓ Price history is maintained (old prices preserved)
✓ Can set effective dates for changes
✓ System prevents deleting service with historical usage
✓ Can mark service as inactive instead of deleting
✓ Audit trail shows who changed what and when
✓ Changes reflect immediately in UI after save
✓ Confirmation message shows what was updated

Edge Cases:
- Service currently in an active bill → show warning, allow edit
- Service part of a package → show all affected packages
- Service with future-dated price → allow editing future price
- Service with active orders → warn but allow edit
```

#### Story 1.3: Deactivate/Discontinue Service
```
As a Billing Manager
I want to deactivate obsolete services
So that staff don't accidentally order discontinued items

Acceptance Criteria:
✓ Can mark service as "Inactive" or "Discontinued"
✓ System shows confirmation with impact analysis:
  - Number of times ordered last 90 days
  - Number of active orders
  - Part of any packages
  - Payer contract mappings
✓ Inactive services don't appear in search/order entry
✓ Historical data preserved (can still view old bills)
✓ Can reactivate service if needed
✓ Status change requires reason/comment (mandatory)
✓ Notification sent to department heads if high-usage service
✓ Option to suggest replacement service
✓ Bulk deactivation supported (select multiple services)

Business Rules:
- Cannot deactivate if part of active package (must remove from package first)
- Services with open orders show warning but can proceed
- Replacement service suggestion helps guide staff to alternative
```


#### Story 1.4: Bulk Service Import
```
As an Admin Officer
I want to import multiple services from Excel
So that I can quickly populate the service catalog

Acceptance Criteria:
✓ Can download Excel template with all required columns
✓ Template includes examples and validation rules
✓ Supports .xlsx and .csv formats (max 10 MB)
✓ Validates data before import (shows error report)
✓ Can choose import mode (create/update/upsert)
✓ Progress bar shows real-time import status
✓ Import processes in batches (100 records/batch)
✓ Transaction-based (rollback on critical errors)
✓ Generates detailed success/failure report
✓ Email notification on completion
✓ Can re-upload after fixing errors
✓ Import completes within 5 minutes for 1000 records

Validation Rules:
- Service name: required, max 200 chars
- Service code: unique, alphanumeric
- Price: numeric, >= 0
- Tax code: must be from predefined list
- Foreign keys validated (category, department)

Error Handling:
- Row-level errors don't stop entire import
- Critical errors (structure, database) cause rollback
- Error report downloadable as Excel with highlighted issues
```

### Epic 2: Service Packages

#### Story 2.1: Create Service Package
```
As a Billing Manager
I want to create bundled service packages
So that we can offer fixed-price packages to patients

Acceptance Criteria:
✓ Can create package with name, code, and description
✓ Can add multiple service components to package
✓ Each component has: service, quantity, unit price
✓ Components can be marked as required/optional
✓ System calculates total component value
✓ Can set package price (usually discounted)
✓ Shows discount amount and percentage
✓ Can set package duration (in days/hours)
✓ Can define package rules:
  - Allow additional services (Yes/No)
  - Billing for over-utilization (charge/absorb)
  - Under-utilization policy (refund/no-refund)
✓ Can set eligibility criteria (age, payer, department)
✓ Package immediately available for billing
✓ Audit trail for package creation

Business Scenarios:
- Maternity Package: Room + Doctor + Delivery + Tests + Nursing
- Cataract Package: Pre-op tests + Surgery + Post-op care + Medicines
- Health Checkup: Blood tests + X-ray + ECG + Consultation
```

#### Story 2.2: Manage Package Components
```
As a Billing Manager
I want to modify components in an existing package
So that packages stay relevant with service changes

Acceptance Criteria:
✓ Can add new components to package
✓ Can remove components (with confirmation)
✓ Can change component quantities
✓ Can toggle required/optional status
✓ System recalculates package total automatically
✓ Shows before/after comparison
✓ Can set effective date for changes
✓ Changes don't affect already sold packages
✓ Warning if package currently in use
✓ Can create new version of package instead of editing
✓ Audit trail shows all component changes

Edge Cases:
- Component service deactivated → flag package for review
- Component price increased → package margin analysis
- Package sold 100+ times → suggest creating v2 instead of editing
```

#### Story 2.3: Package Utilization Tracking
```
As a Finance Manager
I want to track package utilization vs. actual consumption
So that I can analyze profitability and adjust packages

Acceptance Criteria:
✓ For each sold package, track:
  - Package price charged
  - Actual services consumed
  - Actual value of services consumed
  - Profit/loss per package
✓ Can generate package performance report
✓ Shows top profitable and loss-making packages
✓ Identifies over-utilized vs. under-utilized components
✓ Can export data for further analysis
✓ Alerts when package consistently runs at loss
✓ Recommends price adjustments based on data

Analytics Provided:
- Package Revenue: ₹50L
- Actual Cost: ₹48L
- Margin: ₹2L (4%)
- Average Utilization: 92%
- Recommended Action: Increase price by 5% or reduce component quantities
```

### Epic 3: Service Search & Discovery

#### Story 3.1: Quick Service Search
```
As a Doctor/Nurse
I want to quickly search for services during order entry
So that I can place orders without delays

Acceptance Criteria:
✓ Search box available in order entry screen
✓ Auto-complete starts after 2 characters
✓ Search results appear in <100ms
✓ Fuzzy matching handles typos (sugar = suger = shugar)
✓ Synonym recognition (FBS = Fasting Sugar = Glucose Fasting)
✓ Shows 5-10 most relevant results
✓ Can filter by category, price, TAT
✓ Context-aware (OPD shows OPD catalog, ER shows STAT items)
✓ Recently ordered items appear on top
✓ Can search by service code or name
✓ Keyboard navigation supported (arrow keys, enter)
✓ Hover shows quick service details

Performance Requirements:
- Search latency: <100ms (p95)
- Concurrent searches: 100+ users
- Cache hit rate: >90%
```

#### Story 3.2: Advanced Service Filter
```
As a Front Desk Staff
I want to filter services by multiple criteria
So that I can find the exact service quickly

Acceptance Criteria:
✓ Filter by service type (Diagnostic/Procedure/Consultation/etc)
✓ Filter by category and sub-category
✓ Filter by price range (min-max slider)
✓ Filter by TAT (STAT/Same Day/Next Day)
✓ Filter by care context (OPD/IPD/ER)
✓ Filter by department/specialty
✓ Filter by catalog (Default/OPD/Emergency/Package)
✓ Can combine multiple filters (AND logic)
✓ Shows result count with each filter
✓ Can clear all filters with one click
✓ Filter state persists in session
✓ Can save frequently used filter combinations

UI/UX:
- Sidebar filter panel (collapsible)
- Real-time result updates as filters applied
- Filter chips show active filters
- Visual indicators for empty filter results
```

#### Story 3.3: Service Favorites/Quick Access
```
As a Department User
I want to mark frequently ordered services as favorites
So that I can access them quickly

Acceptance Criteria:
✓ Can mark any service as favorite (star icon)
✓ Favorites stored per user + department
✓ Quick access "Favorites" tab in search
✓ Can organize favorites into custom groups
✓ Can reorder favorites (drag-drop)
✓ Can share favorite list with team
✓ Department-level favorites for common protocols
✓ Shows most ordered services in department (auto-suggested)
✓ Can add service to favorite from search results
✓ Favorite status syncs across devices

Use Cases:
- Cardiology: Quick access to ECG, Echo, TMT
- Lab: Quick access to frequently ordered tests
- OPD: Quick access to common consultation types
```

### Epic 4: Standard Code Mapping

#### Story 4.1: Map Standard Codes to Services
```
As a TPA Coordinator
I want to map standard codes to services
So that insurance claims are processed smoothly

Acceptance Criteria:
✓ Can map LOINC codes for lab tests
✓ Can map CPT codes for procedures
✓ Can map ICD-10-PCS codes for procedures
✓ Can map SNOMED codes for clinical terms
✓ Can map NABH codes for accreditation
✓ AI suggests codes based on service name (80% accuracy)
✓ Can add multiple codes per service (one primary)
✓ Validates code format and existence
✓ Shows code description on hover
✓ Can bulk import code mappings via Excel
✓ Unmapped services highlighted in dashboard
✓ Mandatory for insurance-enabled services

AI Assistance:
User enters: "Fasting Blood Glucose"
AI suggests: LOINC 1558-6, CPT 82947
User reviews and confirms/modifies
```

#### Story 4.2: Code Validation & Verification
```
As a Quality Manager
I want to validate standard code mappings
So that claim rejections are minimized

Acceptance Criteria:
✓ Dashboard shows % of services with codes mapped
✓ Can run validation report for specific payers
✓ Flags potential incorrect mappings
✓ Compares with payer's approved service list
✓ Highlights services without codes
✓ Suggests corrections for common mistakes
✓ Can export unmapped services list
✓ Tracks improvement over time (trend chart)
✓ Integration with ABDM code repositories

Quality Metrics:
- Overall code coverage: 95%
- Lab tests: 100% (all have LOINC)
- Procedures: 85% (some missing CPT)
- Services without codes: 47
- Target: 98% coverage
```

### Epic 5: Service Catalog Views

#### Story 5.1: Configure Catalog Views
```
As an Admin
I want to create different catalog views for different contexts
So that users see only relevant services

Acceptance Criteria:
✓ Can create multiple catalog views
✓ Default catalogs: Default, OPD, Emergency, Quick Order, Package
✓ Can create custom catalogs (e.g., Dental, Cardiology)
✓ Each catalog has:
  - Name and description
  - Filter rules (categories, departments, care contexts)
  - Sort order (alphabetical, price, frequency)
✓ Can add services to multiple catalogs
✓ Can set catalog as default for specific roles
✓ Can set catalog visibility (all users / specific roles)
✓ Users can switch between catalogs
✓ Quick Order catalog shows top 50 frequently ordered
✓ Emergency catalog shows only STAT-capable services

Catalog Examples:
- OPD Catalog: Only OPD-enabled services
- ICU Catalog: Critical care specific services
- PMJAY Catalog: Only PMJAY-approved services and packages
```

#### Story 5.2: Payer-Specific Catalogs
```
As a Billing Manager
I want to configure payer-specific service catalogs
So that only covered services are shown for each payer

Acceptance Criteria:
✓ Can create catalog for each payer/insurance company
✓ Only services covered by payer appear in catalog
✓ Services show payer-specific pricing
✓ Services show pre-authorization requirement
✓ System auto-switches catalog based on payer selection
✓ Can import payer's approved service list
✓ Can map hospital services to payer codes
✓ Shows coverage percentage/limits
✓ Flags services requiring approval
✓ Can override catalog for specific cases (with approval)

Payer Catalog Example (PMJAY):
- Contains only PMJAY-approved packages
- Shows package code and HBP code
- Shows maximum package rate as per PMJAY
- Shows pre-authorization requirement
- Includes surgeon/anesthetist/consumables breakdown
```

### Epic 6: Service Lifecycle Management

#### Story 6.1: Service Version Control
```
As a Quality Manager
I want to maintain version history of services
So that I can track changes and maintain compliance

Acceptance Criteria:
✓ System maintains complete change history
✓ Each change creates new version
✓ Can view version history timeline
✓ Shows who changed what and when
✓ Can compare any two versions (diff view)
✓ Can view service as it was on any historical date
✓ Can rollback to previous version (with approval)
✓ Export service history as PDF report
✓ Supports compliance audits (NABH, NABL)
✓ Integrates with document management system

Version History Display:
v1.0 - Created by Rajesh on 01-Jan-2025
v1.1 - Price updated from ₹500 to ₹550 by Meera on 15-Mar-2025
v1.2 - Added LOINC code 1558-6 by Sanjay on 20-Mar-2025
v2.0 - Service restructured by Priya on 01-Apr-2025
```

#### Story 6.2: Service Approval Workflow
```
As a Medical Director
I want to approve critical service changes
So that quality standards are maintained

Acceptance Criteria:
✓ Can configure approval workflow for service changes
✓ Triggers based on change type:
  - New service creation (auto-approved for basic info)
  - Price changes >20% (requires Finance approval)
  - Service deactivation (requires HOD approval)
  - Package creation (requires Medical Director approval)
✓ Multi-level approval supported
✓ Email/app notifications to approvers
✓ Can approve/reject with comments
✓ Changes apply only after approval
✓ Pending approvals dashboard
✓ Escalation if not approved within SLA (24 hours)
✓ Can configure bypass for urgent changes (with justification)

Approval Hierarchy:
Change Type → Billing Manager → Finance Head → Medical Director
Price increase <10% → ✓ → ✗ → ✗
Price increase >10% → ✓ → ✓ → ✗
New package → ✓ → ✓ → ✓
Deactivate service → ✓ → ✗ → ✓
```

---

## 5. Edge Cases & Exception Scenarios

### 5.1 Service Creation Edge Cases

| Scenario | Expected Behavior | Error Handling |
|----------|-------------------|----------------|
| Duplicate service name | Show warning, suggest code suffix | Allow if service codes are different |
| Missing mandatory field | Highlight field in red, show inline error | Prevent save until filled |
| Invalid price (negative) | Show error message | Prevent save |
| Invalid tax code | Show dropdown, force selection | Prevent save |
| Service code conflict | Auto-generate new code | Suggest alternative code |
| Long service name (>200 chars) | Truncate with ellipsis in UI | Store full name in DB |
| Special characters in code | Strip/replace with underscore | Show cleaned code |
| No category selected | Force category selection | Prevent save |

### 5.2 Package Creation Edge Cases

| Scenario | Expected Behavior | Error Handling |
|----------|-------------------|----------------|
| Component service deactivated | Flag package, warn user | Allow package but mark as "Needs Review" |
| Negative package discount | Show error | Prevent save |
| Package price > component total | Show warning (unusual) | Allow with confirmation |
| Zero quantity component | Show error | Prevent save |
| Circular package reference | Detect and prevent | Show error: "Cannot add package to itself" |
| Package with single component | Show warning (use direct service instead) | Allow but warn |
| Duplicate components | Auto-merge quantities | Warn user |
| Component price changed | Flag all affected packages | Show margin impact report |

### 5.3 Search & Discovery Edge Cases

| Scenario | Expected Behavior | Error Handling |
|----------|-------------------|----------------|
| No search results | Suggest alternatives, check spelling | Show "Did you mean..." suggestions |
| Search by inactive service | Don't show in results | Option to "Include inactive" in advanced search |
| Special characters in search | Handle gracefully (sanitize) | Don't break, search as alphanumeric |
| Very long search term (>100 chars) | Truncate, show warning | Search on truncated term |
| Empty search | Show recently ordered or favorites | Don't show full catalog (performance) |
| Simultaneous searches | Handle concurrency | Use connection pooling, query queueing |
| Cache miss (cold start) | Fetch from DB, populate cache | Acceptable latency <500ms first time |
| Ambiguous search ("test") | Return all matching, suggest refinement | Show "Too many results, refine search" |

### 5.4 Pricing Edge Cases

| Scenario | Expected Behavior | Error Handling |
|----------|-------------------|----------------|
| Future-dated price and current price | Show both with validity dates | Billing uses appropriate price based on bill date |
| Overlapping price validity | Prevent overlap, force end date | Show error |
| Price decrease (unusual) | Flag for review | Allow with approval |
| Very large price increase (>50%) | Trigger alert to finance team | Require approval |
| Price update during active bill | Use price at time of bill creation | Don't update already billed items |
| Bulk price update partial failure | Complete successful updates, report failures | Show detailed failure report |
| Rounding errors in packages | Handle with fixed precision (2 decimals) | Store in paise/cents |
| Foreign payer pricing (USD) | Support multi-currency | Convert at current exchange rate, store original currency |

### 5.5 Import/Export Edge Cases

| Scenario | Expected Behavior | Error Handling |
|----------|-------------------|----------------|
| Excel file corrupted | Detect corruption early | Show clear error, request re-upload |
| CSV encoding issues | Auto-detect encoding (UTF-8, Latin1) | Show warning if non-standard characters |
| Empty rows in Excel | Skip empty rows | Don't count as errors |
| Extra columns in file | Ignore extra columns | Warn if critical data might be in wrong column |
| Missing mandatory column | Reject file, list missing columns | Show error before processing |
| Date format mismatch | Support multiple formats (DD/MM/YYYY, MM/DD/YYYY) | Show error if ambiguous |
| Very large file (>10MB) | Reject, show size limit | Suggest splitting file |
| Import timeout | Process in background, email results | Show progress, allow user to continue other work |

---

## 6. Business Rules & Validations

### 6.1 Service Master Rules

| Rule | Description | Impact |
|------|-------------|--------|
| **Service Code Uniqueness** | Service code must be unique across catalog | Prevents duplicate entries |
| **Active Service Name** | No two active services can have same name | Allows reuse of deactivated service names |
| **Price Non-Negative** | Service price must be >= 0 | Prevents data entry errors |
| **Future Effective Date** | Effective date must be >= today | Prevents backdating without approval |
| **Lifecycle Status** | Service must be Active to be orderable | Inactive services hidden from order entry |
| **Required Standard Code** | Insurance services must have CPT/LOINC code | Enforced for insurance billing |
| **Tax Code Mandatory** | Every service must have tax code | Required for GST compliance |
| **Care Context Required** | Service must have at least one care context | Determines where service can be ordered |

### 6.2 Package Rules

| Rule | Description | Impact |
|------|-------------|--------|
| **Minimum Components** | Package must have >= 2 components | Enforces package definition |
| **Component Availability** | All components must be active | Prevents invalid packages |
| **Price Logic** | Package price must be > 0 | Prevents zero-price packages |
| **Quantity Logic** | Component quantity must be > 0 | Ensures valid quantities |
| **Unique Components** | Same service can't be added twice | Prevents duplicate entries |
| **Discount Limit** | Package discount can't exceed 50% of total | Prevents extreme discounting |
| **Duration Validity** | If package has duration, must be > 0 | Ensures valid duration |
| **Utilization Rules** | Must define over/under utilization policy | Guides billing behavior |

### 6.3 Pricing Rules

| Rule | Description | Impact |
|------|-------------|--------|
| **No Price Overlap** | Same service can't have overlapping price validity | Ensures single price per date |
| **Historical Preservation** | Old prices remain in history forever | Maintains billing integrity |
| **Future Price Lock** | Future prices can't be edited within 7 days of effective date | Prevents last-minute changes |
| **Bill Price Freeze** | Price at time of bill creation is locked | Bill amount doesn't change with price updates |
| **Discount Cap** | Service discount can't exceed configured maximum | Protects revenue |
| **Negative Pricing Ban** | Discount can't make final price negative | Prevents system abuse |
| **Package Price Floor** | Package price can't be less than highest single component | Prevents illogical pricing |

### 6.4 Search & Catalog Rules

| Rule | Description | Impact |
|------|-------------|--------|
| **Inactive Hidden** | Inactive services don't appear in regular search | Keeps catalog clean |
| **Context Filtering** | Only context-appropriate services shown | OPD search shows only OPD services |
| **Payer Filtering** | Payer catalog shows only covered services | Prevents ordering non-covered items |
| **Quick Order Logic** | Top 50 most frequently ordered services | Dynamic based on usage |
| **Package Visibility** | Packages only visible in package catalog | Separates packages from individual services |
| **Permission Filtering** | Users see only services for their departments | Role-based catalog access |

### 6.5 Import/Export Rules

| Rule | Description | Impact |
|------|-------------|--------|
| **File Size Limit** | Maximum 10 MB upload | Prevents performance issues |
| **Format Validation** | Only .xlsx, .csv allowed | Ensures parseable format |
| **Mandatory Fields** | Name, code, type, category, price required | Ensures minimum data quality |
| **Duplicate Handling** | Duplicate codes skipped or updated based on mode | Prevents accidental duplication |
| **Transaction Safety** | Import is all-or-nothing for critical errors | Maintains data integrity |
| **Batch Processing** | Process in batches of 100 | Prevents memory issues |


---

# Module 3.13: Financial Configuration

## 1. Module Overview

### 1.1 Business Context
Financial Configuration forms the pricing and billing rules engine of the HIMS. It manages:

- **Tax Structures**: GST codes and rates for Indian healthcare
- **Payer Management**: Insurance companies, TPAs, corporate clients, government schemes
- **Tariff Plans**: Payer-specific pricing contracts and discounts
- **Payment Terms**: Credit days, limits, and settlements
- **Pricing Rules**: Dynamic pricing based on patient type, time, urgency

### 1.2 Indian Healthcare Financial Complexity

**GST Complexity:**
- Most clinical services are GST-exempt (0%)
- Room rent >₹5000/day attracts GST
- Consumables have different GST rates (5%, 12%, 18%)
- Need to track CGST, SGST, IGST separately

**Payer Landscape:**
- 20+ major insurance companies
- 100+ TPAs (Third Party Administrators)
- Government schemes (PMJAY, CGHS, ECHS, State schemes)
- Corporate tie-ups with negotiated rates
- International patients (forex pricing)

**Pricing Challenges:**
- Same service, different prices for different payers
- Package rates vs. individual service rates
- Emergency loading (10-30% extra for emergency services)
- Time-based pricing (OPD vs. IPD)
- Discount rules (senior citizen, employee, volume discounts)

### 1.3 Module Boundaries

**In Scope:**
- GST master data and configuration
- Payer/payor master data
- Payer contract management
- Tariff plan configuration
- Pricing rule engine
- Credit limit management
- Payment terms configuration
- Multi-currency support
- Financial year configuration

**Out of Scope:**
- Actual billing/invoicing (Billing module)
- Payment processing (Billing module)
- Accounting entries (Accounting module)
- Claims processing (Claims module)

---

## 2. User Personas (Financial Module)

| Persona | Role | Key Goals | Pain Points |
|---------|------|-----------|-------------|
| **Kavita** | Finance Manager | Maintain accurate pricing, maximize revenue | Complex payer contracts, manual rate updates |
| **Ramesh** | TPA Coordinator | Smooth claim processing | Missing payer codes, incorrect rates |
| **Deepa** | Billing Executive | Error-free billing | Different rates for different payers, confusion |
| **Arun** | CFO | Revenue optimization, compliance | No visibility into pricing effectiveness |
| **Sunita** | Admin | Quick hospital setup | Overwhelming financial configuration |

---

## 3. Complete Workflows

### Workflow 1: Configure GST Tax Codes

```
┌─────────────────────────────────────────────────────────────────┐
│                    GST TAX CODE CONFIGURATION                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Use Case: Set up Indian GST structure for healthcare           │
│                                                                  │
│  [1] Navigate to Financial Config > Tax Codes                   │
│       └─> System shows predefined healthcare GST codes          │
│                                                                  │
│  [2] Predefined Tax Codes (India Healthcare)                    │
│       │                                                           │
│       ├─> GST_EXEMPT (0%)                                        │
│       │    ├─ Inpatient services                                │
│       │    ├─ Diagnostic services (lab, imaging)                │
│       │    ├─ Doctor consultations                              │
│       │    ├─ Room rent (up to ₹5000/day)                       │
│       │    ├─ ICU charges                                        │
│       │    ├─ Surgery/procedure charges                         │
│       │    └─ Nursing services                                   │
│       │                                                           │
│       ├─> GST_5 (5%)                                             │
│       │    ├─ Some medicines                                     │
│       │    └─ Certain consumables                                │
│       │                                                           │
│       ├─> GST_12 (12%)                                           │
│       │    ├─ Medical equipment                                  │
│       │    └─ Instruments                                        │
│       │                                                           │
│       ├─> GST_18 (18%)                                           │
│       │    ├─ Non-clinical services                             │
│       │    ├─ Cafeteria                                          │
│       │    └─ Accommodation for attendants                      │
│       │                                                           │
│       └─> GST_28 (28%)                                           │
│            └─ Luxury items/services                             │
│                                                                  │
│  [3] Add/Edit Tax Code                                           │
│       ├─> Tax Code: GST_EXEMPT                                  │
│       ├─> Description: Healthcare Services Exemption            │
│       ├─> Tax Rate: 0%                                          │
│       ├─> Components:                                            │
│       │    ├─ CGST: 0%                                          │
│       │    ├─ SGST: 0%                                          │
│       │    └─ IGST: 0%                                          │
│       ├─> HSN/SAC Code: 9993 (Health Services)                 │
│       ├─> Effective From: 01-Jan-2024                           │
│       ├─> Status: Active                                         │
│       └─> Legal Reference: GST Notification 12/2017            │
│                                                                  │
│  [4] Room Rent Special Handling                                  │
│       └─> 🤖 AI Assistant:                                       │
│           "Room rent charges are GST-exempt up to ₹5000/day.   │
│            For rent >₹5000/day, GST applies proportionately     │
│            only on the amount exceeding ₹5000"                  │
│           │                                                      │
│           └─> System Auto-calculates:                           │
│               Room Rent: ₹7,000/day                             │
│               Exempt Portion: ₹5,000 (GST 0%)                   │
│               Taxable Portion: ₹2,000 (GST 12%)                 │
│               GST Amount: ₹240                                   │
│               Total: ₹7,240                                      │
│                                                                  │
│  [5] State-wise GST Configuration                                │
│       ├─> If hospital and patient in same state:                │
│       │    └─ Apply CGST + SGST                                 │
│       │                                                           │
│       └─> If hospital and patient in different states:          │
│            └─ Apply IGST                                        │
│                                                                  │
│  [6] Validation & Compliance                                     │
│       ├─> Tax rate must sum to standard rates (5/12/18/28)     │
│       ├─> HSN/SAC codes validated against GST portal            │
│       ├─> Legal references documented for audit                 │
│       └─> Changes require Finance Head approval                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Workflow 2: Create Payer Master

```
┌─────────────────────────────────────────────────────────────────┐
│                    CREATE PAYER MASTER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Use Case: Add insurance company/TPA to the system              │
│                                                                  │
│  [1] Navigate to Financial Config > Payers                      │
│       └─> Click "Add New Payer"                                 │
│                                                                  │
│  [2] Payer Basic Information                                     │
│       ├─> Payer Type: ☑ Insurance ☐ TPA ☐ Corporate ☐ Govt    │
│       ├─> Payer Code: INS-ICICI-001 (auto-generated)           │
│       ├─> Payer Name: ICICI Lombard General Insurance          │
│       ├─> Short Name: ICICI Lombard                            │
│       ├─> Display Name: ICICI Lombard GIC                      │
│       └─> Parent Company: (for TPA, link to insurance co.)     │
│                                                                  │
│  [3] Regulatory Information                                      │
│       ├─> IRDAI Registration Number: 115                        │
│       ├─> License Number: IRDAI/HLT/115/2001                   │
│       ├─> License Valid Till: 31-Dec-2026                      │
│       ├─> PAN: AAACI1111M                                      │
│       ├─> GSTIN: 29AAACI1111M1Z5                               │
│       └─> CIN: L67200MH2001PLC128170                           │
│                                                                  │
│  [4] Contact Information                                         │
│       ├─> Registered Address                                     │
│       ├─> Billing Address                                        │
│       ├─> Claims Address                                         │
│       ├─> Primary Contact: Name, Phone, Email                   │
│       ├─> Claims Contact: Name, Phone, Email                    │
│       ├─> Emergency Contact: 24x7 helpline                      │
│       └─> Portal URL: claims.icicilombard.com                  │
│                                                                  │
│  [5] Financial Terms                                             │
│       ├─> Payment Terms:                                         │
│       │    ├─ Credit Days: 45 days                             │
│       │    ├─ Credit Limit: ₹10,00,000                         │
│       │    ├─ Grace Period: 7 days                             │
│       │    └─ Interest on delayed payment: 2% per month        │
│       │                                                           │
│       ├─> Settlement Terms:                                      │
│       │    ├─ Claim processing time: 15-21 days                │
│       │    ├─ Query resolution time: 7 days                    │
│       │    └─ Rejection appeal period: 30 days                 │
│       │                                                           │
│       └─> Service Charges:                                       │
│            ├─ Claim processing fee: 2%                          │
│            ├─ Pre-auth charges: ₹100 per case                  │
│            └─ Co-payment: Variable by policy                    │
│                                                                  │
│  [6] Operational Configuration                                   │
│       ├─> Requires Pre-authorization: ☑ Yes                     │
│       ├─> Pre-auth threshold: ₹25,000                           │
│       ├─> Supporting documents required:                         │
│       │    ├─ Policy copy ☑                                    │
│       │    ├─ ID proof ☑                                       │
│       │    ├─ Photo ☑                                          │
│       │    ├─ Pre-existing declaration ☑                       │
│       │    └─ Previous claims history ☐                        │
│       │                                                           │
│       ├─> Claim Submission Method:                              │
│       │    ├─ Online portal ☑                                  │
│       │    ├─ Email ☑                                          │
│       │    ├─ Physical submission ☐                            │
│       │    └─ API integration ☑                                │
│       │                                                           │
│       └─> Exclusions & Limitations:                             │
│            └─ List common exclusions (cosmetic, dental, etc.)  │
│                                                                  │
│  [7] Network Configuration                                       │
│       ├─> Network Type: ☑ Cashless ☐ Reimbursement            │
│       ├─> Hospital empanelment level: Gold                      │
│       ├─> Bed category allowed: All                            │
│       ├─> Room rent limit: ₹3,000/day (Single Private)         │
│       ├─> ICU rent limit: ₹5,000/day                           │
│       └─> Sum Insured range: ₹2L - ₹50L                        │
│                                                                  │
│  [8] Default Discounts (if any)                                  │
│       ├─> Consultation: 0% (no discount)                        │
│       ├─> Diagnostics: 5%                                       │
│       ├─> Procedures: 10%                                       │
│       ├─> Pharmacy: 5%                                          │
│       └─> Room charges: 0%                                      │
│                                                                  │
│  [9] Integration Settings                                        │
│       ├─> API Endpoint: https://api.icicilombard.com/claims   │
│       ├─> API Key: [Encrypted]                                  │
│       ├─> Username: hospital_portal_user                        │
│       ├─> Authentication Method: OAuth 2.0                      │
│       └─> Webhook URL (for status updates): [Our URL]          │
│                                                                  │
│  [10] Documents & Agreements                                     │
│        ├─> Upload empanelment letter                            │
│        ├─> Upload signed agreement (PDF)                        │
│        ├─> Upload tariff schedule                               │
│        └─> Upload panel inclusion certificate                   │
│                                                                  │
│  [11] Status & Validity                                          │
│        ├─> Status: Active                                        │
│        ├─> Empanelment Date: 01-Jan-2024                       │
│        ├─> Agreement Valid Till: 31-Dec-2026                   │
│        ├─> Auto-renewal: Yes                                    │
│        └─> Review reminder: 60 days before expiry              │
│                                                                  │
│  [12] Save & Activate                                            │
│        └─> Payer ready for billing                              │
│        └─> Notification to billing team                         │
│        └─> Audit log entry                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Workflow 3: Create Payer Contract (Tariff Plan)

```
┌─────────────────────────────────────────────────────────────────┐
│                    CREATE PAYER CONTRACT                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Use Case: Define payer-specific pricing for all services       │
│                                                                  │
│  [1] Select Payer                                                │
│       └─> Payer: ICICI Lombard General Insurance                │
│                                                                  │
│  [2] Contract Basic Details                                      │
│       ├─> Contract Name: "ICICI Lombard - Standard Plan 2024"  │
│       ├─> Contract Type: ☑ Price List ☐ Discount Plan          │
│       ├─> Contract Code: TRF-ICICI-STD-2024                    │
│       ├─> Description: Standard tariff for all product lines   │
│       └─> Priority: 1 (if multiple contracts, lower wins)      │
│                                                                  │
│  [3] Validity Period                                             │
│       ├─> Effective From: 01-Jan-2024                           │
│       ├─> Effective Till: 31-Dec-2024                           │
│       ├─> Grace Period: 15 days                                │
│       └─> Auto-renewal: No                                      │
│                                                                  │
│  [4] Pricing Strategy Selection                                 │
│       │                                                           │
│       ├─> Option A: Global Discount                             │
│       │    └─ Apply X% discount on all services                │
│       │                                                           │
│       ├─> Option B: Category-wise Pricing                       │
│       │    └─ Different discounts for different categories     │
│       │                                                           │
│       └─> Option C: Individual Service Pricing                  │
│            └─ Specific price for each service                   │
│                                                                  │
│  [5a] Scenario: Category-wise Pricing                           │
│        │                                                          │
│        ├─> Consultations                                         │
│        │    ├─ Base Tariff: Hospital charge master              │
│        │    ├─ Payer Rate: 100% (no discount)                   │
│        │    ├─ Min Price: ₹500                                  │
│        │    └─ Max Price: ₹2,000                                │
│        │                                                          │
│        ├─> Diagnostics - Laboratory                             │
│        │    ├─ Base Tariff: Hospital charge master              │
│        │    ├─ Payer Rate: 90% (10% discount)                   │
│        │    ├─ Min Price: ₹50                                   │
│        │    └─ Max Price: ₹5,000                                │
│        │                                                          │
│        ├─> Diagnostics - Imaging                                │
│        │    ├─ Base Tariff: Hospital charge master              │
│        │    ├─ Payer Rate: 85% (15% discount)                   │
│        │    ├─ Min Price: ₹500                                  │
│        │    └─ Max Price: ₹20,000                               │
│        │                                                          │
│        ├─> Procedures - Minor                                    │
│        │    ├─ Base Tariff: Hospital charge master              │
│        │    ├─ Payer Rate: 95% (5% discount)                    │
│        │    └─ No min/max caps                                  │
│        │                                                          │
│        ├─> Procedures - Major Surgeries                         │
│        │    ├─ Base Tariff: Hospital charge master              │
│        │    ├─ Payer Rate: 90% (10% discount)                   │
│        │    ├─ Min Price: ₹20,000                               │
│        │    └─ Max Price: ₹5,00,000                             │
│        │                                                          │
│        ├─> Room Charges                                          │
│        │    ├─ General Ward: ₹2,000/day (fixed rate)            │
│        │    ├─ Single Private: ₹3,000/day (capped)              │
│        │    ├─ Twin Sharing: ₹2,500/day (capped)                │
│        │    └─ ICU: ₹5,000/day (capped)                         │
│        │                                                          │
│        ├─> Pharmacy                                              │
│        │    ├─ Base Tariff: Hospital MRP                        │
│        │    ├─ Payer Rate: 95% (5% discount)                    │
│        │    └─ No min/max caps                                  │
│        │                                                          │
│        └─> Packages                                              │
│             ├─ Use payer-specific package rates                 │
│             └─ E.g., Normal Delivery: ₹35,000 (all-inclusive)  │
│                                                                  │
│  [5b] Scenario: Individual Service Pricing (Excel Import)       │
│        │                                                          │
│        └─> Upload payer-provided rate card                      │
│            ├─ Excel with columns:                               │
│            │   [Hospital Code, Service Name, Payer Code,        │
│            │    Payer Rate, Min Price, Max Price]               │
│            │                                                      │
│            ├─ System maps payer codes to hospital services      │
│            ├─ Validates all prices                              │
│            ├─ Shows unmapped services                           │
│            └─ Imports successfully mapped rates                 │
│                                                                  │
│  [6] Special Conditions                                          │
│       ├─> Emergency Loading: 20% extra for ER services          │
│       ├─> After-hours charges: 15% extra (8 PM - 8 AM)          │
│       ├─> Weekend charges: 10% extra (Sat/Sun)                  │
│       ├─> STAT charges: 25% extra for urgent tests              │
│       └─> Multiple procedure discount: 2nd procedure at 50%     │
│                                                                  │
│  [7] Exclusions                                                  │
│       └─> Services not covered (full patient payment):          │
│           ├─ Cosmetic procedures                                │
│           ├─ Dental treatments                                  │
│           ├─ Infertility treatments                             │
│           ├─ Alternative medicine                               │
│           └─ Non-allopathic treatments                          │
│                                                                  │
│  [8] Co-payment Rules                                            │
│       ├─> Parent room: 20% co-payment by patient                │
│       ├─> Age-based: Patients >60 years: 10% co-payment         │
│       ├─> Pre-existing conditions: 25% co-payment first year    │
│       └─> OPD: ₹500 deductible per visit                        │
│                                                                  │
│  [9] Approval Workflow                                           │
│       ├─> Submit to Finance Head                                │
│       ├─> Finance Head reviews and approves                     │
│       ├─> Notification to billing team                          │
│       └─> Contract becomes active on effective date             │
│                                                                  │
│  [10] Testing & Validation                                       │
│        └─> Before going live:                                   │
│            ├─ Test billing for 10 sample services               │
│            ├─ Verify all rate calculations                      │
│            ├─ Check discount applications                       │
│            └─ Validate with payer's rate card                   │
│                                                                  │
│  [11] Go Live                                                    │
│        └─> Contract activated                                   │
│        └─> Billing system uses new rates                        │
│        └─> Old rates archived                                   │
│        └─> Email confirmation sent                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Workflow 4: Government Scheme Configuration (PMJAY)

```
┌─────────────────────────────────────────────────────────────────┐
│              GOVERNMENT SCHEME CONFIGURATION (PMJAY)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Use Case: Configure PMJAY (Ayushman Bharat) scheme             │
│                                                                  │
│  [1] Navigate to Government Schemes > PMJAY                     │
│       └─> Click "Configure PMJAY"                               │
│                                                                  │
│  [2] Hospital Empanelment Details                                │
│       ├─> SHA Code: KA-BLR-001234 (State Health Agency)        │
│       ├─> Empanelment Number: PMJAY/KA/2024/001234             │
│       ├─> Empanelment Date: 15-Jan-2024                        │
│       ├─> Valid Till: 14-Jan-2027                              │
│       ├─> Hospital Type: Private                                │
│       ├─> Bed Category: Multi-specialty (>50 beds)             │
│       └─> Empanelment Level: Gold                              │
│                                                                  │
│  [3] NHA (National Health Authority) Credentials                │
│       ├─> NHA Hospital Code: PMJAY1234567890                   │
│       ├─> Transaction Management System (TMS) Login             │
│       │    ├─ Username: hospital_user_001                      │
│       │    ├─ Password: [Encrypted]                            │
│       │    └─ API Key: [Encrypted]                             │
│       ├─> PMJAY Portal URL: pmjay.gov.in                       │
│       └─> Nodal Officer: Dr. Rajesh Kumar                      │
│                                                                  │
│  [4] Empaneled Specialties                                       │
│       └─> Select applicable specialties:                        │
│           ☑ General Medicine                                    │
│           ☑ General Surgery                                     │
│           ☑ Orthopedics                                         │
│           ☑ Obstetrics & Gynecology                             │
│           ☑ Pediatrics                                          │
│           ☑ Cardiology                                          │
│           ☑ Nephrology                                          │
│           ☐ Neurosurgery (not empaneled)                       │
│           ☐ Oncology (not empaneled)                           │
│                                                                  │
│  [5] Package Configuration                                       │
│       │                                                           │
│       ├─> Import HBP (Health Benefit Package) Codes             │
│       │    └─ CSV from NHA with all package codes               │
│       │                                                           │
│       ├─> Map to Hospital Services                              │
│       │    Example mappings:                                    │
│       │    ├─ HBP Code: 10010001                                │
│       │    │   Name: Laparoscopic Cholecystectomy               │
│       │    │   Hospital Package: PKG-LAPCHO-001                 │
│       │    │   Package Rate: ₹30,000                            │
│       │    │                                                      │
│       │    ├─ HBP Code: 10010015                                │
│       │    │   Name: Coronary Angioplasty with Stent            │
│       │    │   Hospital Package: PKG-PTCA-001                   │
│       │    │   Package Rate: ₹1,50,000                          │
│       │    │                                                      │
│       │    └─ HBP Code: 10020123                                │
│       │        Name: Normal Delivery                            │
│       │        Hospital Package: PKG-NVD-001                    │
│       │        Package Rate: ₹5,000                             │
│       │                                                           │
│       └─> Package Components Breakdown                          │
│            For each package, define:                            │
│            ├─ Surgeon charges                                   │
│            ├─ Anesthetist charges                               │
│            ├─ Consumables & implants                            │
│            ├─ OT charges                                        │
│            ├─ Room charges (days included)                      │
│            ├─ Nursing charges                                    │
│            ├─ Diagnostics included                              │
│            └─ Pharmacy included                                 │
│                                                                  │
│  [6] Preauthorization Settings                                   │
│       ├─> All packages require pre-auth: Yes                    │
│       ├─> Pre-auth submission: Within 24 hours of admission     │
│       ├─> Required documents:                                    │
│       │    ├─ Ayushman card (physical/digital)                 │
│       │    ├─ Aadhaar card                                      │
│       │    ├─ Ration card (if applicable)                      │
│       │    ├─ Doctor's prescription                             │
│       │    ├─ Diagnostic reports                                │
│       │    └─ Treatment plan                                    │
│       ├─> Pre-auth approval time: 2-4 hours (emergency: 1hr)   │
│       └─> Auto-renewal if treatment extends                     │
│                                                                  │
│  [7] Patient Verification                                        │
│       ├─> Beneficiary verification method: Aadhaar-based        │
│       ├─> Integration with PMJAY server: Yes                    │
│       ├─> Biometric verification: Fingerprint/Iris              │
│       ├─> Offline verification: SMS OTP                         │
│       └─> Family verification: All members linked               │
│                                                                  │
│  [8] Claims Submission                                           │
│       ├─> Claim submission window: Within 15 days of discharge  │
│       ├─> Required documents:                                    │
│       │    ├─ Discharge summary                                 │
│       │    ├─ Final bill                                        │
│       │    ├─ Medicines & consumables list                      │
│       │    ├─ Investigation reports                             │
│       │    ├─ Consent forms                                     │
│       │    └─ Pre-auth approval letter                          │
│       ├─> Submission method: Online (TMS portal)                │
│       ├─> Claim processing time: 15-30 days                     │
│       └─> Payment method: NEFT to hospital account              │
│                                                                  │
│  [9] Exclusions & Restrictions                                   │
│       ├─> No VIP/Deluxe room upgrades                           │
│       ├─> No non-PMJAY procedures in same admission             │
│       ├─> No outside medicines (only pharmacy supplies)         │
│       ├─> No attendant charges                                   │
│       └─> Follow-up care as per package only                    │
│                                                                  │
│  [10] Reporting Requirements                                     │
│        ├─> Monthly utilization report to SHA                    │
│        ├─> Quarterly audit by NHA                               │
│        ├─> Grievance register maintenance                       │
│        └─> PMJAY helpdesk display (14555)                       │
│                                                                  │
│  [11] Quality Standards                                          │
│        ├─> NABH accreditation (preferred)                       │
│        ├─> Maintain Bed Occupancy Register                      │
│        ├─> Display PMJAY rates publicly                         │
│        ├─> Zero patient charges (if within package)             │
│        └─> Proper signage and beneficiary facilitation         │
│                                                                  │
│  [12] Save & Activate                                            │
│        └─> PMJAY configuration active                           │
│        └─> Beneficiary verification enabled                     │
│        └─> Pre-auth system ready                                │
│        └─> Claims submission ready                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```


### Workflow 5: Multi-Tier Pricing Configuration

```
┌─────────────────────────────────────────────────────────────────┐
│              MULTI-TIER PRICING CONFIGURATION                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Use Case: Different prices for different patient categories    │
│                                                                  │
│  [1] Pricing Tier Definition                                     │
│       │                                                           │
│       ├─> Tier 1: General (Default)                             │
│       │    └─ Regular patients, full charges                    │
│       │                                                           │
│       ├─> Tier 2: Senior Citizen                                │
│       │    └─ 10% discount on all services                      │
│       │                                                           │
│       ├─> Tier 3: Staff/Employee                                │
│       │    └─ 30% discount on all services                      │
│       │                                                           │
│       ├─> Tier 4: Employee Family                               │
│       │    └─ 20% discount on all services                      │
│       │                                                           │
│       ├─> Tier 5: BPL (Below Poverty Line)                      │
│       │    └─ 50% discount on all services                      │
│       │                                                           │
│       └─> Tier 6: Medical Council                               │
│            └─ Professional courtesy, 40% discount               │
│                                                                  │
│  [2] Tier Assignment Rules                                       │
│       ├─> Automatic assignment based on:                        │
│       │    ├─ Age >60 → Senior Citizen                          │
│       │    ├─ Employee ID present → Staff                       │
│       │    ├─ Relationship to employee → Family                 │
│       │    ├─ BPL card number → BPL                             │
│       │    └─ Medical Council ID → Medical Council              │
│       │                                                           │
│       └─> Manual override allowed (with approval)               │
│                                                                  │
│  [3] Service-specific Tier Pricing                              │
│       └─> Example: CT Scan                                      │
│           ├─ Base Price: ₹3,000                                 │
│           ├─ General: ₹3,000 (100%)                             │
│           ├─ Senior Citizen: ₹2,700 (90%)                       │
│           ├─ Staff: ₹2,100 (70%)                                │
│           ├─ Employee Family: ₹2,400 (80%)                      │
│           ├─ BPL: ₹1,500 (50%)                                  │
│           └─ Medical Council: ₹1,800 (60%)                      │
│                                                                  │
│  [4] Tier Restrictions                                           │
│       ├─> Some services non-discountable:                       │
│       │    ├─ Implants (pacemaker, stents, etc.)                │
│       │    ├─ High-end diagnostic equipment                     │
│       │    └─ Specific branded medicines                        │
│       │                                                           │
│       └─> Maximum discount caps:                                │
│            ├─ Single service: ₹10,000 max discount              │
│            └─ Per bill: ₹50,000 max discount                    │
│                                                                  │
│  [5] Validation & Approval                                       │
│       ├─> BPL eligibility: Verify card with authorities         │
│       ├─> Staff eligibility: Verify employee ID with HR         │
│       ├─> Medical Council: Verify active registration           │
│       └─> Discounts >30% require HOD approval                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. User Stories with Acceptance Criteria (Financial Module)

### Epic 1: Tax Configuration

#### Story 1.1: Configure GST Tax Codes
```
As a Finance Manager
I want to configure GST tax codes
So that bills are GST-compliant

Acceptance Criteria:
✓ Can create tax codes with rate and components (CGST, SGST, IGST)
✓ Predefined healthcare tax codes (0%, 5%, 12%, 18%, 28%)
✓ Can assign HSN/SAC codes for GST compliance
✓ Can set effective dates for tax changes
✓ System auto-applies correct tax based on service type
✓ Special handling for room rent (₹5000/day threshold)
✓ State-based tax calculation (CGST+SGST vs IGST)
✓ Tax audit trail maintained
✓ Integration with GST filing software
✓ Cannot delete tax code with historical usage

Business Rules:
- Inpatient services: GST_EXEMPT
- Diagnostics: GST_EXEMPT
- Room rent ≤₹5000: GST_EXEMPT
- Room rent >₹5000: GST_12 on excess amount
- Non-clinical services: GST_18
```

#### Story 1.2: Handle Room Rent GST Calculation
```
As a Billing Executive
I want the system to auto-calculate GST on room rent
So that I don't make calculation errors

Acceptance Criteria:
✓ Room rent ≤₹5000/day: No GST
✓ Room rent >₹5000/day: GST only on excess
✓ Example calculation shown:
  - Rent: ₹7,000/day
  - Exempt: ₹5,000 (GST 0%)
  - Taxable: ₹2,000 (GST 12% = ₹240)
  - Total: ₹7,240
✓ Calculation breakdown visible to patient
✓ Multi-day stays calculated correctly
✓ Works for partial days (hourly billing)
✓ Audit trail for all calculations

Edge Cases:
- Room type change mid-stay
- ICU to general ward transfer
- Hourly to daily billing conversion
```

### Epic 2: Payer Management

#### Story 2.1: Create Payer Master
```
As a Finance Manager
I want to create and manage payer records
So that we can bill different payers correctly

Acceptance Criteria:
✓ Can create payer with all details (name, type, contact)
✓ Payer types: Insurance, TPA, Corporate, Government, Trust, Employee
✓ Can capture regulatory info (IRDAI, license, PAN, GSTIN)
✓ Can set payment terms (credit days, credit limit)
✓ Can configure pre-authorization requirements
✓ Can upload empanelment documents
✓ Can set payer status (Active/Inactive/Suspended)
✓ System validates IRDAI number format
✓ System validates PAN and GSTIN format
✓ Duplicate payer detection by name/code
✓ Audit trail for all payer changes

Technical Validations:
- IRDAI format: Numeric, 3-4 digits
- PAN format: 10 alphanumeric (e.g., AAACI1111M)
- GSTIN format: 15 alphanumeric (e.g., 29AAACI1111M1Z5)
- Email: Valid email format
- Phone: 10 digits for Indian numbers
```

#### Story 2.2: Manage Credit Limits
```
As a Finance Manager
I want to set and monitor payer credit limits
So that we control credit risk

Acceptance Criteria:
✓ Can set credit limit per payer
✓ Can set credit days (payment terms)
✓ Real-time tracking of utilized credit
✓ Alert when credit utilization >80%
✓ Block billing when credit limit exceeded (configurable)
✓ Can temporarily increase limit (with approval)
✓ Dashboard showing credit utilization by payer
✓ Aging analysis (0-30, 31-60, 61-90, >90 days)
✓ Automated payment reminders
✓ Can set interest on delayed payments

Dashboard Metrics:
- Total credit limit: ₹1.5 Crore
- Utilized: ₹1.1 Crore (73%)
- Available: ₹40 Lakh
- Overdue: ₹25 Lakh
- Highest utilization: ICICI Lombard (95%)
```

#### Story 2.3: Payer Document Management
```
As a TPA Coordinator
I want to manage payer-related documents
So that we have all necessary paperwork

Acceptance Criteria:
✓ Can upload empanelment letter
✓ Can upload signed agreement/MOU
✓ Can upload tariff schedule
✓ Can upload panel inclusion certificate
✓ Can upload correspondence
✓ Document version control
✓ Expiry tracking for time-bound documents
✓ Alerts for document renewal (60/30/15 days)
✓ Can view document history
✓ Can attach documents to claims
✓ Secure document storage with access controls

Document Types:
- Empanelment Letter (Required)
- Agreement/MOU (Required)
- Tariff Schedule (Required)
- Panel Certificate (Required)
- Rate Revision Letters (As needed)
- Correspondence (As needed)
```

### Epic 3: Tariff Plan Management

#### Story 3.1: Create Global Discount Tariff
```
As a Finance Manager
I want to create payer tariff with global discount
So that billing applies correct payer rates

Acceptance Criteria:
✓ Can create tariff plan linked to payer
✓ Can set global discount percentage
✓ Applies to all services uniformly
✓ Can set effective dates
✓ Can set priority (if multiple tariffs)
✓ Can exclude specific service categories
✓ Can set minimum/maximum price caps
✓ Preview pricing for sample services
✓ Requires approval before activation
✓ Old tariffs archived automatically

Example Configuration:
- Payer: ABC Insurance
- Tariff Type: Global Discount
- Discount: 15% on all services
- Effective: 01-Apr-2024 to 31-Mar-2025
- Min Price: ₹100
- Max Price: No cap
- Exclusions: Implants, High-end imaging
```

#### Story 3.2: Create Category-wise Tariff
```
As a Finance Manager
I want to set different pricing for different service categories
So that we can have nuanced payer contracts

Acceptance Criteria:
✓ Can set different discount/rate per category
✓ Categories: Consultation, Diagnostics, Procedures, Room, Pharmacy
✓ Can set sub-category level pricing
✓ Can set min/max price caps per category
✓ Category rules override global rules
✓ Can import category pricing from Excel
✓ Validation ensures all categories covered
✓ Can copy from existing tariff plan
✓ Impact analysis before activation

Example Configuration:
- Consultations: 100% (no discount)
- Lab Tests: 90% (10% discount)
- Imaging: 85% (15% discount)
- Surgeries: 90% (10% discount)
- Room: Fixed rates (₹2000/₹3000/₹5000)
- Pharmacy: 95% (5% discount)
```

#### Story 3.3: Create Service-specific Tariff
```
As a Finance Manager
I want to set specific prices for each service
So that we honor payer rate cards

Acceptance Criteria:
✓ Can import payer rate card (Excel/CSV)
✓ System maps payer codes to hospital services
✓ Can manually enter rates for each service
✓ Can search and update specific service rate
✓ Shows difference from base hospital rate
✓ Highlights services without pricing
✓ Can bulk update selected services
✓ Validation prevents unrealistic prices
✓ Shows impact on revenue (estimated)
✓ Side-by-side comparison with current rates

Import Process:
1. Download mapping template
2. Fill payer codes and rates
3. Upload file
4. System validates and maps
5. Review unmapped services
6. Approve and activate
7. Generate pricing report
```

#### Story 3.4: Tariff Version Management
```
As a Finance Manager
I want to manage multiple versions of tariff plans
So that I can handle rate revisions

Acceptance Criteria:
✓ Can create new version of existing tariff
✓ Old version auto-archived with end date
✓ Can view history of all versions
✓ Can compare two versions (diff view)
✓ Can reactivate old version if needed
✓ Each version has approval workflow
✓ Bills use tariff version active on bill date
✓ Clear version numbering (v1.0, v2.0, etc.)
✓ Can add revision notes/comments
✓ Email notification on new version

Version Timeline:
- v1.0: 01-Jan-2024 to 31-Mar-2024 (Archived)
- v2.0: 01-Apr-2024 to 30-Sep-2024 (Archived)
- v3.0: 01-Oct-2024 to 31-Mar-2025 (Active)
- v4.0: 01-Apr-2025 onwards (Draft)
```

### Epic 4: Government Scheme Configuration

#### Story 4.1: Configure PMJAY Scheme
```
As an Admin Officer
I want to configure PMJAY scheme
So that we can serve Ayushman beneficiaries

Acceptance Criteria:
✓ Can enter hospital empanelment details
✓ Can store NHA credentials securely
✓ Can select empaneled specialties
✓ Can import HBP package codes
✓ Can map HBP codes to hospital packages
✓ Can configure pre-authorization settings
✓ Can configure document requirements
✓ Integration with PMJAY beneficiary verification
✓ Integration with TMS for claims
✓ Dashboard for PMJAY utilization
✓ Monthly reporting to SHA

Package Mapping Example:
- HBP: 10010001 → Laparoscopic Cholecystectomy
- Hospital: PKG-LAPCHO-001
- Rate: ₹30,000
- Components: Surgeon, Anesthetist, Consumables, OT, Room, Diagnostics
- Pre-auth: Mandatory
- Documents: 15 required documents
```

#### Story 4.2: Configure CGHS Scheme
```
As an Admin Officer
I want to configure CGHS scheme
So that we can serve central government employees

Acceptance Criteria:
✓ Can enter CGHS empanelment details
✓ Can select empanelment category (A/B/C city)
✓ Can import CGHS rate card
✓ Can map CGHS codes to hospital services
✓ Can set room rent limits by designation
✓ Can configure referral requirements
✓ Can configure emergency claim process
✓ Integration with CGHS beneficiary verification
✓ Can track claims submission
✓ Monthly billing to CGHS

Rate Configuration:
- City Category: B (Bangalore)
- Room Rent: ₹2000/₹3000/₹4000 (Level/Designation-based)
- Diagnostic Rates: As per CGHS schedule
- Procedure Rates: As per CGHS schedule
- Emergency: 25% loading allowed
- Referral: Required for super-speciality
```

### Epic 5: Pricing Rules & Special Conditions

#### Story 5.1: Configure Time-based Pricing
```
As a Finance Manager
I want to configure time-based pricing surcharges
So that we can charge appropriately for after-hours services

Acceptance Criteria:
✓ Can define time slots (office hours, after hours, night)
✓ Can set surcharge percentage per slot
✓ Applies to specific service categories
✓ Can configure weekend/holiday surcharges
✓ Can exclude certain payers from surcharges
✓ System auto-applies based on service time
✓ Shows surcharge breakdown in bill
✓ Can override surcharge with approval
✓ Audit trail for all surcharges applied

Time-based Rules:
- Office Hours (8 AM - 6 PM): Normal rate
- After Hours (6 PM - 10 PM): +15%
- Night (10 PM - 8 AM): +25%
- Weekends: +10%
- Public Holidays: +20%
- Emergency: +30% (cumulative with time)
```

#### Story 5.2: Configure Patient Category Discounts
```
As a Finance Manager
I want to configure category-based discounts
So that we provide concessions to eligible categories

Acceptance Criteria:
✓ Can define discount categories (Senior, Staff, BPL, etc.)
✓ Can set discount percentage per category
✓ Can exclude specific services from discounts
✓ Can set maximum discount cap per bill
✓ Auto-apply based on patient attributes
✓ Require supporting documents for verification
✓ Approval workflow for high-value discounts
✓ Can combine with payer discounts (configurable)
✓ Dashboard for discount analysis

Discount Categories:
- Senior Citizen (>60 years): 10%
- Hospital Staff: 30%
- Staff Family: 20%
- BPL Card Holder: 50%
- Medical Council: 40%
- Freedom Fighter: 100%
- Blood Donor: ₹500 per donation
```

#### Story 5.3: Configure Package Utilization Rules
```
As a Finance Manager
I want to define how package over/under-utilization is handled
So that billing follows contract terms

Acceptance Criteria:
✓ Can set over-utilization policy per package
  - Charge additional at package rate
  - Charge additional at regular rate
  - Absorb within package
✓ Can set under-utilization policy
  - No refund
  - Partial refund
  - Full refund
✓ Can set utilization thresholds
✓ Alerts for significant deviations
✓ Itemized bill shows package vs. actual
✓ Approval required for policy overrides
✓ Payer-specific rules supported

Example:
- Package: Normal Delivery
- Included Days: 2
- Actual Stay: 3 days
- Over-utilization Policy: Charge at package rate
- Extra Day Charge: ₹2,000 (room) + ₹1,500 (nursing)
- Total Additional: ₹3,500
```

### Epic 6: Credit & Payment Management

#### Story 6.1: Monitor Payer Outstanding
```
As a Finance Manager
I want to monitor payer outstanding amounts
So that I can manage receivables effectively

Acceptance Criteria:
✓ Dashboard showing outstanding by payer
✓ Aging analysis (0-30, 31-60, 61-90, >90 days)
✓ Credit utilization % per payer
✓ Top 10 payers by outstanding
✓ Overdue payers highlighted
✓ Can send payment reminders
✓ Can view bill-wise details
✓ Export to Excel for follow-up
✓ Graphical trends (month-over-month)
✓ Integration with accounting system

Key Metrics:
- Total Outstanding: ₹3.5 Crore
- Current (0-30 days): ₹1.8 Crore
- 31-60 days: ₹1.2 Crore
- 61-90 days: ₹30 Lakh
- >90 days: ₹20 Lakh (Red flag)
- Average collection period: 52 days
```

#### Story 6.2: Configure Payment Terms
```
As a Finance Manager
I want to configure payer payment terms
So that credit is managed systematically

Acceptance Criteria:
✓ Can set credit days per payer
✓ Can set credit limit per payer
✓ Can set grace period for delayed payment
✓ Can configure interest on delayed payment
✓ Can set early payment discount
✓ Can block further credit if limit exceeded
✓ Automated reminders before due date
✓ Escalation for overdue payments
✓ Can configure payment modes accepted
✓ Integration with payment gateway

Payment Terms Example:
- Payer: ICICI Lombard
- Credit Days: 45 days
- Credit Limit: ₹50 Lakh
- Grace Period: 7 days
- Interest: 2% per month on overdue
- Early Payment Discount: 2% if paid within 15 days
- Reminder: 5 days before due date
- Escalation: CFO notification if >60 days overdue
```

---

## 5. Edge Cases & Exception Scenarios (Financial Module)

### 5.1 Tax Calculation Edge Cases

| Scenario | Expected Behavior | Error Handling |
|----------|-------------------|----------------|
| Room rent exactly ₹5000 | Apply GST_EXEMPT | No GST |
| Room rent ₹5001 | GST on ₹1 only | ₹1 × 12% = ₹0.12 |
| Mid-day room type change | Pro-rate charges | Calculate proportionally |
| Interstate patient | Apply IGST instead of CGST+SGST | Auto-detect from patient address |
| Zero-rated supply | 0% but show in GST return | Track separately |
| Reverse charge (RCM) | Not applicable in healthcare | Document reasoning |
| Tax code changed mid-bill | Use code at time of service | Don't retroactively update |
| Invalid GSTIN | Show warning, allow billing | Flag for correction |

### 5.2 Payer Configuration Edge Cases

| Scenario | Expected Behavior | Error Handling |
|----------|-------------------|----------------|
| Empanelment expired | Show warning, block new cases | Alert admin 30 days before |
| Credit limit exceeded | Block/warn based on config | Require approval for override |
| Multiple active tariffs | Use priority order | Lowest priority number wins |
| Payer deactivated mid-case | Continue case, no new cases | Complete ongoing treatments |
| Pre-auth expired | Extend or close case | System prompts for action |
| Patient changed payer mid-admission | Allow with approval | Recompute charges |
| Duplicate payer code | Prevent creation | Suggest alternative code |
| Special characters in payer name | Allow but sanitize for files | Replace with safe characters |

### 5.3 Tariff & Pricing Edge Cases

| Scenario | Expected Behavior | Error Handling |
|----------|-------------------|----------------|
| Service not in tariff | Use base hospital rate | Flag for tariff update |
| Tariff gap (no active tariff) | Use previous tariff with warning | Alert finance team |
| Overlapping tariff dates | Prevent creation | Show error |
| Future tariff and current tariff | Show both | Billing uses appropriate one |
| Negative discount (price increase) | Allow but flag as unusual | Require approval |
| Package rate < component rate | Flag as potential error | Allow with confirmation |
| Circular pricing reference | Detect and prevent | Show error |
| Price ₹0.00 | Flag for review | Allow for free services only |

### 5.4 Multi-Currency Edge Cases

| Scenario | Expected Behavior | Error Handling |
|----------|-------------------|----------------|
| Foreign patient billing | Convert to INR at current rate | Store both currencies |
| Exchange rate not available | Use last known rate + premium | Manual rate entry allowed |
| Currency changed mid-admission | Recalculate at new rate | Require approval |
| Very large amounts (overflow) | Handle with BigDecimal | Show warning |
| Rounding differences | Use banker's rounding | Document method |
| Invoice in foreign currency | Show both original and INR | Both in PDF |

### 5.5 Package & Discount Edge Cases

| Scenario | Expected Behavior | Error Handling |
|----------|-------------------|----------------|
| Over-utilization | Charge per policy | Show breakdown |
| Under-utilization | Handle per policy | No automatic refund |
| Component service discontinued | Flag package | Suggest replacement |
| Multiple discounts eligible | Apply highest or cumulative (config) | Show calculation |
| Discount > service price | Cap at service price (net = ₹0) | Require approval |
| Package + payer discount | Handle per payer contract | Document rules |
| Manual discount override | Require approval + reason | Audit log |

---

## 6. Business Rules & Validations (Financial Module)

### 6.1 Tax Configuration Rules

| Rule | Description | Impact |
|------|-------------|--------|
| **GST Rate Validity** | Must be 0%, 5%, 12%, 18%, or 28% | Prevents incorrect rates |
| **Component Sum** | CGST + SGST must equal total rate | Ensures correct split |
| **IGST vs CGST+SGST** | Interstate: IGST, Intrastate: CGST+SGST | Tax compliance |
| **Room Rent Threshold** | GST only on amount >₹5000/day | Healthcare exemption |
| **HSN/SAC Mandatory** | All tax codes must have HSN/SAC | GST filing requirement |
| **No Retrospective Changes** | Tax rate changes not backdated | Prevents bill manipulation |

### 6.2 Payer Management Rules

| Rule | Description | Impact |
|------|-------------|--------|
| **Unique Payer Code** | Payer code must be system-wide unique | Prevents confusion |
| **IRDAI Required** | Insurance/TPA must have valid IRDAI | Regulatory compliance |
| **Credit Limit Positive** | Credit limit must be > 0 | Prevents negative limits |
| **Credit Days Reasonable** | Credit days typically 15-90 | Alerts for unusual values |
| **Active Empanelment** | Cannot bill if empanelment expired | Prevents invalid claims |
| **Document Attachment** | Empanelment letter mandatory | Compliance requirement |

### 6.3 Tariff Plan Rules

| Rule | Description | Impact |
|------|-------------|--------|
| **Linked to Payer** | Every tariff must be linked to payer | Ensures proper billing |
| **Valid Date Range** | Effective Till >= Effective From | Prevents invalid dates |
| **No Date Overlap** | Same payer can't have overlapping tariffs | Single rate per date |
| **Discount Range** | Discount -50% to +50% | Prevents extreme values |
| **Price Floor** | Payer rate cannot be < cost price (optional) | Protects margins |
| **Approval Required** | New tariffs require finance approval | Quality control |

### 6.4 Package Utilization Rules

| Rule | Description | Impact |
|------|-------------|--------|
| **Policy Definition** | Must define over/under-utilization policy | Guides billing |
| **Component Active** | All package components must be active | Prevents invalid packages |
| **Duration Limit** | Package duration must be reasonable (1-365 days) | Data quality |
| **Price Logic** | Package rate > 0 | Prevents free packages |


---

# Integration Points

## 1. Module Interdependencies

### 1.1 Service Catalog Integration Map

```
Service Catalog
├── → Billing Module
│   ├─ Service pricing for invoice generation
│   ├─ Package component breakdown
│   └─ Discount rules application
│
├── → Clinical Module (EMR)
│   ├─ Orderable services catalog
│   ├─ Clinical decision support (protocols)
│   └─ Service requirements (consent, TAT)
│
├── → Laboratory Module
│   ├─ Lab test master
│   ├─ LOINC code mapping
│   └─ Reference ranges linkage
│
├── → Radiology Module
│   ├─ Imaging procedure master
│   ├─ Equipment requirements
│   └─ Scheduling parameters
│
├── → Pharmacy Module
│   ├─ Billable pharmacy services
│   └─ Drug administration charges
│
├── → OT Module
│   ├─ Surgical procedure catalog
│   ├─ Package components
│   └─ Resource requirements
│
└── → Reporting Module
    ├─ Service utilization analysis
    ├─ Revenue by service
    └─ Profitability analysis
```

### 1.2 Financial Configuration Integration Map

```
Financial Configuration
├── → Billing Module
│   ├─ Tax calculation engine
│   ├─ Payer-specific pricing
│   ├─ Discount application
│   └─ Payment terms enforcement
│
├── → Claims Module
│   ├─ Payer master data
│   ├─ Pre-authorization rules
│   ├─ Package rates for claims
│   └─ Standard code mappings
│
├── → Accounting Module
│   ├─ GST ledger entries
│   ├─ Revenue recognition
│   ├─ Payer receivables
│   └─ Credit limit tracking
│
├── → Registration Module
│   ├─ Payer selection
│   ├─ Credit limit check
│   └─ Eligibility verification
│
├── → Insurance Module
│   ├─ Payer contracts
│   ├─ Coverage verification
│   └─ Approved services catalog
│
└── → Reporting Module
    ├─ Revenue by payer
    ├─ Discount analysis
    ├─ GST reports
    └─ Outstanding analysis
```

## 2. API Integration Points

### 2.1 External Integrations

| System | Integration Purpose | Frequency | Method |
|--------|---------------------|-----------|--------|
| **ABDM (Ayushman Bharat)** | Service code mapping, HFR registry | Real-time | REST API |
| **PMJAY TMS** | Beneficiary verification, pre-auth, claims | Real-time | REST API |
| **GST Portal** | GST return filing, HSN validation | Daily/Monthly | REST API |
| **Insurance Companies** | Eligibility check, pre-auth, claims | Real-time | REST API |
| **TPA Portals** | Claims submission, status tracking | Real-time | REST API/SFTP |
| **LOINC Database** | Lab test code mapping | Monthly sync | Flat file |
| **CPT Database** | Procedure code mapping | Quarterly | Flat file |
| **SNOMED** | Clinical terminology mapping | Quarterly | Flat file |

### 2.2 Internal Integrations

| Module | Integration Point | Data Flow | Trigger |
|--------|-------------------|-----------|---------|
| **Billing** | Service pricing | Service Catalog → Billing | Order creation |
| **Billing** | Tax calculation | Financial Config → Billing | Bill generation |
| **Clinical** | Service ordering | Service Catalog → Clinical | Doctor order entry |
| **Lab** | Test master sync | Service Catalog ↔ Lab | Service creation/update |
| **Pharmacy** | Service charges | Service Catalog → Pharmacy | Medication dispensing |
| **Claims** | Payer contract rates | Financial Config → Claims | Claim generation |
| **Reports** | Service analytics | Service Catalog → Reports | Scheduled/On-demand |

---

# AI Copilot Integration

## 1. Service Catalog AI Features

### 1.1 Intelligent Service Search

**Feature:** AI-powered service search with natural language understanding

**Capabilities:**
- Fuzzy matching and typo correction
- Synonym recognition (FBS = Fasting Sugar = Glucose)
- Context-aware results (OPD vs IPD vs Emergency)
- Learning from user behavior (frequently ordered services)
- Multi-language support (English + regional languages)

**Implementation:**
```javascript
// AI Search Service
class AIServiceSearch {
  async search(query, context) {
    // 1. Fuzzy matching
    const fuzzyMatches = await this.fuzzySearch(query);
    
    // 2. Synonym expansion
    const synonyms = await this.getSynonyms(query);
    
    // 3. Context filtering
    const contextFiltered = this.applyContext(fuzzyMatches, context);
    
    // 4. Personalization
    const personalized = await this.applyUserPreferences(contextFiltered);
    
    // 5. Ranking
    return this.rankResults(personalized);
  }
}
```

**AI Model:** Custom NLP model trained on medical terminology + search patterns

### 1.2 Standard Code Suggestion

**Feature:** AI suggests LOINC, CPT, SNOMED codes for services

**Capabilities:**
- Analyzes service name and description
- Suggests most likely standard codes
- Confidence score for each suggestion
- Learns from user confirmations

**Example:**
```
User enters: "Fasting Blood Glucose Test"

AI suggests:
✓ LOINC: 1558-6 (Glucose [Mass/volume] in Serum or Plasma --fasting) - 98% confidence
✓ CPT: 82947 (Glucose; quantitative, blood) - 95% confidence
✓ SNOMED: 271062006 (Fasting blood glucose measurement) - 92% confidence

User confirms: LOINC 1558-6 ✓
→ AI improves future suggestions
```

### 1.3 Package Optimization

**Feature:** AI recommends optimal package composition and pricing

**Capabilities:**
- Analyzes historical package utilization
- Identifies commonly co-occurring services
- Suggests package components
- Recommends profitable package pricing
- Alerts for loss-making packages

**Example:**
```
AI analyzes 500 Normal Delivery cases:
→ Average services consumed:
  - Room: 2.3 days
  - Doctor visits: 4
  - Lab tests: CBC, Blood Group, Urine
  - Nursing: Continuous
  - Delivery charges: 1

AI recommends:
✓ Package components: Room (2 days) + Doctor (4 visits) + 3 lab tests + Nursing
✓ Average cost: ₹28,000
✓ Recommended price: ₹32,000 (14% margin)
✓ Market competitive: Yes (compared to 3 nearby hospitals)
```

### 1.4 Service Duplication Detection

**Feature:** AI detects duplicate or similar services during creation

**Capabilities:**
- Semantic similarity analysis
- Detects exact duplicates
- Detects near-duplicates with different names
- Suggests merging or standardizing

**Example:**
```
User creates: "Glucose Fasting Test"

AI detects similar services:
⚠️ "Fasting Blood Sugar" (90% similar)
⚠️ "FBS Test" (85% similar)
⚠️ "Blood Glucose Fasting" (95% similar)

AI suggests: Merge or use existing service to avoid duplication
```

## 2. Financial Configuration AI Features

### 2.1 Dynamic Pricing Recommendations

**Feature:** AI recommends optimal pricing based on multiple factors

**Capabilities:**
- Market analysis (competitor pricing)
- Cost analysis (resource utilization)
- Demand analysis (service frequency)
- Margin optimization
- Payer mix analysis

**Example:**
```
Service: MRI Brain Plain
Current Price: ₹4,000

AI analysis:
├─ Average cost: ₹2,500 (consumables + staff + equipment depreciation)
├─ Market range: ₹3,500 - ₹6,000 (5 nearby hospitals)
├─ Your utilization: 120 scans/month
├─ Payer mix: 60% insurance (10% discount), 40% cash
└─ Current margin: 37.5%

AI recommends:
✓ Optimal price: ₹4,500 (maintain competitiveness + improve margin)
✓ Expected impact: +₹60,000/month revenue
✓ Risk: Low (still below market median ₹5,000)
```

### 2.2 Payer Contract Analysis

**Feature:** AI analyzes payer contract profitability

**Capabilities:**
- Service-wise margin analysis
- Package utilization patterns
- Over/under-utilization detection
- Renegotiation recommendations
- Contract renewal alerts

**Example:**
```
Payer: XYZ Insurance
Contract: 15% global discount
Duration: Jan-Dec 2024

AI analysis:
├─ Total revenue: ₹1.2 Crore
├─ Total cases: 450
├─ Average margin: 8% (below target 15%)
├─ Loss-making services: 23 (mostly imaging)
├─ High-utilization packages: Normal Delivery (over-utilized 40%)
└─ Payment delays: Average 62 days (vs 45 days agreed)

AI recommends:
✓ Renegotiate imaging rates (request 5% higher)
✓ Restructure Normal Delivery package (add components or increase price)
✓ Negotiate early payment discount for faster settlements
✓ Expected margin improvement: 8% → 12%
```

### 2.3 Credit Risk Assessment

**Feature:** AI assesses payer credit risk

**Capabilities:**
- Historical payment pattern analysis
- Credit utilization trending
- Anomaly detection (sudden spike in billing)
- Default probability prediction
- Recommended credit limit adjustment

**Example:**
```
Payer: ABC TPA
Credit Limit: ₹50 Lakh
Current Outstanding: ₹45 Lakh (90% utilized)

AI risk analysis:
├─ Payment history: 80% on-time, 20% delayed
├─ Average delay: 15 days
├─ Trend: Increasing delays last 3 months
├─ Overdue amount: ₹12 Lakh (>60 days)
├─ Risk score: 65/100 (Medium-High)

AI recommends:
⚠️ Hold new cases until outstanding <₹40 Lakh
⚠️ Send payment reminder + escalation
⚠️ Request advance payment for high-value cases
⚠️ Consider reducing credit limit to ₹40 Lakh
```

### 2.4 GST Compliance Assistant

**Feature:** AI ensures GST compliance and optimization

**Capabilities:**
- Auto-classifies services into GST categories
- Validates HSN/SAC codes
- Identifies potential exemptions
- Recommends input tax credit optimization
- Alerts for compliance issues

**Example:**
```
New service: "Dental Implant Procedure"

AI analysis:
├─ Service type: Procedure
├─ Healthcare exemption: No (cosmetic/elective)
├─ Recommended GST: 18%
├─ HSN Code: 9993 (Health Services)
├─ Input tax credit: Available on consumables
├─ Compliance note: Maintain proper documentation

AI recommends:
✓ Apply GST_18
✓ Ensure patient consent mentions GST
✓ Segregate bill into taxable and exempt components
```

---

# Data Models & Schema

## 1. Service Catalog Tables

### 1.1 service_master

```sql
CREATE TABLE service_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id),
    branch_id UUID REFERENCES branch(id),
    
    -- Basic Information
    service_code VARCHAR(50) UNIQUE NOT NULL,
    service_name VARCHAR(200) NOT NULL,
    short_name VARCHAR(100),
    display_name VARCHAR(200),
    description TEXT,
    search_aliases TEXT[], -- Array of alternative names
    
    -- Classification
    service_type VARCHAR(50) NOT NULL, -- DIAGNOSTIC, PROCEDURE, CONSULTATION, etc.
    category_id UUID REFERENCES service_category(id),
    sub_category_id UUID REFERENCES service_sub_category(id),
    specialty_id UUID REFERENCES specialty(id),
    
    -- Clinical Configuration
    care_context VARCHAR(50)[], -- [OPD, IPD, EMERGENCY]
    requires_order BOOLEAN DEFAULT true,
    requires_consent VARCHAR(20), -- NONE, VERBAL, WRITTEN
    requires_scheduling BOOLEAN DEFAULT false,
    default_tat_hours INTEGER, -- Turnaround time
    stat_available BOOLEAN DEFAULT false,
    
    -- Standard Codes
    loinc_code VARCHAR(20),
    cpt_code VARCHAR(10),
    icd10_pcs_code VARCHAR(10),
    snomed_code VARCHAR(20),
    nabh_code VARCHAR(20),
    hbp_code VARCHAR(20), -- For PMJAY
    
    -- Resource Requirements
    equipment_required JSONB, -- [{equipment_id, quantity}]
    staff_required JSONB, -- [{role, count}]
    room_type_required VARCHAR(50),
    consumables_required JSONB,
    
    -- Financial Details
    base_price DECIMAL(12,2) DEFAULT 0,
    cost_price DECIMAL(12,2), -- For margin calculation
    tax_code_id UUID REFERENCES tax_code(id),
    billable BOOLEAN DEFAULT true,
    allow_discount BOOLEAN DEFAULT true,
    max_discount_percent DECIMAL(5,2),
    
    -- Lifecycle
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, DISCONTINUED
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_till DATE,
    
    -- Metadata
    created_by UUID REFERENCES user(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES user(id),
    updated_at TIMESTAMP,
    
    CONSTRAINT unique_service_code_per_org UNIQUE(organization_id, service_code),
    CONSTRAINT positive_base_price CHECK (base_price >= 0),
    CONSTRAINT valid_date_range CHECK (effective_till IS NULL OR effective_till >= effective_from)
);

CREATE INDEX idx_service_name ON service_master(service_name);
CREATE INDEX idx_service_code ON service_master(service_code);
CREATE INDEX idx_service_type ON service_master(service_type);
CREATE INDEX idx_service_category ON service_master(category_id);
CREATE INDEX idx_service_status ON service_master(status);
CREATE INDEX idx_service_search ON service_master USING gin(search_aliases);
```

### 1.2 service_package

```sql
CREATE TABLE service_package (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id),
    
    -- Package Details
    package_code VARCHAR(50) UNIQUE NOT NULL,
    package_name VARCHAR(200) NOT NULL,
    short_name VARCHAR(100),
    description TEXT,
    category_id UUID REFERENCES service_category(id),
    specialty_id UUID REFERENCES specialty(id),
    
    -- Package Configuration
    duration_days INTEGER, -- Expected duration
    package_price DECIMAL(12,2) NOT NULL,
    component_total DECIMAL(12,2), -- Sum of all components
    discount_amount DECIMAL(12,2),
    discount_percent DECIMAL(5,2),
    
    -- Package Rules
    allow_component_addition BOOLEAN DEFAULT false,
    allow_component_removal BOOLEAN DEFAULT false,
    allow_quantity_change BOOLEAN DEFAULT false,
    over_utilization_billing VARCHAR(50), -- CHARGE_ADDITIONAL, ABSORB
    under_utilization_refund VARCHAR(50), -- NO_REFUND, PARTIAL, FULL
    
    -- Eligibility
    min_age INTEGER,
    max_age INTEGER,
    gender_restriction VARCHAR(10), -- MALE, FEMALE, ANY
    applicable_payers UUID[], -- Array of payer IDs
    requires_preauth BOOLEAN DEFAULT false,
    
    -- Lifecycle
    status VARCHAR(20) DEFAULT 'ACTIVE',
    effective_from DATE NOT NULL,
    effective_till DATE,
    
    created_by UUID REFERENCES user(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES user(id),
    updated_at TIMESTAMP,
    
    CONSTRAINT positive_package_price CHECK (package_price > 0)
);
```

### 1.3 package_component

```sql
CREATE TABLE package_component (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES service_package(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES service_master(id),
    
    -- Component Details
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    
    -- Flags
    is_required BOOLEAN DEFAULT true,
    is_optional BOOLEAN DEFAULT false,
    
    -- Display
    display_order INTEGER,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT positive_quantity CHECK (quantity > 0),
    CONSTRAINT positive_unit_price CHECK (unit_price >= 0)
);

CREATE INDEX idx_package_component_package ON package_component(package_id);
CREATE INDEX idx_package_component_service ON package_component(service_id);
```

### 1.4 service_catalog_view

```sql
CREATE TABLE service_catalog_view (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id),
    
    -- Catalog Details
    catalog_code VARCHAR(50) UNIQUE NOT NULL,
    catalog_name VARCHAR(100) NOT NULL,
    description TEXT,
    catalog_type VARCHAR(50), -- DEFAULT, OPD, EMERGENCY, QUICK_ORDER, PACKAGE, PAYER_SPECIFIC
    
    -- Configuration
    filter_rules JSONB, -- JSON rules for auto-inclusion
    sort_order VARCHAR(50) DEFAULT 'ALPHABETICAL',
    visibility VARCHAR(50) DEFAULT 'ALL', -- ALL, ROLE_BASED, USER_SPECIFIC
    
    -- Payer Linkage (for payer-specific catalogs)
    payer_id UUID REFERENCES payer_master(id),
    
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 1.5 catalog_service_mapping

```sql
CREATE TABLE catalog_service_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    catalog_id UUID NOT NULL REFERENCES service_catalog_view(id) ON DELETE CASCADE,
    service_id UUID REFERENCES service_master(id),
    package_id UUID REFERENCES service_package(id),
    
    display_order INTEGER,
    is_featured BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT service_or_package CHECK (
        (service_id IS NOT NULL AND package_id IS NULL) OR
        (service_id IS NULL AND package_id IS NOT NULL)
    )
);
```

### 1.6 service_price_history

```sql
CREATE TABLE service_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES service_master(id),
    
    -- Price Details
    old_price DECIMAL(12,2),
    new_price DECIMAL(12,2) NOT NULL,
    change_amount DECIMAL(12,2),
    change_percent DECIMAL(5,2),
    
    -- Effective Period
    effective_from DATE NOT NULL,
    effective_till DATE,
    
    -- Change Details
    change_reason TEXT,
    approved_by UUID REFERENCES user(id),
    approved_at TIMESTAMP,
    
    created_by UUID REFERENCES user(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 2. Financial Configuration Tables

### 2.1 tax_code

```sql
CREATE TABLE tax_code (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id),
    
    -- Tax Code Details
    tax_code VARCHAR(50) UNIQUE NOT NULL, -- GST_EXEMPT, GST_5, GST_12, GST_18, GST_28
    description VARCHAR(200),
    tax_rate DECIMAL(5,2) NOT NULL,
    
    -- GST Components
    cgst_rate DECIMAL(5,2),
    sgst_rate DECIMAL(5,2),
    igst_rate DECIMAL(5,2),
    
    -- Classification
    hsn_sac_code VARCHAR(20), -- HSN/SAC code for GST
    tax_type VARCHAR(50) DEFAULT 'GST', -- GST, VAT, SERVICE_TAX
    
    -- Applicability
    applicable_to TEXT[], -- [CONSULTATION, DIAGNOSTICS, PROCEDURES, etc.]
    
    -- Legal References
    legal_reference TEXT,
    notification_number VARCHAR(100),
    
    -- Lifecycle
    status VARCHAR(20) DEFAULT 'ACTIVE',
    effective_from DATE NOT NULL,
    effective_till DATE,
    
    created_by UUID REFERENCES user(id),
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT valid_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 100),
    CONSTRAINT component_sum CHECK (
        (cgst_rate IS NULL AND sgst_rate IS NULL) OR
        (cgst_rate + sgst_rate = tax_rate)
    )
);
```

### 2.2 payer_master

```sql
CREATE TABLE payer_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id),
    
    -- Basic Information
    payer_code VARCHAR(50) UNIQUE NOT NULL,
    payer_name VARCHAR(200) NOT NULL,
    short_name VARCHAR(100),
    display_name VARCHAR(200),
    payer_type VARCHAR(50) NOT NULL, -- CASH, INSURANCE, TPA, CORPORATE, GOVERNMENT, TRUST, EMPLOYEE
    
    -- Parent Relationship (for TPAs)
    parent_payer_id UUID REFERENCES payer_master(id),
    
    -- Regulatory Information
    irdai_registration VARCHAR(50),
    license_number VARCHAR(100),
    license_valid_till DATE,
    pan VARCHAR(10),
    gstin VARCHAR(15),
    cin VARCHAR(21),
    
    -- Contact Information
    registered_address JSONB,
    billing_address JSONB,
    claims_address JSONB,
    primary_contact JSONB, -- {name, phone, email}
    claims_contact JSONB,
    emergency_contact JSONB,
    portal_url VARCHAR(200),
    
    -- Financial Terms
    credit_days INTEGER DEFAULT 0,
    credit_limit DECIMAL(15,2) DEFAULT 0,
    grace_period_days INTEGER DEFAULT 0,
    interest_rate_per_month DECIMAL(5,2),
    early_payment_discount_percent DECIMAL(5,2),
    
    -- Settlement Terms
    claim_processing_time_days INTEGER,
    query_resolution_time_days INTEGER,
    rejection_appeal_period_days INTEGER,
    
    -- Operational Configuration
    requires_preauth BOOLEAN DEFAULT false,
    preauth_threshold DECIMAL(12,2),
    supporting_documents_required TEXT[],
    claim_submission_method TEXT[], -- [PORTAL, EMAIL, PHYSICAL, API]
    
    -- Network Configuration
    network_type VARCHAR(50), -- CASHLESS, REIMBURSEMENT
    empanelment_level VARCHAR(50),
    room_rent_limit DECIMAL(10,2),
    icu_rent_limit DECIMAL(10,2),
    
    -- Integration
    api_endpoint VARCHAR(500),
    api_key_encrypted TEXT,
    auth_method VARCHAR(50), -- OAUTH, BASIC, API_KEY
    webhook_url VARCHAR(500),
    
    -- Status
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, SUSPENDED, BLOCKED
    empanelment_date DATE,
    empanelment_valid_till DATE,
    auto_renewal BOOLEAN DEFAULT false,
    
    created_by UUID REFERENCES user(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES user(id),
    updated_at TIMESTAMP,
    
    CONSTRAINT positive_credit_limit CHECK (credit_limit >= 0),
    CONSTRAINT valid_credit_days CHECK (credit_days >= 0)
);
```

### 2.3 payer_contract (Tariff Plan)

```sql
CREATE TABLE payer_contract (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id),
    payer_id UUID NOT NULL REFERENCES payer_master(id),
    
    -- Contract Details
    contract_code VARCHAR(50) UNIQUE NOT NULL,
    contract_name VARCHAR(200) NOT NULL,
    contract_type VARCHAR(50), -- PRICE_LIST, DISCOUNT_PLAN
    description TEXT,
    priority INTEGER DEFAULT 100, -- Lower number = higher priority
    
    -- Validity
    effective_from DATE NOT NULL,
    effective_till DATE,
    grace_period_days INTEGER DEFAULT 0,
    auto_renewal BOOLEAN DEFAULT false,
    
    -- Pricing Strategy
    pricing_strategy VARCHAR(50), -- GLOBAL_DISCOUNT, CATEGORY_WISE, SERVICE_SPECIFIC
    global_discount_percent DECIMAL(5,2),
    
    -- Special Conditions
    emergency_loading_percent DECIMAL(5,2),
    after_hours_loading_percent DECIMAL(5,2),
    weekend_loading_percent DECIMAL(5,2),
    stat_loading_percent DECIMAL(5,2),
    
    -- Co-payment
    copayment_rules JSONB, -- Rules for patient co-payment
    
    -- Exclusions
    excluded_services UUID[], -- Array of service IDs
    excluded_categories UUID[], -- Array of category IDs
    
    -- Status
    status VARCHAR(20) DEFAULT 'DRAFT', -- DRAFT, ACTIVE, EXPIRED, TERMINATED
    approval_status VARCHAR(20), -- PENDING, APPROVED, REJECTED
    approved_by UUID REFERENCES user(id),
    approved_at TIMESTAMP,
    
    created_by UUID REFERENCES user(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES user(id),
    updated_at TIMESTAMP,
    
    CONSTRAINT no_overlap_for_payer CHECK (true), -- Implemented via trigger
    CONSTRAINT valid_dates CHECK (effective_till IS NULL OR effective_till >= effective_from)
);
```

### 2.4 contract_service_rate

```sql
CREATE TABLE contract_service_rate (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES payer_contract(id) ON DELETE CASCADE,
    service_id UUID REFERENCES service_master(id),
    package_id UUID REFERENCES service_package(id),
    category_id UUID REFERENCES service_category(id),
    
    -- Pricing
    rate_type VARCHAR(50), -- FIXED_PRICE, PERCENTAGE_OF_BASE, DISCOUNT
    fixed_price DECIMAL(12,2),
    percentage_of_base DECIMAL(5,2),
    discount_percent DECIMAL(5,2),
    
    -- Caps
    min_price DECIMAL(12,2),
    max_price DECIMAL(12,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT service_or_package_or_category CHECK (
        (service_id IS NOT NULL AND package_id IS NULL AND category_id IS NULL) OR
        (service_id IS NULL AND package_id IS NOT NULL AND category_id IS NULL) OR
        (service_id IS NULL AND package_id IS NULL AND category_id IS NOT NULL)
    )
);

CREATE INDEX idx_contract_service ON contract_service_rate(contract_id, service_id);
CREATE INDEX idx_contract_package ON contract_service_rate(contract_id, package_id);
CREATE INDEX idx_contract_category ON contract_service_rate(contract_id, category_id);
```

### 2.5 payer_outstanding

```sql
CREATE TABLE payer_outstanding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id),
    payer_id UUID NOT NULL REFERENCES payer_master(id),
    
    -- Outstanding Details
    total_outstanding DECIMAL(15,2) DEFAULT 0,
    current_0_30_days DECIMAL(15,2) DEFAULT 0,
    aged_31_60_days DECIMAL(15,2) DEFAULT 0,
    aged_61_90_days DECIMAL(15,2) DEFAULT 0,
    aged_over_90_days DECIMAL(15,2) DEFAULT 0,
    
    -- Credit Utilization
    credit_limit DECIMAL(15,2),
    credit_utilized DECIMAL(15,2),
    credit_available DECIMAL(15,2),
    utilization_percent DECIMAL(5,2),
    
    -- Last Update
    last_bill_date DATE,
    last_payment_date DATE,
    last_payment_amount DECIMAL(15,2),
    
    -- Calculated
    average_delay_days INTEGER,
    
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT utilization_calculation CHECK (
        utilization_percent = CASE
            WHEN credit_limit > 0 THEN (credit_utilized / credit_limit * 100)
            ELSE 0
        END
    )
);

CREATE INDEX idx_payer_outstanding_payer ON payer_outstanding(payer_id);
```

### 2.6 government_scheme_config

```sql
CREATE TABLE government_scheme_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organization(id),
    
    -- Scheme Details
    scheme_type VARCHAR(50) NOT NULL, -- PMJAY, CGHS, ECHS, STATE_SCHEME
    scheme_code VARCHAR(50) UNIQUE NOT NULL,
    scheme_name VARCHAR(200) NOT NULL,
    
    -- Registration Details
    registration_number VARCHAR(100),
    registration_date DATE,
    valid_till DATE,
    nodal_officer UUID REFERENCES user(id),
    
    -- PMJAY Specific
    sha_code VARCHAR(50), -- State Health Agency
    nha_hospital_code VARCHAR(50), -- National Health Authority
    tms_credentials JSONB ENCRYPTED, -- Transaction Management System
    
    -- CGHS Specific
    cghs_empanelment_category VARCHAR(10), -- A, B, C (city-based)
    cghs_empanelment_number VARCHAR(100),
    
    -- Configuration
    empaneled_specialties UUID[], -- Array of specialty IDs
    preauth_required BOOLEAN DEFAULT true,
    verification_method VARCHAR(50), -- AADHAAR, BIOMETRIC, OTP
    
    -- Package Mapping
    package_mapping JSONB, -- Maps govt package codes to hospital packages
    
    -- Claim Configuration
    claim_submission_window_days INTEGER,
    claim_processing_time_days INTEGER,
    required_documents TEXT[],
    
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP
);
```

---


# API Specifications

## 1. Service Catalog APIs

### 1.1 Create Service

**Endpoint:** `POST /api/v1/service-catalog/services`

**Request Body:**
```json
{
  "service_code": "LAB-BIO-015",
  "service_name": "HbA1c (Glycated Hemoglobin)",
  "short_name": "HbA1c",
  "service_type": "DIAGNOSTIC",
  "category_id": "uuid-biochemistry",
  "sub_category_id": "uuid-diabetes-markers",
  "care_context": ["OPD", "IPD", "EMERGENCY"],
  "requires_order": true,
  "requires_consent": "NONE",
  "default_tat_hours": 24,
  "stat_available": false,
  "loinc_code": "4548-4",
  "base_price": 500.00,
  "tax_code_id": "uuid-gst-exempt",
  "status": "ACTIVE"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "uuid-service",
    "service_code": "LAB-BIO-015",
    "service_name": "HbA1c (Glycated Hemoglobin)",
    "created_at": "2026-02-08T10:30:00Z"
  },
  "message": "Service created successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Validation error
- `409 Conflict` - Duplicate service code
- `403 Forbidden` - Insufficient permissions

---

### 1.2 Search Services

**Endpoint:** `GET /api/v1/service-catalog/services/search`

**Query Parameters:**
- `q` (string, required): Search query
- `type` (string): Service type filter
- `category` (uuid): Category filter
- `care_context` (string): Care context filter
- `catalog` (uuid): Catalog view filter
- `payer_id` (uuid): Payer-specific catalog
- `limit` (integer): Results limit (default: 20)
- `offset` (integer): Pagination offset

**Example:** `GET /api/v1/service-catalog/services/search?q=sugar&care_context=OPD&limit=10`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "uuid-fbs",
        "service_code": "LAB-BIO-001",
        "service_name": "Fasting Blood Sugar (FBS)",
        "short_name": "FBS",
        "service_type": "DIAGNOSTIC",
        "category": "Biochemistry",
        "base_price": 80.00,
        "loinc_code": "1558-6",
        "default_tat_hours": 2,
        "relevance_score": 0.98
      },
      {
        "id": "uuid-rbs",
        "service_code": "LAB-BIO-002",
        "service_name": "Random Blood Sugar (RBS)",
        "base_price": 70.00,
        "relevance_score": 0.95
      }
    ],
    "total": 5,
    "limit": 10,
    "offset": 0
  }
}
```

---

### 1.3 Get Service Pricing

**Endpoint:** `GET /api/v1/service-catalog/services/{service_id}/pricing`

**Query Parameters:**
- `payer_id` (uuid, optional): Get payer-specific pricing
- `bill_date` (date, optional): Get pricing for specific date

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "service_id": "uuid-service",
    "service_name": "CT Scan Brain",
    "base_price": 3000.00,
    "applicable_price": 2550.00,
    "discount": 450.00,
    "discount_percent": 15.00,
    "tax_code": "GST_EXEMPT",
    "tax_amount": 0.00,
    "final_price": 2550.00,
    "pricing_details": {
      "base": 3000.00,
      "payer_discount": 450.00,
      "payer": "ICICI Lombard",
      "contract": "TRF-ICICI-STD-2024",
      "effective_from": "2024-01-01"
    }
  }
}
```

---

### 1.4 Create Package

**Endpoint:** `POST /api/v1/service-catalog/packages`

**Request Body:**
```json
{
  "package_code": "PKG-NVD-001",
  "package_name": "Normal Delivery Package",
  "category_id": "uuid-obstetrics",
  "duration_days": 2,
  "package_price": 25000.00,
  "components": [
    {
      "service_id": "uuid-room",
      "quantity": 2,
      "unit_price": 2000.00,
      "is_required": true
    },
    {
      "service_id": "uuid-consultation",
      "quantity": 3,
      "unit_price": 800.00,
      "is_required": true
    },
    {
      "service_id": "uuid-delivery",
      "quantity": 1,
      "unit_price": 15000.00,
      "is_required": true
    }
  ],
  "over_utilization_billing": "CHARGE_ADDITIONAL",
  "under_utilization_refund": "NO_REFUND"
}
```

**Response:** `201 Created`

---

### 1.5 Bulk Import Services

**Endpoint:** `POST /api/v1/service-catalog/services/import`

**Request:** `multipart/form-data`
- `file`: Excel/CSV file
- `import_mode`: CREATE_NEW, UPDATE_EXISTING, UPSERT
- `conflict_resolution`: SKIP, OVERWRITE

**Response:** `202 Accepted`
```json
{
  "success": true,
  "data": {
    "import_id": "uuid-import-job",
    "status": "PROCESSING",
    "total_rows": 1250
  },
  "message": "Import started. Check status at /api/v1/service-catalog/imports/{import_id}"
}
```

**Status Check:** `GET /api/v1/service-catalog/imports/{import_id}`

**Response:**
```json
{
  "success": true,
  "data": {
    "import_id": "uuid-import-job",
    "status": "COMPLETED",
    "total_rows": 1250,
    "successfully_imported": 1180,
    "skipped": 50,
    "failed": 20,
    "duration_seconds": 135,
    "report_url": "/api/v1/service-catalog/imports/{import_id}/report"
  }
}
```

---

## 2. Financial Configuration APIs

### 2.1 Create Payer

**Endpoint:** `POST /api/v1/financial/payers`

**Request Body:**
```json
{
  "payer_code": "INS-ICICI-001",
  "payer_name": "ICICI Lombard General Insurance",
  "payer_type": "INSURANCE",
  "irdai_registration": "115",
  "license_number": "IRDAI/HLT/115/2001",
  "pan": "AAACI1111M",
  "gstin": "29AAACI1111M1Z5",
  "primary_contact": {
    "name": "Ramesh Kumar",
    "phone": "9876543210",
    "email": "ramesh@icicilombard.com"
  },
  "credit_days": 45,
  "credit_limit": 5000000.00,
  "requires_preauth": true,
  "preauth_threshold": 25000.00
}
```

**Response:** `201 Created`

---

### 2.2 Create Payer Contract

**Endpoint:** `POST /api/v1/financial/payers/{payer_id}/contracts`

**Request Body:**
```json
{
  "contract_code": "TRF-ICICI-STD-2024",
  "contract_name": "ICICI Lombard - Standard Plan 2024",
  "contract_type": "PRICE_LIST",
  "effective_from": "2024-01-01",
  "effective_till": "2024-12-31",
  "pricing_strategy": "CATEGORY_WISE",
  "category_rates": [
    {
      "category_id": "uuid-consultations",
      "percentage_of_base": 100.00
    },
    {
      "category_id": "uuid-diagnostics-lab",
      "percentage_of_base": 90.00
    },
    {
      "category_id": "uuid-diagnostics-imaging",
      "percentage_of_base": 85.00
    }
  ],
  "emergency_loading_percent": 20.00
}
```

**Response:** `201 Created`

---

### 2.3 Get Effective Price

**Endpoint:** `GET /api/v1/financial/pricing/calculate`

**Query Parameters:**
- `service_id` (uuid, required): Service ID
- `payer_id` (uuid, required): Payer ID
- `patient_category` (string, optional): Patient category for additional discounts
- `bill_date` (date, optional): Date for pricing calculation
- `is_emergency` (boolean, optional): Emergency flag
- `is_after_hours` (boolean, optional): After hours flag

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "service_id": "uuid-service",
    "service_name": "CT Scan Brain",
    "payer_id": "uuid-payer",
    "payer_name": "ICICI Lombard",
    "calculation": {
      "base_price": 3000.00,
      "payer_discount": -450.00,
      "emergency_loading": 600.00,
      "patient_discount": 0.00,
      "subtotal": 3150.00,
      "tax_code": "GST_EXEMPT",
      "tax_amount": 0.00,
      "final_price": 3150.00
    },
    "breakdown": {
      "contract": "TRF-ICICI-STD-2024",
      "contract_rate": "85% of base",
      "emergency_loading": "20%",
      "effective_date": "2024-01-01"
    }
  }
}
```

---

### 2.4 Get Payer Outstanding

**Endpoint:** `GET /api/v1/financial/payers/{payer_id}/outstanding`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "payer_id": "uuid-payer",
    "payer_name": "ICICI Lombard",
    "outstanding": {
      "total": 4500000.00,
      "current_0_30": 1800000.00,
      "aged_31_60": 1200000.00,
      "aged_61_90": 1000000.00,
      "aged_over_90": 500000.00
    },
    "credit": {
      "limit": 5000000.00,
      "utilized": 4500000.00,
      "available": 500000.00,
      "utilization_percent": 90.00
    },
    "payment_metrics": {
      "average_delay_days": 52,
      "last_payment_date": "2024-01-15",
      "last_payment_amount": 250000.00
    },
    "risk_assessment": {
      "risk_score": 65,
      "risk_level": "MEDIUM_HIGH",
      "recommendations": [
        "Hold new cases until outstanding <4000000",
        "Send payment reminder",
        "Request advance for high-value cases"
      ]
    }
  }
}
```

---

### 2.5 Configure Government Scheme

**Endpoint:** `POST /api/v1/financial/government-schemes`

**Request Body:**
```json
{
  "scheme_type": "PMJAY",
  "scheme_code": "PMJAY-KA-2024",
  "sha_code": "KA-BLR-001234",
  "registration_number": "PMJAY/KA/2024/001234",
  "nha_hospital_code": "PMJAY1234567890",
  "tms_credentials": {
    "username": "hospital_user_001",
    "password": "encrypted_password",
    "api_key": "encrypted_api_key"
  },
  "empaneled_specialties": [
    "uuid-general-medicine",
    "uuid-general-surgery",
    "uuid-obstetrics"
  ],
  "preauth_required": true,
  "verification_method": "AADHAAR",
  "package_mapping": [
    {
      "hbp_code": "10010001",
      "hospital_package_id": "uuid-pkg-lapcho"
    }
  ]
}
```

**Response:** `201 Created`

---

## 3. Common API Patterns

### 3.1 Pagination

All list endpoints support pagination:
```
GET /api/v1/service-catalog/services?limit=50&offset=100
```

Response includes:
```json
{
  "data": [...],
  "pagination": {
    "total": 1250,
    "limit": 50,
    "offset": 100,
    "has_more": true
  }
}
```

### 3.2 Filtering & Sorting

```
GET /api/v1/service-catalog/services?status=ACTIVE&sort_by=service_name&sort_order=ASC
```

### 3.3 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_SERVICE_CODE",
    "message": "Service code LAB-BIO-001 already exists",
    "details": {
      "field": "service_code",
      "existing_service_id": "uuid-existing"
    }
  }
}
```

### 3.4 Bulk Operations

Bulk operations return job IDs for async processing:
```json
{
  "success": true,
  "data": {
    "job_id": "uuid-job",
    "status_url": "/api/v1/jobs/{job_id}/status"
  }
}
```

---

# Testing Strategy

## 1. Unit Testing

### 1.1 Service Catalog Tests

**Test File:** `service-catalog.service.spec.ts`

```typescript
describe('ServiceCatalogService', () => {
  describe('createService', () => {
    it('should create service with valid data', async () => {
      const serviceData = createMockServiceData();
      const result = await service.createService(serviceData);
      expect(result.service_code).toBe(serviceData.service_code);
    });

    it('should throw error for duplicate service code', async () => {
      const serviceData = createMockServiceData({ service_code: 'DUPLICATE' });
      await service.createService(serviceData);
      await expect(service.createService(serviceData))
        .rejects.toThrow('Duplicate service code');
    });

    it('should validate negative base price', async () => {
      const serviceData = createMockServiceData({ base_price: -100 });
      await expect(service.createService(serviceData))
        .rejects.toThrow('Base price cannot be negative');
    });
  });

  describe('searchServices', () => {
    it('should return relevant services for query', async () => {
      const results = await service.searchServices('sugar');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].relevance_score).toBeGreaterThan(0.7);
    });

    it('should handle fuzzy matching', async () => {
      const results = await service.searchServices('suger'); // typo
      expect(results).toContain(jasmine.objectContaining({
        service_name: jasmine.stringContaining('Sugar')
      }));
    });
  });

  describe('calculatePackagePrice', () => {
    it('should calculate total from components', () => {
      const package = createMockPackage();
      const total = service.calculateComponentTotal(package.components);
      expect(total).toBe(29700);
    });

    it('should calculate discount correctly', () => {
      const package = createMockPackage();
      const discount = service.calculatePackageDiscount(package);
      expect(discount.amount).toBe(4455);
      expect(discount.percent).toBe(15);
    });
  });
});
```

### 1.2 Financial Configuration Tests

**Test File:** `pricing.service.spec.ts`

```typescript
describe('PricingService', () => {
  describe('calculateEffectivePrice', () => {
    it('should apply payer contract discount', async () => {
      const price = await service.calculateEffectivePrice({
        service_id: 'uuid-service',
        payer_id: 'uuid-payer',
        base_price: 1000
      });
      expect(price.payer_discount).toBe(100); // 10% discount
      expect(price.final_price).toBe(900);
    });

    it('should apply emergency loading', async () => {
      const price = await service.calculateEffectivePrice({
        service_id: 'uuid-service',
        payer_id: 'uuid-payer',
        base_price: 1000,
        is_emergency: true
      });
      expect(price.emergency_loading).toBe(200); // 20% loading
      expect(price.subtotal).toBe(1200);
    });

    it('should handle multiple discounts correctly', async () => {
      const price = await service.calculateEffectivePrice({
        service_id: 'uuid-service',
        payer_id: 'uuid-payer',
        patient_category: 'SENIOR_CITIZEN',
        base_price: 1000
      });
      // Payer discount 10% + Senior citizen 10%
      expect(price.final_price).toBeLessThan(900);
    });
  });

  describe('calculateGST', () => {
    it('should apply GST_EXEMPT for most services', () => {
      const tax = service.calculateTax('CONSULTATION', 1000);
      expect(tax.tax_amount).toBe(0);
      expect(tax.tax_code).toBe('GST_EXEMPT');
    });

    it('should calculate room rent GST correctly', () => {
      const tax = service.calculateTax('ROOM_RENT', 7000);
      expect(tax.exempt_amount).toBe(5000);
      expect(tax.taxable_amount).toBe(2000);
      expect(tax.tax_amount).toBe(240); // 12% of 2000
    });
  });
});
```

## 2. Integration Testing

### 2.1 API Integration Tests

**Test File:** `service-catalog-api.e2e.spec.ts`

```typescript
describe('Service Catalog API (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    app = await createTestingApp();
    authToken = await getAuthToken('admin@test.com');
  });

  it('POST /services should create service', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/service-catalog/services')
      .set('Authorization', `Bearer ${authToken}`)
      .send(mockServiceData)
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.service_code).toBe(mockServiceData.service_code);
  });

  it('GET /services/search should return results', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/service-catalog/services/search')
      .query({ q: 'blood test' })
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.data.results).toBeInstanceOf(Array);
    expect(response.body.data.results.length).toBeGreaterThan(0);
  });

  it('should handle concurrent service creation', async () => {
    const promises = Array(10).fill(null).map((_, i) =>
      request(app.getHttpServer())
        .post('/api/v1/service-catalog/services')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ...mockServiceData, service_code: `TEST-${i}` })
    );

    const results = await Promise.all(promises);
    expect(results.every(r => r.status === 201)).toBe(true);
  });
});
```

### 2.2 Database Integration Tests

```typescript
describe('Service Price History', () => {
  it('should maintain price history on update', async () => {
    const service = await createTestService({ base_price: 1000 });
    
    // Update price
    await service.update({ base_price: 1200 });
    
    // Check history
    const history = await PriceHistory.find({ service_id: service.id });
    expect(history.length).toBe(1);
    expect(history[0].old_price).toBe(1000);
    expect(history[0].new_price).toBe(1200);
    expect(history[0].change_percent).toBe(20);
  });
});
```

## 3. Performance Testing

### 3.1 Load Testing

**Tool:** Artillery or K6

```yaml
# artillery-load-test.yml
config:
  target: "https://api.zypocare.com"
  phases:
    - duration: 60
      arrivalRate: 50  # 50 requests/sec
      name: "Warm up"
    - duration: 300
      arrivalRate: 100  # 100 requests/sec
      name: "Sustained load"
    - duration: 60
      arrivalRate: 200  # 200 requests/sec
      name: "Peak load"

scenarios:
  - name: "Service Search"
    weight: 60
    flow:
      - get:
          url: "/api/v1/service-catalog/services/search?q=blood"
          expect:
            - statusCode: 200
            - contentType: json
            - hasProperty: data.results

  - name: "Calculate Pricing"
    weight: 30
    flow:
      - get:
          url: "/api/v1/financial/pricing/calculate?service_id={{ service_id }}&payer_id={{ payer_id }}"
          expect:
            - statusCode: 200
            - maxResponseTime: 200  # Must respond within 200ms

  - name: "Create Service"
    weight: 10
    flow:
      - post:
          url: "/api/v1/service-catalog/services"
          json:
            service_code: "TEST-{{ $randomString() }}"
            service_name: "Test Service"
            base_price: 100
```

**Performance Targets:**
- Service search: p95 < 100ms, p99 < 200ms
- Pricing calculation: p95 < 150ms, p99 < 300ms
- Service creation: p95 < 500ms
- Bulk import: 1000 services in < 60 seconds
- Concurrent users: Support 500+ simultaneous users

### 3.2 Cache Performance Testing

```typescript
describe('Cache Performance', () => {
  it('should serve from cache after first request', async () => {
    // First request (cache miss)
    const start1 = Date.now();
    await service.searchServices('blood test');
    const duration1 = Date.now() - start1;

    // Second request (cache hit)
    const start2 = Date.now();
    await service.searchServices('blood test');
    const duration2 = Date.now() - start2;

    expect(duration2).toBeLessThan(duration1 / 10); // Cache should be 10x faster
  });
});
```

## 4. Security Testing

### 4.1 Authorization Tests

```typescript
describe('Authorization', () => {
  it('should deny access without valid token', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/service-catalog/services')
      .expect(401);
  });

  it('should deny service creation without proper role', async () => {
    const token = await getAuthToken('frontdesk@test.com'); // No create permission
    await request(app.getHttpServer())
      .post('/api/v1/service-catalog/services')
      .set('Authorization', `Bearer ${token}`)
      .send(mockServiceData)
      .expect(403);
  });
});
```

### 4.2 Input Validation Tests

```typescript
describe('Input Validation', () => {
  it('should sanitize SQL injection attempts', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/service-catalog/services/search')
      .query({ q: "'; DROP TABLE service_master; --" })
      .expect(200);
    // Should return empty results, not execute SQL
  });

  it('should reject XSS in service names', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/service-catalog/services')
      .send({
        ...mockServiceData,
        service_name: '<script>alert("XSS")</script>'
      })
      .expect(400);
  });
});
```

---

# Deployment & Migration

## 1. Database Migration Scripts

### 1.1 Initial Schema Creation

```sql
-- migration_001_service_catalog_schema.sql

-- Create service master table
CREATE TABLE service_master (
    -- Schema as defined in Data Models section
);

-- Create indexes
CREATE INDEX idx_service_name ON service_master(service_name);
CREATE INDEX idx_service_code ON service_master(service_code);
CREATE INDEX idx_service_type ON service_master(service_type);
CREATE INDEX idx_service_status ON service_master(status);
CREATE INDEX idx_service_search ON service_master USING gin(search_aliases);

-- Create audit triggers
CREATE TRIGGER audit_service_changes
    AFTER INSERT OR UPDATE OR DELETE ON service_master
    FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- Create price history trigger
CREATE TRIGGER track_price_changes
    AFTER UPDATE OF base_price ON service_master
    FOR EACH ROW EXECUTE FUNCTION create_price_history_entry();
```

### 1.2 Data Seeding

```sql
-- migration_002_seed_tax_codes.sql

INSERT INTO tax_code (organization_id, tax_code, description, tax_rate, hsn_sac_code, status) VALUES
('{org_id}', 'GST_EXEMPT', 'Healthcare Services Exemption', 0.00, '9993', 'ACTIVE'),
('{org_id}', 'GST_5', 'Reduced Rate GST', 5.00, '9993', 'ACTIVE'),
('{org_id}', 'GST_12', 'Standard Rate (Lower)', 12.00, '9993', 'ACTIVE'),
('{org_id}', 'GST_18', 'Standard Rate', 18.00, '9993', 'ACTIVE'),
('{org_id}', 'GST_28', 'Higher Rate', 28.00, '9993', 'ACTIVE');
```

## 2. Deployment Checklist

### 2.1 Pre-Deployment

- [ ] Database backup taken
- [ ] Migration scripts tested in staging
- [ ] Redis cache configured and tested
- [ ] Elasticsearch indices created
- [ ] API rate limiting configured
- [ ] Monitoring and alerting set up
- [ ] Load balancer configured
- [ ] SSL certificates installed
- [ ] Environment variables configured
- [ ] Rollback plan documented

### 2.2 Deployment Steps

1. **Database Migration**
   ```bash
   npm run migration:run
   ```

2. **Seed Master Data**
   ```bash
   npm run seed:master-data
   ```

3. **Build Application**
   ```bash
   npm run build
   ```

4. **Deploy Backend**
   ```bash
   pm2 start dist/main.js --name zypocare-api --instances 4
   ```

5. **Verify Health**
   ```bash
   curl https://api.zypocare.com/health
   ```

6. **Warm Up Cache**
   ```bash
   npm run cache:warmup
   ```

### 2.3 Post-Deployment

- [ ] Smoke tests passed
- [ ] API response times within SLA
- [ ] Cache hit rate >80%
- [ ] No errors in logs
- [ ] Database connections stable
- [ ] Memory usage normal
- [ ] CPU usage acceptable
- [ ] Create deployment report

## 3. Data Migration (Existing Hospitals)

### 3.1 Service Catalog Migration

```typescript
// migrate-services.ts
async function migrateExistingServices() {
  const oldServices = await fetchFromLegacySystem();
  
  for (const oldService of oldServices) {
    try {
      const mappedService = {
        service_code: oldService.code || generateCode(),
        service_name: oldService.name,
        service_type: mapServiceType(oldService.type),
        category_id: await findOrCreateCategory(oldService.category),
        base_price: oldService.price,
        tax_code_id: await getTaxCode(oldService),
        status: oldService.active ? 'ACTIVE' : 'INACTIVE'
      };
      
      await createService(mappedService);
      console.log(`Migrated: ${mappedService.service_code}`);
    } catch (error) {
      console.error(`Failed to migrate ${oldService.name}:`, error);
      // Log to migration errors table
    }
  }
}
```

### 3.2 Pricing Migration

```typescript
// migrate-pricing.ts
async function migratePricingData() {
  // 1. Migrate payer master
  const oldPayers = await fetchLegacyPayers();
  const payerMapping = new Map();
  
  for (const oldPayer of oldPayers) {
    const newPayer = await createPayer(mapPayerData(oldPayer));
    payerMapping.set(oldPayer.id, newPayer.id);
  }
  
  // 2. Migrate payer contracts
  const oldContracts = await fetchLegacyContracts();
  
  for (const oldContract of oldContracts) {
    const newPayerId = payerMapping.get(oldContract.payer_id);
    await createPayerContract({
      payer_id: newPayerId,
      ...mapContractData(oldContract)
    });
  }
  
  // 3. Migrate service rates
  const oldRates = await fetchLegacyRates();
  
  for (const oldRate of oldRates) {
    await createContractRate({
      contract_id: getNewContractId(oldRate.contract_id),
      service_id: getNewServiceId(oldRate.service_id),
      ...mapRateData(oldRate)
    });
  }
}
```

---

# Conclusion

This comprehensive development specification provides everything needed to build world-class Service Catalog and Financial Configuration modules for ZypoCare One HIMS.

## Key Success Factors

1. **User-Centric Design**: Every workflow designed with end-user efficiency in mind
2. **Indian Healthcare Focus**: GST compliance, government schemes, payer ecosystem
3. **AI Integration**: Intelligent search, pricing recommendations, duplication detection
4. **Performance**: Sub-100ms search, efficient caching, optimized queries
5. **Data Integrity**: Strong validations, audit trails, transaction safety
6. **Scalability**: Support for 10,000+ services, 50+ payer contracts
7. **Compliance**: NABH, ABDM, PMJAY, CGHS ready
8. **Flexibility**: Configurable packages, multi-tier pricing, dynamic rules

## Next Steps

1. **Development**: Follow user stories in sprint-by-sprint manner
2. **Testing**: Implement comprehensive test coverage (>80%)
3. **Integration**: Connect with billing, clinical, claims modules
4. **Training**: Prepare user documentation and training materials
5. **Go-Live**: Pilot with 2-3 hospitals, gather feedback, refine

---

**Document Prepared By:** AI Development Assistant  
**For:** ZypoCare One Development Team  
**Date:** February 8, 2026

**"Building India's Best HIMS - One Module at a Time"**

