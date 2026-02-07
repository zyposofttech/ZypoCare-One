-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "contactDetails" JSONB,
ADD COLUMN     "employmentDetails" JSONB,
ADD COLUMN     "medicalDetails" JSONB,
ADD COLUMN     "personalDetails" JSONB,
ADD COLUMN     "systemAccess" JSONB;
