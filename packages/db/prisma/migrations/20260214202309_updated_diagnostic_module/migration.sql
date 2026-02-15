-- CreateEnum
CREATE TYPE "DiagnosticSectionType" AS ENUM ('LAB', 'IMAGING', 'CARDIOLOGY', 'NEUROLOGY', 'PULMONOLOGY', 'OTHER');

-- CreateEnum
CREATE TYPE "DiagnosticCareContext" AS ENUM ('OPD', 'IPD', 'ER', 'DAYCARE', 'HOMECARE', 'ALL');

-- CreateEnum
CREATE TYPE "DiagnosticPanelType" AS ENUM ('PROFILE', 'PACKAGE');

-- CreateEnum
CREATE TYPE "DiagnosticRangeSource" AS ENUM ('MANUFACTURER', 'HOSPITAL_DEFINED', 'LITERATURE', 'REGULATORY_BODY', 'CONSENSUS_GUIDELINE', 'OTHER');

-- AlterTable
ALTER TABLE "DiagnosticItem" ADD COLUMN     "careContext" "DiagnosticCareContext" NOT NULL DEFAULT 'ALL',
ADD COLUMN     "loincCode" TEXT,
ADD COLUMN     "panelType" "DiagnosticPanelType",
ADD COLUMN     "requiresPcpndt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "searchAliases" JSONB,
ADD COLUMN     "snomedCode" TEXT;

-- AlterTable
ALTER TABLE "DiagnosticParameter" ADD COLUMN     "formula" TEXT,
ADD COLUMN     "isDerived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "DiagnosticReferenceRange" ADD COLUMN     "source" "DiagnosticRangeSource";

-- AlterTable
ALTER TABLE "DiagnosticSection" ADD COLUMN     "headStaffId" TEXT,
ADD COLUMN     "type" "DiagnosticSectionType" NOT NULL DEFAULT 'LAB';

-- AlterTable
ALTER TABLE "DiagnosticServicePoint" ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "operatingHours" JSONB;

-- AlterTable
ALTER TABLE "DiagnosticTemplate" ADD COLUMN     "footerConfig" JSONB,
ADD COLUMN     "headerConfig" JSONB,
ADD COLUMN     "parameterLayout" JSONB,
ADD COLUMN     "signatureRoles" JSONB;

-- AlterTable
ALTER TABLE "SpecimenType" ADD COLUMN     "collectionInstructions" TEXT,
ADD COLUMN     "fastingHours" INTEGER,
ADD COLUMN     "fastingRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "storageTemperature" TEXT;

-- CreateTable
CREATE TABLE "DiagnosticServicePointSection" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "servicePointId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticServicePointSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticServicePointStaff" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "servicePointId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "role" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagnosticServicePointStaff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiagnosticServicePointSection_branchId_servicePointId_isAct_idx" ON "DiagnosticServicePointSection"("branchId", "servicePointId", "isActive");

-- CreateIndex
CREATE INDEX "DiagnosticServicePointSection_branchId_sectionId_idx" ON "DiagnosticServicePointSection"("branchId", "sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticServicePointSection_servicePointId_sectionId_key" ON "DiagnosticServicePointSection"("servicePointId", "sectionId");

-- CreateIndex
CREATE INDEX "DiagnosticServicePointStaff_branchId_servicePointId_isActiv_idx" ON "DiagnosticServicePointStaff"("branchId", "servicePointId", "isActive");

-- CreateIndex
CREATE INDEX "DiagnosticServicePointStaff_branchId_staffId_idx" ON "DiagnosticServicePointStaff"("branchId", "staffId");

-- CreateIndex
CREATE UNIQUE INDEX "DiagnosticServicePointStaff_servicePointId_staffId_key" ON "DiagnosticServicePointStaff"("servicePointId", "staffId");

-- CreateIndex
CREATE INDEX "DiagnosticItem_branchId_loincCode_idx" ON "DiagnosticItem"("branchId", "loincCode");

-- CreateIndex
CREATE INDEX "DiagnosticSection_branchId_type_idx" ON "DiagnosticSection"("branchId", "type");

-- AddForeignKey
ALTER TABLE "DiagnosticServicePointSection" ADD CONSTRAINT "DiagnosticServicePointSection_servicePointId_fkey" FOREIGN KEY ("servicePointId") REFERENCES "DiagnosticServicePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticServicePointSection" ADD CONSTRAINT "DiagnosticServicePointSection_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "DiagnosticSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticServicePointStaff" ADD CONSTRAINT "DiagnosticServicePointStaff_servicePointId_fkey" FOREIGN KEY ("servicePointId") REFERENCES "DiagnosticServicePoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
