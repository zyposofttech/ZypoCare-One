-- DropIndex
DROP INDEX "BranchInfraConfig_branchId_idx";

-- AddForeignKey
ALTER TABLE "BranchInfraConfig" ADD CONSTRAINT "BranchInfraConfig_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
