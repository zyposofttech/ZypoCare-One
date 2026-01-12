/*
  Warnings:

  - You are about to drop the `Facility` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[branchId,facilityId,code]` on the table `Department` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `facilityId` to the `Department` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FacilityCategory" AS ENUM ('SERVICE', 'CLINICAL');

-- DropForeignKey
ALTER TABLE "Facility" DROP CONSTRAINT "Facility_branchId_fkey";

-- DropIndex
DROP INDEX "Department_branchId_code_key";

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "facilityId" TEXT NOT NULL,
ADD COLUMN     "headStaffId" TEXT;

-- DropTable
DROP TABLE "Facility";

-- CreateTable
CREATE TABLE "FacilityCatalog" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(48) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "category" "FacilityCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BranchFacility" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "enabledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchFacility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentDoctor" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentDoctor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FacilityCatalog_code_key" ON "FacilityCatalog"("code");

-- CreateIndex
CREATE INDEX "FacilityCatalog_category_isActive_sortOrder_idx" ON "FacilityCatalog"("category", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "BranchFacility_branchId_isEnabled_idx" ON "BranchFacility"("branchId", "isEnabled");

-- CreateIndex
CREATE INDEX "BranchFacility_facilityId_isEnabled_idx" ON "BranchFacility"("facilityId", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "BranchFacility_branchId_facilityId_key" ON "BranchFacility"("branchId", "facilityId");

-- CreateIndex
CREATE INDEX "DepartmentDoctor_departmentId_idx" ON "DepartmentDoctor"("departmentId");

-- CreateIndex
CREATE INDEX "DepartmentDoctor_staffId_idx" ON "DepartmentDoctor"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentDoctor_departmentId_staffId_key" ON "DepartmentDoctor"("departmentId", "staffId");

-- CreateIndex
CREATE INDEX "Department_branchId_facilityId_isActive_idx" ON "Department"("branchId", "facilityId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Department_branchId_facilityId_code_key" ON "Department"("branchId", "facilityId", "code");

-- AddForeignKey
ALTER TABLE "BranchFacility" ADD CONSTRAINT "BranchFacility_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BranchFacility" ADD CONSTRAINT "BranchFacility_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "FacilityCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "FacilityCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_headStaffId_fkey" FOREIGN KEY ("headStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentDoctor" ADD CONSTRAINT "DepartmentDoctor_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentDoctor" ADD CONSTRAINT "DepartmentDoctor_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
