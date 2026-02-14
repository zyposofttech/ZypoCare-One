# ZypoCare — Compliance Infrastructure Module (One‑Phase Delivery)
**Document ID:** ZC-COMP-001  
**Version:** v1.0  
**Status:** Single‑Phase Build Scope (P0/P1 ordering within Phase‑1)  
**Owner:** Product / Project Management  
**Audience:** Engineering, QA, UX, DevOps, Compliance/Quality Teams  
**Last Updated:** 2026-02-13

---

## 1) Objective

Deliver a complete **Compliance Infrastructure** capability in ZypoCare that centralizes and governs:

- **ABDM readiness & configuration**: HFR (facility), HPR (staff), ABHA client setup (sandbox/prod), callback URLs, feature toggles  
- **Government schemes readiness**: PMJAY + CGHS/ECHS empanelments, rate cards, and mapping to internal services/tariff items  
- **NABH readiness (6th Edition, 2025)**: 10-chapter checklist library, branch clone, evidence, audit cycles, findings, CAPA, scoring, and gap tracking  
- **Go‑Live validator**: blocking gaps vs warnings, readiness score, exports, audit trail

**End Goal:** meet all requirements in **one delivery phase** with **no rework** (schema + API + UI + RBAC + auditability shipped together).

---

## 2) Scope Boundaries (No‑Rework Guardrails)

### 2.1 In Scope (MUST deliver in Phase‑1)
1. **Compliance Workspace** (Org template + Branch instances)
2. **Evidence Vault** (upload/link/expiry/tags/metadata) + immutable audit logs
3. **Approvals framework** (maker‑checker) for sensitive changes
4. **ABDM configuration layer**
   - HFR facility profile + verification status tracking
   - HPR staff linkage + verification + bulk import
   - ABHA config (sandbox/prod), callback URLs, feature toggles, secure secret storage
5. **Government schemes configuration**
   - PMJAY empanelment + SHA code + package/rate versions + mapping
   - CGHS/ECHS empanelment + city category + rate cards + mapping
   - Freeze rate card versions
6. **NABH readiness**
   - 10 chapters library template + branch clone
   - Checklist status lifecycle + assignments + due dates + evidence required rules
   - Audit cycles + findings + CAPA
7. **Validator + dashboard + exports**
   - Readiness score
   - Blocking gaps vs warnings
   - Export pack (JSON/CSV in v1)

### 2.2 Out of Scope (Explicitly parked to prevent scope creep)
- PMJAY full **preauth/claims submission workflow** (separate Claims/TPA module)
- ABDM full **Consent Manager / health record exchange transaction flows** (separate ABDM Ops module)
- Any third‑party integrations beyond this configuration scaffolding (inhouse development only)

---

## 3) Personas & Ownership

- **Super Admin**: global control, audit visibility, emergency override  
- **Corporate Admin**: org templates, multi‑branch oversight, approvals governance  
- **Branch Admin**: branch workspace activation, local configuration, owner assignments  
- **Compliance Officer / Quality Head**: NABH owner, audits, findings, CAPA, scoring review  
- **HR Manager**: HPR IDs + staff credential verification status metadata  
- **IT Admin**: ABHA config, callbacks, security, IMS evidence, validator runs  
- **Billing Head**: scheme empanelments, rate cards, mappings, export pack  
- **Finance Controller**: freeze rate card versions  
- **Pharmacy Head**: medication management evidence, policy documents  
- **Facility/Safety Officer**: facility safety evidence, maintenance/disaster plan evidence  
- **Auditor**: audit cycle execution, findings entry  
- **Department Head/User**: update assigned NABH items, upload evidence

---

## 4) End‑to‑End Workflows (Must be implemented as written)

### Workflow A — Setup Wizard (Org → Branch)
1. Create/Select **Compliance Workspace**
   - Org template OR Branch instance
2. Configure **ABDM**
   - HFR: facility details + services + systems of medicine + ownership
   - ABHA: sandbox/prod credentials + callback URLs + feature toggles
   - HPR: map staff → HPR ID + category + verification status
3. Configure **Government Schemes**
   - PMJAY: empanelment + SHA code + upload packages/rates
   - CGHS/ECHS: empanelment + city category + upload rate cards
   - Mapping: external package/service → internal Service/Tariff item
