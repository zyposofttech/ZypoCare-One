/*
  Warnings:

  - A unique constraint covering the columns `[profilePhotoDocumentId]` on the table `Staff` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[signatureDocumentId]` on the table `Staff` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stampDocumentId]` on the table `Staff` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "StaffOnboardingStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'ACTIVE');

-- CreateEnum
CREATE TYPE "StaffDocumentType" AS ENUM ('PROFILE_PHOTO', 'SIGNATURE', 'STAMP', 'ID_PROOF', 'EDUCATION_DEGREE', 'TRAINING_CERTIFICATE', 'EMPLOYMENT_CONTRACT', 'MEDICAL_REG_EVIDENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "StaffDocumentVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StaffOnboardingItemType" AS ENUM ('DOCUMENT', 'CREDENTIAL', 'IDENTIFIER', 'ASSIGNMENT', 'SYSTEM_ACCESS', 'PRIVILEGE', 'OTHER');

-- CreateEnum
CREATE TYPE "StaffOnboardingItemStatus" AS ENUM ('PENDING', 'DONE', 'WAIVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StaffPrivilegeArea" AS ENUM ('OPD', 'IPD', 'ER', 'OT', 'ICU', 'DIAGNOSTICS', 'LAB', 'RADIOLOGY', 'PHARMACY', 'BILLING', 'ADMIN');

-- CreateEnum
CREATE TYPE "StaffPrivilegeAction" AS ENUM ('VIEW', 'ORDER', 'PRESCRIBE', 'PERFORM', 'ATTEST', 'DISCHARGE', 'SIGN', 'APPROVE', 'OTHER');

-- CreateEnum
CREATE TYPE "StaffPrivilegeTargetType" AS ENUM ('NONE', 'SERVICE_ITEM', 'DIAGNOSTIC_ITEM', 'ORDER_SET', 'OTHER');

-- CreateEnum
CREATE TYPE "StaffPrivilegeStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "StaffComplianceRequirementKind" AS ENUM ('DOCUMENT', 'CREDENTIAL', 'IDENTIFIER');

-- CreateEnum
CREATE TYPE "StaffComplianceAssignmentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingCompletedByUserId" TEXT,
ADD COLUMN     "onboardingStartedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingStatus" "StaffOnboardingStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "profilePhotoDocumentId" TEXT,
ADD COLUMN     "signatureDocumentId" TEXT,
ADD COLUMN     "stampDocumentId" TEXT;

-- CreateTable
CREATE TABLE "StaffDocument" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "branchId" TEXT,
    "staffAssignmentId" TEXT,
    "type" "StaffDocumentType" NOT NULL DEFAULT 'OTHER',
    "title" VARCHAR(160),
    "description" TEXT,
    "refNo" VARCHAR(80),
    "issuedBy" VARCHAR(120),
    "issuedAt" TIMESTAMP(3),
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "fileUrl" VARCHAR(512) NOT NULL,
    "fileMime" VARCHAR(120),
    "fileSizeBytes" INTEGER,
    "checksum" VARCHAR(128),
    "tags" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "uploadedByUserId" TEXT,
    "verificationStatus" "StaffDocumentVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "verificationNotes" VARCHAR(240),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffCredentialEvidence" (
    "id" TEXT NOT NULL,
    "staffCredentialId" TEXT NOT NULL,
    "staffDocumentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffCredentialEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffProviderProfile" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "providerCode" VARCHAR(32),
    "displayName" VARCHAR(160),
    "departmentId" TEXT,
    "specialtyId" TEXT,
    "consultationModes" JSONB,
    "schedulingProfile" JSONB,
    "billingProfile" JSONB,
    "clinicalProfile" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffProviderProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffPrivilegeGrant" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "staffAssignmentId" TEXT,
    "area" "StaffPrivilegeArea" NOT NULL,
    "action" "StaffPrivilegeAction" NOT NULL,
    "targetType" "StaffPrivilegeTargetType" NOT NULL DEFAULT 'NONE',
    "targetId" VARCHAR(80),
    "targetMeta" JSONB,
    "status" "StaffPrivilegeStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "grantedByUserId" TEXT,
    "notes" VARCHAR(240),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffPrivilegeGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffOnboardingItem" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "branchId" TEXT,
    "type" "StaffOnboardingItemType" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "status" "StaffOnboardingItemStatus" NOT NULL DEFAULT 'PENDING',
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "completedByUserId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffOnboardingItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffCompliancePack" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "category" "StaffCategory",
    "roleTemplateId" TEXT,
    "branchId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffCompliancePack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffComplianceRequirement" (
    "id" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "kind" "StaffComplianceRequirementKind" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "documentType" "StaffDocumentType",
    "credentialType" "StaffCredentialType",
    "identifierType" "StaffIdentifierType",
    "renewalRequired" BOOLEAN NOT NULL DEFAULT false,
    "renewalWindowDays" INTEGER,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffComplianceRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffComplianceAssignment" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "branchId" TEXT,
    "status" "StaffComplianceAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "assignedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffComplianceAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffDocument_staffId_type_idx" ON "StaffDocument"("staffId", "type");

-- CreateIndex
CREATE INDEX "StaffDocument_branchId_type_idx" ON "StaffDocument"("branchId", "type");

-- CreateIndex
CREATE INDEX "StaffDocument_staffAssignmentId_idx" ON "StaffDocument"("staffAssignmentId");

-- CreateIndex
CREATE INDEX "StaffDocument_validTo_idx" ON "StaffDocument"("validTo");

-- CreateIndex
CREATE INDEX "StaffDocument_verificationStatus_idx" ON "StaffDocument"("verificationStatus");

-- CreateIndex
CREATE INDEX "StaffDocument_isActive_idx" ON "StaffDocument"("isActive");

-- CreateIndex
CREATE INDEX "StaffCredentialEvidence_staffCredentialId_idx" ON "StaffCredentialEvidence"("staffCredentialId");

-- CreateIndex
CREATE INDEX "StaffCredentialEvidence_staffDocumentId_idx" ON "StaffCredentialEvidence"("staffDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffCredentialEvidence_staffCredentialId_staffDocumentId_key" ON "StaffCredentialEvidence"("staffCredentialId", "staffDocumentId");

-- CreateIndex
CREATE INDEX "StaffProviderProfile_branchId_isActive_idx" ON "StaffProviderProfile"("branchId", "isActive");

-- CreateIndex
CREATE INDEX "StaffProviderProfile_departmentId_idx" ON "StaffProviderProfile"("departmentId");

-- CreateIndex
CREATE INDEX "StaffProviderProfile_specialtyId_idx" ON "StaffProviderProfile"("specialtyId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffProviderProfile_staffId_branchId_key" ON "StaffProviderProfile"("staffId", "branchId");

-- CreateIndex
CREATE INDEX "StaffPrivilegeGrant_staffId_branchId_area_action_idx" ON "StaffPrivilegeGrant"("staffId", "branchId", "area", "action");

-- CreateIndex
CREATE INDEX "StaffPrivilegeGrant_branchId_status_idx" ON "StaffPrivilegeGrant"("branchId", "status");

-- CreateIndex
CREATE INDEX "StaffPrivilegeGrant_effectiveTo_idx" ON "StaffPrivilegeGrant"("effectiveTo");

-- CreateIndex
CREATE INDEX "StaffPrivilegeGrant_targetType_targetId_idx" ON "StaffPrivilegeGrant"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "StaffPrivilegeGrant_staffAssignmentId_idx" ON "StaffPrivilegeGrant"("staffAssignmentId");

-- CreateIndex
CREATE INDEX "StaffOnboardingItem_staffId_status_idx" ON "StaffOnboardingItem"("staffId", "status");

-- CreateIndex
CREATE INDEX "StaffOnboardingItem_branchId_status_idx" ON "StaffOnboardingItem"("branchId", "status");

-- CreateIndex
CREATE INDEX "StaffOnboardingItem_type_status_idx" ON "StaffOnboardingItem"("type", "status");

-- CreateIndex
CREATE INDEX "StaffOnboardingItem_dueAt_idx" ON "StaffOnboardingItem"("dueAt");

-- CreateIndex
CREATE INDEX "StaffCompliancePack_category_idx" ON "StaffCompliancePack"("category");

-- CreateIndex
CREATE INDEX "StaffCompliancePack_roleTemplateId_idx" ON "StaffCompliancePack"("roleTemplateId");

-- CreateIndex
CREATE INDEX "StaffCompliancePack_branchId_idx" ON "StaffCompliancePack"("branchId");

-- CreateIndex
CREATE INDEX "StaffCompliancePack_isActive_idx" ON "StaffCompliancePack"("isActive");

-- CreateIndex
CREATE INDEX "StaffComplianceRequirement_packId_kind_idx" ON "StaffComplianceRequirement"("packId", "kind");

-- CreateIndex
CREATE INDEX "StaffComplianceRequirement_documentType_idx" ON "StaffComplianceRequirement"("documentType");

-- CreateIndex
CREATE INDEX "StaffComplianceRequirement_credentialType_idx" ON "StaffComplianceRequirement"("credentialType");

-- CreateIndex
CREATE INDEX "StaffComplianceRequirement_identifierType_idx" ON "StaffComplianceRequirement"("identifierType");

-- CreateIndex
CREATE INDEX "StaffComplianceAssignment_staffId_status_idx" ON "StaffComplianceAssignment"("staffId", "status");

-- CreateIndex
CREATE INDEX "StaffComplianceAssignment_packId_status_idx" ON "StaffComplianceAssignment"("packId", "status");

-- CreateIndex
CREATE INDEX "StaffComplianceAssignment_branchId_status_idx" ON "StaffComplianceAssignment"("branchId", "status");

-- CreateIndex
CREATE INDEX "StaffComplianceAssignment_effectiveTo_idx" ON "StaffComplianceAssignment"("effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "StaffComplianceAssignment_staffId_packId_branchId_key" ON "StaffComplianceAssignment"("staffId", "packId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_profilePhotoDocumentId_key" ON "Staff"("profilePhotoDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_signatureDocumentId_key" ON "Staff"("signatureDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_stampDocumentId_key" ON "Staff"("stampDocumentId");

-- CreateIndex
CREATE INDEX "Staff_onboardingStatus_idx" ON "Staff"("onboardingStatus");

-- CreateIndex
CREATE INDEX "Staff_onboardingCompletedAt_idx" ON "Staff"("onboardingCompletedAt");

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_onboardingCompletedByUserId_fkey" FOREIGN KEY ("onboardingCompletedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_profilePhotoDocumentId_fkey" FOREIGN KEY ("profilePhotoDocumentId") REFERENCES "StaffDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_signatureDocumentId_fkey" FOREIGN KEY ("signatureDocumentId") REFERENCES "StaffDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_stampDocumentId_fkey" FOREIGN KEY ("stampDocumentId") REFERENCES "StaffDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffDocument" ADD CONSTRAINT "StaffDocument_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffDocument" ADD CONSTRAINT "StaffDocument_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffDocument" ADD CONSTRAINT "StaffDocument_staffAssignmentId_fkey" FOREIGN KEY ("staffAssignmentId") REFERENCES "StaffAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffDocument" ADD CONSTRAINT "StaffDocument_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffDocument" ADD CONSTRAINT "StaffDocument_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCredentialEvidence" ADD CONSTRAINT "StaffCredentialEvidence_staffCredentialId_fkey" FOREIGN KEY ("staffCredentialId") REFERENCES "StaffCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCredentialEvidence" ADD CONSTRAINT "StaffCredentialEvidence_staffDocumentId_fkey" FOREIGN KEY ("staffDocumentId") REFERENCES "StaffDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProviderProfile" ADD CONSTRAINT "StaffProviderProfile_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProviderProfile" ADD CONSTRAINT "StaffProviderProfile_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProviderProfile" ADD CONSTRAINT "StaffProviderProfile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProviderProfile" ADD CONSTRAINT "StaffProviderProfile_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffPrivilegeGrant" ADD CONSTRAINT "StaffPrivilegeGrant_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffPrivilegeGrant" ADD CONSTRAINT "StaffPrivilegeGrant_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffPrivilegeGrant" ADD CONSTRAINT "StaffPrivilegeGrant_staffAssignmentId_fkey" FOREIGN KEY ("staffAssignmentId") REFERENCES "StaffAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffPrivilegeGrant" ADD CONSTRAINT "StaffPrivilegeGrant_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffOnboardingItem" ADD CONSTRAINT "StaffOnboardingItem_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffOnboardingItem" ADD CONSTRAINT "StaffOnboardingItem_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffOnboardingItem" ADD CONSTRAINT "StaffOnboardingItem_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCompliancePack" ADD CONSTRAINT "StaffCompliancePack_roleTemplateId_fkey" FOREIGN KEY ("roleTemplateId") REFERENCES "RoleTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCompliancePack" ADD CONSTRAINT "StaffCompliancePack_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffComplianceRequirement" ADD CONSTRAINT "StaffComplianceRequirement_packId_fkey" FOREIGN KEY ("packId") REFERENCES "StaffCompliancePack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffComplianceAssignment" ADD CONSTRAINT "StaffComplianceAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffComplianceAssignment" ADD CONSTRAINT "StaffComplianceAssignment_packId_fkey" FOREIGN KEY ("packId") REFERENCES "StaffCompliancePack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffComplianceAssignment" ADD CONSTRAINT "StaffComplianceAssignment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffComplianceAssignment" ADD CONSTRAINT "StaffComplianceAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
