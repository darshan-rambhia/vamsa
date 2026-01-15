/*
  Warnings:

  - You are about to drop the column `type` on the `CalendarToken` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CalendarToken" DROP COLUMN "type",
ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
ADD COLUMN     "name" TEXT,
ADD COLUMN     "rotatedAt" TIMESTAMP(3),
ADD COLUMN     "rotatedFrom" TEXT,
ADD COLUMN     "rotationPolicy" TEXT NOT NULL DEFAULT 'annual',
ADD COLUMN     "scopes" TEXT[] DEFAULT ARRAY['calendar:read']::TEXT[];

-- CreateIndex
CREATE INDEX "CalendarToken_userId_isActive_idx" ON "CalendarToken"("userId", "isActive");

-- CreateIndex
CREATE INDEX "Person_dateOfBirth_idx" ON "Person"("dateOfBirth");

-- CreateIndex
CREATE INDEX "Person_isLiving_idx" ON "Person"("isLiving");

-- CreateIndex
CREATE INDEX "Relationship_personId_type_idx" ON "Relationship"("personId", "type");

-- CreateIndex
CREATE INDEX "Relationship_relatedPersonId_type_idx" ON "Relationship"("relatedPersonId", "type");
