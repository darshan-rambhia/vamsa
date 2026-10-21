CREATE TABLE "ApiToken" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text NOT NULL,
	"tokenHash" text NOT NULL,
	"prefix" text NOT NULL,
	"scope" text DEFAULT 'read' NOT NULL,
	"expiresAt" timestamp,
	"lastUsedAt" timestamp,
	"revokedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ApiToken_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_apiToken_userId" ON "ApiToken" USING btree ("userId");