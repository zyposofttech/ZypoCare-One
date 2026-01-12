-- CreateEnum
CREATE TYPE "LocationKind" AS ENUM ('CAMPUS', 'BUILDING', 'FLOOR', 'ZONE');

-- CreateEnum
CREATE TYPE "UnitResourceType" AS ENUM ('BED', 'BAY', 'CHAIR', 'OT_TABLE', 'PROCEDURE_TABLE', 'DIALYSIS_STATION', 'RECOVERY_BAY', 'EXAM_SLOT', 'INCUBATOR');

-- CreateEnum
CREATE TYPE "UnitResourceState" AS ENUM ('AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EquipmentOperationalStatus" AS ENUM ('OPERATIONAL', 'DOWN', 'MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "EquipmentComplianceCategory" AS ENUM ('GENERAL', 'RADIOLOGY', 'ULTRASOUND');

-- CreateEnum
CREATE TYPE "DowntimeStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "FixItType" AS ENUM ('SERVICE_CHARGE_MAPPING_MISSING');

-- CreateEnum
CREATE TYPE "FixItStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ImportEntityType" AS ENUM ('LOCATIONS', 'UNITS', 'ROOMS', 'RESOURCES', 'EQUIPMENT', 'SERVICE_ITEMS', 'CHARGE_MASTER');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('DRAFT', 'VALIDATED', 'COMMITTED', 'FAILED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "LocationNode" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "kind" "LocationKind" NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationNodeRevision" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationNodeRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitTypeCatalog" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(16) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "usesRoomsDefault" BOOLEAN NOT NULL DEFAULT true,
    "schedulableByDefault" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitTypeCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchUnitType" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "unitTypeId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "enabledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchUnitType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "unitTypeId" TEXT NOT NULL,
    "code" VARCHAR(48) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "usesRooms" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitRoom" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitResource" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "roomId" TEXT,
    "resourceType" "UnitResourceType" NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "state" "UnitResourceState" NOT NULL DEFAULT 'AVAILABLE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSchedulable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentAsset" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "category" "EquipmentComplianceCategory" NOT NULL DEFAULT 'GENERAL',
    "make" VARCHAR(120),
    "model" VARCHAR(120),
    "serial" VARCHAR(120),
    "ownerDepartmentId" TEXT,
    "unitId" TEXT,
    "roomId" TEXT,
    "locationNodeId" TEXT,
    "operationalStatus" "EquipmentOperationalStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "amcVendor" VARCHAR(160),
    "amcValidFrom" TIMESTAMP(3),
    "amcValidTo" TIMESTAMP(3),
    "warrantyValidTo" TIMESTAMP(3),
    "pmFrequencyDays" INTEGER,
    "nextPmDueAt" TIMESTAMP(3),
    "aerbLicenseNo" VARCHAR(64),
    "aerbValidTo" TIMESTAMP(3),
    "pcpndtRegNo" VARCHAR(64),
    "pcpndtValidTo" TIMESTAMP(3),
    "isSchedulable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EquipmentAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DowntimeTicket" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "status" "DowntimeStatus" NOT NULL DEFAULT 'OPEN',
    "reason" VARCHAR(240) NOT NULL,
    "notes" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DowntimeTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChargeMasterItem" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "category" VARCHAR(120),
    "unit" VARCHAR(40),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChargeMasterItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceItem" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" VARCHAR(64) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "category" VARCHAR(120) NOT NULL,
    "unit" VARCHAR(40),
    "isOrderable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceChargeMapping" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "serviceItemId" TEXT NOT NULL,
    "chargeMasterItemId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceChargeMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixItTask" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "type" "FixItType" NOT NULL,
    "status" "FixItStatus" NOT NULL DEFAULT 'OPEN',
    "title" VARCHAR(200) NOT NULL,
    "details" JSONB,
    "serviceItemId" TEXT,
    "assignedToUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixItTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkImportJob" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "entityType" "ImportEntityType" NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'DRAFT',
    "fileName" TEXT,
    "payload" JSONB,
    "errors" JSONB,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "invalidRows" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" TEXT,
    "committedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcedureBooking" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "patientId" TEXT,
    "departmentId" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "consentOk" BOOLEAN NOT NULL DEFAULT false,
    "anesthesiaOk" BOOLEAN NOT NULL DEFAULT false,
    "checklistOk" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcedureBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoLiveReport" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "blockers" JSONB NOT NULL,
    "warnings" JSONB NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoLiveReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LocationNode_branchId_kind_idx" ON "LocationNode"("branchId", "kind");

-- CreateIndex
CREATE INDEX "LocationNode_branchId_parentId_idx" ON "LocationNode"("branchId", "parentId");

-- CreateIndex
CREATE INDEX "LocationNodeRevision_nodeId_effectiveFrom_idx" ON "LocationNodeRevision"("nodeId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "LocationNodeRevision_code_idx" ON "LocationNodeRevision"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UnitTypeCatalog_code_key" ON "UnitTypeCatalog"("code");

-- CreateIndex
CREATE INDEX "UnitTypeCatalog_isActive_sortOrder_idx" ON "UnitTypeCatalog"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "BranchUnitType_branchId_isEnabled_idx" ON "BranchUnitType"("branchId", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "BranchUnitType_branchId_unitTypeId_key" ON "BranchUnitType"("branchId", "unitTypeId");

-- CreateIndex
CREATE INDEX "Unit_branchId_departmentId_isActive_idx" ON "Unit"("branchId", "departmentId", "isActive");

-- CreateIndex
CREATE INDEX "Unit_branchId_unitTypeId_isActive_idx" ON "Unit"("branchId", "unitTypeId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Unit_branchId_code_key" ON "Unit"("branchId", "code");

-- CreateIndex
CREATE INDEX "UnitRoom_branchId_unitId_isActive_idx" ON "UnitRoom"("branchId", "unitId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UnitRoom_unitId_code_key" ON "UnitRoom"("unitId", "code");

-- CreateIndex
CREATE INDEX "UnitResource_branchId_unitId_roomId_isActive_idx" ON "UnitResource"("branchId", "unitId", "roomId", "isActive");

-- CreateIndex
CREATE INDEX "UnitResource_branchId_resourceType_state_idx" ON "UnitResource"("branchId", "resourceType", "state");

-- CreateIndex
CREATE UNIQUE INDEX "UnitResource_unitId_code_key" ON "UnitResource"("unitId", "code");

-- CreateIndex
CREATE INDEX "EquipmentAsset_branchId_category_operationalStatus_idx" ON "EquipmentAsset"("branchId", "category", "operationalStatus");

-- CreateIndex
CREATE INDEX "EquipmentAsset_branchId_unitId_roomId_idx" ON "EquipmentAsset"("branchId", "unitId", "roomId");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentAsset_branchId_code_key" ON "EquipmentAsset"("branchId", "code");

-- CreateIndex
CREATE INDEX "DowntimeTicket_assetId_status_idx" ON "DowntimeTicket"("assetId", "status");

-- CreateIndex
CREATE INDEX "ChargeMasterItem_branchId_isActive_idx" ON "ChargeMasterItem"("branchId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ChargeMasterItem_branchId_code_key" ON "ChargeMasterItem"("branchId", "code");

-- CreateIndex
CREATE INDEX "ServiceItem_branchId_category_isActive_idx" ON "ServiceItem"("branchId", "category", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceItem_branchId_code_key" ON "ServiceItem"("branchId", "code");

-- CreateIndex
CREATE INDEX "ServiceChargeMapping_branchId_serviceItemId_effectiveFrom_idx" ON "ServiceChargeMapping"("branchId", "serviceItemId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "ServiceChargeMapping_branchId_chargeMasterItemId_idx" ON "ServiceChargeMapping"("branchId", "chargeMasterItemId");

-- CreateIndex
CREATE INDEX "FixItTask_branchId_status_type_idx" ON "FixItTask"("branchId", "status", "type");

-- CreateIndex
CREATE INDEX "FixItTask_serviceItemId_idx" ON "FixItTask"("serviceItemId");

-- CreateIndex
CREATE INDEX "BulkImportJob_branchId_entityType_status_idx" ON "BulkImportJob"("branchId", "entityType", "status");

-- CreateIndex
CREATE INDEX "ProcedureBooking_branchId_unitId_resourceId_startAt_endAt_idx" ON "ProcedureBooking"("branchId", "unitId", "resourceId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "ProcedureBooking_status_idx" ON "ProcedureBooking"("status");

-- CreateIndex
CREATE INDEX "GoLiveReport_branchId_createdAt_idx" ON "GoLiveReport"("branchId", "createdAt");

-- AddForeignKey
ALTER TABLE "LocationNode" ADD CONSTRAINT "LocationNode_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationNode" ADD CONSTRAINT "LocationNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "LocationNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationNodeRevision" ADD CONSTRAINT "LocationNodeRevision_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "LocationNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationNodeRevision" ADD CONSTRAINT "LocationNodeRevision_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchUnitType" ADD CONSTRAINT "BranchUnitType_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchUnitType" ADD CONSTRAINT "BranchUnitType_unitTypeId_fkey" FOREIGN KEY ("unitTypeId") REFERENCES "UnitTypeCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_unitTypeId_fkey" FOREIGN KEY ("unitTypeId") REFERENCES "UnitTypeCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitRoom" ADD CONSTRAINT "UnitRoom_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitRoom" ADD CONSTRAINT "UnitRoom_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitResource" ADD CONSTRAINT "UnitResource_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitResource" ADD CONSTRAINT "UnitResource_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitResource" ADD CONSTRAINT "UnitResource_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "UnitRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentAsset" ADD CONSTRAINT "EquipmentAsset_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentAsset" ADD CONSTRAINT "EquipmentAsset_ownerDepartmentId_fkey" FOREIGN KEY ("ownerDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentAsset" ADD CONSTRAINT "EquipmentAsset_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentAsset" ADD CONSTRAINT "EquipmentAsset_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "UnitRoom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentAsset" ADD CONSTRAINT "EquipmentAsset_locationNodeId_fkey" FOREIGN KEY ("locationNodeId") REFERENCES "LocationNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DowntimeTicket" ADD CONSTRAINT "DowntimeTicket_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "EquipmentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChargeMasterItem" ADD CONSTRAINT "ChargeMasterItem_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceItem" ADD CONSTRAINT "ServiceItem_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceChargeMapping" ADD CONSTRAINT "ServiceChargeMapping_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceChargeMapping" ADD CONSTRAINT "ServiceChargeMapping_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceChargeMapping" ADD CONSTRAINT "ServiceChargeMapping_chargeMasterItemId_fkey" FOREIGN KEY ("chargeMasterItemId") REFERENCES "ChargeMasterItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixItTask" ADD CONSTRAINT "FixItTask_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixItTask" ADD CONSTRAINT "FixItTask_serviceItemId_fkey" FOREIGN KEY ("serviceItemId") REFERENCES "ServiceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixItTask" ADD CONSTRAINT "FixItTask_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkImportJob" ADD CONSTRAINT "BulkImportJob_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkImportJob" ADD CONSTRAINT "BulkImportJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureBooking" ADD CONSTRAINT "ProcedureBooking_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureBooking" ADD CONSTRAINT "ProcedureBooking_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureBooking" ADD CONSTRAINT "ProcedureBooking_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "UnitResource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureBooking" ADD CONSTRAINT "ProcedureBooking_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoLiveReport" ADD CONSTRAINT "GoLiveReport_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoLiveReport" ADD CONSTRAINT "GoLiveReport_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
