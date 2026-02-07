-- AlterTable
ALTER TABLE "UnitTypeCatalog" ADD COLUMN     "commissioningDate" TIMESTAMP(3),
ADD COLUMN     "floorNumber" INTEGER,
ADD COLUMN     "inchargeStaffId" VARCHAR(64),
ADD COLUMN     "nursingStation" VARCHAR(160),
ADD COLUMN     "totalBedCapacity" INTEGER,
ADD COLUMN     "totalRoomCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wingZone" VARCHAR(120);
