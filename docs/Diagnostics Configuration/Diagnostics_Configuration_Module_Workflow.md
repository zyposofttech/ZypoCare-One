****ZYPOCARE ONE****

Hospital Information Management System

****DIAGNOSTICS CONFIGURATION MODULE****

Complete Workflow Design, User Stories & Implementation Blueprint

Module: 3.10 Diagnostics Configuration (Infrastructure Phase 0B)

Document Type: Product Workflow & User Story Specification

Version: 1.0 | Date: February 15, 2026

Author: Senior Product Manager

Classification: Internal — Engineering & Product

*CONFIDENTIAL — ZypoCare Healthtech Pvt. Ltd.*

# **1. Executive Summary**

The Diagnostics Configuration Module is the backbone of ZypoCare One's clinical testing infrastructure. It is a Phase 0B, P0-priority infrastructure module that MUST be fully configured before the hospital goes live. This module covers the complete setup of laboratory tests, imaging services, cardiac diagnostics, neurological diagnostics, and pulmonary diagnostics — including test parameters, reference ranges, LOINC/SNOMED mapping, sample requirements, report templates, and service point configuration.

This document provides the complete workflow design, user stories, acceptance criteria, and implementation blueprint for the engineering team to build this module end-to-end. It covers both the infrastructure setup phase (configuring diagnostics) and the operational readiness phase (ensuring the operations team can use it seamlessly from day one).

## **1.1 Module Scope**

| **Dimension** | **Scope** |
| --- | --- |
| Module ID | **INFRA-DIAG-3.10** |
| Phase | Phase 0B — Clinical Infrastructure |
| Priority | P0 — Non-Negotiable Foundation |
| Dependency | Requires: Organization, Location, Departments, Service Catalog, Equipment Register |
| Downstream Consumers | LIS (Lab Module), Radiology, CPOE, Billing, EMR, ABDM, NABH Compliance |
| Template Driven | Yes — Pre-seeded for Small (200), Medium (1000), Large (3000) test catalogs |
| AI Copilot | Smart defaults, LOINC auto-mapping, gap detection, reference range suggestions |
| Compliance | LOINC coding, NABL standards, NABH Chapter 7, ABDM DiagnosticReport FHIR R4 |
| Offline Support | Full read, configuration edits sync when online |

## **1.2 Key Success Metrics**

| **Metric** | **Target** | **Measurement** | **Industry Avg** |
| --- | --- | --- | --- |
| Time to configure diagnostics (template) | < 2 hours | Setup wizard timer | 2–4 days |
| Time to configure diagnostics (manual) | < 8 hours | Setup wizard timer | 1–2 weeks |
| Test catalog completeness at go-live | > 95% | Go-Live Validator | ~70% |
| LOINC mapping coverage | > 90% | Auto + manual mapping | < 30% |
| Reference range accuracy | 100% | Peer-reviewed sources | Varies |
| Bulk import speed (1000 tests) | < 30 seconds | Performance test | Minutes |
| AI auto-suggestion accuracy | > 85% | Admin feedback | **N/A** |
| Go-Live validation pass (Diagnostics) | > 90% first attempt | Validator score | ~50% |

# **2. Module Architecture & Data Model**

## **2.1 Module Structure**

The Diagnostics Configuration module is organized into four sub-modules that work together to form the complete diagnostic infrastructure:

| **Sub-Module** | **Purpose** | **Key Entities** | **Owner** |
| --- | --- | --- | --- |
| Sections | Organize diagnostic departments and sub-departments | DiagnosticSection, DiagnosticSubSection | Lab Head / Admin |
| Items | Define every test/investigation the hospital offers | DiagnosticItem, DiagnosticPanel, SampleRequirement | Lab Head / Pathologist |
| Parameters | Define measurable parameters with reference ranges | DiagnosticParameter, ReferenceRange, CriticalRange | Pathologist / Specialist |
| Service Points | Define physical locations where diagnostics are performed | ServicePoint, EquipmentLink, StaffAssignment | Admin / Ops Manager |

## **2.2 Entity Relationship Overview**

The following describes the complete data model relationships:

| **Entity** | **Key Attributes** | **Relationships** |
| --- | --- | --- |
| DiagnosticSection | ID, Name, Code, Type (LAB/IMAGING/CARDIO/NEURO/PULMO), Status, SortOrder, BranchID | Has many SubSections, Has many DiagnosticItems |
| DiagnosticSubSection | ID, SectionID, Name, Code, Status | Belongs to Section, Has many Items |
| DiagnosticItem (Test) | ID, SubSectionID, InternalCode, DisplayName, SearchAliases, LOINC, SNOMED, CareContext, TAT_Routine, TAT_Stat, IsPanel, RequiresConsent, RequiresScheduling, ReportTemplateID, Status | Belongs to SubSection, Has many Parameters, Has SampleRequirement, Linked to ServicePoints, Linked to ServiceCatalog |
| DiagnosticPanel | ID, PanelItemID, MemberItemIDs[], PanelType (PROFILE/PACKAGE) | Links parent Item to child Items |
| SampleRequirement | ID, ItemID, SampleType, ContainerType, Volume, CollectionInstructions, FastingRequired, SpecialHandling | Belongs to Item |
| DiagnosticParameter | ID, ItemID, Name, Code, DataType (NUMERIC/TEXT/CHOICE/FORMULA), Unit, Precision, DisplayOrder, IsDerived, Formula | Belongs to Item, Has many ReferenceRanges |
| ReferenceRange | ID, ParameterID, GenderApplicability, AgeMinDays, AgeMaxDays, NormalLow, NormalHigh, CriticalLow, CriticalHigh, InterpretationNotes, Source | Belongs to Parameter |
| ServicePoint | ID, Name, LocationID, Type (COLLECTION/PROCESSING/REPORTING), SectionsServed[], EquipmentIDs[], StaffIDs[], OperatingHours, Status | Linked to Location, Equipment, Staff, Sections |
| ReportTemplate | ID, Name, SectionID, HeaderConfig, FooterConfig, ParameterLayout, SignatoryRoles[], Format | Used by DiagnosticItems |

## **2.3 Integration Points**