4. Configure **NABH**
   - Clone NABH template to workspace
   - Assign chapter owners and due dates
5. Run **Validator**
6. Mark workspace **Active**

**Outputs:** Branch compliance dashboard, gap list, assignments, expiring evidence list.

### Workflow B — Ongoing Compliance Operations
- Evidence expiry monitoring + reminders  
- Monthly/Quarterly **audit cycles**
- Findings → CAPA creation → closure evidence → closure  
- Rate card updates (new versions) + mapping updates  
- Recompute readiness score + export compliance pack

### Workflow C — Maker‑Checker (Sensitive changes)
- Maker edits ABDM secrets / rate cards / critical NABH item verification  
- Submit for approval  
- Checker approves/rejects  
- Immutable audit trail maintained

---

## 5) One‑Phase Delivery Plan (Priorities inside Phase‑1)

> Everything below is Phase‑1. Priorities indicate build order and “must not slip”.

### P0 — Blocking (Must complete first; all are required)
- **Epic 0: Compliance Core**
  - Workspace CRUD + clone template → branch
  - Evidence vault (upload/link/expiry/tags)
  - Immutable audit logging for all compliance entities
  - RBAC + branch scoping enforcement
  - Approvals framework (maker‑checker) toggle per branch/workspace
- **Epic 1: ABDM Config**
  - ABHA config (sandbox/prod + callbacks + toggles + encrypted secrets)
  - HFR profile + completeness validator + verification status history
  - HPR staff link + bulk import + verification tracking
- **Epic 2: Govt Schemes**
  - Empanelment CRUD (PMJAY/CGHS/ECHS)
  - Rate card header + items bulk upload (CSV/XLSX) + effective dates + versioning
  - Mapping UI/API + unmapped views
  - Freeze rate card versions
- **Epic 3: NABH Readiness**
  - NABH template library (10 chapters) + branch clone
  - Checklist items CRUD (status/owner/due date/risk level/evidence required)
  - Verify flow (requires evidence if configured)
  - Audit cycles + findings + CAPA workflow
- **Epic 4: Validator & Reports**
  - Validator engine: blocking gaps vs warnings + score calculation
  - Workspace dashboard endpoints + UI views
  - Export pack (JSON/CSV)

### P1 — Non‑Blocking Enhancements (Still in Phase‑1; can be built after P0 is stable)
- Auto‑suggest mapping (name similarity heuristic)
- Expanded dashboards (trend graphs, heatmaps) beyond basic tiles
- Configurable scoring weights per org template
- Advanced evidence metadata (categories, retention, department tags)

**Phase‑1 Completion Definition:** All P0 items shipped + smoke tested + seeded with template and sample files.

---

## 6) User Stories (Key) + Acceptance Criteria

### 6.1 Compliance Workspace
**US‑W1:** As Corporate Admin, I can create an org template workspace.  
- ✅ Workspace created with type `ORG_TEMPLATE`, status `DRAFT`, audit log entry created.

**US‑W2:** As Branch Admin, I can clone the org template into a branch workspace.  
- ✅ Creates `BRANCH` workspace; NABH template cloned; audit logs created.

**US‑W3:** As Branch Admin, I can activate a workspace only if validator has no blocking gaps (configurable).  
- ✅ Activation blocked when critical gaps exist; reason list shown.

### 6.2 Evidence Vault
**US‑E1:** As any authorized user, I can upload evidence and link it to NABH items / ABDM / schemes.  
- ✅ Supports PDF/JPG/PNG; expiry date; tags; link/unlink; audit trail.

**US‑E2:** As Compliance Officer, I can see expiring evidence in next N days.  
- ✅ Filter works; export list.

### 6.3 Approvals
**US‑A1:** As IT Admin, updating ABHA client secret requires approval when maker‑checker is enabled.  
- ✅ Change stored as draft; only applied after approval; all actions logged.

### 6.4 ABDM
**US‑ABDM1:** As Branch Admin, I can fill HFR profile and see missing fields via validator.  
- ✅ Validate endpoint returns completeness score + missing fields.

**US‑ABDM2:** As HR Manager, I can link staff to HPR IDs, with bulk import.  
- ✅ CSV import with row-level errors; duplicates prevented per workspace.

