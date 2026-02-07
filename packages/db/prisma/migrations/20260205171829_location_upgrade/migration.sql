-- AlterEnum
ALTER TYPE "LocationKind" ADD VALUE 'AREA';

-- AlterTable
ALTER TABLE "LocationNodeRevision" ADD COLUMN     "emergencyExit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fireZone" TEXT,
ADD COLUMN     "floorNumber" INTEGER,
ADD COLUMN     "gpsLat" DOUBLE PRECISION,
ADD COLUMN     "gpsLng" DOUBLE PRECISION,
ADD COLUMN     "stretcherAccess" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wheelchairAccess" BOOLEAN NOT NULL DEFAULT false;
