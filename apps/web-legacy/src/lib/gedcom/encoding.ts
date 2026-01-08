/**
 * ANSEL Character Encoding Support for GEDCOM
 * ANSEL (American Numeric Standard for Information Interchange for European Languages)
 * is used in GEDCOM 5.5.1 and earlier for encoding special characters
 * Reference: https://en.wikipedia.org/wiki/ANSEL
 */

/**
 * ANSEL to Unicode character mapping
 * Includes both single-byte and multi-byte sequences
 */
const ANSEL_TO_UNICODE: Record<number, string> = {
  // Standard ASCII (0x00-0x7F) maps directly
  // Extended characters (0x80-0xFF)
  0x80: "\u0141", // Ł - Latin Capital Letter L with Stroke
  0x81: "\u00D8", // Ø - Latin Capital Letter O with Stroke
  0x82: "\u0110", // Đ - Latin Capital Letter D with Stroke
  0x83: "\u00DE", // Þ - Latin Capital Letter Thorn
  0x84: "\u00AE", // ® - Registered Sign
  0x85: "\u00B1", // ± - Plus-Minus Sign
  0x86: "\u0100", // Ā - Latin Capital Letter A with Macron
  0x87: "\u0112", // Ē - Latin Capital Letter E with Macron
  0x88: "\u0122", // Ģ - Latin Capital Letter G with Cedilla
  0x89: "\u012A", // Ī - Latin Capital Letter I with Macron
  0x8A: "\u0136", // Ķ - Latin Capital Letter K with Cedilla
  0x8B: "\u013B", // Ļ - Latin Capital Letter L with Cedilla
  0x8C: "\u013D", // Ľ - Latin Capital Letter L with Caron
  0x8D: "\u0145", // Ņ - Latin Capital Letter N with Cedilla
  0x8E: "\u014C", // Ō - Latin Capital Letter O with Macron
  0x8F: "\u0156", // Ŕ - Latin Capital Letter R with Acute
  0x90: "\u0162", // Ţ - Latin Capital Letter T with Cedilla
  0x91: "\u0164", // Ť - Latin Capital Letter T with Caron
  0x92: "\u0168", // Ũ - Latin Capital Letter U with Tilde
  0x93: "\u016A", // Ū - Latin Capital Letter U with Macron
  0x94: "\u0172", // Ų - Latin Capital Letter U with Ogonek
  0x95: "\u0174", // Ŵ - Latin Capital Letter W with Circumflex
  0x96: "\u0176", // Ŷ - Latin Capital Letter Y with Circumflex
  0x97: "\u0178", // Ÿ - Latin Capital Letter Y with Diaeresis
  0x98: "\u0179", // Ź - Latin Capital Letter Z with Acute
  0x99: "\u017B", // Ż - Latin Capital Letter Z with Dot Above
  0x9A: "\u0132", // Ĳ - Latin Capital Ligature IJ
  0x9B: "\u0130", // İ - Latin Capital Letter I with Dot Above
  0x9C: "\u0111", // đ - Latin Small Letter D with Stroke
  0x9D: "\u0144", // ń - Latin Small Letter N with Acute
  0x9E: "\u0161", // š - Latin Small Letter S with Caron
  0x9F: "\u0219", // ș - Latin Small Letter S with Comma Below
  0xA0: "\u00A0", // Non-breaking space
  0xA1: "\u0105", // ą - Latin Small Letter A with Ogonek
  0xA2: "\u0101", // ā - Latin Small Letter A with Macron
  0xA3: "\u0107", // ć - Latin Small Letter C with Acute
  0xA4: "\u0109", // ĉ - Latin Small Letter C with Circumflex
  0xA5: "\u010D", // č - Latin Small Letter C with Caron
  0xA6: "\u010F", // ď - Latin Small Letter D with Caron
  0xA7: "\u0113", // ē - Latin Small Letter E with Macron
  0xA8: "\u0119", // ę - Latin Small Letter E with Ogonek
  0xA9: "\u011B", // ě - Latin Small Letter E with Caron
  0xAA: "\u011D", // ĝ - Latin Small Letter G with Circumflex
  0xAB: "\u011F", // ğ - Latin Small Letter G with Breve
  0xAC: "\u0121", // ġ - Latin Small Letter G with Dot Above
  0xAD: "\u0123", // ģ - Latin Small Letter G with Cedilla
  0xAE: "\u0125", // ĥ - Latin Small Letter H with Circumflex
  0xAF: "\u0129", // ĩ - Latin Small Letter I with Tilde
  0xB0: "\u012B", // ī - Latin Small Letter I with Macron
  0xB1: "\u012F", // į - Latin Small Letter I with Ogonek
  0xB2: "\u0135", // ĵ - Latin Small Letter J with Circumflex
  0xB3: "\u0137", // ķ - Latin Small Letter K with Cedilla
  0xB4: "\u013A", // ĺ - Latin Small Letter L with Acute
  0xB5: "\u013C", // ļ - Latin Small Letter L with Cedilla
  0xB6: "\u013E", // ľ - Latin Small Letter L with Caron
  0xB7: "\u0140", // ŀ - Latin Small Letter L with Middle Dot
  0xB8: "\u0147", // Ň - Latin Capital Letter N with Caron
  0xB9: "\u0146", // ņ - Latin Small Letter N with Cedilla
  0xBA: "\u014D", // ō - Latin Small Letter O with Macron
  0xBB: "\u0151", // ő - Latin Small Letter O with Double Acute
  0xBC: "\u0153", // œ - Latin Small Ligature OE
  0xBD: "\u0157", // ŗ - Latin Small Letter R with Cedilla
  0xBE: "\u015B", // ś - Latin Small Letter S with Acute
  0xBF: "\u015D", // ŝ - Latin Small Letter S with Circumflex
  0xC0: "\u015F", // ş - Latin Small Letter S with Cedilla
  0xC1: "\u0165", // ť - Latin Small Letter T with Caron
  0xC2: "\u0167", // ţ - Latin Small Letter T with Cedilla
  0xC3: "\u0169", // ũ - Latin Small Letter U with Tilde
  0xC4: "\u016B", // ū - Latin Small Letter U with Macron
  0xC5: "\u0171", // ű - Latin Small Letter U with Double Acute
  0xC6: "\u0173", // ų - Latin Small Letter U with Ogonek
  0xC7: "\u0175", // ŵ - Latin Small Letter W with Circumflex
  0xC8: "\u0177", // ŷ - Latin Small Letter Y with Circumflex
  0xC9: "\u017A", // ź - Latin Small Letter Z with Acute
  0xCA: "\u017C", // ż - Latin Small Letter Z with Dot Above
  0xCB: "\u0133", // ĳ - Latin Small Ligature IJ
  0xCC: "\u00A3", // £ - Pound Sign
  0xCD: "\u00A9", // © - Copyright Sign
  0xCE: "\u00AE", // ® - Registered Sign (duplicate)
  0xCF: "\u0122", // Ģ - Latin Capital Letter G with Cedilla (duplicate)
  0xD0: "\u0136", // Ķ - Latin Capital Letter K with Cedilla (duplicate)
  0xD1: "\u013B", // Ļ - Latin Capital Letter L with Cedilla (duplicate)
  0xD2: "\u0145", // Ņ - Latin Capital Letter N with Cedilla (duplicate)
  0xD3: "\u0156", // Ŕ - Latin Capital Letter R with Acute (duplicate)
  0xD4: "\u0162", // Ţ - Latin Capital Letter T with Cedilla (duplicate)
  0xD5: "\u0122", // Ģ - Latin Capital Letter G with Cedilla (duplicate)
  0xD6: "\u00B0", // ° - Degree Sign
  0xD7: "\u0131", // ı - Latin Small Letter Dotless I
  0xD8: "\u00B2", // ² - Superscript Two
  0xD9: "\u00B3", // ³ - Superscript Three
  0xDA: "\u00B9", // ¹ - Superscript One
  0xDB: "\u00BA", // º - Masculine Ordinal Indicator
  0xDC: "\u00AA", // ª - Feminine Ordinal Indicator
  0xDD: "\u00D7", // × - Multiplication Sign
  0xDE: "\u00F7", // ÷ - Division Sign
  0xDF: "\u00BF", // ¿ - Inverted Question Mark
  0xE0: "\u00A1", // ¡ - Inverted Exclamation Mark
  0xE1: "\u00B0", // ° - Degree Sign (duplicate)
  0xE2: "\u00B1", // ± - Plus-Minus Sign (duplicate)
  0xE3: "\u00B2", // ² - Superscript Two (duplicate)
  0xE4: "\u00B3", // ³ - Superscript Three (duplicate)
  0xE5: "\u00B5", // µ - Micro Sign
  0xE6: "\u00B6", // ¶ - Pilcrow
  0xE7: "\u00B7", // · - Middle Dot
  0xE8: "\u00B8", // ¸ - Cedilla
  0xE9: "\u00B9", // ¹ - Superscript One (duplicate)
  0xEA: "\u00BA", // º - Masculine Ordinal Indicator (duplicate)
  0xEB: "\u00BB", // » - Right-Pointing Double Angle Quotation Mark
  0xEC: "\u00BC", // ¼ - Vulgar Fraction One Quarter
  0xED: "\u00BD", // ½ - Vulgar Fraction One Half
  0xEE: "\u00BE", // ¾ - Vulgar Fraction Three Quarters
  0xEF: "\u00BF", // ¿ - Inverted Question Mark (duplicate)
  0xF0: "\u00D7", // × - Multiplication Sign (duplicate)
  0xF1: "\u00F7", // ÷ - Division Sign (duplicate)
};

