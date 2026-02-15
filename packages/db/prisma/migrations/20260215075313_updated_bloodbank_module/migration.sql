-- CreateEnum
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "NotificationDigest" AS ENUM ('NONE', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "BloodUnitTransferStatus" AS ENUM ('INITIATED', 'DISPATCHED', 'RECEIVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LookbackStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'CLOSED');

-- CreateEnum
CREATE TYPE "LookbackTriggerType" AS ENUM ('REACTIVE_TTI', 'POST_ISSUE_REVIEW', 'MANUAL');

-- CreateEnum
CREATE TYPE "BBReportType" AS ENUM ('DAILY_SUMMARY', 'UTILIZATION', 'DISCARD_ANALYSIS', 'DONOR_DEFERRAL', 'TTI_SEROPREVALENCE', 'HAEMOVIGILANCE', 'NACO_ANNUAL', 'SBTC_QUARTERLY');

-- CreateEnum
CREATE TYPE "BBReportRunStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BloodUnitStatus" ADD VALUE 'TRANSFER_PENDING';
ALTER TYPE "BloodUnitStatus" ADD VALUE 'IN_TRANSIT';

-- AlterTable
ALTER TABLE "bb_facilities" ADD COLUMN     "defaultStorageEquipmentId" TEXT;

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" VARCHAR(2000),
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "status" "NotificationStatus" NOT NULL DEFAULT 'OPEN',
    "source" VARCHAR(64),
    "entity" VARCHAR(64),
    "entityId" VARCHAR(64),
    "meta" JSONB,
    "toUserId" TEXT,
    "ackByUserId" TEXT,
    "ackAt" TIMESTAMP(3),
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "dedupeKey" VARCHAR(200),
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_reads" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "severityMin" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "channels" "NotificationChannel"[],
    "digest" "NotificationDigest" NOT NULL DEFAULT 'NONE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_unit_transfers" (
    "id" TEXT NOT NULL,
    "fromBranchId" TEXT NOT NULL,
    "toBranchId" TEXT NOT NULL,
    "status" "BloodUnitTransferStatus" NOT NULL DEFAULT 'INITIATED',
    "courierName" VARCHAR(120),
    "courierRef" VARCHAR(120),
    "dispatchTempC" DOUBLE PRECISION,
    "receivedTempC" DOUBLE PRECISION,
    "notes" VARCHAR(500),
    "createdByUserId" TEXT,
    "dispatchedByUserId" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "receivedByUserId" TEXT,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bb_unit_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_unit_transfer_items" (
    "id" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "bloodUnitId" TEXT NOT NULL,

    CONSTRAINT "bb_unit_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_lookback_cases" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "status" "LookbackStatus" NOT NULL DEFAULT 'OPEN',
    "triggerType" "LookbackTriggerType" NOT NULL DEFAULT 'MANUAL',
    "donorId" TEXT,
    "notes" VARCHAR(1000),
    "computedData" JSONB,
    "createdByUserId" TEXT,
    "closedByUserId" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bb_lookback_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bb_report_runs" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "type" "BBReportType" NOT NULL,
    "status" "BBReportRunStatus" NOT NULL DEFAULT 'DRAFT',
    "params" JSONB,
    "data" JSONB,
    "createdByUserId" TEXT,
    "submittedByUserId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedByUserId" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bb_report_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_branchId_status_severity_createdAt_idx" ON "notifications"("branchId", "status", "severity", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_toUserId_status_createdAt_idx" ON "notifications"("toUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_dedupeKey_idx" ON "notifications"("dedupeKey");

-- CreateIndex
CREATE INDEX "notification_reads_userId_readAt_idx" ON "notification_reads"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_reads_notificationId_userId_key" ON "notification_reads"("notificationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "bb_unit_transfers_fromBranchId_status_createdAt_idx" ON "bb_unit_transfers"("fromBranchId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "bb_unit_transfers_toBranchId_status_createdAt_idx" ON "bb_unit_transfers"("toBranchId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "bb_unit_transfer_items_bloodUnitId_idx" ON "bb_unit_transfer_items"("bloodUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "bb_unit_transfer_items_transferId_bloodUnitId_key" ON "bb_unit_transfer_items"("transferId", "bloodUnitId");

-- CreateIndex
CREATE INDEX "bb_lookback_cases_branchId_status_createdAt_idx" ON "bb_lookback_cases"("branchId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "bb_lookback_cases_donorId_idx" ON "bb_lookback_cases"("donorId");

-- CreateIndex
CREATE INDEX "bb_report_runs_branchId_type_status_createdAt_idx" ON "bb_report_runs"("branchId", "type", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "bb_facilities" ADD CONSTRAINT "bb_facilities_defaultStorageEquipmentId_fkey" FOREIGN KEY ("defaultStorageEquipmentId") REFERENCES "bb_equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_ackByUserId_fkey" FOREIGN KEY ("ackByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_reads" ADD CONSTRAINT "notification_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_unit_transfers" ADD CONSTRAINT "bb_unit_transfers_fromBranchId_fkey" FOREIGN KEY ("fromBranchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_unit_transfers" ADD CONSTRAINT "bb_unit_transfers_toBranchId_fkey" FOREIGN KEY ("toBranchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_unit_transfers" ADD CONSTRAINT "bb_unit_transfers_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_unit_transfers" ADD CONSTRAINT "bb_unit_transfers_dispatchedByUserId_fkey" FOREIGN KEY ("dispatchedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_unit_transfers" ADD CONSTRAINT "bb_unit_transfers_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_unit_transfer_items" ADD CONSTRAINT "bb_unit_transfer_items_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "bb_unit_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_unit_transfer_items" ADD CONSTRAINT "bb_unit_transfer_items_bloodUnitId_fkey" FOREIGN KEY ("bloodUnitId") REFERENCES "bb_blood_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_lookback_cases" ADD CONSTRAINT "bb_lookback_cases_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_lookback_cases" ADD CONSTRAINT "bb_lookback_cases_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "bb_donors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_lookback_cases" ADD CONSTRAINT "bb_lookback_cases_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_lookback_cases" ADD CONSTRAINT "bb_lookback_cases_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_report_runs" ADD CONSTRAINT "bb_report_runs_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_report_runs" ADD CONSTRAINT "bb_report_runs_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_report_runs" ADD CONSTRAINT "bb_report_runs_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_report_runs" ADD CONSTRAINT "bb_report_runs_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bb_report_runs" ADD CONSTRAINT "bb_report_runs_rejectedByUserId_fkey" FOREIGN KEY ("rejectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
