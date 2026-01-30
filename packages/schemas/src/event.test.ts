import { describe, expect, it } from "bun:test";
import {
  eventCreateSchema,
  eventParticipantCreateSchema,
  eventParticipantRemoveSchema,
  eventTypeEnum,
  eventUpdateSchema,
} from "./event";
import type { EventType } from "./event";

describe("eventTypeEnum", () => {
  it("accepts BIRTH event type", () => {
    const result = eventTypeEnum.safeParse("BIRTH");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("BIRTH");
  });

  it("accepts DEATH event type", () => {
    const result = eventTypeEnum.safeParse("DEATH");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("DEATH");
  });

  it("accepts MARRIAGE event type", () => {
    const result = eventTypeEnum.safeParse("MARRIAGE");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("MARRIAGE");
  });

  it("accepts DIVORCE event type", () => {
    const result = eventTypeEnum.safeParse("DIVORCE");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("DIVORCE");
  });

  it("accepts BURIAL event type", () => {
    const result = eventTypeEnum.safeParse("BURIAL");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("BURIAL");
  });

  it("accepts GRADUATION event type", () => {
    const result = eventTypeEnum.safeParse("GRADUATION");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("GRADUATION");
  });

  it("accepts ENGAGEMENT event type", () => {
    const result = eventTypeEnum.safeParse("ENGAGEMENT");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("ENGAGEMENT");
  });

  it("accepts DIVORCE_FILED event type", () => {
    const result = eventTypeEnum.safeParse("DIVORCE_FILED");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("DIVORCE_FILED");
  });

  it("accepts ADOPTION event type", () => {
    const result = eventTypeEnum.safeParse("ADOPTION");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("ADOPTION");
  });

  it("accepts CONFIRMATION event type", () => {
    const result = eventTypeEnum.safeParse("CONFIRMATION");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("CONFIRMATION");
  });

  it("accepts IMMIGRATION event type", () => {
    const result = eventTypeEnum.safeParse("IMMIGRATION");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("IMMIGRATION");
  });

  it("accepts EMIGRATION event type", () => {
    const result = eventTypeEnum.safeParse("EMIGRATION");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("EMIGRATION");
  });

  it("accepts NATURALIZATION event type", () => {
    const result = eventTypeEnum.safeParse("NATURALIZATION");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("NATURALIZATION");
  });

  it("accepts RESIDENCE event type", () => {
    const result = eventTypeEnum.safeParse("RESIDENCE");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("RESIDENCE");
  });

  it("accepts CUSTOM event type", () => {
    const result = eventTypeEnum.safeParse("CUSTOM");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("CUSTOM");
  });

  it("rejects invalid event type", () => {
    const result = eventTypeEnum.safeParse("INVALID");
    expect(result.success).toBe(false);
  });

  it("rejects lowercase event type", () => {
    const result = eventTypeEnum.safeParse("birth");
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = eventTypeEnum.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects null", () => {
    const result = eventTypeEnum.safeParse(null);
    expect(result.success).toBe(false);
  });
});

