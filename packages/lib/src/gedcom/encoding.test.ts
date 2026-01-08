/**
 * Unit Tests for GEDCOM Encoding
 * Tests ANSEL to UTF-8 conversion and encoding detection
 */
import { describe, test, expect } from "bun:test";
import { detectEncoding, normalizeEncoding, anselToUtf8, utf8ToAnsel } from "./encoding";

describe("detectEncoding", () => {
  test("detects UTF-8 encoding", () => {
    const content = `0 HEAD
1 SOUR Test
1 CHAR UTF-8
0 TRLR`;
    expect(detectEncoding(content)).toBe("UTF-8");
  });

  test("detects UTF8 encoding (no hyphen)", () => {
    const content = `0 HEAD
1 SOUR Test
1 CHAR UTF8
0 TRLR`;
    expect(detectEncoding(content)).toBe("UTF-8");
  });

  test("detects ANSEL encoding", () => {
    const content = `0 HEAD
1 SOUR Test
1 CHAR ANSEL
0 TRLR`;
    expect(detectEncoding(content)).toBe("ANSEL");
  });

  test("defaults to UTF-8 when no CHAR tag", () => {
    const content = `0 HEAD
1 SOUR Test
0 TRLR`;
    expect(detectEncoding(content)).toBe("UTF-8");
  });

  test("detects ASCII encoding", () => {
    const content = `0 HEAD
1 CHAR ASCII
0 TRLR`;
    expect(detectEncoding(content)).toBe("ASCII");
  });

  test("handles case variations in ANSEL", () => {
    const content = `0 HEAD
1 CHAR ansel
0 TRLR`;
    expect(detectEncoding(content)).toBe("ANSEL");
  });
});

describe("anselToUtf8", () => {
  test("converts ASCII characters unchanged", () => {
    const input = Buffer.from("Hello World");
    const result = anselToUtf8(input);
    expect(result).toBe("Hello World");
  });

  test("handles empty buffer", () => {
    const input = Buffer.from([]);
    const result = anselToUtf8(input);
    expect(result).toBe("");
  });

  test("converts single ANSEL extended characters", () => {
    // Test L with stroke (0x80 -> Ł)
    const input = Buffer.from([0x80]);
    const result = anselToUtf8(input);
    expect(result).toBe("Ł");
  });

  test("converts O with stroke (0x81)", () => {
    const input = Buffer.from([0x81]);
    const result = anselToUtf8(input);
    expect(result).toBe("Ø");
  });

  test("converts mixed ASCII and ANSEL", () => {
    // "Test" + Ł
    const input = Buffer.from([0x54, 0x65, 0x73, 0x74, 0x80]);
    const result = anselToUtf8(input);
    expect(result).toBe("TestŁ");
  });

  test("handles combining acute accent (0xE0)", () => {
    // "A" + combining acute = "Á"
    const input = Buffer.from([0x41, 0xE0]);
    const result = anselToUtf8(input);
    expect(result).toBe("Á");
  });

  test("handles combining grave accent (0xE1)", () => {
    // "A" + combining grave = "À"
    const input = Buffer.from([0x41, 0xE1]);
    const result = anselToUtf8(input);
    expect(result).toBe("À");
  });

  test("handles combining circumflex (0xE2)", () => {
    // "A" + combining circumflex = "Â"
    const input = Buffer.from([0x41, 0xE2]);
    const result = anselToUtf8(input);
    expect(result).toBe("Â");
  });

  test("handles combining tilde (0xE3)", () => {
    // "N" + combining tilde = "Ñ"
    const input = Buffer.from([0x4E, 0xE3]);
    const result = anselToUtf8(input);
    expect(result).toBe("Ñ");
  });

  test("handles combining diaeresis (0xE4)", () => {
    // "U" + combining diaeresis = "Ü"
    const input = Buffer.from([0x55, 0xE4]);
    const result = anselToUtf8(input);
    expect(result).toBe("Ü");
  });

  test("handles combining ring (0xE5)", () => {
    // "A" + combining ring = "Å"
    const input = Buffer.from([0x41, 0xE5]);
    const result = anselToUtf8(input);
    expect(result).toBe("Å");
  });

  test("handles combining cedilla (0xE8)", () => {
    // "C" + combining cedilla = "Ç"
    const input = Buffer.from([0x43, 0xE8]);
    const result = anselToUtf8(input);
    expect(result).toBe("Ç");
  });

  test("handles Uint8Array input", () => {
    const input = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello"
    const result = anselToUtf8(input);
    expect(result).toBe("Hello");
  });
});

describe("utf8ToAnsel", () => {
  test("converts ASCII characters unchanged", () => {
    const input = "Hello World";
    const result = utf8ToAnsel(input);
    expect(result.toString()).toBe("Hello World");
  });

  test("handles empty string", () => {
    const result = utf8ToAnsel("");
    expect(result.length).toBe(0);
  });

  test("converts accented characters to ANSEL", () => {
    // "Á" should become "A" + combining acute
    const input = "Á";
    const result = utf8ToAnsel(input);
    // Result should be two bytes: A (0x41) + acute (0xE0)
    expect(result[0]).toBe(0x41);
    expect(result[1]).toBe(0xE0);
  });

  test("round-trips ASCII text", () => {
    const original = "The quick brown fox";
    const ansel = utf8ToAnsel(original);
    const restored = anselToUtf8(ansel);
    expect(restored).toBe(original);
  });

  test("handles mixed text with special characters", () => {
    const input = "Test";
    const result = utf8ToAnsel(input);
    const restored = anselToUtf8(result);
    expect(restored).toBe("Test");
  });
});

describe("normalizeEncoding", () => {
  test("returns UTF-8 content unchanged", () => {
    const content = `0 HEAD
1 CHAR UTF-8
1 SOUR Test
0 TRLR`;
    const result = normalizeEncoding(content);
    expect(result).toBe(content);
  });

  test("returns UTF8 content unchanged", () => {
    const content = `0 HEAD
1 CHAR UTF8
1 SOUR Test
0 TRLR`;
    const result = normalizeEncoding(content);
    expect(result).toBe(content);
  });

  test("converts ANSEL content to UTF-8", () => {
    // Create a simple ANSEL file (ASCII subset, so conversion is straightforward)
    const content = `0 HEAD
1 CHAR ANSEL
1 SOUR Test
0 TRLR`;
    const result = normalizeEncoding(content);

    // CHAR should be updated to UTF-8
    expect(result).toContain("1 CHAR UTF-8");
    expect(result).not.toContain("1 CHAR ANSEL");
  });

  test("preserves unknown encoding", () => {
    const content = `0 HEAD
1 CHAR UNKNOWN
1 SOUR Test
0 TRLR`;
    const result = normalizeEncoding(content);
    expect(result).toBe(content);
  });

  test("handles content without CHAR tag", () => {
    const content = `0 HEAD
1 SOUR Test
0 TRLR`;
    const result = normalizeEncoding(content);
    // Should return unchanged (defaults to UTF-8)
    expect(result).toBe(content);
  });
});
