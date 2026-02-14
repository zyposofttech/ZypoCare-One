-- Link SchemeEmpanelment to GovernmentSchemeConfig (guarded for shadow DB)
DO $$
BEGIN
  IF to_regclass('"scheme_empanelments"') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'scheme_empanelments'
        AND column_name = 'govSchemeConfigId'
    ) THEN
      ALTER TABLE "scheme_empanelments" ADD COLUMN "govSchemeConfigId" TEXT;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'scheme_empanelments'
        AND column_name = 'lastSyncedAt'
    ) THEN
      ALTER TABLE "scheme_empanelments" ADD COLUMN "lastSyncedAt" TIMESTAMP(3);
    END IF;
  END IF;
END
$$;

-- Unique constraint ensures 1:1 relationship
DO $$
BEGIN
  IF to_regclass('"scheme_empanelments"') IS NOT NULL
     AND to_regclass('"scheme_empanelments_govSchemeConfigId_key"') IS NULL THEN
    EXECUTE 'CREATE UNIQUE INDEX "scheme_empanelments_govSchemeConfigId_key" ON "scheme_empanelments"("govSchemeConfigId")';
  END IF;
END
$$;

-- Foreign key to GovernmentSchemeConfig
DO $$
BEGIN
  IF to_regclass('"scheme_empanelments"') IS NOT NULL
     AND to_regclass('"GovernmentSchemeConfig"') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'scheme_empanelments_govSchemeConfigId_fkey'
     ) THEN
    ALTER TABLE "scheme_empanelments"
      ADD CONSTRAINT "scheme_empanelments_govSchemeConfigId_fkey"
      FOREIGN KEY ("govSchemeConfigId")
      REFERENCES "GovernmentSchemeConfig"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
