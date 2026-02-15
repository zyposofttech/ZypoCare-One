-- CreateEnum
CREATE TYPE "AntibioticStewardshipLevel" AS ENUM ('UNRESTRICTED', 'RESTRICTED', 'RESERVE');

-- CreateEnum
CREATE TYPE "PharmCommitteeRole" AS ENUM ('CHAIR', 'MEMBER', 'SECRETARY');

-- AlterTable
ALTER TABLE "DrugMaster" ADD COLUMN     "antibioticStewardshipLevel" "AntibioticStewardshipLevel" NOT NULL DEFAULT 'UNRESTRICTED';

-- CreateTable
CREATE TABLE "PharmFormularyCommittee" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmFormularyCommittee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmFormularyCommitteeMember" (
    "id" TEXT NOT NULL,
    "committeeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PharmCommitteeRole" NOT NULL DEFAULT 'MEMBER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmFormularyCommitteeMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmFormularyPolicy" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "committeeId" TEXT,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PharmFormularyPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PharmFormularyCommittee_branchId_isActive_idx" ON "PharmFormularyCommittee"("branchId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PharmFormularyCommittee_branchId_name_key" ON "PharmFormularyCommittee"("branchId", "name");

-- CreateIndex
CREATE INDEX "PharmFormularyCommitteeMember_userId_idx" ON "PharmFormularyCommitteeMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PharmFormularyCommitteeMember_committeeId_userId_key" ON "PharmFormularyCommitteeMember"("committeeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PharmFormularyPolicy_branchId_key" ON "PharmFormularyPolicy"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "PharmFormularyPolicy_committeeId_key" ON "PharmFormularyPolicy"("committeeId");

-- CreateIndex
CREATE INDEX "DrugMaster_branchId_isAntibiotic_antibioticStewardshipLevel_idx" ON "DrugMaster"("branchId", "isAntibiotic", "antibioticStewardshipLevel");

-- AddForeignKey
ALTER TABLE "PharmFormularyCommittee" ADD CONSTRAINT "PharmFormularyCommittee_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmFormularyCommittee" ADD CONSTRAINT "PharmFormularyCommittee_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmFormularyCommitteeMember" ADD CONSTRAINT "PharmFormularyCommitteeMember_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "PharmFormularyCommittee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmFormularyCommitteeMember" ADD CONSTRAINT "PharmFormularyCommitteeMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmFormularyPolicy" ADD CONSTRAINT "PharmFormularyPolicy_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmFormularyPolicy" ADD CONSTRAINT "PharmFormularyPolicy_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "PharmFormularyCommittee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
