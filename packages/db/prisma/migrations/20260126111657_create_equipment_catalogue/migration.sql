-- CreateEnum
CREATE TYPE "EquipmentDocumentType" AS ENUM ('AERB_LICENSE', 'PCPNDT_CERTIFICATE', 'SHIELDING_PLAN', 'CALIBRATION_CERTIFICATE', 'INSTALLATION_REPORT', 'USER_MANUAL', 'SOP', 'WARRANTY_CARD', 'AMC_CONTRACT', 'SERVICE_REPORT', 'INSURANCE_POLICY', 'OTHER');

-- CreateEnum
CREATE TYPE "EquipmentContractType" AS ENUM ('WARRANTY', 'AMC', 'CMC', 'LEASE', 'RENTAL', 'INSURANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "EquipmentMaintenanceType" AS ENUM ('PM', 'CALIBRATION', 'QUALIFICATION', 'SAFETY_TEST', 'REPAIR', 'OTHER');

-- CreateEnum
CREATE TYPE "EquipmentMaintenanceStatus" AS ENUM ('DUE', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EquipmentEvidenceStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EquipmentMovementReason" AS ENUM ('INSTALLATION', 'TRANSFER', 'TEMPORARY_MOVE', 'STORAGE', 'REPLACEMENT', 'DECOMMISSION', 'OTHER');

-- CreateEnum
CREATE TYPE "GovernedChangeStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'APPLIED');

-- CreateTable
CREATE TABLE "EquipmentAssetRevision" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "category" "EquipmentCategory" NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "serial" TEXT,
    "ownerDepartmentId" TEXT,
    "operationalStatus" "EquipmentOperationalStatus" NOT NULL,
    "isSchedulable" BOOLEAN NOT NULL,
    "amcVendor" TEXT,
    "amcValidFrom" TIMESTAMP(3),
    "amcValidTo" TIMESTAMP(3),
    "warrantyValidTo" TIMESTAMP(3),
    "pmFrequencyDays" INTEGER,
    "nextPmDueAt" TIMESTAMP(3),
    "aerbLicenseNo" TEXT,
    "aerbValidTo" TIMESTAMP(3),
    "pcpndtRegNo" TEXT,
    "pcpndtValidTo" TIMESTAMP(3),
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentAssetRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentPlacement" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "locationNodeId" TEXT,
    "unitId" TEXT,
    "roomId" TEXT,
    "resourceId" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentMovement" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "reason" "EquipmentMovementReason" NOT NULL DEFAULT 'TRANSFER',
    "notes" TEXT,
    "fromLocationNodeId" TEXT,
    "fromUnitId" TEXT,
    "fromRoomId" TEXT,
    "fromResourceId" TEXT,
    "toLocationNodeId" TEXT,
    "toUnitId" TEXT,
    "toRoomId" TEXT,
    "toResourceId" TEXT,
    "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "movedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EquipmentMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentDocument" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" "EquipmentDocumentType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileMime" TEXT,
    "fileSize" INTEGER,
    "checksum" TEXT,
    "refNo" TEXT,
    "issuedAt" TIMESTAMP(3),
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "meta" JSONB,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentContract" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" "EquipmentContractType" NOT NULL,
    "contractNo" TEXT,
    "vendorName" TEXT,
    "vendorContact" JSONB,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "terms" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentMaintenanceTask" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "type" "EquipmentMaintenanceType" NOT NULL,
    "status" "EquipmentMaintenanceStatus" NOT NULL DEFAULT 'DUE',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "downtimeTicketId" TEXT,
    "performedByVendor" TEXT,
    "performedByStaffId" TEXT,
    "checklist" JSONB,
    "measurements" JSONB,
    "outcomeNotes" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentMaintenanceTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentComplianceEvidence" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "complianceCode" VARCHAR(64) NOT NULL,
    "evidenceType" VARCHAR(64) NOT NULL,
    "documentId" TEXT,
    "status" "EquipmentEvidenceStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "notes" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentComplianceEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernedChangeRequest" (
    "id" TEXT NOT NULL,
    "branchId" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "GovernedChangeStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "submittedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "approvalNote" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedByUserId" TEXT,
    "rejectionReason" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovernedChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EquipmentAssetRevision_assetId_effectiveFrom_idx" ON "EquipmentAssetRevision"("assetId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "EquipmentAssetRevision_code_idx" ON "EquipmentAssetRevision"("code");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentPlacement_assetId_key" ON "EquipmentPlacement"("assetId");

-- CreateIndex
CREATE INDEX "EquipmentPlacement_branchId_locationNodeId_idx" ON "EquipmentPlacement"("branchId", "locationNodeId");

-- CreateIndex
CREATE INDEX "EquipmentPlacement_branchId_unitId_idx" ON "EquipmentPlacement"("branchId", "unitId");

-- CreateIndex
CREATE INDEX "EquipmentPlacement_branchId_roomId_idx" ON "EquipmentPlacement"("branchId", "roomId");

-- CreateIndex
CREATE INDEX "EquipmentPlacement_branchId_resourceId_idx" ON "EquipmentPlacement"("branchId", "resourceId");

-- CreateIndex
CREATE INDEX "EquipmentMovement_assetId_movedAt_idx" ON "EquipmentMovement"("assetId", "movedAt");

-- CreateIndex
CREATE INDEX "EquipmentMovement_branchId_movedAt_idx" ON "EquipmentMovement"("branchId", "movedAt");

-- CreateIndex
CREATE INDEX "EquipmentDocument_assetId_type_idx" ON "EquipmentDocument"("assetId", "type");

-- CreateIndex
CREATE INDEX "EquipmentDocument_branchId_type_idx" ON "EquipmentDocument"("branchId", "type");

-- CreateIndex
CREATE INDEX "EquipmentDocument_branchId_validTo_idx" ON "EquipmentDocument"("branchId", "validTo");

-- CreateIndex
CREATE INDEX "EquipmentContract_assetId_type_isActive_idx" ON "EquipmentContract"("assetId", "type", "isActive");

-- CreateIndex
CREATE INDEX "EquipmentContract_branchId_type_endAt_idx" ON "EquipmentContract"("branchId", "type", "endAt");

-- CreateIndex
CREATE INDEX "EquipmentMaintenanceTask_branchId_dueAt_status_idx" ON "EquipmentMaintenanceTask"("branchId", "dueAt", "status");

-- CreateIndex
CREATE INDEX "EquipmentMaintenanceTask_assetId_status_idx" ON "EquipmentMaintenanceTask"("assetId", "status");

-- CreateIndex
CREATE INDEX "EquipmentComplianceEvidence_branchId_complianceCode_status_idx" ON "EquipmentComplianceEvidence"("branchId", "complianceCode", "status");

-- CreateIndex
CREATE INDEX "EquipmentComplianceEvidence_assetId_complianceCode_idx" ON "EquipmentComplianceEvidence"("assetId", "complianceCode");

-- CreateIndex
CREATE INDEX "GovernedChangeRequest_branchId_status_createdAt_idx" ON "GovernedChangeRequest"("branchId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "GovernedChangeRequest_entity_entityId_status_idx" ON "GovernedChangeRequest"("entity", "entityId", "status");

-- AddForeignKey
ALTER TABLE "EquipmentAssetRevision" ADD CONSTRAINT "EquipmentAssetRevision_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "EquipmentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentAssetRevision" ADD CONSTRAINT "EquipmentAssetRevision_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentPlacement" ADD CONSTRAINT "EquipmentPlacement_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "EquipmentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentPlacement" ADD CONSTRAINT "EquipmentPlacement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentPlacement" ADD CONSTRAINT "EquipmentPlacement_locationNodeId_fkey" FOREIGN KEY ("locationNodeId") REFERENCES "LocationNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentPlacement" ADD CONSTRAINT "EquipmentPlacement_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentPlacement" ADD CONSTRAINT "EquipmentPlacement_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "UnitRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentPlacement" ADD CONSTRAINT "EquipmentPlacement_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "UnitResource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentPlacement" ADD CONSTRAINT "EquipmentPlacement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentMovement" ADD CONSTRAINT "EquipmentMovement_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "EquipmentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentMovement" ADD CONSTRAINT "EquipmentMovement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentMovement" ADD CONSTRAINT "EquipmentMovement_movedByUserId_fkey" FOREIGN KEY ("movedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentDocument" ADD CONSTRAINT "EquipmentDocument_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentDocument" ADD CONSTRAINT "EquipmentDocument_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "EquipmentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentDocument" ADD CONSTRAINT "EquipmentDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentContract" ADD CONSTRAINT "EquipmentContract_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentContract" ADD CONSTRAINT "EquipmentContract_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "EquipmentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentContract" ADD CONSTRAINT "EquipmentContract_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentMaintenanceTask" ADD CONSTRAINT "EquipmentMaintenanceTask_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentMaintenanceTask" ADD CONSTRAINT "EquipmentMaintenanceTask_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "EquipmentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentMaintenanceTask" ADD CONSTRAINT "EquipmentMaintenanceTask_downtimeTicketId_fkey" FOREIGN KEY ("downtimeTicketId") REFERENCES "DowntimeTicket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentMaintenanceTask" ADD CONSTRAINT "EquipmentMaintenanceTask_performedByStaffId_fkey" FOREIGN KEY ("performedByStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentMaintenanceTask" ADD CONSTRAINT "EquipmentMaintenanceTask_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentComplianceEvidence" ADD CONSTRAINT "EquipmentComplianceEvidence_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentComplianceEvidence" ADD CONSTRAINT "EquipmentComplianceEvidence_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "EquipmentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentComplianceEvidence" ADD CONSTRAINT "EquipmentComplianceEvidence_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "EquipmentDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentComplianceEvidence" ADD CONSTRAINT "EquipmentComplianceEvidence_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernedChangeRequest" ADD CONSTRAINT "GovernedChangeRequest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernedChangeRequest" ADD CONSTRAINT "GovernedChangeRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernedChangeRequest" ADD CONSTRAINT "GovernedChangeRequest_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernedChangeRequest" ADD CONSTRAINT "GovernedChangeRequest_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernedChangeRequest" ADD CONSTRAINT "GovernedChangeRequest_rejectedByUserId_fkey" FOREIGN KEY ("rejectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