| **Integrates With** | **Direction** | **Purpose** |
| --- | --- | --- |
| Service Catalog (3.7) | Bidirectional | Every DiagnosticItem must have a corresponding ServiceCatalog entry for ordering and billing |
| Charge Master / Tariffs (3.13) | Downstream | Pricing, payer-specific rates, GST applicability for each test |
| Equipment Register (3.12) | Upstream | Links lab analyzers and imaging machines to service points and tests |
| Location Hierarchy (3.3) | Upstream | Maps service points (collection centers, labs) to physical locations |
| Staff Management (3.6) | Upstream | Assigns pathologists, radiologists, technicians to service points and as report signatories |
| **ABDM / FHIR (3.14)** | Downstream | DiagnosticReport FHIR R4 resource generation with LOINC/SNOMED codes |
| NABH Compliance (3.14.3) | Downstream | Chapter 7 (Management of Diagnostic Services) compliance validation |
| LIS Module (4.8) | Downstream Consumer | Uses configured tests, parameters, ranges for operational lab workflow |
| **EMR / CPOE (4.2)** | Downstream Consumer | Test ordering, result display, abnormal flagging based on configured ranges |
| Billing Module (4.10) | Downstream Consumer | Auto-billing of ordered diagnostics using configured tariffs |
| Setup Wizard (3.16) | Orchestrator | Diagnostics is Step 7 in the guided setup flow |
| Templates (3.16.2) | Data Source | Pre-seeded test catalogs by hospital size |

# **3. Complete Workflow Design**

This section details every workflow in the Diagnostics Configuration module, organized into two phases: Infrastructure Setup (Phase 0 — before go-live) and Operational Readiness (post-setup, ongoing configuration by operations team).

## **3.1 Workflow 1: Diagnostic Section & Sub-Section Setup**

**Trigger: **Admin initiates diagnostics configuration from Setup Wizard (Step 7) or from Diagnostics Config menu.

****FLOW:****

| **Step** | **Actor** | **Action** | **System Response** |
| --- | --- | --- | --- |
| 1 | System | If template selected, pre-load sections (Lab: 8 sub-sections, Imaging: 7, Cardiology: 5, Neuro: 3, Pulmo: 2) | Display pre-populated section tree with toggle on/off for each |
| 2 | Admin | Review pre-loaded sections, enable/disable based on hospital capabilities | Update section status; gray-out disabled sections |
| 3 | Admin | Add custom sub-sections if needed (e.g., Molecular Diagnostics under Lab) | Validate uniqueness of code, assign sort order |
| 4 | AI Copilot | Analyze enabled departments and suggest missing sections | Show recommendation: 'You have Cardiology dept but no Cardiology Diagnostics section enabled' |
| 5 | Admin | Assign section head (Pathologist for Lab, Radiologist for Imaging, etc.) | Validate staff has appropriate credentials and privileges |
| 6 | System | Auto-create corresponding ServiceCatalog categories for each enabled section | Sync section hierarchy to Service Catalog |
| 7 | Admin | Confirm and save section configuration | Mark 'Diagnostic Sections' step as complete in Setup Wizard |

**Validation Rules: **At least one Lab section OR one Imaging section must be enabled. Section code must be unique within branch. Section head must be a staff member with appropriate specialty.

## **3.2 Workflow 2: Diagnostic Item (Test) Configuration**

**Trigger: **Admin/Lab Head configures individual tests after sections are set up.

****FLOW:****

| **Step** | **Actor** | **Action** | **System Response** |
| --- | --- | --- | --- |
| 1 | System | If template selected, pre-load test catalog (Small: ~200, Medium: ~1000, Large: ~3000 tests) | Display test list organized by section/sub-section |
| 2 | Admin | Choose entry mode: (a) Review template tests, (b) Add individual test, (c) Bulk import via Excel | Show appropriate interface for selected mode |
| 3a | Admin | Template Review: Enable/disable individual tests, modify display names/aliases | Update test status; show count of active tests per section |
| 3b | Admin | Individual Add: Fill test form — Name, Code, Section, Sub-section, Care Context (OPD/IPD/ER) | Validate required fields, check code uniqueness |
| 3c | Admin | Bulk Import: Upload Excel with test data in prescribed format | Parse, validate, show preview with errors highlighted (< 30 sec for 1000 tests) |
| 4 | AI Copilot | Auto-suggest LOINC code for each test based on test name and parameters | Show suggested LOINC with confidence score; admin confirms or overrides |
| 5 | AI Copilot | Auto-suggest SNOMED code for the test | Show suggested SNOMED with mapping confidence |
| 6 | Admin | Configure TAT: Routine (e.g., 4 hours) and Stat/Urgent (e.g., 1 hour) for each test | Validate TAT values are within reasonable ranges |
| 7 | Admin | Mark special flags: Requires Consent, Requires Scheduling, Requires Fasting, PCPNDT applicable | Enable/disable dependent workflows based on flags |
| 8 | System | Auto-create ServiceCatalog entry for each enabled test with LOINC/SNOMED codes | Sync to Service Catalog with default pricing from template |
| 9 | Admin | Review and confirm test configuration batch | Save tests; update Setup Wizard progress bar |

**Business Rules: **Every test must belong to exactly one sub-section. Tests marked PCPNDT must have Form-F workflow enabled. Imaging tests must be linked to at least one equipment from Equipment Register. Panel tests must have at least 2 member tests.

## **3.3 Workflow 3: Test Panel / Profile Configuration**

**Trigger: **Lab Head creates composite tests (profiles like LFT, RFT, Thyroid Panel) or packages (Health Checkup packages).

| **Step** | **Actor** | **Action** | **System Response** |
| --- | --- | --- | --- |
| 1 | Lab Head | Select 'Create Panel/Profile' from test configuration | Show panel creation form |
| 2 | Lab Head | Enter panel name (e.g., 'Liver Function Test'), select type: PROFILE or PACKAGE | Validate name uniqueness |
| 3 | Lab Head | Search and add member tests (e.g., Bilirubin Total, Bilirubin Direct, SGPT, SGOT, ALP, Albumin, Total Protein) | Show searchable list; validate all members belong to same or related sections |
| 4 | System | Calculate consolidated sample requirement (e.g., 1 tube covers all member tests) | Show sample consolidation summary |
| 5 | AI Copilot | Suggest missing tests commonly included in this panel based on clinical standards | Show: 'GGT is commonly included in LFT panels. Add it?' |
| 6 | Lab Head | Configure panel-level TAT (usually = longest member TAT) | Auto-suggest TAT based on member tests; allow override |
| 7 | Lab Head | Set panel pricing (can be different from sum of individual test prices) | Show individual vs panel price comparison |
| 8 | System | Create ServiceCatalog entry for the panel; link to billing | Panel appears in orderable test list |

## **3.4 Workflow 4: Parameter & Reference Range Configuration**

