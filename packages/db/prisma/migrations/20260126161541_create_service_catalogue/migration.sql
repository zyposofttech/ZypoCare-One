/*
  Warnings:

  - A unique constraint covering the columns `[serviceItemId]` on the table `DiagnosticItem` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CareContext" AS ENUM ('OPD', 'IPD', 'ER', 'OT', 'DAYCARE', 'TELECONSULT', 'HOMECARE');

-- CreateEnum
CREATE TYPE "ServiceItemType" AS ENUM ('DIAGNOSTIC_LAB', 'DIAGNOSTIC_IMAGING', 'PROCEDURE', 'NURSING', 'THERAPY', 'BED_CHARGE', 'ADMIN', 'PACKAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceItemLifecycleStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "ServiceCatalogueScope" AS ENUM ('ENTERPRISE', 'BRANCH');

-- CreateEnum
CREATE TYPE "ServiceCatalogueStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "CatalogueChannel" AS ENUM ('DEFAULT', 'QUICK_ORDER', 'ORDER_SET', 'OT_PICKLIST');

-- CreateEnum
CREATE TYPE "ResourceRequirementKind" AS ENUM ('UNIT_RESOURCE_TYPE', 'EQUIPMENT_TAG', 'SERVICE_POINT_TAG');

-- DropIndex
DROP INDEX "ServiceItem_branchId_category_isActive_idx";

-- AlterTable
ALTER TABLE "DiagnosticItem" ADD COLUMN     "serviceItemId" TEXT;

-- AlterTable
ALTER TABLE "ServiceItem" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedByUserId" TEXT,
ADD COLUMN     "consentRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contraindications" TEXT,
ADD COLUMN     "cooldownMins" INTEGER,
ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "estimatedDurationMins" INTEGER,
ADD COLUMN     "externalId" VARCHAR(64),
ADD COLUMN     "instructionsText" TEXT,
ADD COLUMN     "isBillable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lifecycleStatus" "ServiceItemLifecycleStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "prepMins" INTEGER,
ADD COLUMN     "preparationText" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "publishedByUserId" TEXT,
ADD COLUMN     "recoveryMins" INTEGER,
ADD COLUMN     "requiresAppointment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "submittedByUserId" TEXT,
ADD COLUMN     "tatMinsRoutine" INTEGER,
ADD COLUMN     "tatMinsStat" INTEGER,
ADD COLUMN     "type" "ServiceItemType" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "updatedByUserId" TEXT;

-- CreateTable
CREATE TABLE "ServiceItemAlias" (
    "id" TEXT NOT NULL,
    "serviceItemId" TEXT NOT NULL,
    "alias" VARCHAR(160) NOT NULL,
    "normalized" VARCHAR(200),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceItemAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceItemContext" (
    "id" TEXT NOT NULL,
    "serviceItemId" TEXT NOT NULL,
    "context" "CareContext" NOT NULL,
    "isAllowed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceItemContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceItemResourceRequirement" (
    "id" TEXT NOT NULL,
    "serviceItemId" TEXT NOT NULL,
    "kind" "ResourceRequirementKind" NOT NULL DEFAULT 'UNIT_RESOURCE_TYPE',
    "unitResourceType" "UnitResourceType",
    "tag" VARCHAR(64),
    "notes" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceItemResourceRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceItemVersion" (
    "id" TEXT NOT NULL,
    "serviceItemId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "ServiceItemLifecycleStatus" NOT NULL DEFAULT 'PUBLISHED',
    "snapshot" JSONB NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceItemVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCatalogue" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" VARCHAR(48) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "scope" "ServiceCatalogueScope" NOT NULL DEFAULT 'BRANCH',
    "channel" "CatalogueChannel" NOT NULL DEFAULT 'DEFAULT',
    "departmentId" TEXT,
    "context" "CareContext",
    "payerGroup" VARCHAR(64),
    "status" "ServiceCatalogueStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "submittedByUserId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "publishedByUserId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCatalogue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCatalogueItem" (
    "id" TEXT NOT NULL,
    "catalogueId" TEXT NOT NULL,
    "serviceItemId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "overrides" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCatalogueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceCatalogueVersion" (
    "id" TEXT NOT NULL,
    "catalogueId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "ServiceCatalogueStatus" NOT NULL DEFAULT 'PUBLISHED',
    "snapshot" JSONB NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceCatalogueVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceItemAlias_serviceItemId_isActive_idx" ON "ServiceItemAlias"("serviceItemId", "isActive");

-- CreateIndex
CREATE INDEX "ServiceItemAlias_alias_idx" ON "ServiceItemAlias"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceItemAlias_serviceItemId_alias_key" ON "ServiceItemAlias"("serviceItemId", "alias");

-- CreateIndex
CREATE INDEX "ServiceItemContext_context_isAllowed_idx" ON "ServiceItemContext"("context", "isAllowed");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceItemContext_serviceItemId_context_key" ON "ServiceItemContext"("serviceItemId", "context");

-- CreateIndex
CREATE INDEX "ServiceItemResourceRequirement_serviceItemId_isActive_idx" ON "ServiceItemResourceRequirement"("serviceItemId", "isActive");

-- CreateIndex
CREATE INDEX "ServiceItemResourceRequirement_kind_idx" ON "ServiceItemResourceRequirement"("kind");

-- CreateIndex
CREATE INDEX "ServiceItemVersion_serviceItemId_status_effectiveFrom_idx" ON "ServiceItemVersion"("serviceItemId", "status", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceItemVersion_serviceItemId_version_key" ON "ServiceItemVersion"("serviceItemId", "version");

-- CreateIndex
CREATE INDEX "ServiceCatalogue_branchId_scope_status_effectiveFrom_idx" ON "ServiceCatalogue"("branchId", "scope", "status", "effectiveFrom");

-- CreateIndex
CREATE INDEX "ServiceCatalogue_branchId_departmentId_context_idx" ON "ServiceCatalogue"("branchId", "departmentId", "context");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCatalogue_branchId_code_key" ON "ServiceCatalogue"("branchId", "code");

-- CreateIndex
CREATE INDEX "ServiceCatalogueItem_catalogueId_sortOrder_idx" ON "ServiceCatalogueItem"("catalogueId", "sortOrder");

-- CreateIndex
CREATE INDEX "ServiceCatalogueItem_serviceItemId_idx" ON "ServiceCatalogueItem"("serviceItemId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCatalogueItem_catalogueId_serviceItemId_key" ON "ServiceCatalogueItem"("catalogueId", "serviceItemId");

-- CreateIndex
CREATE INDEX "ServiceCatalogueVersion_catalogueId_status_effectiveFrom_idx" ON "ServiceCatalogueVersion"("catalogueId", "status", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceCatalogueVersion_catalogueId_version_key" ON "ServiceCatalogueVersion"("catalogueId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticItem_serviceItemId_key" ON "DiagnosticItem"("serviceItemId");

-- CreateIndex
CREATE INDEX "ServiceItem_branchId_type_category_isActive_idx" ON "ServiceItem"("branchId", "type", "category", "isActive");

-- CreateIndex
CREATE INDEX "ServiceItem_branchId_departmentId_isActive_idx" ON "ServiceItem"("branchId", "departmentId", "isActive");

-- CreateIndex
CREATE INDEX "ServiceItem_branchId_lifecycleStatus_idx" ON "ServiceItem"("branchId", "lifecycleStatus");

-- AddForeignKey
ALTER TABLE "ServiceItem" ADD CONSTRAINT "ServiceItem_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceItem" ADD CONSTRAINT "ServiceItem_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceItem" ADD CONSTRAINT "ServiceItem_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceItem" ADD CONSTRAINT "ServiceItem_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceItem" ADD CONSTRAINT "ServiceItem_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceItem" ADD CONSTRAINT "ServiceItem_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceItemAlias" ADD CONSTRAINT "ServiceItemAlias_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceItemContext" ADD CONSTRAINT "ServiceItemContext_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceItemResourceRequirement" ADD CONSTRAINT "ServiceItemResourceRequirement_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceItemVersion" ADD CONSTRAINT "ServiceItemVersion_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceItemVersion" ADD CONSTRAINT "ServiceItemVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalogue" ADD CONSTRAINT "ServiceCatalogue_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalogue" ADD CONSTRAINT "ServiceCatalogue_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalogue" ADD CONSTRAINT "ServiceCatalogue_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalogue" ADD CONSTRAINT "ServiceCatalogue_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalogue" ADD CONSTRAINT "ServiceCatalogue_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalogue" ADD CONSTRAINT "ServiceCatalogue_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalogue" ADD CONSTRAINT "ServiceCatalogue_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalogueItem" ADD CONSTRAINT "ServiceCatalogueItem_catalogueId_fkey" FOREIGN KEY ("catalogueId") REFERENCES "ServiceCatalogue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalogueItem" ADD CONSTRAINT "ServiceCatalogueItem_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalogueVersion" ADD CONSTRAINT "ServiceCatalogueVersion_catalogueId_fkey" FOREIGN KEY ("catalogueId") REFERENCES "ServiceCatalogue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceCatalogueVersion" ADD CONSTRAINT "ServiceCatalogueVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticItem" ADD CONSTRAINT "DiagnosticItem_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
