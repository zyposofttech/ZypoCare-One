/*
  Warnings:

  - You are about to drop the column `wardId` on the `Bed` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[roomId,code]` on the table `Bed` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `roomId` to the `Bed` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Bed" DROP CONSTRAINT "Bed_wardId_fkey";

-- DropIndex
DROP INDEX "Bed_wardId_code_key";

-- AlterTable
ALTER TABLE "Bed" DROP COLUMN "wardId",
ADD COLUMN     "roomId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "wardId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floor" TEXT,
    "type" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Facility_branchId_isActive_idx" ON "Facility"("branchId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Facility_branchId_code_key" ON "Facility"("branchId", "code");

-- CreateIndex
CREATE INDEX "Room_branchId_wardId_isActive_idx" ON "Room"("branchId", "wardId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Room_wardId_code_key" ON "Room"("wardId", "code");

-- CreateIndex
CREATE INDEX "Bed_branchId_roomId_isActive_idx" ON "Bed"("branchId", "roomId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Bed_roomId_code_key" ON "Bed"("roomId", "code");

-- AddForeignKey
ALTER TABLE "Facility" ADD CONSTRAINT "Facility_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_wardId_fkey" FOREIGN KEY ("wardId") REFERENCES "Ward"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bed" ADD CONSTRAINT "Bed_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
