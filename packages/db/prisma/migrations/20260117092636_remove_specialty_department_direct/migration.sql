-- Backfill existing Specialty.departmentId into DepartmentSpecialty before dropping the column.
-- This preserves historical links created by the old schema.

INSERT INTO "DepartmentSpecialty" ("id", "departmentId", "specialtyId", "isPrimary", "isActive", "createdAt", "updatedAt")
SELECT
  ('mig_' || md5(random()::text || clock_timestamp()::text || s."id")) AS "id",
  s."departmentId" AS "departmentId",
  s."id" AS "specialtyId",
  false AS "isPrimary",
  true AS "isActive",
  now() AS "createdAt",
  now() AS "updatedAt"
FROM "Specialty" s
WHERE s."departmentId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "DepartmentSpecialty" ds
    WHERE ds."departmentId" = s."departmentId"
      AND ds."specialtyId" = s."id"
  );

-- DropForeignKey
ALTER TABLE "Specialty" DROP CONSTRAINT "Specialty_departmentId_fkey";

-- AlterTable
ALTER TABLE "Specialty" DROP COLUMN "departmentId";
