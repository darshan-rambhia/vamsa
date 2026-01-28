import cron from "node-cron";
import { drizzleDb, drizzleSchema } from "@vamsa/lib/server";
import { eq, and } from "drizzle-orm";
import { loggers } from "@vamsa/lib/logger";
import { enforceRotationPolicy } from "@vamsa/lib/server/business";

const log = loggers.jobs;

/**
 * Daily job to check for tokens that need annual rotation
 * Runs at 2am daily
 */
export function startAnnualRotationJob() {
  cron.schedule("0 2 * * *", async () => {
    try {
      log.info({}, "Running annual token rotation check");

      // Find users who have active tokens with annual rotation policy
      const tokensWithAnnualRotation = await drizzleDb
        .select({ userId: drizzleSchema.calendarTokens.userId })
        .from(drizzleSchema.calendarTokens)
        .where(
          and(
            eq(drizzleSchema.calendarTokens.isActive, true),
            eq(drizzleSchema.calendarTokens.rotationPolicy, "annual")
          )
        );

      const userIds = [
        ...new Set(tokensWithAnnualRotation.map((t) => t.userId)),
      ];
      const users = userIds.map((id) => ({ id }));

      let totalRotated = 0;

      for (const user of users) {
        try {
          const { rotated } = await enforceRotationPolicy(
            user.id,
            "annual_check"
          );
          totalRotated += rotated;
        } catch (err) {
          log
            .withErr(err)
            .ctx({ userId: user.id })
            .msg("Failed to rotate tokens for user");
        }
      }

      log.info(
        { totalRotated, usersChecked: users.length },
        "Annual token rotation complete"
      );
    } catch (err) {
      log.withErr(err).msg("Annual token rotation job failed");
    }
  });

  log.info({}, "Annual token rotation job scheduled");
}