**Trigger: **Pathologist/Specialist configures measurable parameters for each test and defines reference ranges. This is the most clinically critical workflow.

****FLOW:****

| **Step** | **Actor** | **Action** | **System Response** |
| --- | --- | --- | --- |
| 1 | System | If template, pre-load parameters and reference ranges from master database | Display parameter list per test with pre-filled ranges |
| 2 | Pathologist | Review/edit parameter: Name, Code, Data Type (Numeric/Text/Choice/Formula), Unit, Precision (decimal places) | Validate data type constraints |
| 3 | Pathologist | For NUMERIC parameters: Set Unit (mg/dL, mmol/L, etc.) and display precision | Show unit conversion helper if applicable |
| 4 | Pathologist | Configure Reference Ranges by demographic group: | Show range configuration matrix |
|  |  | a) Default range (all ages, all genders) |  |
|  |  | b) Gender-specific ranges (Male / Female / Other) |  |
|  |  | c) Age-specific ranges using age-in-days for precision: |  |
|  |  | - Neonatal (0–28 days) |  |
|  |  | - Infant (29–365 days) |  |
|  |  | - Pediatric (1–12 years = 366–4380 days) |  |
|  |  | - Adolescent (13–17 years) |  |
|  |  | - Adult (18–64 years) |  |
|  |  | - Geriatric (65+ years) |  |
| 5 | Pathologist | Set Critical Ranges (Panic Values): Critical Low and Critical High | System will use these for critical/panic alerts in LIS |
| 6 | Pathologist | Add interpretation notes for each range (e.g., 'Mildly elevated', 'Consistent with hepatic dysfunction') | Notes stored for auto-interpretation in reports |
| 7 | Pathologist | For FORMULA parameters: Define calculation (e.g., A/G Ratio = Albumin / (Total Protein - Albumin)) | Validate formula references valid parameter codes |
| 8 | Pathologist | For CHOICE parameters: Define choice list (e.g., Blood Group: A+, A-, B+, B-, O+, O-, AB+, AB-) | Validate no duplicates in choice list |
| 9 | AI Copilot | Validate reference ranges against peer-reviewed medical literature databases | Show warnings if ranges deviate significantly from standard references |
| 10 | Pathologist | Confirm parameter configuration | Save; flag test as 'Parameters Configured' |

**Critical Rules: **Normal range must not overlap with critical range. Critical Low must be < Normal Low. Critical High must be > Normal High. Age ranges must not have gaps or overlaps. At least a default reference range is mandatory for every numeric parameter. Precision (decimal places) must be consistent with clinical practice.

## **3.5 Workflow 5: Sample Requirement Configuration**

**Trigger: **Lab Head configures sample collection requirements for each laboratory test.

| **Step** | **Actor** | **Action** | **System Response** |
| --- | --- | --- | --- |
| 1 | Lab Head | Select test and open 'Sample Requirements' tab | Show sample configuration form |
| 2 | Lab Head | Select Sample Type: Blood (Serum/Plasma/Whole Blood), Urine (Random/24hr/Midstream), CSF, Stool, Sputum, Swab, Tissue, Fluid (Pleural/Ascitic/Synovial) | Filter container options based on sample type |
| 3 | Lab Head | Select Container/Tube Type: Red top (Plain), Purple (EDTA), Blue (Citrate), Green (Heparin), Gray (Fluoride), Yellow (SST), Sterile container, Urine cup | Show tube color visual indicator |
| 4 | Lab Head | Specify minimum volume required (in mL) | Validate volume is clinically appropriate for sample type |
| 5 | Lab Head | Set collection instructions: Fasting required (hours), Time-specific collection, Special handling (ice, protect from light, transport within X mins) | Store as structured data for phlebotomy workflow |
| 6 | AI Copilot | For panels: Auto-calculate total sample volume needed and suggest tube consolidation | Show: 'LFT + RFT + Lipid Profile can share 1 Red-top tube (5 mL)' |
| 7 | Lab Head | Confirm sample configuration | Mark test sample requirements as configured |

## **3.6 Workflow 6: Service Point Configuration**

**Trigger: **Admin/Ops Manager configures the physical locations where diagnostic services are provided.

| **Step** | **Actor** | **Action** | **System Response** |
| --- | --- | --- | --- |
| 1 | Admin | Create service point: Name, Type (COLLECTION_CENTER, PROCESSING_LAB, IMAGING_CENTER, REPORTING_STATION) | Show creation form with type-specific fields |
| 2 | Admin | Link to Location Hierarchy (e.g., Building A, Floor 2, Zone: Laboratory) | Validate location exists and is appropriate zone type |
| 3 | Admin | Assign diagnostic sections served by this point (e.g., Biochemistry, Hematology) | Link sections to service point |
| 4 | Admin | Link Equipment from Equipment Register (e.g., Beckman AU5800 Analyzer, Siemens CT Scanner) | Validate equipment category matches service point type |
| 5 | Admin | Assign staff: Lab Technicians, Pathologists, Radiologists, Radiographers | Validate staff credentials (DMLT/BMLT for tech, MD Pathology for pathologist) |
| 6 | Admin | Set operating hours and availability (24x7 for Emergency Lab, 8am-8pm for OP Lab) | Store schedule; used for TAT calculations and slot availability |
| 7 | Admin | Configure capacity: Max samples/hour (for labs), Max slots/day (for imaging) | Used for scheduling and load balancing |
| 8 | System | Validate: Each enabled section has at least one service point with equipment and staff | Show warnings for uncovered sections |

## **3.7 Workflow 7: Report Template Configuration**

**Trigger: **Lab Head/Admin configures how diagnostic reports will look when printed or shared.

| **Step** | **Actor** | **Action** | **System Response** |
| --- | --- | --- | --- |
| 1 | Admin | Select section and choose 'Configure Report Template' | Show template builder with WYSIWYG preview |
| 2 | Admin | Configure Header: Hospital logo, name, address, NABL accreditation number, lab registration number | Show header preview |
| 3 | Admin | Configure parameter layout: Table format, grouping by sub-section, units column, reference range column, flag column (H/L/C) | Show parameter table preview with sample data |
| 4 | Admin | Configure Footer: Signatory roles (Technician, Pathologist, HOD), digital signature placeholders, disclaimer text | Show footer preview with signature blocks |
| 5 | Admin | Set report format options: Include interpretation notes, include historical trend (last 3 values), include methodology | Toggle options on/off |
| 6 | Admin | For Imaging: Configure findings template, impression template, image attachment area | Show radiology report layout |
| 7 | Admin | Save template and assign to relevant tests/sections | Template available for use in LIS |

