/**
 * Device Tokens Business Logic
 *
 * Handles registration, unregistration, and retrieval of device push notification tokens
 */

import { loggers } from "@vamsa/lib/logger";
import type { DeviceTokenInput, DeviceTokenRecord } from "./types";

const log = loggers.email;

/**
 * Register a new device token for push notifications
 *
 * @param input - Device token input with userId, token, platform, and optional deviceId
 * @throws Error if user not found or database error occurs
 */
export async function registerDeviceToken(
  input: DeviceTokenInput
): Promise<void> {
  try {
    const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
    const { eq, and } = await import("drizzle-orm");

    // Verify user exists
    const user = await drizzleDb.query.users.findFirst({
      where: eq(drizzleSchema.users.id, input.userId),
      columns: { id: true },
    });

    if (!user) {
      throw new Error(`User not found: ${input.userId}`);
    }

    // Check if token already exists for this device
    const existingToken = await drizzleDb.query.deviceTokens.findFirst({
      where: and(
        eq(drizzleSchema.deviceTokens.userId, input.userId),
        eq(drizzleSchema.deviceTokens.token, input.token),
        input.deviceId
          ? eq(drizzleSchema.deviceTokens.deviceId, input.deviceId)
          : undefined
      ),
    });

    if (existingToken) {
      // Update existing token's timestamp and reactivate if needed
      await drizzleDb
        .update(drizzleSchema.deviceTokens)
        .set({
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(drizzleSchema.deviceTokens.id, existingToken.id));

      log.debug(
        { userId: input.userId, platform: input.platform },
        "Device token updated"
      );
      return;
    }

    // Create new device token
    await drizzleDb.insert(drizzleSchema.deviceTokens).values({
      id: crypto.randomUUID(),
      userId: input.userId,
      token: input.token,
      platform: input.platform,
      deviceId: input.deviceId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    log.info(
      { userId: input.userId, platform: input.platform },
      "Device token registered"
    );
  } catch (error) {
    log.withErr(error).msg("Error registering device token");
    throw error;
  }
}

/**
 * Unregister a device token, marking it as inactive
 *
 * @param userId - ID of the user
 * @param deviceId - Unique device identifier
 * @throws Error if device token not found or database error occurs
 */
export async function unregisterDeviceToken(
  userId: string,
  deviceId: string
): Promise<void> {
  try {
    const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
    const { eq, and } = await import("drizzle-orm");

    // Find and deactivate the device token
    await drizzleDb
      .update(drizzleSchema.deviceTokens)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(drizzleSchema.deviceTokens.userId, userId),
          eq(drizzleSchema.deviceTokens.deviceId, deviceId)
        )
      );

    log.info({ userId, deviceId }, "Device token unregistered");
  } catch (error) {
    log.withErr(error).msg("Error unregistering device token");
    throw error;
  }
}

/**
 * Get all active device tokens for a user
 *
 * @param userId - ID of the user
 * @returns Array of active device tokens with platform info
 */
export async function getActiveDeviceTokens(
  userId: string
): Promise<Array<DeviceTokenRecord>> {
  try {
    const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
    const { eq, and } = await import("drizzle-orm");

    const tokens = await drizzleDb.query.deviceTokens.findMany({
      where: and(
        eq(drizzleSchema.deviceTokens.userId, userId),
        eq(drizzleSchema.deviceTokens.isActive, true)
      ),
      columns: {
        token: true,
        platform: true,
        deviceId: true,
      },
    });

    return tokens as Array<DeviceTokenRecord>;
  } catch (error) {
    log.withErr(error).msg("Error retrieving device tokens");
    throw error;
  }
}

/**
 * Deactivate all tokens for a user (e.g., on logout or account deletion)
 *
 * @param userId - ID of the user
 */
export async function deactivateAllUserTokens(userId: string): Promise<void> {
  try {
    const { drizzleDb, drizzleSchema } = await import("@vamsa/api");
    const { eq } = await import("drizzle-orm");

    await drizzleDb
      .update(drizzleSchema.deviceTokens)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(drizzleSchema.deviceTokens.userId, userId));

    log.info({ userId }, "All device tokens deactivated for user");
  } catch (error) {
    log.withErr(error).msg("Error deactivating user tokens");
    throw error;
  }
}
