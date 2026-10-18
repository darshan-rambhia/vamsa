-- Grandfather existing users: set emailVerified = true for all users
-- who registered before email verification was enabled.
-- This prevents locking out existing users when verification is turned on.
-- SQLite stores booleans as integers (0/1). Mirrors drizzle/0001_grandfather_verified_users.sql.
UPDATE `User` SET `emailVerified` = 1 WHERE `emailVerified` = 0 OR `emailVerified` IS NULL;
