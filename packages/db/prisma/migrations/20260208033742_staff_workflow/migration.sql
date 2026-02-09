/*
  Warnings:

  - A unique constraint covering the columns `[staffId,branchId]` on the table `StaffAssignment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "StaffTitle" AS ENUM ('DR', 'MR', 'MS', 'MRS', 'PROF', 'OTHER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'O_POS', 'O_NEG', 'AB_POS', 'AB_NEG');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'SEPARATED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "StaffType" AS ENUM ('DOCTOR_CONSULTANT', 'DOCTOR_RESIDENT', 'DOCTOR_INTERN', 'NURSE_HEAD', 'NURSE_STAFF', 'NURSE_TRAINEE', 'TECHNICIAN_LAB', 'TECHNICIAN_RADIOLOGY', 'TECHNICIAN_OT', 'TECHNICIAN_DIALYSIS', 'TECHNICIAN_ANESTHESIA', 'PHARMACIST', 'PHARMACIST_ASSISTANT', 'PHYSIOTHERAPIST', 'DIETICIAN', 'COUNSELOR', 'RECEPTIONIST', 'CASHIER', 'HOUSEKEEPING', 'SECURITY', 'ADMIN_STAFF', 'OTHER');

-- CreateEnum
CREATE TYPE "StaffEmploymentType" AS ENUM ('PERMANENT', 'CONTRACT', 'CONSULTANT', 'VISITING', 'LOCUM', 'INTERN', 'TRAINEE', 'VENDOR', 'OTHER');

-- CreateEnum
CREATE TYPE "StaffEmploymentStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED', 'TERMINATED', 'RETIRED', 'OFFBOARDED');

-- CreateEnum
CREATE TYPE "StaffVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StaffShiftType" AS ENUM ('MORNING', 'EVENING', 'NIGHT', 'ROTATIONAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "StaffRosterStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PUBLISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StaffAttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY', 'LATE', 'HOLIDAY', 'WEEK_OFF');

-- CreateEnum
CREATE TYPE "StaffLeaveStatus" AS ENUM ('APPLIED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StaffTrainingStatus" AS ENUM ('ENROLLED', 'COMPLETED', 'FAILED', 'DROPPED');

-- CreateEnum
CREATE TYPE "StaffAppraisalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVIEWED', 'APPROVED');

-- CreateEnum
CREATE TYPE "StaffCredentialStatus" AS ENUM ('VALID', 'EXPIRING_SOON', 'EXPIRED', 'RENEWED');

-- CreateEnum
CREATE TYPE "StaffCredentialAlertStage" AS ENUM ('D90', 'D60', 'D30', 'D15', 'D7', 'D0', 'POST_7', 'POST_30');

-- CreateEnum
CREATE TYPE "StaffAlertDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'CANCELLED', 'FAILED');

-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "backgroundVerificationPayload" JSONB,
ADD COLUMN     "backgroundVerificationStatus" "StaffVerificationStatus",
ADD COLUMN     "bloodGroup" "BloodGroup",
ADD COLUMN     "canAdmitPatients" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canPerformSurgery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canPrescribe" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "confirmationDate" TIMESTAMP(3),
ADD COLUMN     "contractEndDate" TIMESTAMP(3),
ADD COLUMN     "contractStartDate" TIMESTAMP(3),
ADD COLUMN     "currentAddress" JSONB,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "defaultShiftType" "StaffShiftType",
ADD COLUMN     "displayName" VARCHAR(160),
ADD COLUMN     "emergencyContact" JSONB,
ADD COLUMN     "employmentStatus" "StaffEmploymentStatus",
ADD COLUMN     "employmentType" "StaffEmploymentType",
ADD COLUMN     "firstName" VARCHAR(80),
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "hasSystemAccess" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hprLastVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "hprVerificationPayload" JSONB,
ADD COLUMN     "hprVerificationStatus" "StaffVerificationStatus",
ADD COLUMN     "isAvailableForAppointment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isAvailableForDuty" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isFullTime" BOOLEAN,
ADD COLUMN     "isSameAsCurrent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "joiningDate" TIMESTAMP(3),
ADD COLUMN     "lastName" VARCHAR(80),
ADD COLUMN     "maritalStatus" "MaritalStatus",
ADD COLUMN     "middleName" VARCHAR(80),
ADD COLUMN     "officialEmail" VARCHAR(120),
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "permanentAddress" JSONB,
ADD COLUMN     "personalEmail" VARCHAR(120),
ADD COLUMN     "policeVerificationStatus" "StaffVerificationStatus",
ADD COLUMN     "primaryBranchId" TEXT,
ADD COLUMN     "primaryPhone" VARCHAR(20),
ADD COLUMN     "probationEndDate" TIMESTAMP(3),
ADD COLUMN     "reportingToStaffId" TEXT,
ADD COLUMN     "secondaryPhone" VARCHAR(20),
ADD COLUMN     "staffType" "StaffType",
ADD COLUMN     "title" "StaffTitle",
ADD COLUMN     "weeklyOffDays" JSONB,
ADD COLUMN     "workingHoursPerWeek" INTEGER;

-- AlterTable
ALTER TABLE "StaffAssignment" ADD COLUMN     "approvalNotes" VARCHAR(240),
ADD COLUMN     "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedByUserId" TEXT,
ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "assignedByUserId" TEXT,
ADD COLUMN     "canAdmitPatients" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canPerformSurgery" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consultationChargeOverride" DECIMAL(10,2),
ADD COLUMN     "daysAvailable" JSONB,
ADD COLUMN     "hasOTPrivileges" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "opdConfiguration" JSONB,
ADD COLUMN     "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" VARCHAR(100),
ADD COLUMN     "workingHours" JSONB;

-- AlterTable
ALTER TABLE "StaffCredential" ADD COLUMN     "isCritical" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastStatusComputedAt" TIMESTAMP(3),
ADD COLUMN     "renewalRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "renewalWindowDays" INTEGER,
ADD COLUMN     "status" "StaffCredentialStatus" NOT NULL DEFAULT 'VALID';

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffCredentialAlert" (
    "id" TEXT NOT NULL,
    "staffCredentialId" TEXT NOT NULL,
    "stage" "StaffCredentialAlertStage" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "StaffAlertDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "outboxEventId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffCredentialAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffRoster" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "StaffRosterStatus" NOT NULL DEFAULT 'DRAFT',
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffRoster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffRosterEntry" (
    "id" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "shiftType" "StaffShiftType",
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffRosterEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAttendance" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "StaffAttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "checkInAt" TIMESTAMP(3),
    "checkOutAt" TIMESTAMP(3),
    "source" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffLeaveRequest" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "leaveType" VARCHAR(80) NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" VARCHAR(240),
    "status" "StaffLeaveStatus" NOT NULL DEFAULT 'APPLIED',
    "reportingManagerApproval" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "reportingManagerApprovedByUserId" TEXT,
    "reportingManagerApprovedAt" TIMESTAMP(3),
    "hrApproval" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "hrApprovedByUserId" TEXT,
    "hrApprovedAt" TIMESTAMP(3),
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffLeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffTrainingRecord" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "branchId" TEXT,
    "programName" VARCHAR(160) NOT NULL,
    "provider" VARCHAR(160),
    "status" "StaffTrainingStatus" NOT NULL DEFAULT 'ENROLLED',
    "completedAt" TIMESTAMP(3),
    "score" DECIMAL(5,2),
    "evidenceDocumentId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffTrainingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAppraisal" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "branchId" TEXT,
    "cycleLabel" VARCHAR(80) NOT NULL,
    "status" "StaffAppraisalStatus" NOT NULL DEFAULT 'DRAFT',
    "rating" DECIMAL(4,2),
    "summary" VARCHAR(240),
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAppraisal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffSeparation" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "branchId" TEXT,
    "separationDate" DATE NOT NULL,
    "reason" VARCHAR(240),
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffSeparation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffHealthRecord" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "StaffHealthRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffInsurancePolicy" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "policyType" VARCHAR(80) NOT NULL,
    "provider" VARCHAR(160),
    "policyNumber" VARCHAR(64),
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffInsurancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_code_key" ON "Organization"("code");

-- CreateIndex
CREATE INDEX "Organization_isActive_idx" ON "Organization"("isActive");

-- CreateIndex
CREATE INDEX "StaffCredentialAlert_status_scheduledAt_idx" ON "StaffCredentialAlert"("status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "StaffCredentialAlert_staffCredentialId_stage_key" ON "StaffCredentialAlert"("staffCredentialId", "stage");

-- CreateIndex
CREATE INDEX "StaffRoster_branchId_periodStart_idx" ON "StaffRoster"("branchId", "periodStart");

-- CreateIndex
CREATE INDEX "StaffRoster_staffId_periodStart_idx" ON "StaffRoster"("staffId", "periodStart");

-- CreateIndex
CREATE INDEX "StaffRosterEntry_startAt_idx" ON "StaffRosterEntry"("startAt");

-- CreateIndex
CREATE INDEX "StaffRosterEntry_rosterId_startAt_idx" ON "StaffRosterEntry"("rosterId", "startAt");

-- CreateIndex
CREATE INDEX "StaffAttendance_branchId_date_idx" ON "StaffAttendance"("branchId", "date");

-- CreateIndex
CREATE INDEX "StaffAttendance_staffId_date_idx" ON "StaffAttendance"("staffId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAttendance_staffId_branchId_date_key" ON "StaffAttendance"("staffId", "branchId", "date");

-- CreateIndex
CREATE INDEX "StaffLeaveRequest_branchId_startDate_idx" ON "StaffLeaveRequest"("branchId", "startDate");

-- CreateIndex
CREATE INDEX "StaffLeaveRequest_staffId_status_idx" ON "StaffLeaveRequest"("staffId", "status");

-- CreateIndex
CREATE INDEX "StaffTrainingRecord_staffId_status_idx" ON "StaffTrainingRecord"("staffId", "status");

-- CreateIndex
CREATE INDEX "StaffTrainingRecord_branchId_status_idx" ON "StaffTrainingRecord"("branchId", "status");

-- CreateIndex
CREATE INDEX "StaffAppraisal_staffId_cycleLabel_idx" ON "StaffAppraisal"("staffId", "cycleLabel");

-- CreateIndex
CREATE INDEX "StaffAppraisal_branchId_cycleLabel_idx" ON "StaffAppraisal"("branchId", "cycleLabel");

-- CreateIndex
CREATE INDEX "StaffAppraisal_status_idx" ON "StaffAppraisal"("status");

-- CreateIndex
CREATE INDEX "StaffSeparation_staffId_separationDate_idx" ON "StaffSeparation"("staffId", "separationDate");

-- CreateIndex
CREATE INDEX "StaffSeparation_branchId_separationDate_idx" ON "StaffSeparation"("branchId", "separationDate");

-- CreateIndex
CREATE INDEX "StaffHealthRecord_staffId_recordedAt_idx" ON "StaffHealthRecord"("staffId", "recordedAt");

-- CreateIndex
CREATE INDEX "StaffInsurancePolicy_staffId_policyType_idx" ON "StaffInsurancePolicy"("staffId", "policyType");

-- CreateIndex
CREATE INDEX "StaffInsurancePolicy_validTo_idx" ON "StaffInsurancePolicy"("validTo");

-- CreateIndex
CREATE INDEX "Staff_displayName_idx" ON "Staff"("displayName");

-- CreateIndex
CREATE INDEX "Staff_primaryPhone_idx" ON "Staff"("primaryPhone");

-- CreateIndex
CREATE INDEX "Staff_personalEmail_idx" ON "Staff"("personalEmail");

-- CreateIndex
CREATE INDEX "Staff_primaryBranchId_idx" ON "Staff"("primaryBranchId");

-- CreateIndex
CREATE INDEX "StaffAssignment_isPrimary_idx" ON "StaffAssignment"("isPrimary");

-- CreateIndex
CREATE INDEX "StaffAssignment_requiresApproval_approvalStatus_idx" ON "StaffAssignment"("requiresApproval", "approvalStatus");

-- CreateIndex
CREATE INDEX "StaffAssignment_approvalStatus_idx" ON "StaffAssignment"("approvalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAssignment_staffId_branchId_key" ON "StaffAssignment"("staffId", "branchId");

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_primaryBranchId_fkey" FOREIGN KEY ("primaryBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_reportingToStaffId_fkey" FOREIGN KEY ("reportingToStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCredentialAlert" ADD CONSTRAINT "StaffCredentialAlert_staffCredentialId_fkey" FOREIGN KEY ("staffCredentialId") REFERENCES "StaffCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffCredentialAlert" ADD CONSTRAINT "StaffCredentialAlert_outboxEventId_fkey" FOREIGN KEY ("outboxEventId") REFERENCES "OutboxEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRoster" ADD CONSTRAINT "StaffRoster_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRoster" ADD CONSTRAINT "StaffRoster_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRosterEntry" ADD CONSTRAINT "StaffRosterEntry_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "StaffRoster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAttendance" ADD CONSTRAINT "StaffAttendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAttendance" ADD CONSTRAINT "StaffAttendance_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffLeaveRequest" ADD CONSTRAINT "StaffLeaveRequest_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffLeaveRequest" ADD CONSTRAINT "StaffLeaveRequest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffLeaveRequest" ADD CONSTRAINT "StaffLeaveRequest_reportingManagerApprovedByUserId_fkey" FOREIGN KEY ("reportingManagerApprovedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffLeaveRequest" ADD CONSTRAINT "StaffLeaveRequest_hrApprovedByUserId_fkey" FOREIGN KEY ("hrApprovedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTrainingRecord" ADD CONSTRAINT "StaffTrainingRecord_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTrainingRecord" ADD CONSTRAINT "StaffTrainingRecord_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAppraisal" ADD CONSTRAINT "StaffAppraisal_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAppraisal" ADD CONSTRAINT "StaffAppraisal_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffSeparation" ADD CONSTRAINT "StaffSeparation_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffSeparation" ADD CONSTRAINT "StaffSeparation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffHealthRecord" ADD CONSTRAINT "StaffHealthRecord_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffInsurancePolicy" ADD CONSTRAINT "StaffInsurancePolicy_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