**US‑ABDM3:** As IT Admin, I can configure ABHA (env, callbacks, toggles) without overwriting the other environment.  
- ✅ Both environments supported; history visible; secrets encrypted.

### 6.5 Government Schemes
**US‑SCH1:** As Billing Head, I can configure PMJAY empanelment + SHA code and upload package rates as a version.  
- ✅ Versioned; duplicates detected; effective dates supported.

**US‑SCH2:** As Finance Controller, I can freeze a rate card version.  
- ✅ Frozen version cannot be edited; only new version allowed.

**US‑SCH3:** As Billing Head, I can map external codes to internal services/tariffs and view unmapped list.  
- ✅ Unmapped filter works; mapping rules stored.

### 6.6 NABH
**US‑NABH1:** As Corporate Admin, I can maintain an org template for NABH 10 chapters.  
- ✅ Active template exists; branch clone is editable copy.

**US‑NABH2:** As Quality Head, I can assign owners/due dates and track status.  
- ✅ Owner assignment by user; CRITICAL items require due date.

**US‑NABH3:** As Auditor, I can create an audit cycle and record findings and CAPA.  
- ✅ Findings map to items; CAPA has owner/due date/status; closure requires evidence (if configured).

### 6.7 Validator & Exports
**US‑V1:** As Branch Admin, I can run validator and see blocking gaps vs warnings.  
- ✅ Gap list includes entity links and remediation hints.

**US‑X1:** As Corporate Admin, I can export compliance pack for a workspace.  
- ✅ Export includes ABDM config summary, schemes summary, NABH status summary, evidence list, audit log summaries.

---

## 7) API Endpoints (Exact)

> Base: `/api/compliance/*`  
> Auth: Bearer token.  
> All endpoints enforce RBAC + branch scope via principal.

### 7.1 Workspaces
- `GET  /api/compliance/workspaces?orgId=&branchId=&status=`
- `POST /api/compliance/workspaces`
- `GET  /api/compliance/workspaces/:workspaceId`
- `PATCH /api/compliance/workspaces/:workspaceId`
- `POST /api/compliance/workspaces/:workspaceId/clone-to-branch`

### 7.2 Evidence Vault
- `GET  /api/compliance/evidence?workspaceId=&linkedType=&linkedId=&expiringInDays=`
- `POST /api/compliance/evidence` (multipart)
- `GET  /api/compliance/evidence/:evidenceId`
- `PATCH /api/compliance/evidence/:evidenceId`
- `POST /api/compliance/evidence/:evidenceId/link`
- `DELETE /api/compliance/evidence/:evidenceId/link`

### 7.3 Approvals
- `GET  /api/compliance/approvals?workspaceId=&status=`
- `POST /api/compliance/approvals`
- `POST /api/compliance/approvals/:approvalId/submit`
- `POST /api/compliance/approvals/:approvalId/decide`

### 7.4 ABDM
**ABHA Config**
- `GET  /api/compliance/abdm/config?workspaceId=`
- `POST /api/compliance/abdm/config`
- `PATCH /api/compliance/abdm/config/:abdmConfigId`
- `POST /api/compliance/abdm/config/:abdmConfigId/test`

**HFR**
- `GET  /api/compliance/abdm/hfr?workspaceId=`
- `POST /api/compliance/abdm/hfr`
- `PATCH /api/compliance/abdm/hfr/:hfrProfileId`
- `POST /api/compliance/abdm/hfr/:hfrProfileId/status`
- `POST /api/compliance/abdm/hfr/:hfrProfileId/validate`

**HPR**
- `GET  /api/compliance/abdm/hpr?workspaceId=&staffId=&status=`
- `POST /api/compliance/abdm/hpr`
- `PATCH /api/compliance/abdm/hpr/:hprLinkId`
- `POST /api/compliance/abdm/hpr/bulk-import`
- `POST /api/compliance/abdm/hpr/:hprLinkId/verify`

### 7.5 Govt Schemes
**Empanelments**
- `GET  /api/compliance/schemes/empanelments?workspaceId=&scheme=`
- `POST /api/compliance/schemes/empanelments`
- `PATCH /api/compliance/schemes/empanelments/:empanelmentId`

