-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "gstNumber" VARCHAR(15);

-- CreateTable
CREATE TABLE "DepartmentSpecialty" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "specialtyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DepartmentSpecialty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DepartmentSpecialty_departmentId_isActive_idx" ON "DepartmentSpecialty"("departmentId", "isActive");

-- CreateIndex
CREATE INDEX "DepartmentSpecialty_specialtyId_isActive_idx" ON "DepartmentSpecialty"("specialtyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DepartmentSpecialty_departmentId_specialtyId_key" ON "DepartmentSpecialty"("departmentId", "specialtyId");

-- AddForeignKey
ALTER TABLE "DepartmentSpecialty" ADD CONSTRAINT "DepartmentSpecialty_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentSpecialty" ADD CONSTRAINT "DepartmentSpecialty_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
