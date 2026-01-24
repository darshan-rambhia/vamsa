/**
 * Unit tests for event utilities
 *
 * Tests cover:
 * - mapGedcomTagToEventType: GEDCOM tag to EventType mapping
 * - mapEventTypeToGedcomTag: EventType to GEDCOM tag reverse mapping
 * - getEventTypeLabel: Event type display labels
 * - GEDCOM_TO_EVENT_TYPE: Mapping object integrity
 * - EVENT_TYPE_TO_GEDCOM: Reverse mapping object integrity
 * - EVENT_TYPE_LABELS: Label object completeness
 */

import { describe, it, expect } from "bun:test";
import {
  mapGedcomTagToEventType,
  mapEventTypeToGedcomTag,
  getEventTypeLabel,
  GEDCOM_TO_EVENT_TYPE,
  EVENT_TYPE_TO_GEDCOM,
  EVENT_TYPE_LABELS,
  type EventType,
} from "./event";

describe("Event utilities", () => {
  describe("mapGedcomTagToEventType", () => {
    it("should map BIRT to BIRTH", () => {
      const result = mapGedcomTagToEventType("BIRT");
      expect(result).toBe("BIRTH");
    });

    it("should map DEAT to DEATH", () => {
      const result = mapGedcomTagToEventType("DEAT");
      expect(result).toBe("DEATH");
    });

    it("should map MARR to MARRIAGE", () => {
      const result = mapGedcomTagToEventType("MARR");
      expect(result).toBe("MARRIAGE");
    });

    it("should map DIV to DIVORCE", () => {
      const result = mapGedcomTagToEventType("DIV");
      expect(result).toBe("DIVORCE");
    });

    it("should map BURI to BURIAL", () => {
      const result = mapGedcomTagToEventType("BURI");
      expect(result).toBe("BURIAL");
    });

    it("should map GRAD to GRADUATION", () => {
      const result = mapGedcomTagToEventType("GRAD");
      expect(result).toBe("GRADUATION");
    });

    it("should map ENGM to ENGAGEMENT", () => {
      const result = mapGedcomTagToEventType("ENGM");
      expect(result).toBe("ENGAGEMENT");
    });

    it("should map DIVF to DIVORCE_FILED", () => {
      const result = mapGedcomTagToEventType("DIVF");
      expect(result).toBe("DIVORCE_FILED");
    });

    it("should map ADOP to ADOPTION", () => {
      const result = mapGedcomTagToEventType("ADOP");
      expect(result).toBe("ADOPTION");
    });

    it("should map CONF to CONFIRMATION", () => {
      const result = mapGedcomTagToEventType("CONF");
      expect(result).toBe("CONFIRMATION");
    });

    it("should map IMMI to IMMIGRATION", () => {
      const result = mapGedcomTagToEventType("IMMI");
      expect(result).toBe("IMMIGRATION");
    });

    it("should map EMIG to EMIGRATION", () => {
      const result = mapGedcomTagToEventType("EMIG");
      expect(result).toBe("EMIGRATION");
    });

    it("should map NATU to NATURALIZATION", () => {
      const result = mapGedcomTagToEventType("NATU");
      expect(result).toBe("NATURALIZATION");
    });

    it("should map RESI to RESIDENCE", () => {
      const result = mapGedcomTagToEventType("RESI");
      expect(result).toBe("RESIDENCE");
    });

    it("should return null for unknown tag", () => {
      const result = mapGedcomTagToEventType("UNKNOWN");
      expect(result).toBeNull();
    });

    it("should be case-sensitive", () => {
      const result = mapGedcomTagToEventType("birt");
      expect(result).toBeNull();
    });

    it("should return null for empty string", () => {
      const result = mapGedcomTagToEventType("");
      expect(result).toBeNull();
    });
  });

  describe("mapEventTypeToGedcomTag", () => {
    it("should map BIRTH to BIRT", () => {
      const result = mapEventTypeToGedcomTag("BIRTH");
      expect(result).toBe("BIRT");
    });

    it("should map DEATH to DEAT", () => {
      const result = mapEventTypeToGedcomTag("DEATH");
      expect(result).toBe("DEAT");
    });

    it("should map MARRIAGE to MARR", () => {
      const result = mapEventTypeToGedcomTag("MARRIAGE");
      expect(result).toBe("MARR");
    });

    it("should map DIVORCE to DIV", () => {
      const result = mapEventTypeToGedcomTag("DIVORCE");
      expect(result).toBe("DIV");
    });

    it("should map BURIAL to BURI", () => {
      const result = mapEventTypeToGedcomTag("BURIAL");
      expect(result).toBe("BURI");
    });

    it("should map GRADUATION to GRAD", () => {
      const result = mapEventTypeToGedcomTag("GRADUATION");
      expect(result).toBe("GRAD");
    });

    it("should map ENGAGEMENT to ENGM", () => {
      const result = mapEventTypeToGedcomTag("ENGAGEMENT");
      expect(result).toBe("ENGM");
    });

    it("should map DIVORCE_FILED to DIVF", () => {
      const result = mapEventTypeToGedcomTag("DIVORCE_FILED");
      expect(result).toBe("DIVF");
    });

    it("should map ADOPTION to ADOP", () => {
      const result = mapEventTypeToGedcomTag("ADOPTION");
      expect(result).toBe("ADOP");
    });

    it("should map CONFIRMATION to CONF", () => {
      const result = mapEventTypeToGedcomTag("CONFIRMATION");
      expect(result).toBe("CONF");
    });

    it("should map IMMIGRATION to IMMI", () => {
      const result = mapEventTypeToGedcomTag("IMMIGRATION");
      expect(result).toBe("IMMI");
    });

    it("should map EMIGRATION to EMIG", () => {
      const result = mapEventTypeToGedcomTag("EMIGRATION");
      expect(result).toBe("EMIG");
    });

    it("should map NATURALIZATION to NATU", () => {
      const result = mapEventTypeToGedcomTag("NATURALIZATION");
      expect(result).toBe("NATU");
    });

    it("should map RESIDENCE to RESI", () => {
      const result = mapEventTypeToGedcomTag("RESIDENCE");
      expect(result).toBe("RESI");
    });

    it("should return null for CUSTOM events", () => {
      const result = mapEventTypeToGedcomTag("CUSTOM");
      expect(result).toBeNull();
    });

    it("should handle all EventType values", () => {
      const eventTypes: EventType[] = [
        "BIRTH",
        "DEATH",
        "MARRIAGE",
        "DIVORCE",
        "BURIAL",
        "GRADUATION",
        "ENGAGEMENT",
        "DIVORCE_FILED",
        "ADOPTION",
        "CONFIRMATION",
        "IMMIGRATION",
        "EMIGRATION",
        "NATURALIZATION",
        "RESIDENCE",
        "CUSTOM",
      ];

      eventTypes.forEach((eventType) => {
        const result = mapEventTypeToGedcomTag(eventType);
        expect(result).toBeDefined();
      });
    });
  });

  describe("getEventTypeLabel", () => {
    it("should return Birth for BIRTH", () => {
      const result = getEventTypeLabel("BIRTH");
      expect(result).toBe("Birth");
    });

    it("should return Death for DEATH", () => {
      const result = getEventTypeLabel("DEATH");
      expect(result).toBe("Death");
    });

    it("should return Marriage for MARRIAGE", () => {
      const result = getEventTypeLabel("MARRIAGE");
      expect(result).toBe("Marriage");
    });

    it("should return Divorce for DIVORCE", () => {
      const result = getEventTypeLabel("DIVORCE");
      expect(result).toBe("Divorce");
    });

    it("should return Burial for BURIAL", () => {
      const result = getEventTypeLabel("BURIAL");
      expect(result).toBe("Burial");
    });

    it("should return Graduation for GRADUATION", () => {
      const result = getEventTypeLabel("GRADUATION");
      expect(result).toBe("Graduation");
    });

    it("should return Engagement for ENGAGEMENT", () => {
      const result = getEventTypeLabel("ENGAGEMENT");
      expect(result).toBe("Engagement");
    });

    it("should return Divorce Filed for DIVORCE_FILED", () => {
      const result = getEventTypeLabel("DIVORCE_FILED");
      expect(result).toBe("Divorce Filed");
    });

    it("should return Adoption for ADOPTION", () => {
      const result = getEventTypeLabel("ADOPTION");
      expect(result).toBe("Adoption");
    });

    it("should return Confirmation for CONFIRMATION", () => {
      const result = getEventTypeLabel("CONFIRMATION");
      expect(result).toBe("Confirmation");
    });

    it("should return Immigration for IMMIGRATION", () => {
      const result = getEventTypeLabel("IMMIGRATION");
      expect(result).toBe("Immigration");
    });

    it("should return Emigration for EMIGRATION", () => {
      const result = getEventTypeLabel("EMIGRATION");
      expect(result).toBe("Emigration");
    });

    it("should return Naturalization for NATURALIZATION", () => {
      const result = getEventTypeLabel("NATURALIZATION");
      expect(result).toBe("Naturalization");
    });

    it("should return Residence for RESIDENCE", () => {
      const result = getEventTypeLabel("RESIDENCE");
      expect(result).toBe("Residence");
    });

    it("should return Custom Event for CUSTOM", () => {
      const result = getEventTypeLabel("CUSTOM");
      expect(result).toBe("Custom Event");
    });

    it("should have labels for all event types", () => {
      const eventTypes: EventType[] = [
        "BIRTH",
        "DEATH",
        "MARRIAGE",
        "DIVORCE",
        "BURIAL",
        "GRADUATION",
        "ENGAGEMENT",
        "DIVORCE_FILED",
        "ADOPTION",
        "CONFIRMATION",
        "IMMIGRATION",
        "EMIGRATION",
        "NATURALIZATION",
        "RESIDENCE",
        "CUSTOM",
      ];

      eventTypes.forEach((eventType) => {
        const label = getEventTypeLabel(eventType);
        expect(label).toBeDefined();
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });

  describe("GEDCOM_TO_EVENT_TYPE mapping", () => {
    it("should have all GEDCOM tags mapped", () => {
      const expectedTags = [
        "BIRT",
        "DEAT",
        "BURI",
        "MARR",
        "DIV",
        "DIVF",
        "ENGM",
        "ADOP",
        "CONF",
        "IMMI",
        "EMIG",
        "NATU",
        "RESI",
        "GRAD",
      ];

      expectedTags.forEach((tag) => {
        expect(GEDCOM_TO_EVENT_TYPE[tag]).toBeDefined();
        expect(GEDCOM_TO_EVENT_TYPE[tag]).not.toBeNull();
      });
    });

    it("should only contain EventType values", () => {
      const validEventTypes: EventType[] = [
        "BIRTH",
        "DEATH",
        "MARRIAGE",
        "DIVORCE",
        "BURIAL",
        "GRADUATION",
        "ENGAGEMENT",
        "DIVORCE_FILED",
        "ADOPTION",
        "CONFIRMATION",
        "IMMIGRATION",
        "EMIGRATION",
        "NATURALIZATION",
        "RESIDENCE",
        "CUSTOM",
      ];

      Object.values(GEDCOM_TO_EVENT_TYPE).forEach((value) => {
        expect(validEventTypes).toContain(value);
      });
    });
  });

  describe("EVENT_TYPE_TO_GEDCOM mapping", () => {
    it("should have entries for all EventTypes", () => {
      const eventTypes: EventType[] = [
        "BIRTH",
        "DEATH",
        "MARRIAGE",
        "DIVORCE",
        "BURIAL",
        "GRADUATION",
        "ENGAGEMENT",
        "DIVORCE_FILED",
        "ADOPTION",
        "CONFIRMATION",
        "IMMIGRATION",
        "EMIGRATION",
        "NATURALIZATION",
        "RESIDENCE",
        "CUSTOM",
      ];

      eventTypes.forEach((eventType) => {
        expect(EVENT_TYPE_TO_GEDCOM).toHaveProperty(eventType);
      });
    });

    it("should map to valid GEDCOM tags or null", () => {
      const validTags = [
        "BIRT",
        "DEAT",
        "MARR",
        "DIV",
        "BURI",
        "GRAD",
        "ENGM",
        "DIVF",
        "ADOP",
        "CONF",
        "IMMI",
        "EMIG",
        "NATU",
        "RESI",
        null,
      ];

      Object.values(EVENT_TYPE_TO_GEDCOM).forEach((value) => {
        expect(validTags).toContain(value);
      });
    });
  });

  describe("EVENT_TYPE_LABELS mapping", () => {
    it("should have labels for all EventTypes", () => {
      const eventTypes: EventType[] = [
        "BIRTH",
        "DEATH",
        "MARRIAGE",
        "DIVORCE",
        "BURIAL",
        "GRADUATION",
        "ENGAGEMENT",
        "DIVORCE_FILED",
        "ADOPTION",
        "CONFIRMATION",
        "IMMIGRATION",
        "EMIGRATION",
        "NATURALIZATION",
        "RESIDENCE",
        "CUSTOM",
      ];

      eventTypes.forEach((eventType) => {
        expect(EVENT_TYPE_LABELS).toHaveProperty(eventType);
      });
    });

    it("should have non-empty string labels", () => {
      Object.values(EVENT_TYPE_LABELS).forEach((label) => {
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Bidirectional mapping consistency", () => {
    it("should be reversible: GEDCOM -> EventType -> GEDCOM", () => {
      const gedcomTags = Object.keys(GEDCOM_TO_EVENT_TYPE);

      gedcomTags.forEach((tag) => {
        const eventType = mapGedcomTagToEventType(tag);
        const gedcomTag = mapEventTypeToGedcomTag(eventType!);
        expect(gedcomTag).toBe(tag);
      });
    });

    it("should map most EventTypes back to GEDCOM tags", () => {
      const customEventTypes: EventType[] = ["CUSTOM"];

      const eventTypes: EventType[] = [
        "BIRTH",
        "DEATH",
        "MARRIAGE",
        "DIVORCE",
        "BURIAL",
        "GRADUATION",
        "ENGAGEMENT",
        "DIVORCE_FILED",
        "ADOPTION",
        "CONFIRMATION",
        "IMMIGRATION",
        "EMIGRATION",
        "NATURALIZATION",
        "RESIDENCE",
        "CUSTOM",
      ];

      eventTypes.forEach((eventType) => {
        const gedcomTag = mapEventTypeToGedcomTag(eventType);
        if (!customEventTypes.includes(eventType)) {
          expect(gedcomTag).not.toBeNull();
        }
      });
    });
  });
});
