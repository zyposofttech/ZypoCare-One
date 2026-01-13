/*
  Warnings:

  - You are about to drop the column `gstNumber` on the `Branch` table. All the data in the column will be lost.
  - The `status` column on the `BulkImportJob` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `code` on the `ChargeMasterItem` table. The data in that column could be lost. The data in that column will be cast from `VarChar(64)` to `VarChar(48)`.
  - The `category` column on the `EquipmentAsset` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `updatedAt` on the `ProcedureBooking` table. All the data in the column will be lost.
  - You are about to alter the column `code` on the `ServiceItem` table. The data in that column could be lost. The data in that column will be cast from `VarChar(64)` to `VarChar(48)`.
  - You are about to alter the column `category` on the `ServiceItem` table. The data in that column could be lost. The data in that column will be cast from `VarChar(120)` to `VarChar(80)`.
  - You are about to alter the column `code` on the `Unit` table. The data in that column could be lost. The data in that column will be cast from `VarChar(48)` to `VarChar(32)`.
  - You are about to drop the `DepartmentSpecialty` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `entityType` on the `BulkImportJob` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `payload` on table `BulkImportJob` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `type` on the `FixItTask` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "EquipmentCategory" AS ENUM ('GENERAL', 'RADIOLOGY', 'ULTRASOUND');

-- CreateEnum
CREATE TYPE "FixItTaskType" AS ENUM ('SERVICE_CHARGE_MAPPING_MISSING');

-- CreateEnum
CREATE TYPE "BulkImportStatus" AS ENUM ('VALIDATED', 'COMMITTED', 'FAILED');

-- CreateEnum
CREATE TYPE "BulkImportEntityType" AS ENUM ('LOCATIONS', 'UNITS', 'ROOMS', 'RESOURCES', 'EQUIPMENT', 'SERVICE_ITEMS', 'CHARGE_MASTER');

-- DropForeignKey
ALTER TABLE "DepartmentSpecialty" DROP CONSTRAINT "DepartmentSpecialty_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "DepartmentSpecialty" DROP CONSTRAINT "DepartmentSpecialty_specialtyId_fkey";

-- DropForeignKey
ALTER TABLE "EquipmentAsset" DROP CONSTRAINT "EquipmentAsset_locationNodeId_fkey";

-- DropForeignKey
ALTER TABLE "EquipmentAsset" DROP CONSTRAINT "EquipmentAsset_roomId_fkey";

-- DropForeignKey
ALTER TABLE "EquipmentAsset" DROP CONSTRAINT "EquipmentAsset_unitId_fkey";

-- DropForeignKey
ALTER TABLE "LocationNode" DROP CONSTRAINT "LocationNode_branchId_fkey";

-- DropForeignKey
ALTER TABLE "ProcedureBooking" DROP CONSTRAINT "ProcedureBooking_resourceId_fkey";

-- DropForeignKey
ALTER TABLE "ProcedureBooking" DROP CONSTRAINT "ProcedureBooking_unitId_fkey";

-- DropIndex
DROP INDEX "EquipmentAsset_branchId_category_operationalStatus_idx";

-- DropIndex
DROP INDEX "EquipmentAsset_branchId_unitId_roomId_idx";

-- DropIndex
DROP INDEX "FixItTask_branchId_status_type_idx";

-- DropIndex
DROP INDEX "FixItTask_serviceItemId_idx";

-- DropIndex
DROP INDEX "ProcedureBooking_branchId_unitId_resourceId_startAt_endAt_idx";

-- DropIndex
DROP INDEX "ProcedureBooking_status_idx";

-- DropIndex
DROP INDEX "ServiceChargeMapping_branchId_chargeMasterItemId_idx";

-- DropIndex
DROP INDEX "Specialty_branchId_isActive_idx";

-- DropIndex
DROP INDEX "Unit_branchId_unitTypeId_isActive_idx";

-- DropIndex
DROP INDEX "UnitResource_branchId_resourceType_state_idx";

-- DropIndex
DROP INDEX "UnitResource_branchId_unitId_roomId_isActive_idx";

-- AlterTable
ALTER TABLE "Branch" DROP COLUMN "gstNumber";

-- AlterTable
ALTER TABLE "BranchUnitType" ALTER COLUMN "enabledAt" DROP NOT NULL,
ALTER COLUMN "enabledAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "BulkImportJob" DROP COLUMN "entityType",
ADD COLUMN     "entityType" "BulkImportEntityType" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "BulkImportStatus" NOT NULL DEFAULT 'VALIDATED',
ALTER COLUMN "payload" SET NOT NULL,
ALTER COLUMN "totalRows" DROP DEFAULT,
ALTER COLUMN "validRows" DROP DEFAULT,
ALTER COLUMN "invalidRows" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ChargeMasterItem" ALTER COLUMN "code" SET DATA TYPE VARCHAR(48),
ALTER COLUMN "category" SET DATA TYPE TEXT,
ALTER COLUMN "unit" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "DowntimeTicket" ALTER COLUMN "reason" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "EquipmentAsset" DROP COLUMN "category",
ADD COLUMN     "category" "EquipmentCategory" NOT NULL DEFAULT 'GENERAL',
ALTER COLUMN "make" SET DATA TYPE TEXT,
ALTER COLUMN "model" SET DATA TYPE TEXT,
ALTER COLUMN "serial" SET DATA TYPE TEXT,
ALTER COLUMN "amcVendor" SET DATA TYPE TEXT,
ALTER COLUMN "aerbLicenseNo" SET DATA TYPE TEXT,
ALTER COLUMN "pcpndtRegNo" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "FixItTask" DROP COLUMN "type",
ADD COLUMN     "type" "FixItTaskType" NOT NULL,
ALTER COLUMN "title" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "LocationNodeRevision" ALTER COLUMN "code" SET DATA TYPE TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "effectiveFrom" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProcedureBooking" DROP COLUMN "updatedAt",
ADD COLUMN     "cancelledAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "ServiceChargeMapping" ALTER COLUMN "effectiveFrom" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ServiceItem" ALTER COLUMN "code" SET DATA TYPE VARCHAR(48),
ALTER COLUMN "category" SET DATA TYPE VARCHAR(80),
ALTER COLUMN "unit" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Specialty" ADD COLUMN     "departmentId" TEXT;

-- AlterTable
ALTER TABLE "Unit" ALTER COLUMN "code" SET DATA TYPE VARCHAR(32);

-- AlterTable
ALTER TABLE "UnitResource" ALTER COLUMN "code" SET DATA TYPE VARCHAR(96);

-- AlterTable
ALTER TABLE "UnitTypeCatalog" ALTER COLUMN "code" SET DATA TYPE VARCHAR(32);

-- DropTable
DROP TABLE "DepartmentSpecialty";

-- DropEnum
DROP TYPE "EquipmentComplianceCategory";

-- DropEnum
DROP TYPE "FixItType";

-- DropEnum
DROP TYPE "ImportEntityType";

-- DropEnum
DROP TYPE "ImportJobStatus";

-- CreateIndex
CREATE INDEX "BulkImportJob_branchId_entityType_status_idx" ON "BulkImportJob"("branchId", "entityType", "status");

-- CreateIndex
CREATE INDEX "EquipmentAsset_branchId_category_idx" ON "EquipmentAsset"("branchId", "category");

-- CreateIndex
CREATE INDEX "FixItTask_branchId_status_idx" ON "FixItTask"("branchId", "status");

-- CreateIndex
CREATE INDEX "ProcedureBooking_branchId_resourceId_startAt_endAt_idx" ON "ProcedureBooking"("branchId", "resourceId", "startAt", "endAt");

-- CreateIndex
CREATE INDEX "ProcedureBooking_branchId_unitId_startAt_idx" ON "ProcedureBooking"("branchId", "unitId", "startAt");

-- CreateIndex
CREATE INDEX "UnitResource_branchId_unitId_isActive_idx" ON "UnitResource"("branchId", "unitId", "isActive");

-- CreateIndex
CREATE INDEX "UnitResource_branchId_resourceType_isSchedulable_idx" ON "UnitResource"("branchId", "resourceType", "isSchedulable");

-- AddForeignKey
ALTER TABLE "Specialty" ADD CONSTRAINT "Specialty_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationNode" ADD CONSTRAINT "LocationNode_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureBooking" ADD CONSTRAINT "ProcedureBooking_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcedureBooking" ADD CONSTRAINT "ProcedureBooking_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "UnitResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
