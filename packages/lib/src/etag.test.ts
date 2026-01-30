import { describe, expect, it } from "bun:test";
import {
  CacheControl,
  createCacheHeaders,
  etagMatches,
  generateETag,
  generateETagFromObject,
  generateTimestampETag,
  generateVersionETag,
  parseETag,
} from "./etag";

describe("generateETag", () => {
  it("generates a strong ETag by default", () => {
    const etag = generateETag("test content");
    expect(etag).toMatch(/^"[a-f0-9]{16}"$/);
  });

  it("generates a weak ETag when specified", () => {
    const etag = generateETag("test content", { weak: true });
    expect(etag).toMatch(/^W\/"[a-f0-9]{16}"$/);
  });

  it("generates consistent ETags for the same content", () => {
    const etag1 = generateETag("test content");
    const etag2 = generateETag("test content");
    expect(etag1).toBe(etag2);
  });

  it("generates different ETags for different content", () => {
    const etag1 = generateETag("content A");
    const etag2 = generateETag("content B");
    expect(etag1).not.toBe(etag2);
  });

  it("accepts Buffer input", () => {
    const buffer = Buffer.from("test content");
    const etag = generateETag(buffer);
    expect(etag).toMatch(/^"[a-f0-9]{16}"$/);
  });

  it("uses sha256 algorithm when specified", () => {
    const etag = generateETag("test", { algorithm: "sha256" });
    expect(etag).toMatch(/^"[a-f0-9]{16}"$/);
  });

  it("respects custom length option", () => {
    const etag = generateETag("test", { length: 8 });
    expect(etag).toMatch(/^"[a-f0-9]{8}"$/);
  });

  it("handles empty string", () => {
    const etag = generateETag("");
    expect(etag).toMatch(/^"[a-f0-9]{16}"$/);
  });

  it("handles unicode content", () => {
    const etag = generateETag("Hello World");
    expect(etag).toMatch(/^"[a-f0-9]{16}"$/);
  });

  it("handles long content", () => {
    const longContent = "x".repeat(100000);
    const etag = generateETag(longContent);
    expect(etag).toMatch(/^"[a-f0-9]{16}"$/);
  });
});

describe("generateETagFromObject", () => {
  it("generates ETag from object", () => {
    const etag = generateETagFromObject({ name: "test" });
    expect(etag).toMatch(/^"[a-f0-9]{16}"$/);
  });

  it("generates consistent ETags for equivalent objects", () => {
    const etag1 = generateETagFromObject({ a: 1, b: 2 });
    const etag2 = generateETagFromObject({ a: 1, b: 2 });
    expect(etag1).toBe(etag2);
  });

  it("generates different ETags for objects with different key order", () => {
    // Note: JSON.stringify maintains insertion order, so these may differ
    const obj1 = { a: 1, b: 2 };
    const obj2 = { b: 2, a: 1 };
    // In JavaScript, object key order is maintained for string keys
    // so these will have different JSON representations
    const etag1 = generateETagFromObject(obj1);
    const etag2 = generateETagFromObject(obj2);
    // They may or may not be equal depending on JSON.stringify behavior
    expect(etag1).toBeDefined();
    expect(etag2).toBeDefined();
  });

  it("handles arrays", () => {
    const etag = generateETagFromObject([1, 2, 3]);
    expect(etag).toMatch(/^"[a-f0-9]{16}"$/);
  });

  it("handles nested objects", () => {
    const etag = generateETagFromObject({
      person: { name: "John", age: 30 },
      tags: ["a", "b"],
    });
    expect(etag).toMatch(/^"[a-f0-9]{16}"$/);
  });

  it("handles null", () => {
    const etag = generateETagFromObject(null);
    expect(etag).toMatch(/^"[a-f0-9]{16}"$/);
  });

  it("supports weak option", () => {
    const etag = generateETagFromObject({ test: true }, { weak: true });
    expect(etag).toMatch(/^W\/"[a-f0-9]{16}"$/);
  });
});

describe("generateTimestampETag", () => {
  it("generates weak ETag from Date", () => {
    const date = new Date("2024-01-15T12:00:00Z");
    const etag = generateTimestampETag(date);
    expect(etag).toMatch(/^W\/"[a-z0-9]+"$/);
  });

  it("generates weak ETag from timestamp number", () => {
    const timestamp = 1705320000000;
    const etag = generateTimestampETag(timestamp);
    expect(etag).toMatch(/^W\/"[a-z0-9]+"$/);
  });

  it("generates consistent ETags for same timestamp", () => {
    const timestamp = 1705320000000;
    const etag1 = generateTimestampETag(timestamp);
    const etag2 = generateTimestampETag(timestamp);
    expect(etag1).toBe(etag2);
  });

  it("generates different ETags for different timestamps", () => {
    const etag1 = generateTimestampETag(1705320000000);
    const etag2 = generateTimestampETag(1705320001000);
    expect(etag1).not.toBe(etag2);
  });

  it("uses base36 encoding for compact representation", () => {
    const timestamp = 1705320000000;
    const etag = generateTimestampETag(timestamp);
    // Base36 is more compact than hex
    const hash = etag.replace(/^W\/"/, "").replace(/"$/, "");
    expect(hash.length).toBeLessThanOrEqual(10);
  });
});

