CREATE TABLE `DeviceCode` (
	`id` text PRIMARY KEY NOT NULL,
	`deviceCode` text NOT NULL,
	`userCode` text NOT NULL,
	`userId` text,
	`expiresAt` integer NOT NULL,
	`status` text NOT NULL,
	`lastPolledAt` integer,
	`pollingInterval` integer,
	`clientId` text,
	`scope` text,
	`userAgent` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `DeviceCode_deviceCode_unique` ON `DeviceCode` (`deviceCode`);--> statement-breakpoint
CREATE UNIQUE INDEX `DeviceCode_userCode_unique` ON `DeviceCode` (`userCode`);--> statement-breakpoint
CREATE INDEX `idx_deviceCode_userId` ON `DeviceCode` (`userId`);