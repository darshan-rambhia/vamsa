-- Grandfather existing users: set emailVerified = true for all users
-- who registered before email verification was enabled.
-- This prevents locking out existing users when verification is turned on.
UPDATE "User" SET "emailVerified" = true WHERE "emailVerified" = false OR "emailVerified" IS NULL;