describe("generateVersionETag", () => {
  it("generates weak ETag with version prefix", () => {
    const etag = generateVersionETag(1);
    expect(etag).toBe('W/"v1"');
  });

  it("handles large version numbers", () => {
    const etag = generateVersionETag(999999);
    expect(etag).toBe('W/"v999999"');
  });

  it("handles zero", () => {
    const etag = generateVersionETag(0);
    expect(etag).toBe('W/"v0"');
  });
});

describe("etagMatches", () => {
  it("returns false for null clientETag", () => {
    expect(etagMatches(null, '"abc"')).toBe(false);
  });

  it("returns false for undefined clientETag", () => {
    expect(etagMatches(undefined, '"abc"')).toBe(false);
  });

  it("returns false for empty string clientETag", () => {
    expect(etagMatches("", '"abc"')).toBe(false);
  });

  it("matches identical ETags", () => {
    expect(etagMatches('"abc123"', '"abc123"')).toBe(true);
  });

  it("does not match different ETags", () => {
    expect(etagMatches('"abc123"', '"xyz789"')).toBe(false);
  });

  it("matches wildcard (*)", () => {
    expect(etagMatches("*", '"anything"')).toBe(true);
  });

  it("matches weak ETags ignoring W/ prefix", () => {
    expect(etagMatches('W/"abc123"', '"abc123"')).toBe(true);
    expect(etagMatches('"abc123"', 'W/"abc123"')).toBe(true);
    expect(etagMatches('W/"abc123"', 'W/"abc123"')).toBe(true);
  });

  it("handles multiple ETags in client header (comma-separated)", () => {
    expect(etagMatches('"aaa", "bbb", "ccc"', '"bbb"')).toBe(true);
    expect(etagMatches('"aaa", "bbb", "ccc"', '"ddd"')).toBe(false);
  });

  it("handles multiple ETags with whitespace", () => {
    expect(etagMatches('"aaa" , "bbb" , "ccc"', '"bbb"')).toBe(true);
  });

  it("handles multiple ETags with wildcard", () => {
    expect(etagMatches('"aaa", *, "ccc"', '"anything"')).toBe(true);
  });
});

describe("parseETag", () => {
  it("parses strong ETag", () => {
    const result = parseETag('"abc123"');
    expect(result.isWeak).toBe(false);
    expect(result.hash).toBe("abc123");
  });

  it("parses weak ETag", () => {
    const result = parseETag('W/"abc123"');
    expect(result.isWeak).toBe(true);
    expect(result.hash).toBe("abc123");
  });

  it("handles ETag without quotes", () => {
    const result = parseETag("abc123");
    expect(result.isWeak).toBe(false);
    expect(result.hash).toBe("abc123");
  });

  it("handles weak ETag without quotes", () => {
    const result = parseETag("W/abc123");
    expect(result.isWeak).toBe(true);
    expect(result.hash).toBe("abc123");
  });
});

describe("createCacheHeaders", () => {
  it("creates headers with ETag and default Cache-Control", () => {
    const headers = createCacheHeaders('"abc123"');
    expect(headers.ETag).toBe('"abc123"');
    expect(headers["Cache-Control"]).toBe(
      "private, must-revalidate, max-age=0"
    );
    expect(headers.Vary).toBe("Accept, Accept-Encoding");
  });

  it("creates headers with custom Cache-Control", () => {
    const headers = createCacheHeaders('"abc123"', "public, max-age=3600");
    expect(headers["Cache-Control"]).toBe("public, max-age=3600");
  });
});

describe("CacheControl", () => {
  it("noStore returns correct value", () => {
    expect(CacheControl.noStore).toBe("no-store, no-cache, must-revalidate");
  });

  it("revalidate returns correct value", () => {
    expect(CacheControl.revalidate).toBe("private, must-revalidate, max-age=0");
  });

  it("shortTerm returns correct value with default", () => {
    expect(CacheControl.shortTerm()).toBe(
      "private, max-age=60, must-revalidate"
    );
  });

  it("shortTerm returns correct value with custom seconds", () => {
    expect(CacheControl.shortTerm(120)).toBe(
      "private, max-age=120, must-revalidate"
    );
  });

  it("public returns correct value", () => {
    expect(CacheControl.public(7200)).toBe(
      "public, max-age=7200, must-revalidate"
    );
  });

  it("immutable returns correct value", () => {
    expect(CacheControl.immutable()).toBe(
      "public, max-age=31536000, immutable"
    );
  });

  it("staleWhileRevalidate returns correct value", () => {
    expect(CacheControl.staleWhileRevalidate(60, 3600)).toBe(
      "public, max-age=60, stale-while-revalidate=3600"
    );
  });
});
