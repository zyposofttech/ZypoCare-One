-- AlterEnum (guarded for shadow DB)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE lower(typname) = lower('ComplianceEntityType')
  ) THEN
    BEGIN
      ALTER TYPE "ComplianceEntityType" ADD VALUE IF NOT EXISTS 'SCHEME_SYNC';
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;
  END IF;
END
$$;
