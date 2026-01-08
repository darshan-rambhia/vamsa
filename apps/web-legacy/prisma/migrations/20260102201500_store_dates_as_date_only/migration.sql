-- AlterTable
-- Convert dateOfBirth and dateOfPassing to DATE type for date-only storage
ALTER TABLE "Person" ALTER COLUMN "dateOfBirth" TYPE DATE;
ALTER TABLE "Person" ALTER COLUMN "dateOfPassing" TYPE DATE;

-- AlterTable  
-- Convert marriageDate and divorceDate to DATE type for date-only storage
ALTER TABLE "Relationship" ALTER COLUMN "marriageDate" TYPE DATE;
ALTER TABLE "Relationship" ALTER COLUMN "divorceDate" TYPE DATE;