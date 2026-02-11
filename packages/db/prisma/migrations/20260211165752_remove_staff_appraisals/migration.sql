/*
  Warnings:

  - The values [APPLIED] on the enum `StaffLeaveStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `backgroundVerificationPayload` on the `Staff` table. All the data in the column will be lost.
  - You are about to drop the column `backgroundVerificationStatus` on the `Staff` table. All the data in the column will be lost.
  - You are about to drop the column `policeVerificationStatus` on the `Staff` table. All the data in the column will be lost.
  - You are about to drop the `StaffAppraisal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StaffInsurancePolicy` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[approvalRequestId]` on the table `StaffLeaveRequest` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ApprovalRequestStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalEntityType" AS ENUM ('STAFF_LEAVE', 'STAFF_ATTENDANCE_CORRECTION', 'STAFF_ROSTER_PUBLISH', 'STAFF_ONBOARDING_SUBMIT');

-- CreateEnum
CREATE TYPE "ApprovalApproverKind" AS ENUM ('DEPARTMENT_HEAD', 'BRANCH_ROLE', 'GLOBAL_ROLE', 'SPECIFIC_USER');

-- CreateEnum
CREATE TYPE "ApprovalStepStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED', 'CANCELLED');

-- AlterEnum
BEGIN;
CREATE TYPE "StaffLeaveStatus_new" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED', 'WITHDRAWN');
ALTER TABLE "StaffLeaveRequest" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "StaffLeaveRequest" ALTER COLUMN "status" TYPE "StaffLeaveStatus_new" USING ("status"::text::"StaffLeaveStatus_new");
ALTER TYPE "StaffLeaveStatus" RENAME TO "StaffLeaveStatus_old";
ALTER TYPE "StaffLeaveStatus_new" RENAME TO "StaffLeaveStatus";
DROP TYPE "StaffLeaveStatus_old";
ALTER TABLE "StaffLeaveRequest" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- DropForeignKey
ALTER TABLE "StaffAppraisal" DROP CONSTRAINT "StaffAppraisal_branchId_fkey";

-- DropForeignKey
ALTER TABLE "StaffAppraisal" DROP CONSTRAINT "StaffAppraisal_staffId_fkey";

-- DropForeignKey
ALTER TABLE "StaffInsurancePolicy" DROP CONSTRAINT "StaffInsurancePolicy_staffId_fkey";

-- AlterTable
ALTER TABLE "Staff" DROP COLUMN "backgroundVerificationPayload",
DROP COLUMN "backgroundVerificationStatus",
DROP COLUMN "policeVerificationStatus";

-- AlterTable
ALTER TABLE "StaffLeaveRequest" ADD COLUMN     "approvalRequestId" TEXT,
ADD COLUMN     "decidedAt" TIMESTAMP(3),
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- DropTable
DROP TABLE "StaffAppraisal";

-- DropTable
DROP TABLE "StaffInsurancePolicy";

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "entityType" "ApprovalEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "status" "ApprovalRequestStatus" NOT NULL DEFAULT 'PENDING',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalStep" (
    "id" TEXT NOT NULL,
    "approvalRequestId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "approverKind" "ApprovalApproverKind" NOT NULL,
    "approverRoleCode" VARCHAR(64),
    "approverUserId" TEXT,
    "status" "ApprovalStepStatus" NOT NULL DEFAULT 'PENDING',
    "actedAt" TIMESTAMP(3),
    "actedByUserId" TEXT,
    "remarks" VARCHAR(240),
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApprovalRequest_branchId_status_idx" ON "ApprovalRequest"("branchId", "status");

-- CreateIndex
CREATE INDEX "ApprovalRequest_createdByUserId_idx" ON "ApprovalRequest"("createdByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRequest_entityType_entityId_key" ON "ApprovalRequest"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ApprovalStep_approvalRequestId_status_idx" ON "ApprovalStep"("approvalRequestId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalStep_approvalRequestId_stepOrder_key" ON "ApprovalStep"("approvalRequestId", "stepOrder");

-- CreateIndex
CREATE UNIQUE INDEX "StaffLeaveRequest_approvalRequestId_key" ON "StaffLeaveRequest"("approvalRequestId");

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approverUserId_fkey" FOREIGN KEY ("approverUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_actedByUserId_fkey" FOREIGN KEY ("actedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffLeaveRequest" ADD CONSTRAINT "StaffLeaveRequest_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "ApprovalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
