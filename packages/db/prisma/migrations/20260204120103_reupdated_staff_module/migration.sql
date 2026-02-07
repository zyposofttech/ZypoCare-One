-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "isUsgAuthorized" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedUntil" TIMESTAMP(3),
ADD COLUMN     "suspensionReason" VARCHAR(240),
ADD COLUMN     "usgAuthorizationNotes" VARCHAR(240),
ADD COLUMN     "usgAuthorizedAt" TIMESTAMP(3),
ADD COLUMN     "usgAuthorizedByUserId" TEXT;

-- CreateIndex
CREATE INDEX "Staff_category_idx" ON "Staff"("category");

-- CreateIndex
CREATE INDEX "Staff_engagementType_idx" ON "Staff"("engagementType");

-- CreateIndex
CREATE INDEX "Staff_isUsgAuthorized_idx" ON "Staff"("isUsgAuthorized");

-- CreateIndex
CREATE INDEX "Staff_suspendedUntil_idx" ON "Staff"("suspendedUntil");

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_usgAuthorizedByUserId_fkey" FOREIGN KEY ("usgAuthorizedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