## **3.8 Workflow 8: Bulk Import & Template Seeding**

**Trigger: **Admin uses bulk import to load large numbers of tests, or system seeds data from pre-built templates.

| **Step** | **Actor** | **Action** | **System Response** |
| --- | --- | --- | --- |
| 1 | Admin | Select 'Bulk Import' and download Excel template | Generate .xlsx with columns: Section, SubSection, TestCode, TestName, LOINC, SampleType, Container, TAT_Routine, TAT_Stat, Parameters (JSON), ReferenceRanges (JSON) |
| 2 | Admin | Fill Excel with test data (or use pre-filled template for hospital size) | N/A (offline activity) |
| 3 | Admin | Upload filled Excel file | Parse and validate within 30 seconds for 1000 rows |
| 4 | System | Show validation report: Passed rows (green), Warning rows (yellow), Failed rows (red) | Display importable count and error details |
| 5 | AI Copilot | Auto-fill missing LOINC codes and suggest reference ranges for rows with partial data | Show AI-filled fields highlighted in blue |
| 6 | Admin | Review, fix errors in-app or re-upload corrected Excel | Re-validate fixed rows |
| 7 | Admin | Confirm import | Import all valid rows; create ServiceCatalog entries; update progress |
| 8 | System | Generate import summary: X tests imported, Y panels created, Z errors skipped | Log import activity for audit trail |

## **3.9 Workflow 9: Go-Live Validation for Diagnostics**

**Trigger: **Admin runs Go-Live Validator which includes 15+ diagnostic-specific checks.

****DIAGNOSTICS VALIDATION CHECKLIST:****

| **#** | **Validation Check** | **Severity** | **Auto-Fixable?** |
| --- | --- | --- | --- |
| 1 | At least one diagnostic section is enabled and has active tests | **BLOCKER** | No |
| 2 | All active tests have at least one parameter configured | **BLOCKER** | No |
| 3 | All numeric parameters have at least a default reference range | **BLOCKER** | No |
| 4 | Critical ranges do not overlap with normal ranges | **BLOCKER** | No |
| 5 | All lab tests have sample requirements configured | **BLOCKER** | No |
| 6 | All enabled sections have at least one service point | **BLOCKER** | No |
| 7 | All service points have at least one staff member assigned | **WARNING** | No |
| 8 | All service points have equipment linked (for processing labs) | **WARNING** | No |
| 9 | LOINC mapping coverage > 80% of active tests | **WARNING** | AI Auto-fill |
| 10 | All imaging tests linked to equipment with valid AERB license | **BLOCKER** | No |
| 11 | All ultrasound tests have PCPNDT compliance flag set | **BLOCKER** | AI Auto-detect |
| 12 | Report templates configured for each active section | **WARNING** | Default template |
| 13 | Diagnostic tests have ServiceCatalog entries with pricing | **BLOCKER** | No |
| 14 | TAT configured for all active tests (Routine + Stat) | **WARNING** | Default values |
| 15 | No age-range gaps in reference ranges for pediatric-relevant tests | **WARNING** | No |
| 16 | Signatory roles configured for report templates | **WARNING** | No |

## **3.10 Workflow 10: Operational Day-2 Configuration (Post Go-Live)**

After go-live, the operations team will need to perform ongoing configuration changes. The module must support these without system downtime.

| **Operational Scenario** | **Workflow** | **Access Control** |
| --- | --- | --- |
| Add new test to catalog | Same as Workflow 2, single-test mode; auto-creates ServiceCatalog entry; effective immediately | Lab Head + Admin approval |
| Modify reference ranges | Edit parameter ranges; version-controlled with audit log; old ranges archived, not deleted | Pathologist only |
| Deactivate a test | Soft-delete: Mark as INACTIVE; hide from order list but retain historical data | Lab Head + Admin |
| Add new equipment | Link new analyzer to service point; map tests to equipment; configure interface (ASTM/HL7) | Admin + Biomedical Eng |
| Change TAT targets | Edit TAT for Routine/Stat; operational change, no clinical impact | Lab Head |
| Add new panel/profile | Same as Workflow 3; instant availability for ordering | Lab Head |
| Seasonal test addition | Rapid addition of outbreak-specific tests (e.g., Dengue NS1 during monsoon) | Lab Head (fast-track, admin approval within 24hr) |
| Update report template | Edit template; versioned; new reports use updated template, old reports retain original | Lab Head + Admin |
| Bulk price revision | Upload revised price Excel; system shows diff; admin approves; effective from date | Finance + Admin |
| Branch-level override | Override enterprise-wide config for specific branch (e.g., different ranges for high-altitude branch) | Branch Admin + Lab Head |

# **4. Complete User Stories & Acceptance Criteria**

All user stories are organized by Epics. Each story includes acceptance criteria, priority (P0/P1/P2), sprint target, and story points.

## **Epic 1: Diagnostic Section Management**

As a hospital admin, I need to organize my diagnostic services into sections and sub-sections so that tests are logically grouped and easy to find for clinical staff.

| ****ID**** | **User Story** | **Acceptance Criteria** | **Priority** | **Sprint** | **Points** |
| --- | --- | --- | --- | --- | --- |
| ****DS-001**** | As an admin, I can view all pre-loaded diagnostic sections when a hospital template is selected | *Given a Medium template is selected, when I open Diagnostics Config, then I see Lab (8 subs), Imaging (7), Cardiology (5), Neuro (3), Pulmo (2) pre-populated* | **P0** | Sprint 1 | 3 |
| ****DS-002**** | As an admin, I can enable or disable individual sections and sub-sections based on my hospital capabilities | *When I toggle off 'Molecular Diagnostics', then it is grayed out and its tests are hidden from all downstream modules* | **P0** | Sprint 1 | 3 |
| ****DS-003**** | As an admin, I can create a custom sub-section under any section | *When I add 'Point of Care Testing' under Lab, then system validates code uniqueness and assigns sort order* | **P0** | Sprint 1 | 2 |
| ****DS-004**** | As AI Copilot, I detect mismatches between enabled departments and diagnostic sections | *When Cardiology dept is active but Cardiology Diagnostics section is disabled, then AI shows a recommendation to enable it* | **P1** | Sprint 2 | 3 |
| ****DS-005**** | As an admin, I can assign a section head (qualified staff) to each diagnostic section | *Given I assign Dr. Sharma (MD Pathology) as Lab head, when I save, then system validates credentials and links the assignment* | **P0** | Sprint 1 | 2 |
| ****DS-006**** | As the system, I auto-create ServiceCatalog categories when diagnostic sections are enabled | *When admin enables 'Biochemistry', then a matching category appears in Service Catalog automatically* | **P0** | Sprint 1 | 3 |

