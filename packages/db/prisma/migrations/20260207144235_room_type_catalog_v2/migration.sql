-- CreateEnum
CREATE TYPE "IsolationType" AS ENUM ('CONTACT', 'DROPLET', 'AIRBORNE', 'PROTECTIVE');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('OPERATIONAL', 'UNDER_MAINTENANCE', 'CLEANING_IN_PROGRESS', 'BLOCKED', 'OUT_OF_SERVICE');

-- AlterEnum
ALTER TYPE "UnitRoomType" ADD VALUE 'RECOVERY';

-- AlterTable
ALTER TABLE "UnitRoom" ADD COLUMN     "baseChargePerDay" DECIMAL(12,2),
ADD COLUMN     "currentOccupancy" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hasCallButton" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasMonitor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasVentilator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isIsolation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isolationType" "IsolationType",
ADD COLUMN     "lastCleanedAt" TIMESTAMP(3),
ADD COLUMN     "maintenanceStatus" "MaintenanceStatus" NOT NULL DEFAULT 'OPERATIONAL';
