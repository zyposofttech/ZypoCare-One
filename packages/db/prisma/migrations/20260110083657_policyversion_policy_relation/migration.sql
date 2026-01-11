/*
  Warnings:

  - You are about to drop the column `policyDefinitionId` on the `PolicyVersion` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "PolicyVersion" DROP CONSTRAINT "PolicyVersion_policyDefinitionId_fkey";

-- AlterTable
ALTER TABLE "PolicyVersion" DROP COLUMN "policyDefinitionId";

-- AddForeignKey
ALTER TABLE "PolicyVersion" ADD CONSTRAINT "PolicyVersion_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "PolicyDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
