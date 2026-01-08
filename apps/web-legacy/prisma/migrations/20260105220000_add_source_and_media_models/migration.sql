-- GEDCOM Phase 2: Source Citations Support
CREATE TABLE "Source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "publicationDate" TEXT,
    "description" TEXT,
    "repository" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create index on Source title for faster lookups
CREATE INDEX "Source_title_idx" ON "Source"("title");

-- Join table for Event to Source relationships
CREATE TABLE "EventSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,

    CONSTRAINT "EventSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE CASCADE,
    CONSTRAINT "EventSource_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE
);

-- Create indexes for EventSource
CREATE INDEX "EventSource_sourceId_idx" ON "EventSource"("sourceId");
CREATE INDEX "EventSource_personId_idx" ON "EventSource"("personId");
CREATE INDEX "EventSource_eventType_idx" ON "EventSource"("eventType");
CREATE UNIQUE INDEX "EventSource_sourceId_personId_eventType_key" ON "EventSource"("sourceId", "personId", "eventType");

-- GEDCOM Phase 2: Multimedia Object Support
CREATE TABLE "MediaObject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "filePath" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create index on MediaObject filePath
CREATE INDEX "MediaObject_filePath_idx" ON "MediaObject"("filePath");

-- Join table for Event to MediaObject relationships
CREATE TABLE "EventMedia" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mediaId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,

    CONSTRAINT "EventMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "MediaObject" ("id") ON DELETE CASCADE,
    CONSTRAINT "EventMedia_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE
);

-- Create indexes for EventMedia
CREATE INDEX "EventMedia_mediaId_idx" ON "EventMedia"("mediaId");
CREATE INDEX "EventMedia_personId_idx" ON "EventMedia"("personId");
CREATE INDEX "EventMedia_eventType_idx" ON "EventMedia"("eventType");
CREATE UNIQUE INDEX "EventMedia_mediaId_personId_eventType_key" ON "EventMedia"("mediaId", "personId", "eventType");
