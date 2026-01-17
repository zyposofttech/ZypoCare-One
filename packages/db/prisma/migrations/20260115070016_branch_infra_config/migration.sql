-- CreateTable
CREATE TABLE "BranchInfraConfig" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "housekeepingGateEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BranchInfraConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BranchInfraConfig_branchId_key" ON "BranchInfraConfig"("branchId");

-- CreateIndex
CREATE INDEX "BranchInfraConfig_branchId_idx" ON "BranchInfraConfig"("branchId");
