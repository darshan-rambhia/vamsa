CREATE TABLE "DeviceCode" (
	"id" text PRIMARY KEY NOT NULL,
	"deviceCode" text NOT NULL,
	"userCode" text NOT NULL,
	"userId" text,
	"expiresAt" timestamp NOT NULL,
	"status" text NOT NULL,
	"lastPolledAt" timestamp,
	"pollingInterval" integer,
	"clientId" text,
	"scope" text,
	"userAgent" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "DeviceCode_deviceCode_unique" UNIQUE("deviceCode"),
	CONSTRAINT "DeviceCode_userCode_unique" UNIQUE("userCode")
);
--> statement-breakpoint
ALTER TABLE "DeviceCode" ADD CONSTRAINT "DeviceCode_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_deviceCode_userId" ON "DeviceCode" USING btree ("userId");