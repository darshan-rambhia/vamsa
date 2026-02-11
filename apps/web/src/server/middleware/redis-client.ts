import { loggers } from "@vamsa/lib/logger";
import type Redis from "ioredis";

const log = loggers.api;

let redisInstance: Redis | null = null;

/**
 * Get or create a Redis client singleton.
 * Returns null if REDIS_URL is not set.
 */
export async function getRedisClient(): Promise<Redis | null> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return null;

  if (redisInstance) return redisInstance;

  try {
    const { default: Redis } = await import("ioredis");
    redisInstance = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
      lazyConnect: true,
    });

    redisInstance.on("connect", () => {
      log.info({}, "Redis connected for rate limiting");
    });

    redisInstance.on("error", (err) => {
      log.warn({ error: err.message }, "Redis connection error");
    });

    await redisInstance.connect();
    return redisInstance;
  } catch (error) {
    log.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "Failed to connect to Redis, using in-memory rate limiting"
    );
    redisInstance = null;
    return null;
  }
}

/**
 * Close the Redis connection gracefully.
 */
export async function closeRedisClient(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}