## **Epic 2: Diagnostic Item (Test) Configuration**

As a lab head, I need to configure every diagnostic test my hospital offers with all clinical metadata so that the LIS, CPOE, and billing systems can function correctly.

| ****ID**** | **User Story** | **Acceptance Criteria** | **Priority** | **Sprint** | **Points** |
| --- | --- | --- | --- | --- | --- |
| ****DI-001**** | As an admin, I can review and customize pre-loaded tests from the hospital template | *Given 1000 tests pre-loaded, when I view the test list, then I can filter by section, search by name/code, and enable/disable individual tests* | **P0** | Sprint 2 | 5 |
| ****DI-002**** | As an admin, I can add a new diagnostic test manually with all required fields | *When I create 'HbA1c' with code, section, LOINC, care context, TAT, then system validates and saves* | **P0** | Sprint 2 | 5 |
| ****DI-003**** | As an admin, I can bulk import tests via Excel upload with validation | *When I upload 500 tests in Excel, then system validates in <30 sec, shows pass/warn/fail for each row, and lets me import valid rows* | **P0** | Sprint 2 | 8 |
| ****DI-004**** | As AI Copilot, I auto-suggest LOINC codes for each test based on name and parameters | *When admin adds 'Serum Creatinine', then AI suggests LOINC 2160-0 with 92% confidence; admin confirms or overrides* | **P1** | Sprint 3 | 5 |
| ****DI-005**** | As AI Copilot, I auto-suggest SNOMED codes for diagnostic tests | *When test 'Complete Blood Count' is created, then AI suggests SNOMED 26604007 with mapping confidence displayed* | **P1** | Sprint 3 | 5 |
| ****DI-006**** | As an admin, I can configure TAT (Routine and Stat) for each test | *When I set Routine=4hr and Stat=1hr for CBC, then these values are used by LIS for TAT tracking and escalation* | **P0** | Sprint 2 | 3 |
| ****DI-007**** | As an admin, I can mark tests with special flags: Requires Consent, Requires Scheduling, PCPNDT applicable | *When I mark USG Obstetric as PCPNDT, then system enables Form-F workflow for this test* | **P0** | Sprint 2 | 3 |
| ****DI-008**** | As the system, I auto-create ServiceCatalog entries for every enabled test | *When a test is saved, then a corresponding ServiceCatalog item exists with LOINC, SNOMED, and default price* | **P0** | Sprint 2 | 5 |
| ****DI-009**** | As an admin, I can configure search aliases for tests so clinical staff find them easily | *When I add alias 'LFT', 'Liver Panel' for 'Liver Function Test', then searching any alias returns this test in CPOE* | **P0** | Sprint 2 | 2 |
| ****DI-010**** | As an admin, I can soft-deactivate a test (hide from ordering but retain historical data) | *When I deactivate 'Widal Test', then it disappears from order list but past results remain accessible in EMR* | **P0** | Sprint 3 | 3 |

## **Epic 3: Test Panel & Profile Management**

As a lab head, I need to create composite tests (panels/profiles) so that clinicians can order commonly grouped tests with a single click.

| ****ID**** | **User Story** | **Acceptance Criteria** | **Priority** | **Sprint** | **Points** |
| --- | --- | --- | --- | --- | --- |
| ****DP-001**** | As a lab head, I can create a test panel by selecting member tests | *When I create 'LFT' panel with 7 member tests, then it appears as a single orderable item* | **P0** | Sprint 3 | 5 |
| ****DP-002**** | As the system, I calculate consolidated sample requirements for panels | *When LFT panel has 7 tests all needing Serum, then system shows '1 Red-top tube, 5 mL' instead of 7 separate requirements* | **P0** | Sprint 3 | 3 |
| ****DP-003**** | As AI Copilot, I suggest commonly missing member tests in panels | *When I create 'Thyroid Panel' with T3 and T4, then AI suggests 'TSH is commonly included. Add it?'* | **P1** | Sprint 4 | 3 |
| ****DP-004**** | As a lab head, I can set panel-level pricing different from sum of individual tests | *When LFT individual sum is 850 but panel price is 600, then billing uses 600 for panel orders* | **P0** | Sprint 3 | 3 |
| ****DP-005**** | As a lab head, I can create Health Checkup packages with tests from multiple sections | *When I create 'Executive Health Check' with CBC, LFT, RFT, Lipid, Thyroid, ECG, Chest X-Ray, then it works across Lab and Imaging sections* | **P1** | Sprint 4 | 5 |

## **Epic 4: Parameter & Reference Range Configuration**

As a pathologist, I need to define measurable parameters and clinically accurate reference ranges so that results are correctly interpreted and critical values trigger alerts.

