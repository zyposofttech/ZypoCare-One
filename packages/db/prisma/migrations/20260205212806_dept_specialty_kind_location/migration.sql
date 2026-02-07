-- CreateEnum
CREATE TYPE "SpecialtyKind" AS ENUM ('SPECIALTY', 'SUPER_SPECIALTY');

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "costCenterCode" VARCHAR(64),
ADD COLUMN     "extensions" JSONB,
ADD COLUMN     "facilityType" "FacilityCategory" NOT NULL DEFAULT 'CLINICAL',
ADD COLUMN     "operatingHours" JSONB;

-- AlterTable
ALTER TABLE "Specialty" ADD COLUMN     "kind" "SpecialtyKind" NOT NULL DEFAULT 'SPECIALTY';

-- CreateTable
CREATE TABLE "DepartmentLocation" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "locationNodeId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DepartmentLocation_departmentId_isActive_idx" ON "DepartmentLocation"("departmentId", "isActive");

-- CreateIndex
CREATE INDEX "DepartmentLocation_locationNodeId_isActive_idx" ON "DepartmentLocation"("locationNodeId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentLocation_departmentId_locationNodeId_key" ON "DepartmentLocation"("departmentId", "locationNodeId");

-- CreateIndex
CREATE INDEX "Specialty_branchId_isActive_idx" ON "Specialty"("branchId", "isActive");

-- AddForeignKey
ALTER TABLE "DepartmentLocation" ADD CONSTRAINT "DepartmentLocation_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentLocation" ADD CONSTRAINT "DepartmentLocation_locationNodeId_fkey" FOREIGN KEY ("locationNodeId") REFERENCES "LocationNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