**Rate Cards**
- `GET  /api/compliance/schemes/rate-cards?workspaceId=&scheme=&version=&activeOn=`
- `POST /api/compliance/schemes/rate-cards`
- `POST /api/compliance/schemes/rate-cards/:rateCardId/items/bulk-upload`
- `PATCH /api/compliance/schemes/rate-cards/:rateCardId`
- `POST /api/compliance/schemes/rate-cards/:rateCardId/freeze`
- `GET  /api/compliance/schemes/rate-cards/:rateCardId/items?search=&code=&page=`
- `PATCH /api/compliance/schemes/rate-cards/:rateCardId/items/:itemId`

**Mappings**
- `GET  /api/compliance/schemes/mappings?workspaceId=&scheme=&unmappedOnly=`
- `POST /api/compliance/schemes/mappings`
- `PATCH /api/compliance/schemes/mappings/:mappingId`
- `POST /api/compliance/schemes/mappings/auto-suggest`

### 7.6 NABH
**Templates**
- `GET  /api/compliance/nabh/templates?orgId=&active=`
- `POST /api/compliance/nabh/templates`
- `POST /api/compliance/nabh/templates/:templateId/clone-to-workspace`

**Workspace Items**
- `GET  /api/compliance/nabh/items?workspaceId=&chapter=&status=&ownerStaffId=`
- `PATCH /api/compliance/nabh/items/:itemId`
- `POST /api/compliance/nabh/items/:itemId/verify`
- `GET  /api/compliance/nabh/chapters/summary?workspaceId=`

**Audits / Findings / CAPA**
- `GET  /api/compliance/nabh/audits?workspaceId=&status=`
- `POST /api/compliance/nabh/audits`
- `PATCH /api/compliance/nabh/audits/:auditId`
- `POST /api/compliance/nabh/audits/:auditId/findings`
- `PATCH /api/compliance/nabh/findings/:findingId`
- `POST /api/compliance/nabh/findings/:findingId/capa`
- `PATCH /api/compliance/nabh/capa/:capaId`

### 7.7 Validator / Dashboard / Export / Logs
- `POST /api/compliance/validator/run`
- `GET  /api/compliance/dashboard?workspaceId=`
- `GET  /api/compliance/export/pack?workspaceId=&format=json|csv`
- `GET  /api/compliance/audit-logs?workspaceId=&entityType=&entityId=&from=&to=`

---

## 8) UI Pages / Routes (Exact)

> Recommended Next.js App Router location: `apps/web/app/governance/compliance/...`

### 8.1 Core
- `/governance/compliance`
- `/governance/compliance/overview`
- `/governance/compliance/workspaces`
- `/governance/compliance/workspaces/new`
- `/governance/compliance/workspaces/[workspaceId]`
- `/governance/compliance/workspaces/[workspaceId]/validator`
- `/governance/compliance/workspaces/[workspaceId]/export`

### 8.2 Evidence
- `/governance/compliance/workspaces/[workspaceId]/evidence`
- `/governance/compliance/workspaces/[workspaceId]/evidence/new`
- `/governance/compliance/workspaces/[workspaceId]/evidence/[evidenceId]`

### 8.3 Approvals
- `/governance/compliance/workspaces/[workspaceId]/approvals`
- `/governance/compliance/workspaces/[workspaceId]/approvals/[approvalId]`

### 8.4 ABDM
- `/governance/compliance/workspaces/[workspaceId]/abdm`
- `/governance/compliance/workspaces/[workspaceId]/abdm/hfr`
- `/governance/compliance/workspaces/[workspaceId]/abdm/hpr`
- `/governance/compliance/workspaces/[workspaceId]/abdm/abha`

### 8.5 Schemes
- `/governance/compliance/workspaces/[workspaceId]/schemes`
- `/governance/compliance/workspaces/[workspaceId]/schemes/pmjay`
- `/governance/compliance/workspaces/[workspaceId]/schemes/cghs`
- `/governance/compliance/workspaces/[workspaceId]/schemes/echs`
- `/governance/compliance/workspaces/[workspaceId]/schemes/rate-cards/[rateCardId]`
- `/governance/compliance/workspaces/[workspaceId]/schemes/mapping`

