-- CreateEnum
CREATE TYPE "ComplianceWorkspaceType" AS ENUM ('ORG_TEMPLATE', 'BRANCH');

-- CreateEnum
CREATE TYPE "ComplianceWorkspaceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EnvironmentType" AS ENUM ('SANDBOX', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'EXPIRED', 'MISMATCH');

-- CreateEnum
CREATE TYPE "EmpanelmentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CityCategory" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "RateCardStatus" AS ENUM ('DRAFT', 'ACTIVE', 'FROZEN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "NabhItemStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'IMPLEMENTED', 'VERIFIED', 'NON_COMPLIANT');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('CRITICAL', 'MAJOR', 'MINOR');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ComplianceApprovalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditCycleStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "FindingSeverity" AS ENUM ('CRITICAL', 'MAJOR', 'MINOR');

-- CreateEnum
CREATE TYPE "CapaStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "ComplianceEntityType" AS ENUM ('COMPLIANCE_WORKSPACE', 'ABDM_CONFIG', 'HFR_PROFILE', 'HPR_LINK', 'SCHEME_EMPANELMENT', 'SCHEME_RATE_CARD', 'SCHEME_MAPPING', 'NABH_TEMPLATE', 'NABH_ITEM', 'EVIDENCE', 'AUDIT_CYCLE', 'FINDING', 'CAPA', 'APPROVAL', 'SCHEME_API_CREDENTIAL', 'SCHEME_SYNC');

-- CreateEnum
CREATE TYPE "BloodBankType" AS ENUM ('HOSPITAL_BASED', 'STANDALONE', 'STORAGE_CENTRE', 'COMPONENT_SEPARATION_CENTRE');

-- CreateEnum
CREATE TYPE "ComponentType" AS ENUM ('WHOLE_BLOOD', 'PRBC', 'FFP', 'PLATELET_RDP', 'PLATELET_SDP', 'CRYOPRECIPITATE', 'CRYO_POOR_PLASMA');

-- CreateEnum
CREATE TYPE "BagType" AS ENUM ('SINGLE', 'DOUBLE', 'TRIPLE', 'QUADRUPLE');

-- CreateEnum
CREATE TYPE "DonorType" AS ENUM ('VOLUNTARY', 'REPLACEMENT', 'DIRECTED', 'AUTOLOGOUS');

-- CreateEnum
CREATE TYPE "DonorStatus" AS ENUM ('ELIGIBLE', 'TEMPORARILY_DEFERRED', 'PERMANENTLY_DEFERRED');

-- CreateEnum
CREATE TYPE "CollectionType" AS ENUM ('WHOLE_BLOOD_350', 'WHOLE_BLOOD_450', 'APHERESIS_SDP', 'APHERESIS_PLASMA');

-- CreateEnum
CREATE TYPE "BloodUnitStatus" AS ENUM ('COLLECTED', 'TESTING', 'QUARANTINED', 'AVAILABLE', 'RESERVED', 'CROSS_MATCHED', 'ISSUED', 'TRANSFUSED', 'DISCARDED', 'SEPARATED', 'RETURNED');

-- CreateEnum
CREATE TYPE "TTITestResult" AS ENUM ('REACTIVE', 'NON_REACTIVE', 'INDETERMINATE', 'PENDING');

-- CreateEnum
CREATE TYPE "CrossMatchMethod" AS ENUM ('IMMEDIATE_SPIN', 'AHG_INDIRECT_COOMBS', 'ELECTRONIC');

-- CreateEnum
CREATE TYPE "CrossMatchResult" AS ENUM ('COMPATIBLE', 'INCOMPATIBLE', 'PENDING');

-- CreateEnum
CREATE TYPE "BloodRequestUrgency" AS ENUM ('ROUTINE', 'URGENT', 'EMERGENCY', 'MTP');

-- CreateEnum
CREATE TYPE "BloodRequestStatus" AS ENUM ('PENDING', 'SAMPLE_RECEIVED', 'CROSS_MATCHING', 'READY', 'ISSUED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransfusionReactionType" AS ENUM ('FEBRILE', 'ALLERGIC', 'HEMOLYTIC_ACUTE', 'HEMOLYTIC_DELAYED', 'TRALI', 'TACO', 'ANAPHYLAXIS', 'BACTERIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "DiscardReason" AS ENUM ('EXPIRED', 'TTI_REACTIVE', 'BAG_LEAK', 'CLOT', 'LIPEMIC', 'HEMOLYZED', 'QC_FAILURE', 'RETURN_TIMEOUT', 'OTHER');

-- CreateEnum
CREATE TYPE "BBEquipmentType" AS ENUM ('REFRIGERATOR', 'DEEP_FREEZER', 'PLATELET_AGITATOR', 'CELL_SEPARATOR', 'BLOOD_WARMER', 'CENTRIFUGE', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BloodGroup" ADD VALUE 'BOMBAY';
ALTER TYPE "BloodGroup" ADD VALUE 'RARE_OTHER';

-- CreateTable
CREATE TABLE "compliance_workspaces" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "branchId" TEXT,
    "type" "ComplianceWorkspaceType" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ComplianceWorkspaceStatus" NOT NULL DEFAULT 'DRAFT',
    "readinessScore" DOUBLE PRECISION,
    "lastComputedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abdm_configs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "environment" "EnvironmentType" NOT NULL DEFAULT 'SANDBOX',
    "clientId" TEXT,
    "clientSecretEnc" TEXT,
    "callbackUrls" TEXT[],
    "featureTogglesJson" JSONB,
    "status" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
    "lastTestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abdm_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hfr_facility_profiles" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "facilityName" TEXT NOT NULL,
    "ownershipType" TEXT NOT NULL,
    "facilityType" TEXT NOT NULL,
    "systemsOfMedicine" TEXT[],
    "servicesOffered" TEXT[],
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "hfrId" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "verificationNotes" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hfr_facility_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hpr_professional_links" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "hprId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "registrationStatus" "RegistrationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "verifiedByStaffId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hpr_professional_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheme_empanelments" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "scheme" "SchemeType" NOT NULL,
    "empanelmentNumber" TEXT NOT NULL,
    "shaCode" TEXT,
    "state" TEXT,
    "cityCategory" "CityCategory",
    "status" "EmpanelmentStatus" NOT NULL DEFAULT 'DRAFT',
    "govSchemeConfigId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheme_empanelments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheme_rate_cards" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "scheme" "SchemeType" NOT NULL,
    "version" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "status" "RateCardStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheme_rate_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheme_rate_card_items" (
    "id" TEXT NOT NULL,
    "rateCardId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(12,2) NOT NULL,
    "inclusions" TEXT,
    "exclusions" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheme_rate_card_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheme_mappings" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "scheme" "SchemeType" NOT NULL,
    "externalCode" TEXT NOT NULL,
    "externalName" TEXT,
    "internalServiceId" TEXT,
    "internalTariffItemId" TEXT,
    "rules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheme_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheme_api_credentials" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "scheme" "SchemeType" NOT NULL,
    "apiKeyEnc" TEXT,
    "apiSecretEnc" TEXT,
    "baseUrl" TEXT,
    "environment" "EnvironmentType" NOT NULL DEFAULT 'SANDBOX',
    "status" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
    "lastTestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheme_api_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nabh_templates" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nabh_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nabh_template_items" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "chapter" TEXT NOT NULL,
    "standardCode" TEXT NOT NULL,
    "meCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "evidenceRequired" BOOLEAN NOT NULL DEFAULT true,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MAJOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nabh_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nabh_workspace_items" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "chapter" TEXT NOT NULL,
    "standardCode" TEXT NOT NULL,
    "meCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "NabhItemStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MAJOR',
    "evidenceRequired" BOOLEAN NOT NULL DEFAULT true,
    "ownerStaffId" TEXT,
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedByStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nabh_workspace_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_artifacts" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "tags" TEXT[],
    "status" "EvidenceStatus" NOT NULL DEFAULT 'ACTIVE',
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "uploadedByStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_links" (
    "id" TEXT NOT NULL,
    "evidenceId" TEXT NOT NULL,
    "targetType" "ComplianceEntityType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_cycles" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "AuditCycleStatus" NOT NULL DEFAULT 'PLANNED',
    "auditorStaffIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_findings" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "itemId" TEXT,
    "severity" "FindingSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "recommendedAction" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capa_actions" (
    "id" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "ownerStaffId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "actionPlan" TEXT NOT NULL,
    "status" "CapaStatus" NOT NULL DEFAULT 'OPEN',
    "closureNotes" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capa_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_approvals" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "status" "ComplianceApprovalStatus" NOT NULL DEFAULT 'DRAFT',
    "changeType" TEXT NOT NULL,
    "entityType" "ComplianceEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "payloadDraft" JSONB NOT NULL,
    "notes" TEXT,
    "requestedByStaffId" TEXT NOT NULL,
    "decidedByStaffId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_audit_logs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "entityType" "ComplianceEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "actorStaffId" TEXT,
    "actorIp" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_facilities" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "facilityType" "BloodBankType" NOT NULL,
    "drugLicenseNo" VARCHAR(64),
    "sbtcRegNo" VARCHAR(64),
    "nacoId" VARCHAR(64),
    "licenseValidTo" TIMESTAMP(3),
    "operatingHours" JSONB,
    "physicalLayout" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bb_facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_component_masters" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "componentType" "ComponentType" NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "shelfLifeDays" INTEGER NOT NULL,
    "storageMinTempC" DECIMAL(5,2) NOT NULL,
    "storageMaxTempC" DECIMAL(5,2) NOT NULL,
    "volumeMinMl" INTEGER,
    "volumeMaxMl" INTEGER,
    "preparationMethod" VARCHAR(200),
    "requiresAgitation" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bb_component_masters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_equipment" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "equipmentType" "BBEquipmentType" NOT NULL,
    "equipmentId" VARCHAR(64) NOT NULL,
    "make" VARCHAR(120),
    "model" VARCHAR(120),
    "serialNumber" VARCHAR(120),
    "location" VARCHAR(200),
    "capacityUnits" INTEGER,
    "tempRangeMinC" DECIMAL(5,2),
    "tempRangeMaxC" DECIMAL(5,2),
    "alarmThresholdMinC" DECIMAL(5,2),
    "alarmThresholdMaxC" DECIMAL(5,2),
    "pollingIntervalSec" INTEGER NOT NULL DEFAULT 300,
    "calibrationDueDate" TIMESTAMP(3),
    "calibrationInterval" INTEGER,
    "lastCalibratedAt" TIMESTAMP(3),
    "calibratedByStaffId" TEXT,
    "iotSensorId" VARCHAR(120),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bb_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_equipment_temp_logs" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "temperatureC" DECIMAL(5,2) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isBreaching" BOOLEAN NOT NULL DEFAULT false,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedByStaffId" TEXT,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "bb_equipment_temp_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_reagents" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "lotNumber" VARCHAR(64),
    "expiryDate" TIMESTAMP(3),
    "stockQty" INTEGER NOT NULL DEFAULT 0,
    "minStockQty" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bb_reagents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_tariff_configs" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "componentMasterId" TEXT,
    "chargeType" VARCHAR(48) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'INR',
    "gstPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "govSchemeCode" VARCHAR(48),
    "govSchemeRate" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bb_tariff_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_donors" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "donorNumber" VARCHAR(32) NOT NULL,
    "donorType" "DonorType" NOT NULL DEFAULT 'VOLUNTARY',
    "name" VARCHAR(160) NOT NULL,
    "gender" VARCHAR(16) NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "age" INTEGER,
    "mobile" VARCHAR(20),
    "email" VARCHAR(120),
    "aadhaarNo" VARCHAR(16),
    "address" VARCHAR(500),
    "photoUrl" VARCHAR(500),
    "bloodGroup" "BloodGroup",
    "donorStatus" "DonorStatus" NOT NULL DEFAULT 'ELIGIBLE',
    "donationCount" INTEGER NOT NULL DEFAULT 0,
    "lastDonationDate" TIMESTAMP(3),
    "nextEligibleDate" TIMESTAMP(3),
    "patientId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bb_donors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_donor_deferrals" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "deferralType" VARCHAR(32) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "deferredByStaffId" TEXT,
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bb_donor_deferrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_donor_screenings" (
    "id" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "screeningDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dhqResponses" JSONB,
    "hemoglobinGdl" DECIMAL(4,1),
    "weightKg" DECIMAL(5,1),
    "bpSystolic" INTEGER,
    "bpDiastolic" INTEGER,
    "pulseRate" INTEGER,
    "temperatureC" DECIMAL(4,1),
    "veinAssessment" VARCHAR(200),
    "eligibilityDecision" VARCHAR(32) NOT NULL,
    "decisionNotes" VARCHAR(500),
    "decidedByStaffId" TEXT,
    "consentGiven" BOOLEAN NOT NULL DEFAULT false,
    "consentSignature" VARCHAR(500),
    "consentTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bb_donor_screenings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_blood_units" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "unitNumber" VARCHAR(48) NOT NULL,
    "barcode" VARCHAR(64) NOT NULL,
    "donorId" TEXT NOT NULL,
    "bagType" "BagType" NOT NULL,
    "collectionType" "CollectionType" NOT NULL,
    "bloodGroup" "BloodGroup",
    "rhFactor" VARCHAR(16),
    "collectionStartAt" TIMESTAMP(3),
    "collectionEndAt" TIMESTAMP(3),
    "volumeCollectedMl" INTEGER,
    "segmentCount" INTEGER,
    "status" "BloodUnitStatus" NOT NULL DEFAULT 'COLLECTED',
    "parentUnitId" TEXT,
    "componentType" "ComponentType",
    "expiryDate" TIMESTAMP(3),
    "donorAdverseEvent" VARCHAR(200),
    "donorAdverseSeverity" VARCHAR(32),
    "collectedByStaffId" TEXT,
    "pilotTubeLabels" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bb_blood_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_grouping_results" (
    "id" TEXT NOT NULL,
    "bloodUnitId" TEXT NOT NULL,
    "forwardGrouping" JSONB,
    "reverseGrouping" JSONB,
    "aboGroup" VARCHAR(8),
    "rhType" VARCHAR(16),
    "confirmedGroup" "BloodGroup",
    "antibodyScreenResult" VARCHAR(32),
    "antibodyIdentified" VARCHAR(200),
    "hasDiscrepancy" BOOLEAN NOT NULL DEFAULT false,
    "discrepancyNotes" VARCHAR(500),
    "method" VARCHAR(48),
    "testedByStaffId" TEXT,
    "verifiedByStaffId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bb_grouping_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_tti_tests" (
    "id" TEXT NOT NULL,
    "bloodUnitId" TEXT NOT NULL,
    "testName" VARCHAR(48) NOT NULL,
    "method" VARCHAR(48),
    "kitName" VARCHAR(120),
    "kitLotNo" VARCHAR(64),
    "result" "TTITestResult" NOT NULL DEFAULT 'PENDING',
    "rawValue" VARCHAR(120),
    "testedByStaffId" TEXT,
    "verifiedByStaffId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bb_tti_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_inventory_slots" (
    "id" TEXT NOT NULL,
    "bloodUnitId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "shelf" VARCHAR(32),
    "slot" VARCHAR(32),
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "bb_inventory_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_blood_requests" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "requestNumber" VARCHAR(48) NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "requestedComponent" "ComponentType" NOT NULL,
    "quantityUnits" INTEGER NOT NULL,
    "urgency" "BloodRequestUrgency" NOT NULL DEFAULT 'ROUTINE',
    "indication" VARCHAR(500),
    "diagnosis" VARCHAR(500),
    "status" "BloodRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestedByStaffId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slaTargetMinutes" INTEGER,
    "notes" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bb_blood_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_patient_samples" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "sampleId" VARCHAR(48) NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectedByStaffId" TEXT,
    "verifiedByStaffId" TEXT,
    "verificationMethod" VARCHAR(48),
    "patientBloodGroup" "BloodGroup",
    "patientAntibodies" VARCHAR(500),
    "groupHistoryConsistent" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bb_patient_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_cross_match_tests" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "bloodUnitId" TEXT NOT NULL,
    "method" "CrossMatchMethod" NOT NULL,
    "result" "CrossMatchResult" NOT NULL DEFAULT 'PENDING',
    "certificateNumber" VARCHAR(48),
    "validUntil" TIMESTAMP(3),
    "testedByStaffId" TEXT,
    "verifiedByStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bb_cross_match_tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_blood_issues" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "issueNumber" VARCHAR(48) NOT NULL,
    "bloodUnitId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "crossMatchId" TEXT,
    "issuedToWard" VARCHAR(120),
    "issuedToPerson" VARCHAR(160),
    "transportBoxTemp" DECIMAL(4,1),
    "visualInspectionOk" BOOLEAN NOT NULL DEFAULT true,
    "inspectionNotes" VARCHAR(500),
    "issuedByStaffId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isReturned" BOOLEAN NOT NULL DEFAULT false,
    "returnedAt" TIMESTAMP(3),
    "returnReason" VARCHAR(200),
    "restockEligible" BOOLEAN,
    "isEmergencyIssue" BOOLEAN NOT NULL DEFAULT false,
    "mtpSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bb_blood_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_transfusion_records" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "bedsideVerifiedAt" TIMESTAMP(3),
    "bedsideVerifier1StaffId" TEXT,
    "bedsideVerifier2StaffId" TEXT,
    "patientWristbandScan" BOOLEAN NOT NULL DEFAULT false,
    "unitBarcodeScan" BOOLEAN NOT NULL DEFAULT false,
    "bedsideVerificationOk" BOOLEAN,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "totalVolumeMl" INTEGER,
    "preVitals" JSONB,
    "vitals15Min" JSONB,
    "vitals30Min" JSONB,
    "vitals1Hr" JSONB,
    "postVitals" JSONB,
    "hasReaction" BOOLEAN NOT NULL DEFAULT false,
    "administeredByStaffId" TEXT,
    "doctorNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bb_transfusion_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_transfusion_reactions" (
    "id" TEXT NOT NULL,
    "transfusionId" TEXT NOT NULL,
    "reactionType" "TransfusionReactionType" NOT NULL,
    "severity" VARCHAR(32) NOT NULL,
    "onsetAt" TIMESTAMP(3),
    "description" VARCHAR(1000),
    "transfusionStopped" BOOLEAN NOT NULL DEFAULT true,
    "managementNotes" VARCHAR(1000),
    "investigationResults" JSONB,
    "rootCause" VARCHAR(500),
    "correctiveAction" VARCHAR(500),
    "reportedByStaffId" TEXT,
    "investigatedByStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bb_transfusion_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_qc_records" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "recordType" VARCHAR(32) NOT NULL,
    "testSystem" VARCHAR(120) NOT NULL,
    "equipmentId" TEXT,
    "qcLevel" VARCHAR(32),
    "expectedValue" VARCHAR(64),
    "observedValue" VARCHAR(64),
    "westgardResult" VARCHAR(32),
    "westgardRule" VARCHAR(32),
    "eqasCycleId" VARCHAR(64),
    "eqasProvider" VARCHAR(120),
    "eqasResult" VARCHAR(32),
    "calibrationValues" JSONB,
    "calibrationPassFail" VARCHAR(16),
    "correctiveAction" VARCHAR(500),
    "performedByStaffId" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedByStaffId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bb_qc_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_donation_camps" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "campCode" VARCHAR(32) NOT NULL,
    "campDate" TIMESTAMP(3) NOT NULL,
    "location" VARCHAR(500) NOT NULL,
    "organizer" VARCHAR(200) NOT NULL,
    "estimatedDonors" INTEGER,
    "actualDonors" INTEGER,
    "unitsCollected" INTEGER,
    "teamAllocation" JSONB,
    "equipmentChecklist" JSONB,
    "status" VARCHAR(32) NOT NULL DEFAULT 'PLANNED',
    "syncedAt" TIMESTAMP(3),
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bb_donation_camps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_mtp_sessions" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "encounterId" TEXT,
    "activatedByStaffId" TEXT,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deactivatedByStaffId" TEXT,
    "deactivatedAt" TIMESTAMP(3),
    "packRatio" JSONB,
    "status" VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    "summary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bb_mtp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_msbos_configs" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "procedureCode" VARCHAR(48) NOT NULL,
    "procedureName" VARCHAR(200) NOT NULL,
    "recommendedPRBC" INTEGER NOT NULL DEFAULT 0,
    "recommendedFFP" INTEGER NOT NULL DEFAULT 0,
    "recommendedPlatelet" INTEGER NOT NULL DEFAULT 0,
    "recommendedCryo" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bb_msbos_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "compliance_workspaces_orgId_branchId_idx" ON "compliance_workspaces"("orgId", "branchId");

-- CreateIndex
CREATE INDEX "compliance_workspaces_status_type_idx" ON "compliance_workspaces"("status", "type");

-- CreateIndex
CREATE UNIQUE INDEX "abdm_configs_workspaceId_environment_key" ON "abdm_configs"("workspaceId", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "hfr_facility_profiles_workspaceId_key" ON "hfr_facility_profiles"("workspaceId");

-- CreateIndex
CREATE INDEX "hpr_professional_links_workspaceId_registrationStatus_idx" ON "hpr_professional_links"("workspaceId", "registrationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "hpr_professional_links_workspaceId_staffId_key" ON "hpr_professional_links"("workspaceId", "staffId");

-- CreateIndex
CREATE UNIQUE INDEX "hpr_professional_links_workspaceId_hprId_key" ON "hpr_professional_links"("workspaceId", "hprId");

-- CreateIndex
CREATE UNIQUE INDEX "scheme_empanelments_govSchemeConfigId_key" ON "scheme_empanelments"("govSchemeConfigId");

-- CreateIndex
CREATE INDEX "scheme_empanelments_workspaceId_scheme_status_idx" ON "scheme_empanelments"("workspaceId", "scheme", "status");

-- CreateIndex
CREATE UNIQUE INDEX "scheme_empanelments_workspaceId_scheme_key" ON "scheme_empanelments"("workspaceId", "scheme");

-- CreateIndex
CREATE INDEX "scheme_rate_cards_workspaceId_scheme_status_idx" ON "scheme_rate_cards"("workspaceId", "scheme", "status");

-- CreateIndex
CREATE UNIQUE INDEX "scheme_rate_cards_workspaceId_scheme_version_key" ON "scheme_rate_cards"("workspaceId", "scheme", "version");

-- CreateIndex
CREATE INDEX "scheme_rate_card_items_rateCardId_name_idx" ON "scheme_rate_card_items"("rateCardId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "scheme_rate_card_items_rateCardId_code_key" ON "scheme_rate_card_items"("rateCardId", "code");

-- CreateIndex
CREATE INDEX "scheme_mappings_workspaceId_scheme_idx" ON "scheme_mappings"("workspaceId", "scheme");

-- CreateIndex
CREATE UNIQUE INDEX "scheme_mappings_workspaceId_scheme_externalCode_key" ON "scheme_mappings"("workspaceId", "scheme", "externalCode");

-- CreateIndex
CREATE UNIQUE INDEX "scheme_api_credentials_workspaceId_scheme_environment_key" ON "scheme_api_credentials"("workspaceId", "scheme", "environment");

-- CreateIndex
CREATE INDEX "nabh_templates_orgId_isActive_idx" ON "nabh_templates"("orgId", "isActive");

-- CreateIndex
CREATE INDEX "nabh_template_items_templateId_chapter_idx" ON "nabh_template_items"("templateId", "chapter");

-- CreateIndex
CREATE UNIQUE INDEX "nabh_template_items_templateId_standardCode_meCode_key" ON "nabh_template_items"("templateId", "standardCode", "meCode");

-- CreateIndex
CREATE INDEX "nabh_workspace_items_workspaceId_chapter_status_idx" ON "nabh_workspace_items"("workspaceId", "chapter", "status");

-- CreateIndex
CREATE UNIQUE INDEX "nabh_workspace_items_workspaceId_standardCode_meCode_key" ON "nabh_workspace_items"("workspaceId", "standardCode", "meCode");

-- CreateIndex
CREATE INDEX "evidence_artifacts_workspaceId_expiresAt_idx" ON "evidence_artifacts"("workspaceId", "expiresAt");

-- CreateIndex
CREATE INDEX "evidence_links_targetType_targetId_idx" ON "evidence_links"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "evidence_links_evidenceId_targetType_targetId_key" ON "evidence_links"("evidenceId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "audit_cycles_workspaceId_status_idx" ON "audit_cycles"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "audit_findings_auditId_severity_idx" ON "audit_findings"("auditId", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "capa_actions_findingId_key" ON "capa_actions"("findingId");

-- CreateIndex
CREATE INDEX "capa_actions_ownerStaffId_status_idx" ON "capa_actions"("ownerStaffId", "status");

-- CreateIndex
CREATE INDEX "compliance_approvals_workspaceId_status_idx" ON "compliance_approvals"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "compliance_audit_logs_workspaceId_entityType_entityId_idx" ON "compliance_audit_logs"("workspaceId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "bb_facilities_branchId_key" ON "bb_facilities"("branchId");

-- CreateIndex
CREATE INDEX "bb_component_masters_branchId_isActive_idx" ON "bb_component_masters"("branchId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "bb_component_masters_branchId_code_key" ON "bb_component_masters"("branchId", "code");

-- CreateIndex
CREATE INDEX "bb_equipment_branchId_equipmentType_isActive_idx" ON "bb_equipment"("branchId", "equipmentType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "bb_equipment_branchId_equipmentId_key" ON "bb_equipment"("branchId", "equipmentId");

-- CreateIndex
CREATE INDEX "bb_equipment_temp_logs_equipmentId_recordedAt_idx" ON "bb_equipment_temp_logs"("equipmentId", "recordedAt");

-- CreateIndex
CREATE INDEX "bb_equipment_temp_logs_equipmentId_isBreaching_idx" ON "bb_equipment_temp_logs"("equipmentId", "isBreaching");

-- CreateIndex
CREATE INDEX "bb_reagents_branchId_isActive_idx" ON "bb_reagents"("branchId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "bb_reagents_branchId_code_key" ON "bb_reagents"("branchId", "code");

-- CreateIndex
CREATE INDEX "bb_tariff_configs_branchId_chargeType_isActive_idx" ON "bb_tariff_configs"("branchId", "chargeType", "isActive");

-- CreateIndex
CREATE INDEX "bb_donors_branchId_donorStatus_isActive_idx" ON "bb_donors"("branchId", "donorStatus", "isActive");

-- CreateIndex
CREATE INDEX "bb_donors_branchId_bloodGroup_idx" ON "bb_donors"("branchId", "bloodGroup");

-- CreateIndex
CREATE INDEX "bb_donors_mobile_idx" ON "bb_donors"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "bb_donors_branchId_donorNumber_key" ON "bb_donors"("branchId", "donorNumber");

-- CreateIndex
CREATE INDEX "bb_donor_deferrals_donorId_startDate_idx" ON "bb_donor_deferrals"("donorId", "startDate");

-- CreateIndex
CREATE INDEX "bb_donor_screenings_donorId_screeningDate_idx" ON "bb_donor_screenings"("donorId", "screeningDate");

-- CreateIndex
CREATE INDEX "bb_blood_units_branchId_status_bloodGroup_idx" ON "bb_blood_units"("branchId", "status", "bloodGroup");

-- CreateIndex
CREATE INDEX "bb_blood_units_branchId_expiryDate_idx" ON "bb_blood_units"("branchId", "expiryDate");

-- CreateIndex
CREATE INDEX "bb_blood_units_donorId_idx" ON "bb_blood_units"("donorId");

-- CreateIndex
CREATE UNIQUE INDEX "bb_blood_units_branchId_unitNumber_key" ON "bb_blood_units"("branchId", "unitNumber");

-- CreateIndex
CREATE INDEX "bb_grouping_results_bloodUnitId_idx" ON "bb_grouping_results"("bloodUnitId");

-- CreateIndex
CREATE INDEX "bb_tti_tests_bloodUnitId_testName_idx" ON "bb_tti_tests"("bloodUnitId", "testName");

-- CreateIndex
CREATE UNIQUE INDEX "bb_inventory_slots_bloodUnitId_key" ON "bb_inventory_slots"("bloodUnitId");

-- CreateIndex
CREATE INDEX "bb_inventory_slots_equipmentId_idx" ON "bb_inventory_slots"("equipmentId");

-- CreateIndex
CREATE INDEX "bb_blood_requests_branchId_status_urgency_idx" ON "bb_blood_requests"("branchId", "status", "urgency");

-- CreateIndex
CREATE INDEX "bb_blood_requests_patientId_idx" ON "bb_blood_requests"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "bb_blood_requests_branchId_requestNumber_key" ON "bb_blood_requests"("branchId", "requestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "bb_patient_samples_requestId_key" ON "bb_patient_samples"("requestId");

-- CreateIndex
CREATE INDEX "bb_cross_match_tests_requestId_result_idx" ON "bb_cross_match_tests"("requestId", "result");

-- CreateIndex
CREATE INDEX "bb_cross_match_tests_bloodUnitId_idx" ON "bb_cross_match_tests"("bloodUnitId");

-- CreateIndex
CREATE INDEX "bb_blood_issues_branchId_issuedAt_idx" ON "bb_blood_issues"("branchId", "issuedAt");

-- CreateIndex
CREATE INDEX "bb_blood_issues_bloodUnitId_idx" ON "bb_blood_issues"("bloodUnitId");

-- CreateIndex
CREATE INDEX "bb_blood_issues_requestId_idx" ON "bb_blood_issues"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "bb_blood_issues_branchId_issueNumber_key" ON "bb_blood_issues"("branchId", "issueNumber");

-- CreateIndex
CREATE UNIQUE INDEX "bb_transfusion_records_issueId_key" ON "bb_transfusion_records"("issueId");

-- CreateIndex
CREATE INDEX "bb_transfusion_records_patientId_idx" ON "bb_transfusion_records"("patientId");

-- CreateIndex
CREATE INDEX "bb_transfusion_reactions_transfusionId_idx" ON "bb_transfusion_reactions"("transfusionId");

-- CreateIndex
CREATE INDEX "bb_qc_records_branchId_recordType_performedAt_idx" ON "bb_qc_records"("branchId", "recordType", "performedAt");

-- CreateIndex
CREATE INDEX "bb_donation_camps_branchId_status_idx" ON "bb_donation_camps"("branchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bb_donation_camps_branchId_campCode_key" ON "bb_donation_camps"("branchId", "campCode");

-- CreateIndex
CREATE INDEX "bb_mtp_sessions_branchId_status_idx" ON "bb_mtp_sessions"("branchId", "status");

-- CreateIndex
CREATE INDEX "bb_mtp_sessions_patientId_idx" ON "bb_mtp_sessions"("patientId");

-- CreateIndex
CREATE INDEX "bb_msbos_configs_branchId_isActive_idx" ON "bb_msbos_configs"("branchId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "bb_msbos_configs_branchId_procedureCode_key" ON "bb_msbos_configs"("branchId", "procedureCode");

-- AddForeignKey
ALTER TABLE "compliance_workspaces" ADD CONSTRAINT "compliance_workspaces_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_workspaces" ADD CONSTRAINT "compliance_workspaces_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abdm_configs" ADD CONSTRAINT "abdm_configs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "compliance_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hfr_facility_profiles" ADD CONSTRAINT "hfr_facility_profiles_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "compliance_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hpr_professional_links" ADD CONSTRAINT "hpr_professional_links_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "compliance_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hpr_professional_links" ADD CONSTRAINT "hpr_professional_links_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hpr_professional_links" ADD CONSTRAINT "hpr_professional_links_verifiedByStaffId_fkey" FOREIGN KEY ("verifiedByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheme_empanelments" ADD CONSTRAINT "scheme_empanelments_govSchemeConfigId_fkey" FOREIGN KEY ("govSchemeConfigId") REFERENCES "GovernmentSchemeConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheme_empanelments" ADD CONSTRAINT "scheme_empanelments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "compliance_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheme_rate_cards" ADD CONSTRAINT "scheme_rate_cards_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "compliance_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheme_rate_card_items" ADD CONSTRAINT "scheme_rate_card_items_rateCardId_fkey" FOREIGN KEY ("rateCardId") REFERENCES "scheme_rate_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheme_mappings" ADD CONSTRAINT "scheme_mappings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "compliance_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheme_api_credentials" ADD CONSTRAINT "scheme_api_credentials_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "compliance_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nabh_templates" ADD CONSTRAINT "nabh_templates_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nabh_template_items" ADD CONSTRAINT "nabh_template_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "nabh_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nabh_workspace_items" ADD CONSTRAINT "nabh_workspace_items_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "compliance_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nabh_workspace_items" ADD CONSTRAINT "nabh_workspace_items_ownerStaffId_fkey" FOREIGN KEY ("ownerStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nabh_workspace_items" ADD CONSTRAINT "nabh_workspace_items_verifiedByStaffId_fkey" FOREIGN KEY ("verifiedByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_artifacts" ADD CONSTRAINT "evidence_artifacts_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "compliance_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_artifacts" ADD CONSTRAINT "evidence_artifacts_uploadedByStaffId_fkey" FOREIGN KEY ("uploadedByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_links" ADD CONSTRAINT "evidence_links_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "evidence_artifacts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_cycles" ADD CONSTRAINT "audit_cycles_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "compliance_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "audit_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_actions" ADD CONSTRAINT "capa_actions_findingId_fkey" FOREIGN KEY ("findingId") REFERENCES "audit_findings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capa_actions" ADD CONSTRAINT "capa_actions_ownerStaffId_fkey" FOREIGN KEY ("ownerStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_approvals" ADD CONSTRAINT "compliance_approvals_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "compliance_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_approvals" ADD CONSTRAINT "compliance_approvals_requestedByStaffId_fkey" FOREIGN KEY ("requestedByStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_approvals" ADD CONSTRAINT "compliance_approvals_decidedByStaffId_fkey" FOREIGN KEY ("decidedByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_audit_logs" ADD CONSTRAINT "compliance_audit_logs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "compliance_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_audit_logs" ADD CONSTRAINT "compliance_audit_logs_actorStaffId_fkey" FOREIGN KEY ("actorStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_facilities" ADD CONSTRAINT "bb_facilities_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_component_masters" ADD CONSTRAINT "bb_component_masters_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_equipment" ADD CONSTRAINT "bb_equipment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_equipment_temp_logs" ADD CONSTRAINT "bb_equipment_temp_logs_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "bb_equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_reagents" ADD CONSTRAINT "bb_reagents_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_tariff_configs" ADD CONSTRAINT "bb_tariff_configs_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_tariff_configs" ADD CONSTRAINT "bb_tariff_configs_componentMasterId_fkey" FOREIGN KEY ("componentMasterId") REFERENCES "bb_component_masters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_donors" ADD CONSTRAINT "bb_donors_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_donors" ADD CONSTRAINT "bb_donors_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_donor_deferrals" ADD CONSTRAINT "bb_donor_deferrals_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "bb_donors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_donor_screenings" ADD CONSTRAINT "bb_donor_screenings_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "bb_donors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_blood_units" ADD CONSTRAINT "bb_blood_units_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_blood_units" ADD CONSTRAINT "bb_blood_units_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "bb_donors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_blood_units" ADD CONSTRAINT "bb_blood_units_parentUnitId_fkey" FOREIGN KEY ("parentUnitId") REFERENCES "bb_blood_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_grouping_results" ADD CONSTRAINT "bb_grouping_results_bloodUnitId_fkey" FOREIGN KEY ("bloodUnitId") REFERENCES "bb_blood_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_tti_tests" ADD CONSTRAINT "bb_tti_tests_bloodUnitId_fkey" FOREIGN KEY ("bloodUnitId") REFERENCES "bb_blood_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_inventory_slots" ADD CONSTRAINT "bb_inventory_slots_bloodUnitId_fkey" FOREIGN KEY ("bloodUnitId") REFERENCES "bb_blood_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_inventory_slots" ADD CONSTRAINT "bb_inventory_slots_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "bb_equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_blood_requests" ADD CONSTRAINT "bb_blood_requests_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_blood_requests" ADD CONSTRAINT "bb_blood_requests_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_patient_samples" ADD CONSTRAINT "bb_patient_samples_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "bb_blood_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_cross_match_tests" ADD CONSTRAINT "bb_cross_match_tests_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "bb_blood_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_cross_match_tests" ADD CONSTRAINT "bb_cross_match_tests_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "bb_patient_samples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_cross_match_tests" ADD CONSTRAINT "bb_cross_match_tests_bloodUnitId_fkey" FOREIGN KEY ("bloodUnitId") REFERENCES "bb_blood_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_blood_issues" ADD CONSTRAINT "bb_blood_issues_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_blood_issues" ADD CONSTRAINT "bb_blood_issues_bloodUnitId_fkey" FOREIGN KEY ("bloodUnitId") REFERENCES "bb_blood_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_blood_issues" ADD CONSTRAINT "bb_blood_issues_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "bb_blood_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_blood_issues" ADD CONSTRAINT "bb_blood_issues_crossMatchId_fkey" FOREIGN KEY ("crossMatchId") REFERENCES "bb_cross_match_tests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_blood_issues" ADD CONSTRAINT "bb_blood_issues_mtpSessionId_fkey" FOREIGN KEY ("mtpSessionId") REFERENCES "bb_mtp_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_transfusion_records" ADD CONSTRAINT "bb_transfusion_records_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_transfusion_records" ADD CONSTRAINT "bb_transfusion_records_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "bb_blood_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_transfusion_records" ADD CONSTRAINT "bb_transfusion_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_transfusion_reactions" ADD CONSTRAINT "bb_transfusion_reactions_transfusionId_fkey" FOREIGN KEY ("transfusionId") REFERENCES "bb_transfusion_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_qc_records" ADD CONSTRAINT "bb_qc_records_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_qc_records" ADD CONSTRAINT "bb_qc_records_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "bb_equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_donation_camps" ADD CONSTRAINT "bb_donation_camps_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_mtp_sessions" ADD CONSTRAINT "bb_mtp_sessions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_mtp_sessions" ADD CONSTRAINT "bb_mtp_sessions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_msbos_configs" ADD CONSTRAINT "bb_msbos_configs_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
