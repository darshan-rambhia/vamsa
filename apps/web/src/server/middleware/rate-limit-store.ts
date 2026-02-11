import { loggers } from "@vamsa/lib/logger";
import type Redis from "ioredis";

const log = loggers.api;

export interface RateLimitResult {
  count: number;
  resetAt: number;
}

export interface RateLimitStore {
  increment: (key: string, windowMs: number) => Promise<RateLimitResult>;
  get: (key: string) => Promise<RateLimitResult | null>;
  reset: (key: string) => Promise<void>;
}

/**
 * In-memory rate limit store (default, for dev and single-instance).
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitResult>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  async increment(key: string, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry || entry.resetAt < now) {
      entry = { count: 1, resetAt: now + windowMs };
    } else {
      entry = { ...entry, count: entry.count + 1 };
    }

    this.store.set(key, entry);
    return entry;
  }

  async get(key: string): Promise<RateLimitResult | null> {
    const entry = this.store.get(key);
    if (!entry || entry.resetAt < Date.now()) return null;
    return entry;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt < now) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
    this.store.clear();
  }
}

/**
 * Redis-backed rate limit store for production multi-instance deployments.
 * Uses atomic INCR + PEXPIRE for correct counting across instances.
 * Includes circuit breaker fallback to memory store if Redis is unavailable.
 */
export class RedisRateLimitStore implements RateLimitStore {
  private redis: Redis;
  private fallback: MemoryRateLimitStore;
  private circuitOpen = false;
  private consecutiveFailures = 0;
  private readonly failureThreshold = 3;
  private readonly prefix = "ratelimit:";

  constructor(redis: Redis) {
    this.redis = redis;
    this.fallback = new MemoryRateLimitStore();
  }

  async increment(key: string, windowMs: number): Promise<RateLimitResult> {
    if (this.circuitOpen) {
      return this.fallback.increment(key, windowMs);
    }

    try {
      const redisKey = this.prefix + key;
      const count = await this.redis.incr(redisKey);

      // Set TTL only on first increment (count === 1)
      if (count === 1) {
        await this.redis.pexpire(redisKey, windowMs);
      }

      const pttl = await this.redis.pttl(redisKey);
      const resetAt = Date.now() + Math.max(pttl, 0);

      this.consecutiveFailures = 0;
      return { count, resetAt };
    } catch (error) {
      return this.handleRedisError(error, key, windowMs);
    }
  }

  async get(key: string): Promise<RateLimitResult | null> {
    if (this.circuitOpen) {
      return this.fallback.get(key);
    }

    try {
      const redisKey = this.prefix + key;
      const [countStr, pttl] = await Promise.all([
        this.redis.get(redisKey),
        this.redis.pttl(redisKey),
      ]);

      if (!countStr || pttl <= 0) return null;

      this.consecutiveFailures = 0;
      return { count: parseInt(countStr, 10), resetAt: Date.now() + pttl };
    } catch {
      return this.fallback.get(key);
    }
  }

  async reset(key: string): Promise<void> {
    if (this.circuitOpen) {
      return this.fallback.reset(key);
    }

    try {
      await this.redis.del(this.prefix + key);
      this.consecutiveFailures = 0;
    } catch {
      await this.fallback.reset(key);
    }
  }

  private async handleRedisError(
    error: unknown,
    key: string,
    windowMs: number
  ): Promise<RateLimitResult> {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.circuitOpen = true;
      log.warn(
        {},
        "Redis rate limit circuit breaker opened, falling back to memory"
      );
      setTimeout(() => {
        this.circuitOpen = false;
        this.consecutiveFailures = 0;
        log.info({}, "Redis rate limit circuit breaker reset");
      }, 30_000);
    }
    return this.fallback.increment(key, windowMs);
  }

  destroy(): void {
    this.fallback.destroy();
  }
}