### 8.6 NABH
- `/governance/compliance/workspaces/[workspaceId]/nabh`
- `/governance/compliance/workspaces/[workspaceId]/nabh/checklist`
- `/governance/compliance/workspaces/[workspaceId]/nabh/checklist/[itemId]`
- `/governance/compliance/workspaces/[workspaceId]/nabh/audits`
- `/governance/compliance/workspaces/[workspaceId]/nabh/audits/new`
- `/governance/compliance/workspaces/[workspaceId]/nabh/audits/[auditId]`
- `/governance/compliance/workspaces/[workspaceId]/nabh/findings/[findingId]`
- `/governance/compliance/workspaces/[workspaceId]/nabh/capa/[capaId]`

---

## 9) Permission Matrix (Roles × Actions)

> Permission keys (recommended): `COMPLIANCE_*` with scope = ORG/BRANCH/WORKSPACE.

### Actions
- **A1** View workspace/dashboard  
- **A2** Create/clone workspace  
- **A3** Activate/archive workspace  
- **A4** Configure ABDM (ABHA/HFR/HPR)  
- **A5** Configure schemes (empanelment)  
- **A6** Manage rate cards (create/upload/edit)  
- **A7** Freeze rate card version  
- **A8** Manage scheme mappings  
- **A9** Manage NABH template (org-level)  
- **A10** Manage NABH checklist items (branch)  
- **A11** Verify NABH items  
- **A12** Upload/manage evidence  
- **A13** Start/manage audits  
- **A14** Record findings  
- **A15** Manage CAPA  
- **A16** Run validator / view gaps  
- **A17** Export compliance pack  
- **A18** Approve/reject (maker-checker)  
- **A19** View audit logs

| Role | A1 | A2 | A3 | A4 | A5 | A6 | A7 | A8 | A9 | A10 | A11 | A12 | A13 | A14 | A15 | A16 | A17 | A18 | A19 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Super Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Corporate Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅* | ✅ |
| Branch Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ◻️ | ✅ | ◻️ | ✅ | ◻️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅* | ✅ |
| Compliance Officer / QH | ✅ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅* | ✅ |
| IT Admin | ✅ | ◻️ | ◻️ | ✅ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ✅ | ◻️ | ◻️ | ◻️ | ✅ | ◻️ | ✅* | ✅ |
| HR Manager | ✅ | ◻️ | ◻️ | ✅(HPR) | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ✅ | ◻️ | ◻️ | ◻️ | ✅ | ◻️ | ◻️ | ✅ |
| Billing Head | ✅ | ◻️ | ◻️ | ◻️ | ✅ | ✅ | ◻️ | ✅ | ◻️ | ◻️ | ◻️ | ✅ | ◻️ | ◻️ | ◻️ | ✅ | ✅ | ◻️ | ✅ |
| Finance Controller | ✅ | ◻️ | ◻️ | ◻️ | ◻️ | ✅(view) | ✅ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ✅ | ◻️ | ◻️ | ✅ |
| Pharmacy Head | ✅ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ✅(assigned) | ◻️ | ✅ | ◻️ | ◻️ | ◻️ | ✅ | ◻️ | ◻️ | ✅ |
| Facility/Safety Officer | ✅ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ✅(assigned) | ◻️ | ✅ | ◻️ | ◻️ | ◻️ | ✅ | ◻️ | ◻️ | ✅ |
| Auditor | ✅ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ✅ | ✅(assigned) | ✅ | ◻️ | ✅ | ◻️ | ◻️ | ✅ |
| Department Head/User | ✅(assigned) | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ◻️ | ✅(assigned) | ◻️ | ✅ | ◻️ | ◻️ | ◻️ | ✅(view) | ◻️ | ◻️ | ◻️ |

\* A18 (Approvals) is only for designated checkers when maker‑checker is enabled.  
◻️ = Not permitted by default (can be granted via custom role templates if needed).

---

## 10) Prisma Schema Draft (Prisma‑style)

> Note: assumes existing models `Organization`, `Branch`, `Staff` exist.  
> Encryption is applied in service layer (store encrypted strings).

