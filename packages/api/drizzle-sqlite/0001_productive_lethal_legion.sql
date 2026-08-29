ALTER TABLE `Account` ADD `issuer` text DEFAULT 'local:credential' NOT NULL;
--> statement-breakpoint
UPDATE `Account` SET `issuer` = 'local:oauth:' || `providerId` WHERE `providerId` <> 'credential';--> statement-breakpoint
UPDATE `Account` SET `accountId` = `userId` WHERE `providerId` = 'credential';
