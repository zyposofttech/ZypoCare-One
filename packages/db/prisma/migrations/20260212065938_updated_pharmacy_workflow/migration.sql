-- AlterTable
ALTER TABLE "DrugMaster" ADD COLUMN     "drugCategoryNodeId" TEXT;

-- CreateTable
CREATE TABLE "SupplierDrugMapping" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "drugMasterId" TEXT NOT NULL,
    "supplierPrice" DECIMAL(12,2),
    "leadTimeDays" INTEGER,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierDrugMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DrugCategoryNode" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DrugCategoryNode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierDrugMapping_drugMasterId_idx" ON "SupplierDrugMapping"("drugMasterId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierDrugMapping_supplierId_drugMasterId_key" ON "SupplierDrugMapping"("supplierId", "drugMasterId");

-- CreateIndex
CREATE INDEX "DrugCategoryNode_branchId_parentId_idx" ON "DrugCategoryNode"("branchId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "DrugCategoryNode_branchId_code_key" ON "DrugCategoryNode"("branchId", "code");

-- AddForeignKey
ALTER TABLE "DrugMaster" ADD CONSTRAINT "DrugMaster_drugCategoryNodeId_fkey" FOREIGN KEY ("drugCategoryNodeId") REFERENCES "DrugCategoryNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDrugMapping" ADD CONSTRAINT "SupplierDrugMapping_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "PharmSupplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierDrugMapping" ADD CONSTRAINT "SupplierDrugMapping_drugMasterId_fkey" FOREIGN KEY ("drugMasterId") REFERENCES "DrugMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrugCategoryNode" ADD CONSTRAINT "DrugCategoryNode_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DrugCategoryNode" ADD CONSTRAINT "DrugCategoryNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DrugCategoryNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
