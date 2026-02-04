/*
  Warnings:

  - You are about to drop the column `branchId` on the `Staff` table. All the data in the column will be lost.
  - You are about to drop the column `departmentId` on the `Staff` table. All the data in the column will be lost.
  - You are about to drop the column `designation` on the `Staff` table. All the data in the column will be lost.
  - You are about to drop the column `empCode` on the `Staff` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `Staff` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Staff` table. All the data in the column will be lost.
  - You are about to drop the column `specialtyId` on the `Staff` table. All the data in the column will be lost.
  - You are about to alter the column `phone` on the `Staff` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `email` on the `Staff` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(120)`.
  - A unique constraint covering the columns `[staffNo]` on the table `Staff` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `fullName` to the `Staff` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StaffCategory" AS ENUM ('MEDICAL', 'NON_MEDICAL');

-- CreateEnum
CREATE TYPE "StaffStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'OFFBOARDED');

-- CreateEnum
CREATE TYPE "StaffEngagementType" AS ENUM ('EMPLOYEE', 'CONSULTANT', 'VISITING_CONSULTANT', 'LOCUM', 'CONTRACTOR', 'VENDOR_STAFF', 'INTERN', 'TRAINEE');

-- CreateEnum
CREATE TYPE "StaffAssignmentType" AS ENUM ('PERMANENT', 'TEMPORARY', 'ROTATION', 'VISITING', 'LOCUM', 'CONTRACTOR', 'TRAINEE', 'SHARED_SERVICE');

-- CreateEnum
CREATE TYPE "StaffAssignmentStatus" AS ENUM ('ACTIVE', 'ENDED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "StaffCredentialType" AS ENUM ('MEDICAL_REGISTRATION', 'NURSING_REGISTRATION', 'PHARMACY_REGISTRATION', 'TECHNICIAN_LICENSE', 'OTHER');

-- CreateEnum
CREATE TYPE "StaffCredentialVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StaffIdentifierType" AS ENUM ('AADHAAR', 'PAN', 'PASSPORT', 'VOTER_ID', 'DRIVING_LICENSE', 'OTHER');

-- CreateEnum
CREATE TYPE "UserSource" AS ENUM ('STAFF', 'ADMIN', 'SYSTEM', 'INTEGRATION');

-- DropForeignKey
ALTER TABLE "Staff" DROP CONSTRAINT "Staff_branchId_fkey";

-- DropForeignKey
ALTER TABLE "Staff" DROP CONSTRAINT "Staff_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "Staff" DROP CONSTRAINT "Staff_specialtyId_fkey";

-- DropIndex
DROP INDEX "Staff_branchId_empCode_key";

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "headAssignmentId" TEXT;

-- AlterTable
ALTER TABLE "Staff" DROP COLUMN "branchId",
DROP COLUMN "departmentId",
DROP COLUMN "designation",
DROP COLUMN "empCode",
DROP COLUMN "isActive",
DROP COLUMN "name",
DROP COLUMN "specialtyId",
ADD COLUMN     "category" "StaffCategory" NOT NULL DEFAULT 'MEDICAL',
ADD COLUMN     "designationPrimary" VARCHAR(120),
ADD COLUMN     "displayName" VARCHAR(160),
ADD COLUMN     "engagementType" "StaffEngagementType" NOT NULL DEFAULT 'EMPLOYEE',
ADD COLUMN     "fullName" VARCHAR(160) NOT NULL,
ADD COLUMN     "homeBranchId" TEXT,
ADD COLUMN     "hprId" VARCHAR(64),
ADD COLUMN     "meta" JSONB,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "staffNo" VARCHAR(32),
ADD COLUMN     "status" "StaffStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "phone" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(120);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "source" "UserSource" NOT NULL DEFAULT 'ADMIN';

-- CreateTable
CREATE TABLE "StaffAssignment" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "facilityId" TEXT,
    "departmentId" TEXT,
    "specialtyId" TEXT,
    "designation" VARCHAR(120),
    "branchEmpCode" VARCHAR(48),
    "assignmentType" "StaffAssignmentType" NOT NULL DEFAULT 'PERMANENT',
    "status" "StaffAssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffCredential" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "type" "StaffCredentialType" NOT NULL,
    "issuingAuthority" VARCHAR(160),
    "registrationNumber" VARCHAR(80) NOT NULL,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "verificationStatus" "StaffCredentialVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "documentUrl" TEXT,
    "documentMime" TEXT,
    "documentSize" INTEGER,
    "documentChecksum" TEXT,
    "notes" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffIdentifier" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "type" "StaffIdentifierType" NOT NULL,
    "valueHash" VARCHAR(128) NOT NULL,
    "last4" VARCHAR(8),
    "issuedBy" VARCHAR(80),
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffMergeLog" (
    "id" TEXT NOT NULL,
    "fromStaffId" TEXT NOT NULL,
    "intoStaffId" TEXT NOT NULL,
    "reason" TEXT,
    "meta" JSONB,
    "mergedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mergedByUserId" TEXT,

    CONSTRAINT "StaffMergeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRoleBinding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleVersionId" TEXT NOT NULL,
    "scope" "RoleScope" NOT NULL DEFAULT 'BRANCH',
    "branchId" TEXT,
    "staffAssignmentId" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRoleBinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffAssignment_branchId_status_idx" ON "StaffAssignment"("branchId", "status");

-- CreateIndex
CREATE INDEX "StaffAssignment_staffId_status_idx" ON "StaffAssignment"("staffId", "status");

-- CreateIndex
CREATE INDEX "StaffAssignment_departmentId_idx" ON "StaffAssignment"("departmentId");

-- CreateIndex
CREATE INDEX "StaffAssignment_specialtyId_idx" ON "StaffAssignment"("specialtyId");

-- CreateIndex
CREATE INDEX "StaffAssignment_effectiveFrom_effectiveTo_idx" ON "StaffAssignment"("effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAssignment_staffId_branchId_departmentId_effectiveFrom_key" ON "StaffAssignment"("staffId", "branchId", "departmentId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "StaffCredential_staffId_type_idx" ON "StaffCredential"("staffId", "type");

-- CreateIndex
CREATE INDEX "StaffCredential_staffId_validTo_idx" ON "StaffCredential"("staffId", "validTo");

-- CreateIndex
CREATE INDEX "StaffCredential_verificationStatus_validTo_idx" ON "StaffCredential"("verificationStatus", "validTo");

-- CreateIndex
CREATE UNIQUE INDEX "StaffCredential_type_registrationNumber_key" ON "StaffCredential"("type", "registrationNumber");

-- CreateIndex
CREATE INDEX "StaffIdentifier_staffId_type_idx" ON "StaffIdentifier"("staffId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "StaffIdentifier_type_valueHash_key" ON "StaffIdentifier"("type", "valueHash");

-- CreateIndex
CREATE INDEX "StaffMergeLog_intoStaffId_mergedAt_idx" ON "StaffMergeLog"("intoStaffId", "mergedAt");

-- CreateIndex
CREATE INDEX "StaffMergeLog_fromStaffId_idx" ON "StaffMergeLog"("fromStaffId");

-- CreateIndex
CREATE INDEX "UserRoleBinding_userId_branchId_idx" ON "UserRoleBinding"("userId", "branchId");

-- CreateIndex
CREATE INDEX "UserRoleBinding_roleVersionId_idx" ON "UserRoleBinding"("roleVersionId");

-- CreateIndex
CREATE INDEX "UserRoleBinding_staffAssignmentId_idx" ON "UserRoleBinding"("staffAssignmentId");

-- CreateIndex
CREATE INDEX "UserRoleBinding_userId_effectiveFrom_effectiveTo_idx" ON "UserRoleBinding"("userId", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE UNIQUE INDEX "UserRoleBinding_userId_roleVersionId_branchId_effectiveFrom_key" ON "UserRoleBinding"("userId", "roleVersionId", "branchId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_staffNo_key" ON "Staff"("staffNo");

-- CreateIndex
CREATE INDEX "Staff_category_status_idx" ON "Staff"("category", "status");

-- CreateIndex
CREATE INDEX "Staff_fullName_idx" ON "Staff"("fullName");

-- CreateIndex
CREATE INDEX "Staff_phone_idx" ON "Staff"("phone");

-- CreateIndex
CREATE INDEX "Staff_email_idx" ON "Staff"("email");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_headAssignmentId_fkey" FOREIGN KEY ("headAssignmentId") REFERENCES "StaffAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "FacilityCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCredential" ADD CONSTRAINT "StaffCredential_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCredential" ADD CONSTRAINT "StaffCredential_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffIdentifier" ADD CONSTRAINT "StaffIdentifier_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMergeLog" ADD CONSTRAINT "StaffMergeLog_fromStaffId_fkey" FOREIGN KEY ("fromStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMergeLog" ADD CONSTRAINT "StaffMergeLog_intoStaffId_fkey" FOREIGN KEY ("intoStaffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffMergeLog" ADD CONSTRAINT "StaffMergeLog_mergedByUserId_fkey" FOREIGN KEY ("mergedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleBinding" ADD CONSTRAINT "UserRoleBinding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleBinding" ADD CONSTRAINT "UserRoleBinding_roleVersionId_fkey" FOREIGN KEY ("roleVersionId") REFERENCES "RoleTemplateVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleBinding" ADD CONSTRAINT "UserRoleBinding_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRoleBinding" ADD CONSTRAINT "UserRoleBinding_staffAssignmentId_fkey" FOREIGN KEY ("staffAssignmentId") REFERENCES "StaffAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_homeBranchId_fkey" FOREIGN KEY ("homeBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
