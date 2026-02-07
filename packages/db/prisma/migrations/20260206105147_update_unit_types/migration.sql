-- CreateEnum
CREATE TYPE "PricingTier" AS ENUM ('ECONOMY', 'STANDARD', 'DELUXE', 'SUITE', 'VIP');

-- CreateEnum
CREATE TYPE "UnitRoomType" AS ENUM ('CONSULTATION', 'PROCEDURE', 'EXAMINATION', 'PATIENT_ROOM', 'ISOLATION', 'NEGATIVE_PRESSURE', 'POSITIVE_PRESSURE', 'NURSING_STATION', 'WAITING', 'STORAGE', 'UTILITY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UnitResourceState" ADD VALUE 'RESERVED';
ALTER TYPE "UnitResourceState" ADD VALUE 'BLOCKED';

-- AlterTable
ALTER TABLE "UnitRoom" ADD COLUMN     "areaSqFt" INTEGER,
ADD COLUMN     "hasAC" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasAttachedBathroom" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasOxygen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasSuction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasTV" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxOccupancy" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "pricingTier" "PricingTier",
ADD COLUMN     "roomType" "UnitRoomType";

-- AlterTable
ALTER TABLE "UnitTypeCatalog" ADD COLUMN     "bedBasedDefault" BOOLEAN NOT NULL DEFAULT false;
