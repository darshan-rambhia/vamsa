CREATE TABLE "DashboardPreferences" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"layout" jsonb DEFAULT '{"widgets":[]}'::jsonb NOT NULL,
	"widgets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL,
	CONSTRAINT "DashboardPreferences_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
ALTER TABLE "User" DROP CONSTRAINT "User_oidcProvider_oidcSubject_unique";--> statement-breakpoint
ALTER TABLE "Relationship" DROP CONSTRAINT "Relationship_personId_relatedPersonId_type_unique";--> statement-breakpoint
ALTER TABLE "EventMedia" DROP CONSTRAINT "EventMedia_mediaId_personId_eventType_unique";--> statement-breakpoint
ALTER TABLE "EventParticipant" DROP CONSTRAINT "EventParticipant_eventId_personId_unique";--> statement-breakpoint
ALTER TABLE "PlacePersonLink" DROP CONSTRAINT "PlacePersonLink_personId_placeId_type_unique";--> statement-breakpoint
ALTER TABLE "User" ALTER COLUMN "emailNotificationPreferences" SET DEFAULT '{"newMemberJoined":true,"birthdayReminders":true,"suggestionsCreated":true,"suggestionsUpdated":true}'::jsonb;--> statement-breakpoint
ALTER TABLE "Person" ADD COLUMN "deletedAt" timestamp;--> statement-breakpoint
CREATE INDEX "idx_dashboardPreferences_userId" ON "DashboardPreferences" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_person_deletedAt" ON "Person" USING btree ("deletedAt");--> statement-breakpoint
ALTER TABLE "User" ADD CONSTRAINT "User_oidcProvider_oidcSubject_unique" UNIQUE("oidcSubject","oidcProvider");--> statement-breakpoint
ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_personId_relatedPersonId_type_unique" UNIQUE("type","relatedPersonId","personId");--> statement-breakpoint
ALTER TABLE "EventMedia" ADD CONSTRAINT "EventMedia_mediaId_personId_eventType_unique" UNIQUE("personId","mediaId","eventType");--> statement-breakpoint
ALTER TABLE "EventParticipant" ADD CONSTRAINT "EventParticipant_eventId_personId_unique" UNIQUE("personId","eventId");--> statement-breakpoint
ALTER TABLE "PlacePersonLink" ADD CONSTRAINT "PlacePersonLink_personId_placeId_type_unique" UNIQUE("type","placeId","personId");