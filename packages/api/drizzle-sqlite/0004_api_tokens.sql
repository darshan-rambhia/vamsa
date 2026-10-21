CREATE TABLE `ApiToken` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`tokenHash` text NOT NULL,
	`prefix` text NOT NULL,
	`scope` text DEFAULT 'read' NOT NULL,
	`expiresAt` integer,
	`lastUsedAt` integer,
	`revokedAt` integer,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ApiToken_tokenHash_unique` ON `ApiToken` (`tokenHash`);--> statement-breakpoint
CREATE INDEX `idx_apiToken_userId` ON `ApiToken` (`userId`);