| ****ID**** | **User Story** | **Acceptance Criteria** | **Priority** | **Sprint** | **Points** |
| --- | --- | --- | --- | --- | --- |
| ****PR-001**** | As a pathologist, I can configure NUMERIC parameters with unit, precision, and ranges | *When I configure Hemoglobin with unit g/dL, precision 1, range 12.0-16.0 (Female), 13.0-17.0 (Male), then ranges validate correctly* | **P0** | Sprint 3 | 5 |
| ****PR-002**** | As a pathologist, I can configure age-specific reference ranges using age-in-days | *When I set Bilirubin ranges: Neonatal (0-28 days): 1.0-12.0, Pediatric (29-4380 days): 0.2-1.0, Adult: 0.3-1.2, then age-specific range is used based on patient DOB* | **P0** | Sprint 3 | 8 |
| ****PR-003**** | As a pathologist, I can set Critical (Panic) values that trigger immediate alerts | *When I set Critical Low=7.0 and Critical High=20.0 for Hemoglobin, then any result outside this range triggers a critical alert in LIS* | **P0** | Sprint 3 | 5 |
| ****PR-004**** | As a pathologist, I can configure FORMULA parameters (calculated values) | *When I define 'A/G Ratio = Albumin / (Total Protein - Albumin)', then system auto-calculates this when both source parameters have results* | **P0** | Sprint 4 | 5 |
| ****PR-005**** | As a pathologist, I can configure CHOICE parameters (discrete values) | *When I define Blood Group choices (A+, A-, B+, B-, O+, O-, AB+, AB-), then tech can only select from this list during result entry* | **P0** | Sprint 3 | 3 |
| ****PR-006**** | As a pathologist, I can add interpretation notes to reference ranges | *When I add 'Mildly elevated — correlate with liver enzymes' for Bilirubin 1.2-3.0, then this note appears in reports when value falls in this range* | **P1** | Sprint 4 | 3 |
| ****PR-007**** | As AI Copilot, I validate reference ranges against medical literature | *When pathologist enters Serum Creatinine normal range as 5.0-10.0, then AI warns: 'Range significantly deviates from standard (0.7-1.3 mg/dL). Please verify.'* | **P1** | Sprint 4 | 5 |
| ****PR-008**** | As the system, I ensure age ranges have no gaps or overlaps for any parameter | *When neonatal range ends at 28 days and pediatric starts at 30 days, then system shows error: 'Gap detected: Day 29 has no reference range'* | **P0** | Sprint 3 | 5 |
| ****PR-009**** | As a pathologist, I can view and edit pre-loaded reference ranges from the hospital template | *Given template loaded ranges for 200 tests, when I open any test's parameters, then I see pre-filled ranges that I can review and customize* | **P0** | Sprint 3 | 3 |
| ****PR-010**** | As the system, I maintain version history of all reference range changes with audit trail | *When pathologist changes Glucose fasting range from 70-100 to 70-110, then old range is archived with timestamp, user, and reason for change* | **P0** | Sprint 4 | 5 |

## **Epic 5: Sample Requirement Configuration**

As a lab head, I need to define exact sample collection requirements for every lab test so that phlebotomists collect the right samples in the right tubes.

| ****ID**** | **User Story** | **Acceptance Criteria** | **Priority** | **Sprint** | **Points** |
| --- | --- | --- | --- | --- | --- |
| ****SR-001**** | As a lab head, I can configure sample type, container, and volume for each test | *When I set CBC to need 3 mL EDTA (Purple top), then this info shows on collection labels and phlebotomy worklist* | **P0** | Sprint 3 | 5 |
| ****SR-002**** | As a lab head, I can set fasting requirements and special handling instructions | *When I mark Glucose Fasting as 'Fasting: 8-12 hours', then appointment system and patient instructions include this* | **P0** | Sprint 3 | 3 |
| ****SR-003**** | As AI Copilot, I suggest tube consolidation for panels to minimize patient draws | *When LFT+RFT+Lipid ordered together, AI shows: 'All 3 can use 1 Red-top (SST) tube, 7 mL total'* | **P1** | Sprint 4 | 5 |
| ****SR-004**** | As a lab head, I can configure special handling: transport on ice, protect from light, centrifuge within X minutes | *When I set 'ABG: transport on ice, analyze within 15 min', then collection workflow shows handling alerts* | **P0** | Sprint 4 | 3 |

## **Epic 6: Service Point Configuration**

As an operations manager, I need to configure the physical locations where diagnostic services are provided so that samples are routed correctly and staff is assigned.

| ****ID**** | **User Story** | **Acceptance Criteria** | **Priority** | **Sprint** | **Points** |
| --- | --- | --- | --- | --- | --- |
| ****SP-001**** | As an admin, I can create service points of different types: Collection Center, Processing Lab, Imaging Center, Reporting Station | *When I create 'Main Lab - Biochemistry' as Processing Lab, then I can link equipment, staff, and sections* | **P0** | Sprint 4 | 5 |
| ****SP-002**** | As an admin, I can link service points to Location Hierarchy | *When I assign 'Sample Collection - OPD' to Building A, Ground Floor, OPD Zone, then it appears on the hospital map* | **P0** | Sprint 4 | 3 |
| ****SP-003**** | As an admin, I can assign equipment from Equipment Register to service points | *When I link 'Beckman AU5800' to Main Lab, then tests processable on this analyzer are mapped to this service point* | **P0** | Sprint 4 | 5 |
| ****SP-004**** | As an admin, I can assign staff (technicians, pathologists) to service points | *When I assign 2 lab techs and 1 pathologist to Main Lab, then system validates their credentials (DMLT/BMLT, MD Path)* | **P0** | Sprint 4 | 3 |
| ****SP-005**** | As an admin, I can set operating hours and capacity for each service point | *When I set Main Lab hours as 8AM-8PM, capacity 200 samples/day, then scheduling and TAT calculations use these constraints* | **P0** | Sprint 4 | 3 |
| ****SP-006**** | As the system, I validate that every enabled section has at least one fully configured service point | *When Microbiology section has no service point, then Go-Live Validator flags: BLOCKER - 'No service point for Microbiology'* | **P0** | Sprint 5 | 5 |

## **Epic 7: Report Template Configuration**

As a lab head, I need to configure how diagnostic reports will look so that reports are professional, compliant, and contain all necessary clinical information.

| ****ID**** | **User Story** | **Acceptance Criteria** | **Priority** | **Sprint** | **Points** |
| --- | --- | --- | --- | --- | --- |
| ****RT-001**** | As an admin, I can configure report header with hospital logo, name, accreditation details | *When I upload logo and enter NABL number, then all lab reports show this header* | **P0** | Sprint 5 | 5 |
| ****RT-002**** | As a lab head, I can configure parameter table layout: grouping, units, reference ranges, flags | *When I set LFT to group parameters by category with H/L/C flags, then report shows structured table* | **P0** | Sprint 5 | 5 |
| ****RT-003**** | As an admin, I can configure signatory roles and digital signature placeholders | *When I set 'Lab Technician' and 'Consultant Pathologist' as signatories, then report footer shows both signature blocks* | **P0** | Sprint 5 | 3 |
| ****RT-004**** | As a lab head, I can configure radiology report templates with findings, impression, and image sections | *When radiologist enters findings for X-Ray, the report renders with structured sections and image attachment area* | **P0** | Sprint 5 | 5 |
| ****RT-005**** | As a lab head, I can enable optional sections: interpretation notes, historical trend, methodology | *When 'Historical Trend' is enabled, report shows last 3 values for each parameter as a mini-chart* | **P1** | Sprint 6 | 5 |

## **Epic 8: Bulk Operations & Template Seeding**

As an admin, I need bulk import and template seeding capabilities so that I can configure hundreds of tests in minutes instead of hours.