```prisma
enum ComplianceWorkspaceType { ORG_TEMPLATE BRANCH }
enum ComplianceWorkspaceStatus { DRAFT ACTIVE ARCHIVED }
enum EnvironmentType { SANDBOX PRODUCTION }
enum VerificationStatus { NOT_SUBMITTED PENDING VERIFIED REJECTED }
enum RegistrationStatus { UNVERIFIED VERIFIED EXPIRED MISMATCH }
enum SchemeType { PMJAY CGHS ECHS }
enum EmpanelmentStatus { DRAFT ACTIVE SUSPENDED }
enum CityCategory { A B C }
enum RateCardStatus { DRAFT ACTIVE FROZEN ARCHIVED }
enum NabhItemStatus { NOT_STARTED IN_PROGRESS IMPLEMENTED VERIFIED NON_COMPLIANT }
enum RiskLevel { CRITICAL MAJOR MINOR }
enum EvidenceStatus { ACTIVE ARCHIVED }
enum ApprovalStatus { DRAFT SUBMITTED APPROVED REJECTED CANCELLED }
enum AuditCycleStatus { PLANNED IN_PROGRESS CLOSED }
enum FindingSeverity { CRITICAL MAJOR MINOR }
enum CapaStatus { OPEN IN_PROGRESS CLOSED }

enum ComplianceEntityType {
  COMPLIANCE_WORKSPACE
  ABDM_CONFIG
  HFR_PROFILE
  HPR_LINK
  SCHEME_EMPANELMENT
  SCHEME_RATE_CARD
  SCHEME_MAPPING
  NABH_TEMPLATE
  NABH_ITEM
  EVIDENCE
  AUDIT_CYCLE
  FINDING
  CAPA
  APPROVAL
}

model ComplianceWorkspace {
  id          String   @id @default(cuid())
  orgId       String
  branchId    String?
  type        ComplianceWorkspaceType
  name        String
  status      ComplianceWorkspaceStatus @default(DRAFT)

  readinessScore Float?
  lastComputedAt DateTime?

  org      Organization @relation(fields: [orgId], references: [id])
  branch   Branch?      @relation(fields: [branchId], references: [id])

  abdmConfig     AbdmConfig?
  hfrProfile     HfrFacilityProfile?
  hprLinks       HprProfessionalLink[]
  empanelments   SchemeEmpanelment[]
  rateCards      SchemeRateCard[]
  schemeMappings SchemeMapping[]

  nabhItems         NabhWorkspaceItem[]
  evidenceArtifacts EvidenceArtifact[]
  approvals         ApprovalRequest[]
  auditCycles       AuditCycle[]
  auditLogs         ComplianceAuditLog[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([orgId, branchId])
  @@index([status, type])
  @@map("compliance_workspaces")
}

model AbdmConfig {
  id          String   @id @default(cuid())
  workspaceId String   @unique

  environment EnvironmentType @default(SANDBOX)

  clientId        String?
  clientSecretEnc String?
  callbackUrls    String[]
  featureTogglesJson Json

  status       String   @default("NOT_CONFIGURED")
  lastTestedAt DateTime?

  workspace  ComplianceWorkspace @relation(fields: [workspaceId], references: [id])

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@map("abdm_configs")
}

model HfrFacilityProfile {
  id          String   @id @default(cuid())
  workspaceId String   @unique

  facilityName      String
  ownershipType     String
  facilityType      String
  systemsOfMedicine String[]
  servicesOffered   String[]

  addressLine1 String
  addressLine2 String?
  city         String
  state        String
  pincode      String
  latitude     Float?
  longitude    Float?
  contactPhone String?
  contactEmail String?

  hfrId              String?
  verificationStatus VerificationStatus @default(NOT_SUBMITTED)
  verificationNotes  String?
  lastSyncedAt       DateTime?

  workspace  ComplianceWorkspace @relation(fields: [workspaceId], references: [id])

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@map("hfr_facility_profiles")
}

model HprProfessionalLink {
  id          String   @id @default(cuid())
  workspaceId String
  staffId     String

  hprId       String
  category    String
  registrationStatus RegistrationStatus @default(UNVERIFIED)

  verifiedAt        DateTime?
  verifiedByStaffId String?
  notes             String?

  workspace  ComplianceWorkspace @relation(fields: [workspaceId], references: [id])
  staff      Staff               @relation(fields: [staffId], references: [id])
  verifiedBy Staff? @relation("HprVerifiedBy", fields: [verifiedByStaffId], references: [id])

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([workspaceId, staffId])
  @@unique([workspaceId, hprId])
  @@index([workspaceId, registrationStatus])
  @@map("hpr_professional_links")
}

model SchemeEmpanelment {
  id          String   @id @default(cuid())
  workspaceId String

  scheme      SchemeType
  empanelmentNumber String

  shaCode     String?
  state       String?

  cityCategory CityCategory?

  status      EmpanelmentStatus @default(DRAFT)

  workspace   ComplianceWorkspace @relation(fields: [workspaceId], references: [id])

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([workspaceId, scheme])
  @@index([workspaceId, scheme, status])
  @@map("scheme_empanelments")
}

model SchemeRateCard {
  id          String   @id @default(cuid())
  workspaceId String
  scheme      SchemeType

  version     String
  effectiveFrom DateTime
  effectiveTo   DateTime?

  status      RateCardStatus @default(DRAFT)

  items       SchemeRateCardItem[]
  workspace   ComplianceWorkspace @relation(fields: [workspaceId], references: [id])

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([workspaceId, scheme, version])
  @@index([workspaceId, scheme, status])
  @@map("scheme_rate_cards")
}

model SchemeRateCardItem {
  id         String @id @default(cuid())
  rateCardId String

  code       String
  name       String
  rate       Decimal @db.Decimal(12, 2)

  inclusions String?
  exclusions String?
  metadata   Json?

  rateCard   SchemeRateCard @relation(fields: [rateCardId], references: [id])

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([rateCardId, code])
  @@index([rateCardId, name])
  @@map("scheme_rate_card_items")
}

model SchemeMapping {
  id          String @id @default(cuid())
  workspaceId String
  scheme      SchemeType

  externalCode String
  externalName String?

  internalServiceId    String?
  internalTariffItemId String?

  rules Json?

  workspace ComplianceWorkspace @relation(fields: [workspaceId], references: [id])

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([workspaceId, scheme, externalCode])
  @@index([workspaceId, scheme])
  @@map("scheme_mappings")
}

model NabhTemplate {
  id       String @id @default(cuid())
  orgId    String
  name     String
  isActive Boolean @default(true)

  items    NabhTemplateItem[]
  org      Organization @relation(fields: [orgId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([orgId, isActive])
  @@map("nabh_templates")
}

model NabhTemplateItem {
  id         String @id @default(cuid())
  templateId String

  chapter      String
  standardCode String
  meCode       String

  title       String
  description String?

  evidenceRequired Boolean @default(true)
  riskLevel  RiskLevel @default(MAJOR)

  template   NabhTemplate @relation(fields: [templateId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([templateId, standardCode, meCode])
  @@index([templateId, chapter])
  @@map("nabh_template_items")
}

model NabhWorkspaceItem {
  id          String @id @default(cuid())
  workspaceId String

  chapter      String
  standardCode String
  meCode       String

  title       String
  description String?

  status      NabhItemStatus @default(NOT_STARTED)
  riskLevel   RiskLevel @default(MAJOR)
  evidenceRequired Boolean @default(true)

  ownerStaffId String?
  dueDate      DateTime?
  notes        String?

  verifiedAt        DateTime?
  verifiedByStaffId String?

  workspace  ComplianceWorkspace @relation(fields: [workspaceId], references: [id])
  owner      Staff? @relation("NabhOwner", fields: [ownerStaffId], references: [id])
  verifiedBy Staff? @relation("NabhVerifiedBy", fields: [verifiedByStaffId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([workspaceId, standardCode, meCode])
  @@index([workspaceId, chapter, status])
  @@map("nabh_workspace_items")
}

model EvidenceArtifact {
  id          String @id @default(cuid())
  workspaceId String

  title  String
  tags   String[]
  status EvidenceStatus @default(ACTIVE)

  fileKey   String
  fileName  String
  mimeType  String
  sizeBytes Int

  expiresAt DateTime?
  uploadedByStaffId String?

  workspace  ComplianceWorkspace @relation(fields: [workspaceId], references: [id])
  uploadedBy Staff? @relation(fields: [uploadedByStaffId], references: [id])

  links EvidenceLink[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([workspaceId, expiresAt])
  @@map("evidence_artifacts")
}

model EvidenceLink {
  id         String @id @default(cuid())
  evidenceId String

  targetType ComplianceEntityType
  targetId   String

  evidence   EvidenceArtifact @relation(fields: [evidenceId], references: [id])

  createdAt DateTime @default(now())

  @@unique([evidenceId, targetType, targetId])
  @@index([targetType, targetId])
  @@map("evidence_links")
}

model AuditCycle {
  id          String @id @default(cuid())
  workspaceId String

  name      String
  startDate DateTime
  endDate   DateTime

  status AuditCycleStatus @default(PLANNED)
  auditorStaffIds String[]

  findings  AuditFinding[]
  workspace ComplianceWorkspace @relation(fields: [workspaceId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([workspaceId, status])
  @@map("audit_cycles")
}

model AuditFinding {
  id      String @id @default(cuid())
  auditId String
  itemId  String?

  severity FindingSeverity
  description String
  recommendedAction String?
  dueDate DateTime?

  capa CapaAction?

  audit AuditCycle @relation(fields: [auditId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([auditId, severity])
  @@map("audit_findings")
}

model CapaAction {
  id        String @id @default(cuid())
  findingId String @unique

  ownerStaffId String
  dueDate      DateTime
  actionPlan   String

  status      CapaStatus @default(OPEN)
  closureNotes String?
  closedAt     DateTime?

  finding AuditFinding @relation(fields: [findingId], references: [id])
  owner   Staff @relation(fields: [ownerStaffId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([ownerStaffId, status])
  @@map("capa_actions")
}

model ApprovalRequest {
  id          String @id @default(cuid())
  workspaceId String

  status      ApprovalStatus @default(DRAFT)

  changeType  String
  entityType  ComplianceEntityType
  entityId    String

  payloadDraft Json
  notes       String?

  requestedByStaffId String
  decidedByStaffId   String?
  decidedAt          DateTime?
  decisionNotes      String?

  workspace    ComplianceWorkspace @relation(fields: [workspaceId], references: [id])
  requestedBy  Staff @relation("ApprovalRequestedBy", fields: [requestedByStaffId], references: [id])
  decidedBy    Staff? @relation("ApprovalDecidedBy", fields: [decidedByStaffId], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([workspaceId, status])
  @@map("approval_requests")
}

model ComplianceAuditLog {
  id          String @id @default(cuid())
  workspaceId String

  entityType ComplianceEntityType
  entityId   String

  action  String
  before  Json?
  after   Json?

  actorStaffId String?
  actorIp      String?
  userAgent    String?

  workspace ComplianceWorkspace @relation(fields: [workspaceId], references: [id])
  actor     Staff? @relation(fields: [actorStaffId], references: [id])

  createdAt DateTime @default(now())

  @@index([workspaceId, entityType, entityId])
  @@map("compliance_audit_logs")
}
```

