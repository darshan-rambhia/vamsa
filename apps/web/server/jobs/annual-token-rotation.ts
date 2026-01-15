import cron from "node-cron";
import { prisma } from "../../src/server/db";
import { logger } from "@vamsa/lib/logger";
import { enforceRotationPolicy } from "../auth/token-rotation";

/**
 * Daily job to check for tokens that need annual rotation
 * Runs at 2am daily
 */
export function startAnnualRotationJob() {
  cron.schedule("0 2 * * *", async () => {
    try {
      logger.info("Running annual token rotation check");

      const users = await prisma.user.findMany({
        where: {
          calendarTokens: {
            some: {
              isActive: true,
              rotationPolicy: "annual",
            },
          },
        },
        select: { id: true },
      });

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
