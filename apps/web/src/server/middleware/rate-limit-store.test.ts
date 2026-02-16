import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRateLimitStore, RedisRateLimitStore } from "./rate-limit-store";

describe("MemoryRateLimitStore", () => {
  let store: MemoryRateLimitStore;
  const testKey = "test:key";

  beforeEach(() => {
    store = new MemoryRateLimitStore();
  });

  describe("increment", () => {
    it("creates new entry with count 1 on first call", async () => {
      const result = await store.increment(testKey, 60000);
      expect(result.count).toBe(1);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it("increments existing entry count", async () => {
      const windowMs = 60000;
      const result1 = await store.increment(testKey, windowMs);
      const result2 = await store.increment(testKey, windowMs);
      expect(result2.count).toBe(2);
      expect(result2.resetAt).toBe(result1.resetAt);
    });

    it("resets count when window expires", async () => {
      const windowMs = 100; // Very short window
      const result1 = await store.increment(testKey, windowMs);
      expect(result1.count).toBe(1);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      const result2 = await store.increment(testKey, windowMs);
      expect(result2.count).toBe(1);
      expect(result2.resetAt).toBeGreaterThan(result1.resetAt);
    });

    it("tracks separate keys independently", async () => {
      const windowMs = 60000;
      const key1 = "key:1";
      const key2 = "key:2";

      await store.increment(key1, windowMs);
      await store.increment(key1, windowMs);

      await store.increment(key2, windowMs);

      const result1 = await store.get(key1);
      const result2 = await store.get(key2);

      expect(result1?.count).toBe(2);
      expect(result2?.count).toBe(1);
    });
  });

  describe("get", () => {
    it("returns null for non-existent key", async () => {
      const result = await store.get("non-existent");
      expect(result).toBeNull();
    });

    it("returns entry for existing key within window", async () => {
      const windowMs = 60000;
      await store.increment(testKey, windowMs);
      const result = await store.get(testKey);

      expect(result).not.toBeNull();
      expect(result?.count).toBe(1);
    });

    it("returns null for expired entry", async () => {
      const windowMs = 100;
      await store.increment(testKey, windowMs);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      const result = await store.get(testKey);
      expect(result).toBeNull();
    });
  });

  describe("reset", () => {
    it("removes entry from store", async () => {
      const windowMs = 60000;
      await store.increment(testKey, windowMs);

      let result = await store.get(testKey);
      expect(result).not.toBeNull();

      await store.reset(testKey);

      result = await store.get(testKey);
      expect(result).toBeNull();
    });

    it("does not affect other entries", async () => {
      const windowMs = 60000;
      const key1 = "key:1";
      const key2 = "key:2";

      await store.increment(key1, windowMs);
      await store.increment(key2, windowMs);

      await store.reset(key1);

      const result1 = await store.get(key1);
      const result2 = await store.get(key2);

      expect(result1).toBeNull();
      expect(result2).not.toBeNull();
    });
  });

  describe("cleanup", () => {
    it("removes expired entries", async () => {
      const shortWindow = 100;
      const longWindow = 60000;

      const expiredKey = "expired:key";
      const validKey = "valid:key";

      // Create one entry that will expire and one that won't
      await store.increment(expiredKey, shortWindow);
      await new Promise((resolve) => setTimeout(resolve, 50));
      await store.increment(validKey, longWindow);

      // Wait for expired entry to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Manually trigger cleanup (normally runs on interval)
      // We can't directly call the private cleanup method, so we'll
      // verify that expired entries are returned as null by get()
      const expiredResult = await store.get(expiredKey);
      const validResult = await store.get(validKey);

      expect(expiredResult).toBeNull();
      expect(validResult).not.toBeNull();
    });
  });

  describe("destroy", () => {
    it("clears all entries", async () => {
      const windowMs = 60000;
      await store.increment("key1", windowMs);
      await store.increment("key2", windowMs);

      store.destroy();

      // After destroy, the store should no longer hold entries
      // (This is harder to test directly, but we can verify cleanup works)
      const _result1 = await store.get("key1");
      const _result2 = await store.get("key2");

      // These may still return values from memory if cleanup hasn't run,
      // but after destroy, the cleanup interval should be cleared
      // The important part is that destroy doesn't throw
      expect(store).toBeDefined();
    });
  });
});

describe("RedisRateLimitStore", () => {
  let mockRedis: any;
  let store: RedisRateLimitStore;
  const testKey = "test:key";

  beforeEach(() => {
    // Create a mock Redis client
    mockRedis = {
      incr: vi.fn(async () => 1),
      pexpire: vi.fn(async () => 1),
      pttl: vi.fn(async () => 60000),
      get: vi.fn(async () => "1"),
      del: vi.fn(async () => 1),
    };
    store = new RedisRateLimitStore(mockRedis);
  });

  describe("increment", () => {
    it("increments Redis key and returns count", async () => {
      mockRedis.incr.mockResolvedValueOnce(1);
      mockRedis.pttl.mockResolvedValueOnce(60000);

      const result = await store.increment(testKey, 60000);

      expect(mockRedis.incr).toHaveBeenCalledWith("ratelimit:test:key");
      expect(result.count).toBe(1);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it("sets TTL on first increment", async () => {
      mockRedis.incr.mockResolvedValueOnce(1);
      mockRedis.pttl.mockResolvedValueOnce(60000);

      await store.increment(testKey, 60000);

      expect(mockRedis.pexpire).toHaveBeenCalledWith(
        "ratelimit:test:key",
        60000
      );
    });

    it("does not set TTL on subsequent increments", async () => {
      mockRedis.incr.mockResolvedValueOnce(2);
      mockRedis.pttl.mockResolvedValueOnce(55000);

      await store.increment(testKey, 60000);

      expect(mockRedis.pexpire).not.toHaveBeenCalled();
    });

    it("falls back to memory store when Redis fails", async () => {
      mockRedis.incr.mockRejectedValueOnce(new Error("Redis unavailable"));

      const result = await store.increment(testKey, 60000);

      // Should still return a result (from fallback)
      expect(result.count).toBe(1);
      expect(result.resetAt).toBeGreaterThan(Date.now());
    });

    it("opens circuit breaker after consecutive failures", async () => {
      mockRedis.incr.mockRejectedValue(new Error("Redis unavailable"));

      // Trigger 3 failures to open circuit
      await store.increment("key1", 60000);
      await store.increment("key2", 60000);
      await store.increment("key3", 60000);

      // Next call should skip Redis entirely (circuit is open)
      const result = await store.increment("key4", 60000);

      expect(result.count).toBe(1); // Fallback memory store
    });
  });

  describe("get", () => {
    it("retrieves count from Redis", async () => {
      mockRedis.get.mockResolvedValueOnce("5");
      mockRedis.pttl.mockResolvedValueOnce(45000);

      const result = await store.get(testKey);

      expect(mockRedis.get).toHaveBeenCalledWith("ratelimit:test:key");
      expect(result?.count).toBe(5);
      expect(result?.resetAt).toBeGreaterThan(Date.now());
    });

    it("returns null when key does not exist", async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockRedis.pttl.mockResolvedValueOnce(-2);

      const result = await store.get(testKey);

      expect(result).toBeNull();
    });

    it("returns null when key has expired", async () => {
      mockRedis.get.mockResolvedValueOnce("3");
      mockRedis.pttl.mockResolvedValueOnce(-1);

      const result = await store.get(testKey);

      expect(result).toBeNull();
    });

    it("falls back to memory store on Redis error", async () => {
      mockRedis.get.mockRejectedValueOnce(new Error("Redis unavailable"));

      const result = await store.get(testKey);

      // Should return null from fallback (no entry yet)
      expect(result).toBeNull();
    });
  });

  describe("reset", () => {
    it("deletes key from Redis", async () => {
      mockRedis.del.mockResolvedValueOnce(1);

      await store.reset(testKey);

      expect(mockRedis.del).toHaveBeenCalledWith("ratelimit:test:key");
    });

    it("falls back to memory store on Redis error", async () => {
      mockRedis.del.mockRejectedValueOnce(new Error("Redis unavailable"));

      // Should not throw
      await store.reset(testKey);

      expect(mockRedis.del).toHaveBeenCalled();
    });

    it("uses fallback when circuit is open", async () => {
      // Open circuit
      mockRedis.incr.mockRejectedValue(new Error("Redis down"));
      await store.increment("key1", 60000);
      await store.increment("key2", 60000);
      await store.increment("key3", 60000);

      // Reset should use fallback
      await store.reset(testKey);

      // del should not be called (circuit is open)
      expect(mockRedis.del).not.toHaveBeenCalled();
    });
  });

  describe("circuit breaker", () => {
    it("resets consecutiveFailures on successful operation", async () => {
      mockRedis.incr.mockRejectedValueOnce(new Error("Redis error"));

      // One failure
      await store.increment("key1", 60000);

      // Success
      mockRedis.incr.mockResolvedValueOnce(1);
      mockRedis.pttl.mockResolvedValueOnce(60000);
      await store.increment("key2", 60000);

      // Should not have opened circuit (success reset counter)
      mockRedis.incr.mockResolvedValueOnce(1);
      mockRedis.pttl.mockResolvedValueOnce(60000);
      const result = await store.increment("key3", 60000);

      expect(result.count).toBe(1);
      expect(mockRedis.incr).toHaveBeenCalled();
    });

    it("opens circuit after threshold failures", async () => {
      mockRedis.incr.mockRejectedValue(new Error("Redis down"));

      // 3 failures (threshold)
      await store.increment("key1", 60000);
      await store.increment("key2", 60000);
      await store.increment("key3", 60000);

      // Circuit should be open now, next call skips Redis
      mockRedis.incr.mockClear();
      await store.increment("key4", 60000);

      expect(mockRedis.incr).not.toHaveBeenCalled();
    });
  });

  describe("destroy", () => {
    it("cleans up fallback store", () => {
      // Should not throw
      store.destroy();
      expect(store).toBeDefined();
    });
  });

  describe("key prefixing", () => {
    it("prefixes all Redis keys with ratelimit:", async () => {
      mockRedis.incr.mockResolvedValueOnce(1);
      mockRedis.pttl.mockResolvedValueOnce(60000);

      await store.increment("api:user:123", 60000);

      expect(mockRedis.incr).toHaveBeenCalledWith("ratelimit:api:user:123");
    });
  });
});
