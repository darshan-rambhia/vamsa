ALTER TABLE "Account" ADD COLUMN "issuer" text DEFAULT 'local:credential' NOT NULL;
--> statement-breakpoint
-- better-auth 1.7 backfill: credential accounts are keyed by user id;
-- OAuth accounts use the "local:oauth:<provider>" namespace.
-- ponytail: 'oidc' rows get local:oauth:oidc, not the discovery issuer URL;
-- re-link via trusted-provider account linking if any exist.
UPDATE "Account" SET "issuer" = 'local:oauth:' || "providerId" WHERE "providerId" <> 'credential';--> statement-breakpoint
UPDATE "Account" SET "accountId" = "userId" WHERE "providerId" = 'credential';
