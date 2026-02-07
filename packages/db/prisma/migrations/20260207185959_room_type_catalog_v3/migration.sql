-- CreateEnum
CREATE TYPE "UnitResourceCategory" AS ENUM ('BED', 'PROCEDURE', 'DIAGNOSTIC', 'CONSULTATION', 'OTHER');

-- AlterEnum
ALTER TYPE "UnitResourceState" ADD VALUE 'SANITIZATION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UnitResourceType" ADD VALUE 'GENERAL_BED';
ALTER TYPE "UnitResourceType" ADD VALUE 'ICU_BED';
ALTER TYPE "UnitResourceType" ADD VALUE 'NICU_INCUBATOR';
ALTER TYPE "UnitResourceType" ADD VALUE 'CRIB';
ALTER TYPE "UnitResourceType" ADD VALUE 'TROLLEY';
ALTER TYPE "UnitResourceType" ADD VALUE 'STRETCHER';
ALTER TYPE "UnitResourceType" ADD VALUE 'WHEELCHAIR_POSITION';
ALTER TYPE "UnitResourceType" ADD VALUE 'CHEMOTHERAPY_CHAIR';
ALTER TYPE "UnitResourceType" ADD VALUE 'PROCEDURE_CHAIR';
ALTER TYPE "UnitResourceType" ADD VALUE 'DENTAL_CHAIR';
ALTER TYPE "UnitResourceType" ADD VALUE 'EXAMINATION_TABLE';
ALTER TYPE "UnitResourceType" ADD VALUE 'XRAY_MACHINE_SLOT';
ALTER TYPE "UnitResourceType" ADD VALUE 'CT_SCANNER_SLOT';
ALTER TYPE "UnitResourceType" ADD VALUE 'MRI_SCANNER_SLOT';
ALTER TYPE "UnitResourceType" ADD VALUE 'USG_MACHINE_SLOT';
ALTER TYPE "UnitResourceType" ADD VALUE 'ECG_MACHINE_SLOT';
ALTER TYPE "UnitResourceType" ADD VALUE 'ECHO_MACHINE_SLOT';
ALTER TYPE "UnitResourceType" ADD VALUE 'SAMPLE_COLLECTION_COUNTER';
ALTER TYPE "UnitResourceType" ADD VALUE 'CONSULTATION_SLOT';

-- AlterTable
ALTER TABLE "UnitResource" ADD COLUMN     "assignedPatientId" VARCHAR(64),
ADD COLUMN     "commissionedAt" TIMESTAMP(3),
ADD COLUMN     "hasMonitor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasOxygenSupply" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasSuction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasVentilatorSupport" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPowerRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastMaintenanceDate" TIMESTAMP(3),
ADD COLUMN     "manufacturer" VARCHAR(120),
ADD COLUMN     "model" VARCHAR(120),
ADD COLUMN     "nextMaintenanceDate" TIMESTAMP(3),
ADD COLUMN     "resourceCategory" "UnitResourceCategory",
ADD COLUMN     "serialNumber" VARCHAR(120),
ADD COLUMN     "slotDurationMinutes" INTEGER,
ADD COLUMN     "warrantyExpiryDate" TIMESTAMP(3);
