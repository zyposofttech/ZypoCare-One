-- AlterEnum: Add SCHEME_API_CREDENTIAL to ComplianceEntityType (guarded for shadow DB)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE lower(typname) = lower('ComplianceEntityType')
  ) THEN
    BEGIN
      ALTER TYPE "ComplianceEntityType" ADD VALUE IF NOT EXISTS 'SCHEME_API_CREDENTIAL';
    EXCEPTION
      WHEN duplicate_object THEN
        NULL;
    END;
  END IF;
END
$$;

-- DropIndex: Remove old unique constraint on abdm_configs.workspaceId
DROP INDEX IF EXISTS "abdm_configs_workspaceId_key";

-- CreateIndex: Add compound unique (workspaceId + environment) on abdm_configs
DO $$
BEGIN
  IF to_regclass('"abdm_configs"') IS NOT NULL
     AND to_regclass('"abdm_configs_workspaceId_environment_key"') IS NULL THEN
    EXECUTE 'CREATE UNIQUE INDEX "abdm_configs_workspaceId_environment_key" ON "abdm_configs"("workspaceId", "environment")';
  END IF;
END
$$;

-- CreateTable: scheme_api_credentials (guarded for shadow DB)
DO $$
BEGIN
  IF to_regclass('"scheme_api_credentials"') IS NULL
     AND to_regclass('"compliance_workspaces"') IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_type WHERE lower(typname) = lower('SchemeType'))
     AND EXISTS (SELECT 1 FROM pg_type WHERE lower(typname) = lower('EnvironmentType')) THEN
    EXECUTE '
      CREATE TABLE "scheme_api_credentials" (
          "id" TEXT NOT NULL,
          "workspaceId" TEXT NOT NULL,
          "scheme" "SchemeType" NOT NULL,
          "apiKeyEnc" TEXT,
          "apiSecretEnc" TEXT,
          "baseUrl" TEXT,
          "environment" "EnvironmentType" NOT NULL DEFAULT ''SANDBOX'',
          "status" TEXT NOT NULL DEFAULT ''NOT_CONFIGURED'',
          "lastTestedAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL,
          CONSTRAINT "scheme_api_credentials_pkey" PRIMARY KEY ("id")
      )';
  END IF;
END
$$;

-- CreateIndex: scheme_api_credentials unique compound
DO $$
BEGIN
  IF to_regclass('"scheme_api_credentials"') IS NOT NULL
     AND to_regclass('"scheme_api_credentials_workspaceId_scheme_environment_key"') IS NULL THEN
    EXECUTE 'CREATE UNIQUE INDEX "scheme_api_credentials_workspaceId_scheme_environment_key" ON "scheme_api_credentials"("workspaceId", "scheme", "environment")';
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF to_regclass('"scheme_api_credentials"') IS NOT NULL
     AND to_regclass('"compliance_workspaces"') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'scheme_api_credentials_workspaceId_fkey'
     ) THEN
    ALTER TABLE "scheme_api_credentials"
      ADD CONSTRAINT "scheme_api_credentials_workspaceId_fkey"
      FOREIGN KEY ("workspaceId") REFERENCES "compliance_workspaces"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;