/**
 * Multi-byte ANSEL sequences (combining marks and special combinations)
 * Format: [base_char_hex][combining_byte_hex] => result_character
 * These are combining marks that follow a base character
 */
const ANSEL_COMBINING: Record<string, string> = {
  // Combining acute accent (0xE0)
  "41E0": "\u00C1", // A + acute = Á
  "45E0": "\u00C9", // E + acute = É
  "49E0": "\u00CD", // I + acute = Í
  "4FE0": "\u00D3", // O + acute = Ó
  "55E0": "\u00DA", // U + acute = Ú
  "61E0": "\u00E1", // a + acute = á
  "65E0": "\u00E9", // e + acute = é
  "69E0": "\u00ED", // i + acute = í
  "6FE0": "\u00F3", // o + acute = ó
  "75E0": "\u00FA", // u + acute = ú
  "59E0": "\u00DD", // Y + acute = Ý
  "79E0": "\u00FD", // y + acute = ý

  // Combining grave accent (0xE1)
  "41E1": "\u00C0", // A + grave = À
  "45E1": "\u00C8", // E + grave = È
  "49E1": "\u00CC", // I + grave = Ì
  "4FE1": "\u00D2", // O + grave = Ò
  "55E1": "\u00D9", // U + grave = Ù
  "61E1": "\u00E0", // a + grave = à
  "65E1": "\u00E8", // e + grave = è
  "69E1": "\u00EC", // i + grave = ì
  "6FE1": "\u00F2", // o + grave = ò
  "75E1": "\u00F9", // u + grave = ù

  // Combining circumflex (0xE2)
  "41E2": "\u00C2", // A + circumflex = Â
  "45E2": "\u00CA", // E + circumflex = Ê
  "49E2": "\u00CE", // I + circumflex = Î
  "4FE2": "\u00D4", // O + circumflex = Ô
  "55E2": "\u00DB", // U + circumflex = Û
  "61E2": "\u00E2", // a + circumflex = â
  "65E2": "\u00EA", // e + circumflex = ê
  "69E2": "\u00EE", // i + circumflex = î
  "6FE2": "\u00F4", // o + circumflex = ô
  "75E2": "\u00FB", // u + circumflex = û

  // Combining tilde (0xE3)
  "41E3": "\u00C3", // A + tilde = Ã
  "4EE3": "\u00D1", // N + tilde = Ñ
  "4FE3": "\u00D5", // O + tilde = Õ
  "55E3": "\u0168", // U + tilde = Ũ
  "61E3": "\u00E3", // a + tilde = ã
  "6EE3": "\u00F1", // n + tilde = ñ
  "6FE3": "\u00F5", // o + tilde = õ
  "75E3": "\u0169", // u + tilde = ũ

  // Combining diaeresis (0xE4)
  "41E4": "\u00C4", // A + diaeresis = Ä
  "45E4": "\u00CB", // E + diaeresis = Ë
  "49E4": "\u00CF", // I + diaeresis = Ï
  "4FE4": "\u00D6", // O + diaeresis = Ö
  "55E4": "\u00DC", // U + diaeresis = Ü
  "61E4": "\u00E4", // a + diaeresis = ä
  "65E4": "\u00EB", // e + diaeresis = ë
  "69E4": "\u00EF", // i + diaeresis = ï
  "6FE4": "\u00F6", // o + diaeresis = ö
  "75E4": "\u00FC", // u + diaeresis = ü
  "79E4": "\u00FF", // y + diaeresis = ÿ

  // Combining ring above (0xE5)
  "41E5": "\u00C5", // A + ring = Å
  "61E5": "\u00E5", // a + ring = å

  // Combining cedilla (0xE8)
  "43E8": "\u00C7", // C + cedilla = Ç
  "63E8": "\u00E7", // c + cedilla = ç
};

