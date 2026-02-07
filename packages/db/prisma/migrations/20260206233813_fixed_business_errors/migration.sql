/*
  Warnings:

  - A unique constraint covering the columns `[branchId,code]` on the table `Department` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[branchId,assetTag]` on the table `UnitResource` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[unitId,roomNumber]` on the table `UnitRoom` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Department_branchId_facilityId_code_key";

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "deactivatedByUserId" TEXT,
ADD COLUMN     "deactivationReason" VARCHAR(500),
ADD COLUMN     "parentDepartmentId" TEXT;

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "deactivatedByUserId" TEXT,
ADD COLUMN     "deactivationReason" VARCHAR(500);

-- AlterTable
ALTER TABLE "UnitResource" ADD COLUMN     "assetTag" VARCHAR(64),
ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "deactivatedByUserId" TEXT,
ADD COLUMN     "deactivationReason" VARCHAR(500);

-- AlterTable
ALTER TABLE "UnitRoom" ADD COLUMN     "deactivatedAt" TIMESTAMP(3),
ADD COLUMN     "deactivatedByUserId" TEXT,
ADD COLUMN     "deactivationReason" VARCHAR(500),
ADD COLUMN     "roomNumber" VARCHAR(32);

-- CreateIndex
CREATE INDEX "Department_branchId_isActive_idx" ON "Department"("branchId", "isActive");

-- CreateIndex
CREATE INDEX "Department_deactivatedByUserId_idx" ON "Department"("deactivatedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Department_branchId_code_key" ON "Department"("branchId", "code");

-- CreateIndex
CREATE INDEX "UnitResource_branchId_assetTag_idx" ON "UnitResource"("branchId", "assetTag");

-- CreateIndex
CREATE INDEX "UnitResource_deactivatedByUserId_idx" ON "UnitResource"("deactivatedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UnitResource_branchId_assetTag_key" ON "UnitResource"("branchId", "assetTag");

-- CreateIndex
CREATE INDEX "UnitRoom_deactivatedByUserId_idx" ON "UnitRoom"("deactivatedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "UnitRoom_unitId_roomNumber_key" ON "UnitRoom"("unitId", "roomNumber");

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_parentDepartmentId_fkey" FOREIGN KEY ("parentDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_deactivatedByUserId_fkey" FOREIGN KEY ("deactivatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_deactivatedByUserId_fkey" FOREIGN KEY ("deactivatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitRoom" ADD CONSTRAINT "UnitRoom_deactivatedByUserId_fkey" FOREIGN KEY ("deactivatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitResource" ADD CONSTRAINT "UnitResource_deactivatedByUserId_fkey" FOREIGN KEY ("deactivatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
