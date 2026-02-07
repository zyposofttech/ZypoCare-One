-- CreateEnum
CREATE TYPE "UnitCategory" AS ENUM ('OUTPATIENT', 'INPATIENT', 'CRITICAL_CARE', 'PROCEDURE', 'DIAGNOSTIC', 'SUPPORT');

-- AlterTable
ALTER TABLE "UnitTypeCatalog" ADD COLUMN     "category" "UnitCategory" NOT NULL DEFAULT 'OUTPATIENT',
ADD COLUMN     "defaultOperatingHours" JSONB,
ADD COLUMN     "isSystemDefined" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresPreAuthDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "standardEquipment" JSONB;

-- CreateIndex
CREATE INDEX "UnitTypeCatalog_category_idx" ON "UnitTypeCatalog"("category");
