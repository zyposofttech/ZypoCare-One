-- Link SchemeEmpanelment to GovernmentSchemeConfig (bidirectional 1:1)
ALTER TABLE "scheme_empanelments" ADD COLUMN "govSchemeConfigId" TEXT;
ALTER TABLE "scheme_empanelments" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

-- Unique constraint ensures 1:1 relationship
CREATE UNIQUE INDEX "scheme_empanelments_govSchemeConfigId_key" ON "scheme_empanelments"("govSchemeConfigId");

-- Foreign key to GovernmentSchemeConfig
ALTER TABLE "scheme_empanelments"
  ADD CONSTRAINT "scheme_empanelments_govSchemeConfigId_fkey"
  FOREIGN KEY ("govSchemeConfigId")
  REFERENCES "GovernmentSchemeConfig"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
