-- AlterEnum: Add SCHEME_API_CREDENTIAL to ComplianceEntityType
ALTER TYPE "ComplianceEntityType" ADD VALUE IF NOT EXISTS 'SCHEME_API_CREDENTIAL';

-- DropIndex: Remove old unique constraint on abdm_configs.workspaceId
DROP INDEX IF EXISTS "abdm_configs_workspaceId_key";

-- CreateIndex: Add compound unique (workspaceId + environment) on abdm_configs
CREATE UNIQUE INDEX "abdm_configs_workspaceId_environment_key" ON "abdm_configs"("workspaceId", "environment");

-- CreateTable: scheme_api_credentials
CREATE TABLE "scheme_api_credentials" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "scheme" "SchemeType" NOT NULL,
    "apiKeyEnc" TEXT,
    "apiSecretEnc" TEXT,
    "baseUrl" TEXT,
    "environment" "EnvironmentType" NOT NULL DEFAULT 'SANDBOX',
    "status" TEXT NOT NULL DEFAULT 'NOT_CONFIGURED',
    "lastTestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheme_api_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: scheme_api_credentials unique compound
CREATE UNIQUE INDEX "scheme_api_credentials_workspaceId_scheme_environment_key" ON "scheme_api_credentials"("workspaceId", "scheme", "environment");

-- AddForeignKey
ALTER TABLE "scheme_api_credentials" ADD CONSTRAINT "scheme_api_credentials_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "compliance_workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