| ****ID**** | **User Story** | **Acceptance Criteria** | **Priority** | **Sprint** | **Points** |
| --- | --- | --- | --- | --- | --- |
| ****BO-001**** | As an admin, I can download a structured Excel template for bulk test import | *When I click 'Download Template', then I get .xlsx with all required columns, validation rules, and sample data rows* | **P0** | Sprint 2 | 3 |
| ****BO-002**** | As an admin, I can upload filled Excel and see validation results within 30 seconds | *When I upload 1000-row Excel, then within 30 sec I see: 950 passed, 30 warnings, 20 errors with details* | **P0** | Sprint 2 | 8 |
| ****BO-003**** | As AI Copilot, I auto-fill missing LOINC codes and reference ranges during import | *When Excel has test name but no LOINC, then AI fills LOINC with confidence score; admin reviews before import* | **P1** | Sprint 3 | 5 |
| ****BO-004**** | As an admin, I can select a hospital size template and get pre-seeded diagnostic data | *When I select 'Medium Hospital', then 1000 tests across all sections are pre-loaded with parameters, ranges, and sample requirements* | **P0** | Sprint 1 | 8 |
| ****BO-005**** | As an admin, I can clone diagnostic configuration from another branch | *When I clone from Branch A, then all sections, tests, parameters, ranges, service points are copied to new branch with ability to customize* | **P0** | Sprint 5 | 8 |
| ****BO-006**** | As an admin, I can bulk export current diagnostic configuration to Excel for review/backup | *When I click 'Export All', then system generates .xlsx with complete configuration of all tests, parameters, ranges* | **P1** | Sprint 5 | 5 |

## **Epic 9: Go-Live Validation & Compliance**

As an admin, I need automated validation to ensure my diagnostic configuration is complete and compliant before going live.

| ****ID**** | **User Story** | **Acceptance Criteria** | **Priority** | **Sprint** | **Points** |
| --- | --- | --- | --- | --- | --- |
| ****GV-001**** | As the system, I run 16 automated diagnostic validation checks during Go-Live | *When admin triggers Go-Live Validator, then all 16 checks run and results display as PASS/WARN/BLOCK with details* | **P0** | Sprint 5 | 8 |
| ****GV-002**** | As AI Copilot, I auto-detect and fix LOINC mapping gaps when coverage < 80% | *When only 70% tests have LOINC, then AI auto-suggests codes for remaining 30%; admin batch-approves* | **P1** | Sprint 5 | 5 |
| ****GV-003**** | As AI Copilot, I auto-detect PCPNDT-applicable tests and flag compliance requirements | *When Ultrasound tests exist but PCPNDT flag is not set, then AI flags: 'BLOCKER - 3 USG tests need PCPNDT compliance'* | **P0** | Sprint 5 | 3 |
| ****GV-004**** | As an admin, I can generate a Diagnostics Readiness Report for management review | *When I click 'Generate Report', then system creates PDF with section-wise score, test count, missing items, compliance status* | **P1** | Sprint 6 | 5 |
| ****GV-005**** | As the system, I validate NABH Chapter 7 (Diagnostic Services) compliance requirements | *When Go-Live runs, then NABH checklist items for lab quality, turnaround times, calibration, and safety are validated* | **P1** | Sprint 6 | 8 |

## **Epic 10: Operational Configuration (Day-2 Operations)**

As an operations team member, I need to make post-go-live configuration changes without system downtime.

| ****ID**** | **User Story** | **Acceptance Criteria** | **Priority** | **Sprint** | **Points** |
| --- | --- | --- | --- | --- | --- |
| ****OC-001**** | As a lab head, I can add a new test to the active catalog and it is immediately available for ordering | *When I add 'Dengue NS1 Antigen' with all parameters, then it appears in CPOE within 5 minutes* | **P0** | Sprint 6 | 5 |
| ****OC-002**** | As a pathologist, I can modify reference ranges with version control and audit trail | *When I change Glucose fasting from 70-100 to 70-110, then old range is archived and audit shows who, when, why* | **P0** | Sprint 6 | 5 |
| ****OC-003**** | As a lab head, I can add seasonal or outbreak-specific tests via fast-track workflow | *When monsoon outbreak hits, I can add Dengue, Malaria, Leptospira tests in <15 min with admin approval within 24hr* | **P0** | Sprint 6 | 5 |
| ****OC-004**** | As a branch admin, I can override enterprise-wide diagnostic config for my specific branch | *When head office sets Hemoglobin range 12-16, but my high-altitude branch needs 14-18, then I can override at branch level* | **P1** | Sprint 7 | 5 |
| ****OC-005**** | As a finance manager, I can perform bulk price revision for diagnostic tests | *When I upload revised price Excel, system shows diff (old vs new price per test); I approve; effective from specified date* | **P1** | Sprint 7 | 5 |

# **5. Sprint Plan & Delivery Roadmap**

Assuming 2-week sprints with a team of 2 backend engineers, 1 frontend engineer, 1 QA engineer, and 1 product manager.

| **Sprint** | **Focus Area** | **Key Deliverables** | **Story Points** |
| --- | --- | --- | --- |
| Sprint 1 | Foundation: Sections + Template Seeding | Section CRUD, template seeding engine, section-ServiceCatalog sync, DB schema setup | 22 |
| Sprint 2 | Test Configuration + Bulk Import | Individual test CRUD, bulk Excel import with validation, ServiceCatalog sync, search aliases | 36 |
| Sprint 3 | Parameters + Reference Ranges + Panels | Parameter CRUD, numeric/text/choice/formula types, age-gender reference ranges, critical ranges, panel creation | 40 |
| Sprint 4 | Sample Config + Service Points + AI | Sample requirements, tube types, service point CRUD, equipment linking, AI LOINC/SNOMED suggestions | 38 |
| Sprint 5 | Reports + Go-Live + Clone + Export | Report template builder, 16-point Go-Live validation, branch cloning, bulk export, PCPNDT auto-detect | 42 |
| Sprint 6 | Day-2 Ops + Polish | Operational workflows, version-controlled edits, fast-track test addition, readiness report, NABH checks | 38 |
| Sprint 7 | Branch Overrides + Edge Cases + Hardening | Branch-level overrides, bulk price revision, performance optimization, security audit, UAT | 30 |

**Total Estimated Effort: **~246 story points across 7 sprints (14 weeks). Target completion: Phase 0B delivery within 3.5 months of sprint start.

# **6. Non-Functional Requirements**

