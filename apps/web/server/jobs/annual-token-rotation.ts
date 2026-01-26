import cron from "node-cron";
import { drizzleDb, drizzleSchema } from "@vamsa/lib/server";
import { eq, and } from "drizzle-orm";
import { logger } from "@vamsa/lib/logger";
import { enforceRotationPolicy } from "@vamsa/lib/server/business";

/**
 * Daily job to check for tokens that need annual rotation
 * Runs at 2am daily
 */
export function startAnnualRotationJob() {
  cron.schedule("0 2 * * *", async () => {
    try {
      logger.info("Running annual token rotation check");

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
          logger.error(
            { err, userId: user.id },
            "Failed to rotate tokens for user"
          );
        }
      }

      logger.info(
        { totalRotated, usersChecked: users.length },
        "Annual token rotation complete"
      );
    } catch (err) {
      logger.error({ err }, "Annual token rotation job failed");
    }
  });

  logger.info("Annual token rotation job scheduled");
}
