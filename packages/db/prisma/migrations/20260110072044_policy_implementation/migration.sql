-- DropForeignKey
ALTER TABLE "PolicyVersion" DROP CONSTRAINT "PolicyVersion_policyId_fkey";

-- AlterTable
ALTER TABLE "PolicyVersion" ADD COLUMN     "policyDefinitionId" TEXT;

-- AddForeignKey
ALTER TABLE "PolicyVersion" ADD CONSTRAINT "PolicyVersion_policyDefinitionId_fkey" FOREIGN KEY ("policyDefinitionId") REFERENCES "PolicyDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