/**
 * Detect GEDCOM file encoding from CHAR tag in HEAD record
 * Returns detected encoding or 'UTF-8' as default
 */
export function detectEncoding(content: string): string {
  // Find HEAD record and CHAR tag
  const lines = content.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^1\s+CHAR\s+(.+)$/);
    if (match) {
      const charset = match[1].trim().toUpperCase();
      // Normalize encoding names
      if (charset.includes("ANSEL")) {
        return "ANSEL";
      }
      if (charset.includes("UTF")) {
        return "UTF-8";
      }
      return charset;
    }
  }

  // Default to UTF-8
  return "UTF-8";
}

/**
 * Convert ANSEL encoded bytes to UTF-8 string
 * Handles both single-byte and multi-byte ANSEL sequences
 */
export function anselToUtf8(buffer: Buffer | Uint8Array): string {
  const bytes = buffer instanceof Buffer ? buffer : Buffer.from(buffer);
  const result: string[] = [];

  let i = 0;
  while (i < bytes.length) {
    const byte = bytes[i];

    // Handle standard ASCII (0x00-0x7F)
    if (byte < 0x80) {
      result.push(String.fromCharCode(byte));
      i++;
      continue;
    }

    // Check if current byte is a combining mark (0xE0-0xEF)
    // If so, combine with previous character
    if (byte >= 0xE0 && byte <= 0xEF && result.length > 0) {
      // Remove the last character
      const lastChar = result.pop();
      if (lastChar) {
        // Get the char code of the last character
        const charCode = lastChar.charCodeAt(0);
        const combined = charCode.toString(16).padStart(2, "0").toUpperCase() +
          byte.toString(16).padStart(2, "0").toUpperCase();

        if (ANSEL_COMBINING[combined]) {
          result.push(ANSEL_COMBINING[combined]);
          i++;
          continue;
        } else {
          // Restore the character and add the combining mark separately
          result.push(lastChar);
          if (ANSEL_TO_UNICODE[byte]) {
            result.push(ANSEL_TO_UNICODE[byte]);
          } else {
            result.push(String.fromCharCode(byte));
          }
          i++;
          continue;
        }
      }
    }

    // Handle extended character (0x80-0xFF)
    if (ANSEL_TO_UNICODE[byte]) {
      result.push(ANSEL_TO_UNICODE[byte]);
    } else {
      // If not in mapping, try to pass through as-is
      result.push(String.fromCharCode(byte));
    }
    i++;
  }

  return result.join("");
}