| **Requirement** | **Specification** |
| --- | --- |
| Performance | Bulk import of 1000 tests < 30 seconds. Page load for test list (1000 items) < 2 seconds. Search response < 500ms. |
| Scalability | Support up to 5000 diagnostic items per branch. Support up to 50 parameters per test. Support up to 20 reference range groups per parameter. |
| Security | RBAC: Only Lab Head/Admin can modify tests. Only Pathologist can modify reference ranges. Audit trail on all changes. Encryption at rest for patient-related config. |
| Availability | 99.9% uptime for read operations. Configuration changes should not cause downtime. |
| Offline | Full read access to diagnostic configuration offline. Configuration edits queued for sync when online. Conflict resolution: last-write-wins with notification. |
| Audit | Every create, update, delete operation logged with user, timestamp, old value, new value. Version history for reference ranges. Import/export activities logged. |
| Data Integrity | Referential integrity enforced: Cannot delete a section with active tests. Cannot delete a parameter with historical results. Soft-delete pattern for all entities. |
| Compliance | LOINC codes mapped per international standards. SNOMED CT codes for ABDM compliance. FHIR R4 DiagnosticReport resource generation capability. PCPNDT Form-F workflow support. NABL/NABH standards adherence. |
| Localization | Support English and Hindi for test names and report headers. RTL support not required. Indian number formatting (lakh/crore) for billing. |
| API Design | RESTful APIs for all CRUD operations. GraphQL for complex query patterns (e.g., test with parameters with ranges). Webhook for downstream notifications (new test added, range changed). |

# **7. AI Copilot Features for Diagnostics**

The AI Copilot is a mandatory intelligence layer embedded in every workflow. For Diagnostics Configuration, AI provides the following capabilities:

| **#** | **AI Feature** | **How It Works** | **Trigger** | **Priority** |
| --- | --- | --- | --- | --- |
| 1 | LOINC Auto-Mapping | AI analyzes test name, parameters, and sample type to suggest the best LOINC code with confidence score | Test creation / import | **P1** |
| 2 | SNOMED Auto-Mapping | AI maps test to SNOMED CT code for ABDM FHIR resource generation | Test creation / import | **P1** |
| 3 | Reference Range Validation | AI compares entered ranges against peer-reviewed medical literature (Harrison's, Tietz) and flags deviations | Range configuration | **P1** |
| 4 | Section Gap Detection | AI cross-references enabled departments with diagnostic sections and flags mismatches | Section setup | **P1** |
| 5 | Panel Suggestion | AI suggests commonly missing member tests when creating panels based on clinical standards | Panel creation | **P1** |
| 6 | Tube Consolidation | AI analyzes panel sample requirements and suggests optimal tube combinations to minimize patient draws | Panel / order set creation | **P1** |
| 7 | PCPNDT Auto-Detection | AI identifies ultrasound-based tests and flags them for PCPNDT compliance if flag is missing | Go-Live validation | **P0** |
| 8 | Smart Defaults | AI pre-fills TAT, sample types, common parameters based on hospital size template and test type | Template seeding | **P1** |
| 9 | Import Auto-Fill | AI fills missing LOINC, reference ranges, and sample requirements during bulk Excel import | Bulk import | **P1** |
| 10 | Completeness Score | AI continuously calculates a 'Diagnostic Readiness Score' showing configuration completeness | Dashboard / wizard | **P1** |

# **8. Risk Register**

| **Risk** | **Impact** | **Probability** | **Mitigation** |
| --- | --- | --- | --- |
| Reference range errors cause clinical misinterpretation | Critical | Medium | Mandatory peer-reviewed validation, AI range checking, dual-approval for range changes, version control |
| LOINC mapping inaccuracy affects ABDM compliance | High | Medium | AI confidence scores, mandatory manual review for low-confidence mappings, LOINC master database updates |
| Bulk import fails or corrupts data | High | Low | Transaction-based import (all-or-nothing per batch), validation preview before commit, audit log |
| Template data does not match hospital-specific needs | Medium | High | Templates are starting points, not final config; easy customization; AI suggestions for gaps |
| Performance degradation with 3000+ tests | Medium | Low | Indexed search, pagination, lazy-loading parameters, caching frequently accessed configs |
| PCPNDT non-compliance due to missing flags | Critical | Medium | AI auto-detection, Go-Live blocker, mandatory compliance check for all ultrasound equipment |
| Branch override conflicts with enterprise config | Medium | Medium | Clear inheritance model: enterprise defaults, branch overrides visible, conflict resolution UI |

# **9. Glossary of Key Terms**

| **Term** | **Definition** |
| --- | --- |
| **LOINC** | Logical Observation Identifiers Names and Codes — International standard for identifying laboratory and clinical observations |
| **SNOMED CT** | Systematized Nomenclature of Medicine — Clinical Terms — International standard for clinical terminology |
| **NABL** | National Accreditation Board for Testing and Calibration Laboratories — Indian accreditation body for labs |
| **NABH** | National Accreditation Board for Hospitals — Indian hospital accreditation body |
| **PCPNDT** | Pre-Conception and Pre-Natal Diagnostic Techniques Act — Indian law regulating use of diagnostic techniques for sex determination |
| **AERB** | Atomic Energy Regulatory Board — Regulates use of radiation equipment in India |
| **TAT** | Turnaround Time — Time from sample collection to report availability |
| **FHIR R4** | Fast Healthcare Interoperability Resources Release 4 — Standard for exchanging healthcare information electronically |
| **LIS** | Laboratory Information System — Operational module that uses diagnostic configuration for day-to-day lab workflow |
| **CPOE** | Computerized Provider Order Entry — System used by clinicians to order tests electronically |
| **EDTA** | Ethylenediaminetetraacetic acid — Anticoagulant used in purple-top tubes for hematology tests |
| **SST** | Serum Separator Tube — Yellow-top tube used for biochemistry tests |
| Panel/Profile | Composite test containing multiple individual tests ordered as a single unit (e.g., LFT = 7 individual tests) |
| Service Point | Physical location where diagnostic services are provided (collection center, processing lab, imaging center) |
| Critical/Panic Value | Test result so abnormal that it poses immediate danger to the patient and requires urgent clinical notification |
| Delta Check | Comparison of current result with patient's previous result to detect potential errors or significant changes |

# **10. Document Approval**

| **Role** | **Name** | **Date** | **Signature** |
| --- | --- | --- | --- |
| Senior Product Manager |  |  |  |
| Engineering Lead |  |  |  |
| QA Lead |  |  |  |
| Lab Consultant (SME) |  |  |  |
| **CTO** |  |  |  |

*END OF DOCUMENT — Diagnostics Configuration Module v1.0*
