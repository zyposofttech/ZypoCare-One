-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "locationNodeId" TEXT;

-- CreateIndex
CREATE INDEX "Unit_branchId_locationNodeId_isActive_idx" ON "Unit"("branchId", "locationNodeId", "isActive");

-- AddForeignKey
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_locationNodeId_fkey" FOREIGN KEY ("locationNodeId") REFERENCES "LocationNode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
