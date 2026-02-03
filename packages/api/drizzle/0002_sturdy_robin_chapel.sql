CREATE TABLE "DeviceToken" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"token" varchar(512) NOT NULL,
	"platform" varchar(20) NOT NULL,
	"deviceId" varchar(255),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Notification" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" varchar(1024) NOT NULL,
	"data" jsonb,
	"readAt" timestamp,
	"sentAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_deviceToken_userId" ON "DeviceToken" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_deviceToken_isActive" ON "DeviceToken" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "idx_deviceToken_userId_isActive" ON "DeviceToken" USING btree ("userId","isActive");--> statement-breakpoint
CREATE INDEX "idx_deviceToken_deviceId" ON "DeviceToken" USING btree ("deviceId");--> statement-breakpoint
CREATE INDEX "idx_notification_userId" ON "Notification" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_notification_type" ON "Notification" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_notification_createdAt" ON "Notification" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "idx_notification_userId_readAt" ON "Notification" USING btree ("userId","readAt");