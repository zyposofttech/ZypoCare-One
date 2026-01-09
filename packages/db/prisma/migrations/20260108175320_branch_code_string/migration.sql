/*
  Warnings:

  - Changed the type of `code` on the `Branch` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Branch" DROP COLUMN "code",
ADD COLUMN     "code" VARCHAR(32) NOT NULL;

-- DropEnum
DROP TYPE "BranchCode";

-- CreateIndex
CREATE UNIQUE INDEX "Branch_code_key" ON "Branch"("code");
