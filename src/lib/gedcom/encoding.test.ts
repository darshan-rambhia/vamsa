import { describe, it, expect } from "bun:test";
import {
  detectEncoding,
  anselToUtf8,
  utf8ToAnsel,
  normalizeEncoding,
} from "./encoding";

describe("ANSEL Encoding", () => {
  describe("detectEncoding", () => {
    it("should detect UTF-8 encoding", () => {
      const gedcom = `0 HEAD
1 SOUR Test
1 CHAR UTF-8
1 GEDC
2 VERS 5.5.1
0 TRLR`;
      expect(detectEncoding(gedcom)).toBe("UTF-8");
    });

    it("should detect ANSEL encoding", () => {
      const gedcom = `0 HEAD
1 SOUR Test
1 CHAR ANSEL
1 GEDC
2 VERS 5.5.1
0 TRLR`;
      expect(detectEncoding(gedcom)).toBe("ANSEL");
    });

    it("should default to UTF-8 if CHAR tag missing", () => {
      const gedcom = `0 HEAD
1 SOUR Test
1 GEDC
2 VERS 5.5.1
0 TRLR`;
      expect(detectEncoding(gedcom)).toBe("UTF-8");
    });

    it("should handle case-insensitive encoding names", () => {
      const gedcom = `0 HEAD
1 CHAR utf-8
0 TRLR`;
      expect(detectEncoding(gedcom)).toBe("UTF-8");
    });
  });

  describe("anselToUtf8", () => {
    it("should pass through ASCII characters", () => {
      const buffer = Buffer.from("Hello World");
      expect(anselToUtf8(buffer)).toBe("Hello World");
    });

    it("should convert ANSEL extended characters to UTF-8", () => {
      // Test ¡ (inverted exclamation) = 0xE0
      const buffer = Buffer.from([0xE0]);
      expect(anselToUtf8(buffer)).toBe("¡");
    });

    it("should convert ANSEL combining sequences", () => {
      // Test combining acute: A (0x41) + acute combining (0xE0) = Á (U+00C1)
      const buffer = Buffer.from([0x41, 0xE0]);
      expect(anselToUtf8(buffer)).toBe("Á");
    });

    it("should handle mixed ASCII and ANSEL", () => {
      // "José" where é is represented as e + combining diaeresis (0xE4)
      const buffer = Buffer.from([
        0x4A, 0x6F, 0x73, 0x65, 0xE4, // Jose + combining diaeresis on e
      ]);
      expect(anselToUtf8(buffer)).toBe("Josë");
    });

    it("should convert German umlaut ü (u + diaeresis)", () => {
      // u (0x75) + diaeresis combining (0xE4) = ü (U+00FC)
      const buffer = Buffer.from([0x75, 0xE4]);
      expect(anselToUtf8(buffer)).toBe("ü");
    });

    it("should convert uppercase umlauts", () => {
      // U (0x55) + diaeresis combining (0xE4) = Ü (U+00DC)
      const buffer = Buffer.from([0x55, 0xE4]);
      expect(anselToUtf8(buffer)).toBe("Ü");
    });

    it("should handle Müller example", () => {
      // M + ü + ller = M + u(0x75) + diaeresis(0xE4) + ller
      const buffer = Buffer.from([0x4D, 0x75, 0xE4, 0x6C, 0x6C, 0x65, 0x72]);
      expect(anselToUtf8(buffer)).toBe("Müller");
    });

    it("should handle François example", () => {
      // Fran + c(0x63) + cedilla(0xE8) + ois
      const buffer = Buffer.from([
        0x46, 0x72, 0x61, 0x6E, 0x63, 0xE8, 0x6F, 0x69, 0x73,
      ]);
      expect(anselToUtf8(buffer)).toBe("François");
    });

    it("should handle combining grave accent", () => {
      // a + grave combining (0xE1) = à (U+00E0)
      const buffer = Buffer.from([0x61, 0xE1]);
      expect(anselToUtf8(buffer)).toBe("à");
    });

    it("should handle combining circumflex", () => {
      // a + circumflex combining (0xE2) = â (U+00E2)
      const buffer = Buffer.from([0x61, 0xE2]);
      expect(anselToUtf8(buffer)).toBe("â");
    });

    it("should handle combining tilde", () => {
      // n + tilde combining (0xE3) = ñ (U+00F1)
      const buffer = Buffer.from([0x6E, 0xE3]);
      expect(anselToUtf8(buffer)).toBe("ñ");
    });

    it("should handle unknown characters gracefully", () => {
      // Unknown ANSEL code should pass through
      const buffer = Buffer.from([0x41, 0xFF]);
      expect(anselToUtf8(buffer).length).toBeGreaterThan(0);
    });
  });

  describe("utf8ToAnsel", () => {
    it("should pass through ASCII characters", () => {
      const buffer = utf8ToAnsel("Hello World");
      expect(buffer.toString("latin1")).toBe("Hello World");
    });

    it("should convert UTF-8 ü to ANSEL u + diaeresis", () => {
      const buffer = utf8ToAnsel("ü");
      // Should be u (0x75) + diaeresis combining (0xE4)
      expect(buffer[0]).toBe(0x75);
      expect(buffer[1]).toBe(0xE4);
    });

    it("should convert UTF-8 é to ANSEL e + acute", () => {
      const buffer = utf8ToAnsel("é");
      // Should be e + acute combining
      expect(buffer[0]).toBe(0x65);
      expect(buffer[1]).toBe(0xE0);
    });

    it("should convert Müller", () => {
      const buffer = utf8ToAnsel("Müller");
      const result = anselToUtf8(buffer);
      expect(result).toBe("Müller");
    });

    it("should convert François", () => {
      const buffer = utf8ToAnsel("François");
      const result = anselToUtf8(buffer);
      expect(result).toBe("François");
    });

    it("should convert José", () => {
      const buffer = utf8ToAnsel("José");
      const result = anselToUtf8(buffer);
      expect(result).toBe("José");
    });

    it("should handle Copyright sign", () => {
      const buffer = utf8ToAnsel("©");
      // © is 0xCD in ANSEL
      expect(buffer[0]).toBe(0xCD);
    });

    it("should handle Registered sign", () => {
      const buffer = utf8ToAnsel("®");
      // ® is 0xCE or 0x84 in ANSEL
      expect([0x84, 0xCE].includes(buffer[0])).toBe(true);
    });

    it("should handle Pound sign", () => {
      const buffer = utf8ToAnsel("£");
      // £ is 0xCC in ANSEL
      expect(buffer[0]).toBe(0xCC);
    });
  });

  describe("roundtrip conversion", () => {
    it("should roundtrip ASCII text", () => {
      const original = "John Smith";
      const buffer = utf8ToAnsel(original);
      const converted = anselToUtf8(buffer);
      expect(converted).toBe(original);
    });

    it("should roundtrip accented names", () => {
      const original = "José García";
      const buffer = utf8ToAnsel(original);
      const converted = anselToUtf8(buffer);
      expect(converted).toBe(original);
    });

    it("should roundtrip German names", () => {
      const original = "Müller Schäfer";
      const buffer = utf8ToAnsel(original);
      const converted = anselToUtf8(buffer);
      expect(converted).toBe(original);
    });

    it("should roundtrip French names", () => {
      const original = "François Renault";
      const buffer = utf8ToAnsel(original);
      const converted = anselToUtf8(buffer);
      expect(converted).toBe(original);
    });

    it("should roundtrip mixed European characters", () => {
      const original = "Åsa Rönnlund";
      const buffer = utf8ToAnsel(original);
      const converted = anselToUtf8(buffer);
      expect(converted).toBe(original);
    });

    it("should roundtrip special symbols", () => {
      const original = "© ® ° ±";
      const buffer = utf8ToAnsel(original);
      const converted = anselToUtf8(buffer);
      expect(converted).toBe(original);
    });
  });

  describe("normalizeEncoding", () => {
    it("should leave UTF-8 content unchanged", () => {
      const gedcom = `0 HEAD
1 CHAR UTF-8
0 @I1@ INDI
1 NAME José /García/
0 TRLR`;
      const result = normalizeEncoding(gedcom);
      expect(result).toContain("José");
      expect(result).toContain("García");
    });

    it("should detect and update ANSEL to UTF-8", () => {
      // Create GEDCOM with ANSEL encoding declaration
      const gedcom = `0 HEAD
1 SOUR Test
1 CHAR ANSEL
1 GEDC
2 VERS 5.5.1
0 TRLR`;
      const result = normalizeEncoding(gedcom);
      expect(result).toContain("1 CHAR UTF-8");
    });

    it("should preserve non-ASCII characters when already UTF-8", () => {
      const gedcom = `0 HEAD
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Müller /Schäfer/
0 TRLR`;
      const result = normalizeEncoding(gedcom);
      expect(result).toContain("Müller");
      expect(result).toContain("Schäfer");
    });
  });

  describe("real-world examples", () => {
    it("should handle European name database", () => {
      const names = [
        "José García",
        "Müller",
        "François Renault",
        "Åsa Rönnlund",
        "Łukasz Kowalski",
      ];

      for (const name of names) {
        const buffer = utf8ToAnsel(name);
        const converted = anselToUtf8(buffer);
        expect(converted).toBe(name);
      }
    });

    it("should handle names with unrepresentable characters gracefully", () => {
      // Some characters like ø (o with stroke) don't have direct ANSEL mappings
      // The conversion should still work but may not round-trip perfectly
      const name = "Jørgensen";
      const buffer = utf8ToAnsel(name);
      // Should be able to convert it, just check no crashes
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should handle text with special characters", () => {
      const text = "Smith © 2024 ® Registered ±";
      const buffer = utf8ToAnsel(text);
      const converted = anselToUtf8(buffer);
      expect(converted).toBe(text);
    });

    it("should handle mixed case accents", () => {
      const text = "JOSÉ josé José";
      const buffer = utf8ToAnsel(text);
      const converted = anselToUtf8(buffer);
      expect(converted).toBe(text);
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      const buffer = utf8ToAnsel("");
      expect(buffer.length).toBe(0);
      expect(anselToUtf8(buffer)).toBe("");
    });

    it("should handle consecutive combining marks", () => {
      // Test two combining marks in a row
      const buffer = Buffer.from([0x41, 0xE0, 0x45, 0xE1]); // A + acute + E + grave
      const result = anselToUtf8(buffer);
      expect(result).toContain("Á");
      expect(result).toContain("È");
    });

    it("should handle partial combining sequence at end", () => {
      const buffer = Buffer.from([0x41, 0xE0]); // A + acute at end
      const result = anselToUtf8(buffer);
      expect(result).toBe("Á");
    });

    it("should handle whitespace and special ASCII", () => {
      const text = "First Name, Middle\nLast";
      const buffer = utf8ToAnsel(text);
      const converted = anselToUtf8(buffer);
      expect(converted).toBe(text);
    });
  });
});