describe("eventCreateSchema", () => {
  describe("personId validation", () => {
    it("accepts valid personId", () => {
      const result = eventCreateSchema.safeParse({
        personId: "person-123",
        type: "BIRTH",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty personId", () => {
      const result = eventCreateSchema.safeParse({
        personId: "",
        type: "BIRTH",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing personId", () => {
      const result = eventCreateSchema.safeParse({
        type: "BIRTH",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("type validation", () => {
    it("accepts valid event type", () => {
      const result = eventCreateSchema.safeParse({
        personId: "person-123",
        type: "BIRTH",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid event type", () => {
      const result = eventCreateSchema.safeParse({
        personId: "person-123",
        type: "INVALID_TYPE",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing type", () => {
      const result = eventCreateSchema.safeParse({
        personId: "person-123",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("date field transformation", () => {
    it("accepts valid ISO date string and transforms to Date", () => {
      const result = eventCreateSchema.safeParse({
        personId: "person-123",
        type: "BIRTH",
        date: "2000-01-15",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBeInstanceOf(Date);
      }
    });

    it("accepts Date object unchanged", () => {
      const date = new Date("2000-01-15");
      const result = eventCreateSchema.safeParse({
        personId: "person-123",
        type: "BIRTH",
        date,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toEqual(date);
      }
    });

    it("transforms null date to null", () => {
      const result = eventCreateSchema.safeParse({
        personId: "person-123",
        type: "BIRTH",
        date: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBe(null);
      }
    });

    it("transforms undefined date to null", () => {
      const result = eventCreateSchema.safeParse({
        personId: "person-123",
        type: "BIRTH",
        date: undefined,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBe(null);
      }
    });

    it("transforms empty string date to null", () => {
      const result = eventCreateSchema.safeParse({
        personId: "person-123",
        type: "BIRTH",
        date: "",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBe(null);
      }
    });

    it("transforms whitespace string date to null", () => {
      const result = eventCreateSchema.safeParse({
        personId: "person-123",
        type: "BIRTH",
        date: "   ",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBe(null);
      }
    });

    it("transforms invalid date string to null", () => {
      const result = eventCreateSchema.safeParse({
        personId: "person-123",
        type: "BIRTH",
        date: "invalid-date",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBe(null);
      }
    });

    it("transforms invalid month to null", () => {
      const result = eventCreateSchema.safeParse({
        personId: "person-123",
        type: "BIRTH",
        date: "2000-13-01",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBe(null);
      }
    });

    it("transforms invalid day to null", () => {
      const result = eventCreateSchema.safeParse({
        personId: "person-123",
        type: "BIRTH",
        date: "2000-01-32",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBe(null);
      }
    });

    it("handles zero month as invalid", () => {
      const result = eventCreateSchema.safeParse({
        personId: "person-123",
        type: "BIRTH",
        date: "2000-00-15",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBe(null);
      }
    });

    it("handles zero day as invalid", () => {
      const result = eventCreateSchema.safeParse({
        personId: "person-123",
        type: "BIRTH",
        date: "2000-01-00",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBe(null);
      }
    });

    it("parses valid dates with leading zeros correctly", () => {
      const result = eventCreateSchema.safeParse({
        personId: "person-123",
        type: "BIRTH",
        date: "2000-01-05",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBeInstanceOf(Date);
      }
    });
  });

  describe("optional fields", () => {
    it("allows date to be omitted", () => {
      const result = eventCreateSchema.safeParse({
        personId: "person-123",
        type: "BIRTH",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBe(null);
      }
    });

    it("allows place to be omitted", () => {
      const result = eventCreateSchema.safeParse({
        personId: "person-123",
        type: "BIRTH",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.place).toBeUndefined();
      }
    });

    it("allows description to be omitted", () => {
      const result = eventCreateSchema.safeParse({
        personId: "person-123",
        type: "BIRTH",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBeUndefined();
      }
    });

    it("accepts place when provided", () => {
      const result = eventCreateSchema.safeParse({
        personId: "person-123",
        type: "BIRTH",
        place: "New York, USA",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.place).toBe("New York, USA");
      }
    });

    it("accepts description when provided", () => {
      const result = eventCreateSchema.safeParse({
        personId: "person-123",
        type: "BIRTH",
        description: "Born in a hospital",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe("Born in a hospital");
      }
    });

    it("accepts all optional fields together", () => {
      const result = eventCreateSchema.safeParse({
        personId: "person-123",
        type: "BIRTH",
        date: "2000-01-15",
        place: "New York",
        description: "Born in hospital",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBeInstanceOf(Date);
        expect(result.data.place).toBe("New York");
        expect(result.data.description).toBe("Born in hospital");
      }
    });
  });
});

describe("eventUpdateSchema", () => {
  describe("id validation", () => {
    it("accepts valid event id", () => {
      const result = eventUpdateSchema.safeParse({
        id: "event-123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty id", () => {
      const result = eventUpdateSchema.safeParse({
        id: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing id", () => {
      const result = eventUpdateSchema.safeParse({
        type: "BIRTH",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("type field as optional", () => {
    it("allows type to be omitted", () => {
      const result = eventUpdateSchema.safeParse({
        id: "event-123",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBeUndefined();
      }
    });

    it("accepts type when provided", () => {
      const result = eventUpdateSchema.safeParse({
        id: "event-123",
        type: "DEATH",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe("DEATH");
      }
    });

    it("rejects invalid type when provided", () => {
      const result = eventUpdateSchema.safeParse({
        id: "event-123",
        type: "INVALID",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("date field as optional", () => {
    it("allows date to be omitted", () => {
      const result = eventUpdateSchema.safeParse({
        id: "event-123",
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid date when provided", () => {
      const result = eventUpdateSchema.safeParse({
        id: "event-123",
        date: "2000-01-15",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBeInstanceOf(Date);
      }
    });

    it("transforms null date to null", () => {
      const result = eventUpdateSchema.safeParse({
        id: "event-123",
        date: null,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBe(null);
      }
    });
  });

  describe("place field as optional", () => {
    it("allows place to be omitted", () => {
      const result = eventUpdateSchema.safeParse({
        id: "event-123",
      });
      expect(result.success).toBe(true);
    });

    it("accepts place when provided", () => {
      const result = eventUpdateSchema.safeParse({
        id: "event-123",
        place: "London",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.place).toBe("London");
      }
    });
  });

  describe("description field as optional", () => {
    it("allows description to be omitted", () => {
      const result = eventUpdateSchema.safeParse({
        id: "event-123",
      });
      expect(result.success).toBe(true);
    });

    it("accepts description when provided", () => {
      const result = eventUpdateSchema.safeParse({
        id: "event-123",
        description: "Updated description",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe("Updated description");
      }
    });
  });

  describe("multiple fields update", () => {
    it("accepts all fields for update", () => {
      const result = eventUpdateSchema.safeParse({
        id: "event-123",
        type: "MARRIAGE",
        date: "2010-06-20",
        place: "Paris",
        description: "Wedding day",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("event-123");
        expect(result.data.type).toBe("MARRIAGE");
        expect(result.data.date).toBeInstanceOf(Date);
        expect(result.data.place).toBe("Paris");
        expect(result.data.description).toBe("Wedding day");
      }
    });
  });
});

describe("eventParticipantCreateSchema", () => {
  describe("eventId validation", () => {
    it("accepts valid eventId", () => {
      const result = eventParticipantCreateSchema.safeParse({
        eventId: "event-123",
        personId: "person-456",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty eventId", () => {
      const result = eventParticipantCreateSchema.safeParse({
        eventId: "",
        personId: "person-456",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing eventId", () => {
      const result = eventParticipantCreateSchema.safeParse({
        personId: "person-456",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("personId validation", () => {
    it("accepts valid personId", () => {
      const result = eventParticipantCreateSchema.safeParse({
        eventId: "event-123",
        personId: "person-456",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty personId", () => {
      const result = eventParticipantCreateSchema.safeParse({
        eventId: "event-123",
        personId: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing personId", () => {
      const result = eventParticipantCreateSchema.safeParse({
        eventId: "event-123",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("role field", () => {
    it("accepts valid role", () => {
      const result = eventParticipantCreateSchema.safeParse({
        eventId: "event-123",
        personId: "person-456",
        role: "bride",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBe("bride");
      }
    });

    it("allows role to be omitted", () => {
      const result = eventParticipantCreateSchema.safeParse({
        eventId: "event-123",
        personId: "person-456",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.role).toBeUndefined();
      }
    });
  });
});

describe("eventParticipantRemoveSchema", () => {
  describe("eventId validation", () => {
    it("accepts valid eventId", () => {
      const result = eventParticipantRemoveSchema.safeParse({
        eventId: "event-123",
        personId: "person-456",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty eventId", () => {
      const result = eventParticipantRemoveSchema.safeParse({
        eventId: "",
        personId: "person-456",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing eventId", () => {
      const result = eventParticipantRemoveSchema.safeParse({
        personId: "person-456",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("personId validation", () => {
    it("accepts valid personId", () => {
      const result = eventParticipantRemoveSchema.safeParse({
        eventId: "event-123",
        personId: "person-456",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty personId", () => {
      const result = eventParticipantRemoveSchema.safeParse({
        eventId: "event-123",
        personId: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing personId", () => {
      const result = eventParticipantRemoveSchema.safeParse({
        eventId: "event-123",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("structure", () => {
    it("accepts exactly the required fields", () => {
      const result = eventParticipantRemoveSchema.safeParse({
        eventId: "event-123",
        personId: "person-456",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.eventId).toBe("event-123");
        expect(result.data.personId).toBe("person-456");
      }
    });

    it("strips extra fields and validates core fields", () => {
      const result = eventParticipantRemoveSchema.safeParse({
        eventId: "event-123",
        personId: "person-456",
        role: "extra-field",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.eventId).toBe("event-123");
        expect(result.data.personId).toBe("person-456");
      }
    });
  });
});

describe("edge cases and special scenarios", () => {
  it("handles very long personId", () => {
    const longId = "person-" + "x".repeat(1000);
    const result = eventCreateSchema.safeParse({
      personId: longId,
      type: "BIRTH",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.personId).toBe(longId);
    }
  });

  it("handles very long place name", () => {
    const longPlace = "A".repeat(1000);
    const result = eventCreateSchema.safeParse({
      personId: "person-123",
      type: "BIRTH",
      place: longPlace,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.place).toBe(longPlace);
    }
  });

  it("handles very long description", () => {
    const longDesc = "Description " + "x".repeat(1000);
    const result = eventCreateSchema.safeParse({
      personId: "person-123",
      type: "BIRTH",
      description: longDesc,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBe(longDesc);
    }
  });

  it("parses date boundaries - December 31st", () => {
    const result = eventCreateSchema.safeParse({
      personId: "person-123",
      type: "BIRTH",
      date: "2000-12-31",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date).toBeInstanceOf(Date);
    }
  });

  it("parses date boundaries - January 1st", () => {
    const result = eventCreateSchema.safeParse({
      personId: "person-123",
      type: "BIRTH",
      date: "2000-01-01",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date).toBeInstanceOf(Date);
    }
  });

  it("parses date with single digit day in ISO format", () => {
    const result = eventCreateSchema.safeParse({
      personId: "person-123",
      type: "BIRTH",
      date: "2000-01-01",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date).toBeInstanceOf(Date);
    }
  });

  it("accepts existing Date object with time component", () => {
    const dateWithTime = new Date("2000-01-15T10:30:00Z");
    const result = eventCreateSchema.safeParse({
      personId: "person-123",
      type: "BIRTH",
      date: dateWithTime,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date).toEqual(dateWithTime);
    }
  });
});

describe("type exports", () => {
  it("EventType can be inferred from eventTypeEnum", () => {
    const type: EventType = "BIRTH";
    expect(type).toBe("BIRTH");
  });

  it("eventCreateSchema produces correct type", () => {
    const input = {
      personId: "person-123",
      type: "BIRTH" as const,
      date: "2000-01-15",
    };
    const result = eventCreateSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});
