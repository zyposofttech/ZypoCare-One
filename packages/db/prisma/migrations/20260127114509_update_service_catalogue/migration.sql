/*
  Warnings:

  - The `scope` column on the `ServiceCatalogue` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `ServiceCatalogue` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `contraindications` on the `ServiceItem` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `ServiceItem` table. All the data in the column will be lost.
  - The `lifecycleStatus` column on the `ServiceItem` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `normalized` on the `ServiceItemAlias` table. All the data in the column will be lost.
  - You are about to drop the column `isAllowed` on the `ServiceItemContext` table. All the data in the column will be lost.
  - You are about to drop the column `isMandatory` on the `ServiceItemResourceRequirement` table. All the data in the column will be lost.
  - You are about to drop the column `kind` on the `ServiceItemResourceRequirement` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `ServiceItemResourceRequirement` table. All the data in the column will be lost.
  - You are about to drop the column `tag` on the `ServiceItemResourceRequirement` table. All the data in the column will be lost.
  - You are about to drop the column `unitResourceType` on the `ServiceItemResourceRequirement` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[branchId,externalId]` on the table `ServiceItem` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `status` on the `ServiceCatalogueVersion` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `resourceType` to the `ServiceItemResourceRequirement` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `status` on the `ServiceItemVersion` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ServiceLifecycleStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "ServiceChargeUnit" AS ENUM ('PER_UNIT', 'PER_VISIT', 'PER_TEST', 'PER_HOUR', 'PER_DAY', 'PER_SIDE', 'PER_LEVEL', 'PER_SESSION');

-- CreateEnum
CREATE TYPE "TaxApplicability" AS ENUM ('GST_EXEMPT', 'GST_STANDARD', 'GST_ZERO', 'GST_REDUCED');

-- CreateEnum
CREATE TYPE "CatalogueScope" AS ENUM ('ENTERPRISE', 'BRANCH');

-- CreateEnum
CREATE TYPE "CatalogueStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "PackageStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "PackageComponentType" AS ENUM ('SERVICE_ITEM', 'DIAGNOSTIC_ITEM', 'CHARGE_MASTER_ITEM');

-- CreateEnum
CREATE TYPE "OrderSetStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "OrderSetItemType" AS ENUM ('SERVICE_ITEM', 'DIAGNOSTIC_ITEM', 'SERVICE_PACKAGE');

-- CreateEnum
CREATE TYPE "StandardCodeSystem" AS ENUM ('INTERNAL', 'LOINC', 'CPT', 'HCPCS', 'SNOMED', 'ICD10PCS', 'OTHER');

-- CreateEnum
CREATE TYPE "ExternalSystemType" AS ENUM ('LIS', 'RIS', 'ERP', 'OTHER');

-- DropForeignKey
ALTER TABLE "ServiceCatalogueItem" DROP CONSTRAINT "ServiceCatalogueItem_serviceItemId_fkey";

-- DropIndex
DROP INDEX "ServiceCatalogue_branchId_departmentId_context_idx";

-- DropIndex
DROP INDEX "ServiceCatalogue_branchId_scope_status_effectiveFrom_idx";

-- DropIndex
DROP INDEX "ServiceCatalogueItem_serviceItemId_idx";

-- DropIndex
DROP INDEX "ServiceCatalogueVersion_catalogueId_status_effectiveFrom_idx";

-- DropIndex
DROP INDEX "ServiceItem_branchId_departmentId_isActive_idx";

-- DropIndex
DROP INDEX "ServiceItem_branchId_lifecycleStatus_idx";

-- DropIndex
DROP INDEX "ServiceItem_branchId_type_category_isActive_idx";

-- DropIndex
DROP INDEX "ServiceItemAlias_alias_idx";

-- DropIndex
DROP INDEX "ServiceItemContext_context_isAllowed_idx";

-- DropIndex
DROP INDEX "ServiceItemResourceRequirement_kind_idx";

-- DropIndex
DROP INDEX "ServiceItemResourceRequirement_serviceItemId_isActive_idx";

-- DropIndex
DROP INDEX "ServiceItemVersion_serviceItemId_status_effectiveFrom_idx";

-- AlterTable
ALTER TABLE "ServiceCatalogue" DROP COLUMN "scope",
ADD COLUMN     "scope" "CatalogueScope" NOT NULL DEFAULT 'BRANCH',
ALTER COLUMN "payerGroup" SET DATA TYPE TEXT,
DROP COLUMN "status",
ADD COLUMN     "status" "CatalogueStatus" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "effectiveFrom" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "ServiceCatalogueVersion" DROP COLUMN "status",
ADD COLUMN     "status" "CatalogueStatus" NOT NULL;

-- AlterTable
ALTER TABLE "ServiceItem" DROP COLUMN "contraindications",
DROP COLUMN "description",
ADD COLUMN     "billingPolicy" JSONB,
ADD COLUMN     "chargeUnit" "ServiceChargeUnit",
ADD COLUMN     "contraindicationsText" TEXT,
ADD COLUMN     "genderRestriction" VARCHAR(16),
ADD COLUMN     "maxAgeYears" INTEGER,
ADD COLUMN     "minAgeYears" INTEGER,
ADD COLUMN     "taxApplicability" "TaxApplicability",
ALTER COLUMN "externalId" SET DATA TYPE VARCHAR(80),
DROP COLUMN "lifecycleStatus",
ADD COLUMN     "lifecycleStatus" "ServiceLifecycleStatus" NOT NULL DEFAULT 'PUBLISHED';

-- AlterTable
ALTER TABLE "ServiceItemAlias" DROP COLUMN "normalized";

-- AlterTable
ALTER TABLE "ServiceItemContext" DROP COLUMN "isAllowed",
ADD COLUMN     "isEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "ServiceItemResourceRequirement" DROP COLUMN "isMandatory",
DROP COLUMN "kind",
DROP COLUMN "notes",
DROP COLUMN "tag",
DROP COLUMN "unitResourceType",
ADD COLUMN     "constraints" JSONB,
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "resourceType" "UnitResourceType" NOT NULL;

-- AlterTable
ALTER TABLE "ServiceItemVersion" DROP COLUMN "status",
ADD COLUMN     "status" "ServiceLifecycleStatus" NOT NULL,
ALTER COLUMN "effectiveFrom" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "ServiceItemClinicalRule" (
    "id" TEXT NOT NULL,
    "serviceItemId" TEXT NOT NULL,
    "ruleType" VARCHAR(64) NOT NULL,
    "payload" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceItemClinicalRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceSeriesPolicy" (
    "id" TEXT NOT NULL,
    "serviceItemId" TEXT NOT NULL,
    "totalSessions" INTEGER,
    "maxSessionsPerDay" INTEGER,
    "expiryDays" INTEGER,
    "scheduleTemplate" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceSeriesPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePackage" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" VARCHAR(48) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "status" "PackageStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePackageComponent" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "componentType" "PackageComponentType" NOT NULL,
    "serviceItemId" TEXT,
    "diagnosticItemId" TEXT,
    "chargeMasterItemId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isIncluded" BOOLEAN NOT NULL DEFAULT true,
    "condition" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePackageComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePackageVersion" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "PackageStatus" NOT NULL,
    "snapshot" JSONB NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePackageVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderSet" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" VARCHAR(48) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "context" "CareContext",
    "channel" "CatalogueChannel" NOT NULL DEFAULT 'ORDER_SET',
    "status" "OrderSetStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderSetItem" (
    "id" TEXT NOT NULL,
    "orderSetId" TEXT NOT NULL,
    "itemType" "OrderSetItemType" NOT NULL,
    "serviceItemId" TEXT,
    "diagnosticItemId" TEXT,
    "packageId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderSetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderSetVersion" (
    "id" TEXT NOT NULL,
    "orderSetId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "OrderSetStatus" NOT NULL,
    "snapshot" JSONB NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderSetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandardCodeSet" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(48) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "system" "StandardCodeSystem" NOT NULL DEFAULT 'INTERNAL',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StandardCodeSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandardCodeEntry" (
    "id" TEXT NOT NULL,
    "codeSetId" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "display" VARCHAR(200) NOT NULL,
    "category" TEXT,
    "attributes" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StandardCodeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceItemStandardMapping" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "serviceItemId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceItemStandardMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceAvailabilityCalendar" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "serviceItemId" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceAvailabilityCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceAvailabilityRule" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceAvailabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceBlackout" (
    "id" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "from" TIMESTAMP(3) NOT NULL,
    "to" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceBlackout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalDirectorySource" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "systemType" "ExternalSystemType" NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "meta" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalDirectorySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalDirectoryEntry" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalCode" VARCHAR(80) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "kind" VARCHAR(40) NOT NULL,
    "payload" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalDirectoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalDirectoryMapping" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "serviceItemId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'MAPPED',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalDirectoryMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceItemClinicalRule_serviceItemId_ruleType_isActive_idx" ON "ServiceItemClinicalRule"("serviceItemId", "ruleType", "isActive");

-- CreateIndex
CREATE INDEX "ServiceSeriesPolicy_serviceItemId_isActive_idx" ON "ServiceSeriesPolicy"("serviceItemId", "isActive");

-- CreateIndex
CREATE INDEX "ServicePackage_branchId_status_idx" ON "ServicePackage"("branchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePackage_branchId_code_key" ON "ServicePackage"("branchId", "code");

-- CreateIndex
CREATE INDEX "ServicePackageComponent_packageId_sortOrder_idx" ON "ServicePackageComponent"("packageId", "sortOrder");

-- CreateIndex
CREATE INDEX "ServicePackageVersion_packageId_effectiveFrom_idx" ON "ServicePackageVersion"("packageId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "ServicePackageVersion_packageId_version_key" ON "ServicePackageVersion"("packageId", "version");

-- CreateIndex
CREATE INDEX "OrderSet_branchId_context_status_idx" ON "OrderSet"("branchId", "context", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OrderSet_branchId_code_key" ON "OrderSet"("branchId", "code");

-- CreateIndex
CREATE INDEX "OrderSetItem_orderSetId_sortOrder_idx" ON "OrderSetItem"("orderSetId", "sortOrder");

-- CreateIndex
CREATE INDEX "OrderSetVersion_orderSetId_effectiveFrom_idx" ON "OrderSetVersion"("orderSetId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "OrderSetVersion_orderSetId_version_key" ON "OrderSetVersion"("orderSetId", "version");

-- CreateIndex
CREATE INDEX "StandardCodeSet_system_isActive_idx" ON "StandardCodeSet"("system", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StandardCodeSet_system_code_key" ON "StandardCodeSet"("system", "code");

-- CreateIndex
CREATE INDEX "StandardCodeEntry_codeSetId_isActive_idx" ON "StandardCodeEntry"("codeSetId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StandardCodeEntry_codeSetId_code_key" ON "StandardCodeEntry"("codeSetId", "code");

-- CreateIndex
CREATE INDEX "ServiceItemStandardMapping_branchId_isPrimary_idx" ON "ServiceItemStandardMapping"("branchId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceItemStandardMapping_branchId_serviceItemId_entryId_key" ON "ServiceItemStandardMapping"("branchId", "serviceItemId", "entryId");

-- CreateIndex
CREATE INDEX "ServiceAvailabilityCalendar_branchId_isActive_idx" ON "ServiceAvailabilityCalendar"("branchId", "isActive");

-- CreateIndex
CREATE INDEX "ServiceAvailabilityCalendar_serviceItemId_isActive_idx" ON "ServiceAvailabilityCalendar"("serviceItemId", "isActive");

-- CreateIndex
CREATE INDEX "ServiceAvailabilityRule_calendarId_dayOfWeek_isActive_idx" ON "ServiceAvailabilityRule"("calendarId", "dayOfWeek", "isActive");

-- CreateIndex
CREATE INDEX "ServiceBlackout_calendarId_from_idx" ON "ServiceBlackout"("calendarId", "from");

-- CreateIndex
CREATE INDEX "ExternalDirectorySource_branchId_systemType_isActive_idx" ON "ExternalDirectorySource"("branchId", "systemType", "isActive");

-- CreateIndex
CREATE INDEX "ExternalDirectoryEntry_sourceId_kind_isActive_idx" ON "ExternalDirectoryEntry"("sourceId", "kind", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalDirectoryEntry_sourceId_externalCode_key" ON "ExternalDirectoryEntry"("sourceId", "externalCode");

-- CreateIndex
CREATE INDEX "ExternalDirectoryMapping_branchId_isPrimary_idx" ON "ExternalDirectoryMapping"("branchId", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalDirectoryMapping_branchId_sourceId_entryId_key" ON "ExternalDirectoryMapping"("branchId", "sourceId", "entryId");

-- CreateIndex
CREATE INDEX "ServiceCatalogue_branchId_channel_status_idx" ON "ServiceCatalogue"("branchId", "channel", "status");

-- CreateIndex
CREATE INDEX "ServiceCatalogue_branchId_context_status_idx" ON "ServiceCatalogue"("branchId", "context", "status");

-- CreateIndex
CREATE INDEX "ServiceCatalogue_branchId_payerGroup_status_idx" ON "ServiceCatalogue"("branchId", "payerGroup", "status");

-- CreateIndex
CREATE INDEX "ServiceCatalogueVersion_catalogueId_effectiveFrom_idx" ON "ServiceCatalogueVersion"("catalogueId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "ServiceItem_branchId_category_isActive_idx" ON "ServiceItem"("branchId", "category", "isActive");

-- CreateIndex
CREATE INDEX "ServiceItem_branchId_type_isActive_idx" ON "ServiceItem"("branchId", "type", "isActive");

-- CreateIndex
CREATE INDEX "ServiceItem_branchId_lifecycleStatus_isActive_idx" ON "ServiceItem"("branchId", "lifecycleStatus", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceItem_branchId_externalId_key" ON "ServiceItem"("branchId", "externalId");

-- CreateIndex
CREATE INDEX "ServiceItemContext_serviceItemId_isEnabled_idx" ON "ServiceItemContext"("serviceItemId", "isEnabled");

-- CreateIndex
CREATE INDEX "ServiceItemResourceRequirement_serviceItemId_resourceType_i_idx" ON "ServiceItemResourceRequirement"("serviceItemId", "resourceType", "isActive");

-- CreateIndex
CREATE INDEX "ServiceItemVersion_serviceItemId_effectiveFrom_idx" ON "ServiceItemVersion"("serviceItemId", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "ServiceItemClinicalRule" ADD CONSTRAINT "ServiceItemClinicalRule_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceSeriesPolicy" ADD CONSTRAINT "ServiceSeriesPolicy_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalogueItem" ADD CONSTRAINT "ServiceCatalogueItem_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePackage" ADD CONSTRAINT "ServicePackage_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePackageComponent" ADD CONSTRAINT "ServicePackageComponent_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePackageComponent" ADD CONSTRAINT "ServicePackageComponent_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePackageComponent" ADD CONSTRAINT "ServicePackageComponent_diagnosticItemId_fkey" FOREIGN KEY ("diagnosticItemId") REFERENCES "DiagnosticItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePackageComponent" ADD CONSTRAINT "ServicePackageComponent_chargeMasterItemId_fkey" FOREIGN KEY ("chargeMasterItemId") REFERENCES "ChargeMasterItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePackageVersion" ADD CONSTRAINT "ServicePackageVersion_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSet" ADD CONSTRAINT "OrderSet_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSetItem" ADD CONSTRAINT "OrderSetItem_orderSetId_fkey" FOREIGN KEY ("orderSetId") REFERENCES "OrderSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSetItem" ADD CONSTRAINT "OrderSetItem_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSetItem" ADD CONSTRAINT "OrderSetItem_diagnosticItemId_fkey" FOREIGN KEY ("diagnosticItemId") REFERENCES "DiagnosticItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSetItem" ADD CONSTRAINT "OrderSetItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "ServicePackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderSetVersion" ADD CONSTRAINT "OrderSetVersion_orderSetId_fkey" FOREIGN KEY ("orderSetId") REFERENCES "OrderSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StandardCodeEntry" ADD CONSTRAINT "StandardCodeEntry_codeSetId_fkey" FOREIGN KEY ("codeSetId") REFERENCES "StandardCodeSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceItemStandardMapping" ADD CONSTRAINT "ServiceItemStandardMapping_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceItemStandardMapping" ADD CONSTRAINT "ServiceItemStandardMapping_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceItemStandardMapping" ADD CONSTRAINT "ServiceItemStandardMapping_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "StandardCodeEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAvailabilityCalendar" ADD CONSTRAINT "ServiceAvailabilityCalendar_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAvailabilityCalendar" ADD CONSTRAINT "ServiceAvailabilityCalendar_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceAvailabilityRule" ADD CONSTRAINT "ServiceAvailabilityRule_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "ServiceAvailabilityCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceBlackout" ADD CONSTRAINT "ServiceBlackout_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "ServiceAvailabilityCalendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDirectorySource" ADD CONSTRAINT "ExternalDirectorySource_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDirectoryEntry" ADD CONSTRAINT "ExternalDirectoryEntry_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ExternalDirectorySource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDirectoryMapping" ADD CONSTRAINT "ExternalDirectoryMapping_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDirectoryMapping" ADD CONSTRAINT "ExternalDirectoryMapping_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ExternalDirectorySource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDirectoryMapping" ADD CONSTRAINT "ExternalDirectoryMapping_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "ExternalDirectoryEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalDirectoryMapping" ADD CONSTRAINT "ExternalDirectoryMapping_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