/**
 * Convert UTF-8 string to ANSEL encoded bytes
 * Returns best-effort conversion; some Unicode characters may not have ANSEL equivalents
 */
export function utf8ToAnsel(text: string): Buffer {
  const bytes: number[] = [];

  for (const char of text) {
    const code = char.charCodeAt(0);

    // ASCII range (0x00-0x7F) passes through directly
    if (code < 0x80) {
      bytes.push(code);
      continue;
    }

    // Find in reverse mapping
    let found = false;

    // Check single-character mappings first
    for (const [anselCode, unicode] of Object.entries(ANSEL_TO_UNICODE)) {
      if (unicode === char) {
        bytes.push(parseInt(anselCode, 10));
        found = true;
        break;
      }
    }

    if (found) {
      continue;
    }

    // Check combining sequences
    for (const [combined, unicode] of Object.entries(ANSEL_COMBINING)) {
      if (unicode === char) {
        const baseByte = parseInt(combined.substring(0, 2), 16);
        const combByte = parseInt(combined.substring(2, 4), 16);
        bytes.push(baseByte, combByte);
        found = true;
        break;
      }
    }

    if (found) {
      continue;
    }

    // If not found, use UTF-8 encoding (may not be compatible with ANSEL readers)
    // but better than losing the character
    const utf8Bytes = Buffer.from(char, "utf8");
    bytes.push(...Array.from(utf8Bytes));
  }

  return Buffer.from(bytes);
}

/**
 * Re-encode GEDCOM file content from ANSEL to UTF-8 if needed
 * Returns file content with proper encoding
 */
export function normalizeEncoding(content: string): string {
  const encoding = detectEncoding(content);

  if (encoding === "UTF-8" || encoding === "UTF8") {
    // Already UTF-8, return as-is
    return content;
  }

  if (encoding === "ANSEL") {
    // Convert from ANSEL to UTF-8
    const bytes = Buffer.from(content, "latin1"); // ANSEL is 8-bit, read as latin1
    const utf8Text = anselToUtf8(bytes);

    // Update CHAR tag in HEAD to UTF-8
    const lines = utf8Text.split(/\r?\n/);
    const result = lines.map((line) => {
      if (line.match(/^1\s+CHAR\s+ANSEL/)) {
        return "1 CHAR UTF-8";
      }
      return line;
    });

    return result.join("\n");
  }

  // Unknown encoding, return as-is
  return content;
}