---

## 11) Non‑Functional Requirements (Phase‑1 Must‑Haves)
- **Security**
  - Encrypt ABHA client secrets at rest (service-layer encryption)
  - Strict RBAC + branch scope enforcement on all endpoints
- **Auditability**
  - Immutable audit logs for every create/update/delete/approve/verify/freeze action
- **Versioning**
  - Rate cards are versioned with effective dates; frozen versions are immutable
- **Extensibility**
  - ABDM and scheme sections designed as “config scaffolding” so operational transaction modules can be added later without redesign
- **Performance**
  - List endpoints paginated; server-side search on rate card items and mappings

---

## 12) Definition of Done (Global)
A feature is **Done** only if:
- DB schema + migrations applied
- APIs implemented with DTO validation + RBAC guards + audit logging
- UI screens implemented and functional as per routes list
- Evidence upload and link/unlink works
- Validator runs and produces correct blocking gaps/warnings/score
- Seed data: NABH template base + sample upload templates available
- QA smoke test checklist passed (core flows A/B/C)

---

## 13) QA Smoke Test Checklist (Minimum)
- Create org template → clone to branch → configure ABDM → schemes → NABH → validator → activate
- Upload evidence → link to NABH item → verify item
- Upload rate card → freeze version → ensure edit blocked
- Maker-checker enabled → attempt secret update → approval required → approve → applied
- Export pack returns complete datasets and summaries
- Audit logs show all mutations with correct actor and timestamps

---
