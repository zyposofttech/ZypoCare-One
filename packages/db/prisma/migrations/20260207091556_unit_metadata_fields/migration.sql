/*
  Warnings:

  - You are about to drop the column `commissioningDate` on the `UnitTypeCatalog` table. All the data in the column will be lost.
  - You are about to drop the column `floorNumber` on the `UnitTypeCatalog` table. All the data in the column will be lost.
  - You are about to drop the column `inchargeStaffId` on the `UnitTypeCatalog` table. All the data in the column will be lost.
  - You are about to drop the column `nursingStation` on the `UnitTypeCatalog` table. All the data in the column will be lost.
  - You are about to drop the column `totalBedCapacity` on the `UnitTypeCatalog` table. All the data in the column will be lost.
  - You are about to drop the column `totalRoomCount` on the `UnitTypeCatalog` table. All the data in the column will be lost.
  - You are about to drop the column `wingZone` on the `UnitTypeCatalog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "commissioningDate" TIMESTAMP(3),
ADD COLUMN     "floorNumber" INTEGER,
ADD COLUMN     "inchargeStaffId" VARCHAR(64),
ADD COLUMN     "nursingStation" VARCHAR(160),
ADD COLUMN     "totalBedCapacity" INTEGER,
ADD COLUMN     "totalRoomCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wingZone" VARCHAR(120);

-- AlterTable
ALTER TABLE "UnitTypeCatalog" DROP COLUMN "commissioningDate",
DROP COLUMN "floorNumber",
DROP COLUMN "inchargeStaffId",
DROP COLUMN "nursingStation",
DROP COLUMN "totalBedCapacity",
DROP COLUMN "totalRoomCount",
DROP COLUMN "wingZone";
