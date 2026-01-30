/**
 * Unit Tests for Place Schemas
 * Tests Zod schema validation for place management, coordinates, and person-place relationships
 */
import { describe, expect, it } from "bun:test";
import {
  personPlaceTypeEnum,
  placeCreateSchema,
  placePersonLinkCreateSchema,
  placeTypeEnum,
  placeUpdateSchema,
} from "./place";
import type {
  PlaceCreateInput,
  PlacePersonLinkCreateInput,
  PlaceUpdateInput,
} from "./place";

describe("placeTypeEnum", () => {
  it("should accept all valid place types", () => {
    const validPlaceTypes = [
      "COUNTRY",
      "STATE",
      "COUNTY",
      "CITY",
      "TOWN",
      "VILLAGE",
      "PARISH",
      "DISTRICT",
      "REGION",
      "PROVINCE",
      "TERRITORY",
      "OTHER",
    ];

    validPlaceTypes.forEach((placeType) => {
      const result = placeTypeEnum.safeParse(placeType);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid place types", () => {
    const invalidPlaceTypes = [
      "country",
      "LOCATION",
      "PLACE",
      "AREA",
      "",
      null,
      123,
      "CITY ",
      " CITY",
    ];

    invalidPlaceTypes.forEach((placeType) => {
      const result = placeTypeEnum.safeParse(placeType);
      expect(result.success).toBe(false);
    });
  });

  it("should reject lowercase place type values", () => {
    const result = placeTypeEnum.safeParse("city");
    expect(result.success).toBe(false);
  });

  it("should reject mixed case place type values", () => {
    const result = placeTypeEnum.safeParse("City");
    expect(result.success).toBe(false);
  });

  it("should reject whitespace place type values", () => {
    const result = placeTypeEnum.safeParse("CITY ");
    expect(result.success).toBe(false);
  });
});

describe("personPlaceTypeEnum", () => {
  it("should accept all valid person place types", () => {
    const validPersonPlaceTypes = [
      "BIRTH",
      "MARRIAGE",
      "DEATH",
      "LIVED",
      "WORKED",
      "STUDIED",
      "OTHER",
    ];

    validPersonPlaceTypes.forEach((personPlaceType) => {
      const result = personPlaceTypeEnum.safeParse(personPlaceType);
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid person place types", () => {
    const invalidPersonPlaceTypes = [
      "birth",
      "MARRIED",
      "DIED",
      "LIVED_IN",
      "",
      null,
      123,
      "BIRTH ",
    ];

    invalidPersonPlaceTypes.forEach((personPlaceType) => {
      const result = personPlaceTypeEnum.safeParse(personPlaceType);
      expect(result.success).toBe(false);
    });
  });

  it("should reject lowercase person place type values", () => {
    const result = personPlaceTypeEnum.safeParse("birth");
    expect(result.success).toBe(false);
  });

  it("should reject mixed case person place type values", () => {
    const result = personPlaceTypeEnum.safeParse("Birth");
    expect(result.success).toBe(false);
  });
});

describe("placeCreateSchema", () => {
  describe("Valid inputs", () => {
    it("should validate complete place creation with all fields", () => {
      const place: PlaceCreateInput = {
        name: "New York",
        placeType: "CITY",
        latitude: 40.7128,
        longitude: -74.006,
        parentId: "state-123",
        description: "A major city",
        alternativeNames: ["NYC", "The Big Apple"],
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should validate place with only required fields", () => {
      const place = {
        name: "Paris",
        placeType: "CITY" as const,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should validate place with name and placeType only", () => {
      const place: PlaceCreateInput = {
        name: "Tokyo",
        placeType: "CITY",
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Tokyo");
        expect(result.data.placeType).toBe("CITY");
      }
    });

    it("should accept all valid place types", () => {
      const placeTypes = [
        "COUNTRY",
        "STATE",
        "COUNTY",
        "CITY",
        "TOWN",
        "VILLAGE",
        "PARISH",
        "DISTRICT",
        "REGION",
        "PROVINCE",
        "TERRITORY",
        "OTHER",
      ];

      placeTypes.forEach((placeType) => {
        const place = {
          name: "Test Place",
          placeType: placeType as any,
        };

        const result = placeCreateSchema.safeParse(place);
        expect(result.success).toBe(true);
      });
    });

    it("should accept optional latitude field", () => {
      const place = {
        name: "London",
        placeType: "CITY" as const,
        latitude: 51.5074,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should accept optional longitude field", () => {
      const place = {
        name: "London",
        placeType: "CITY" as const,
        longitude: -0.1278,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should accept null latitude", () => {
      const place = {
        name: "Unknown",
        placeType: "OTHER" as const,
        latitude: null,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should accept null longitude", () => {
      const place = {
        name: "Unknown",
        placeType: "OTHER" as const,
        longitude: null,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should accept null parentId", () => {
      const place = {
        name: "Country Place",
        placeType: "COUNTRY" as const,
        parentId: null,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should accept optional description", () => {
      const place = {
        name: "Berlin",
        placeType: "CITY" as const,
        description: "Capital of Germany",
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should accept null description", () => {
      const place = {
        name: "Berlin",
        placeType: "CITY" as const,
        description: null,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should accept optional alternativeNames array", () => {
      const place = {
        name: "Istanbul",
        placeType: "CITY" as const,
        alternativeNames: ["Constantinople", "Byzantium"],
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should accept single alternative name", () => {
      const place = {
        name: "Mumbai",
        placeType: "CITY" as const,
        alternativeNames: ["Bombay"],
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should transform empty alternativeNames array to null", () => {
      const place = {
        name: "Test",
        placeType: "CITY" as const,
        alternativeNames: [],
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.alternativeNames).toBe(null);
      }
    });

    it("should accept null alternativeNames", () => {
      const place = {
        name: "Bangkok",
        placeType: "CITY" as const,
        alternativeNames: null,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should validate both latitude and longitude together", () => {
      const place = {
        name: "Sydney",
        placeType: "CITY" as const,
        latitude: -33.8688,
        longitude: 151.2093,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should accept name at exactly 1 character", () => {
      const place = {
        name: "A",
        placeType: "TOWN" as const,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should accept name at exactly 255 characters", () => {
      const place = {
        name: "A".repeat(255),
        placeType: "CITY" as const,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });
  });

  describe("Name validation", () => {
    it("should reject empty name", () => {
      const place = {
        name: "",
        placeType: "CITY" as const,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(false);
    });

    it("should reject missing name", () => {
      const place = { placeType: "CITY" as const };
      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(false);
    });

    it("should reject null name", () => {
      const place = {
        name: null,
        placeType: "CITY" as const,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(false);
    });

    it("should reject name longer than 255 characters", () => {
      const place = {
        name: "A".repeat(256),
        placeType: "CITY" as const,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(false);
    });

    it("should accept name with special characters", () => {
      const place = {
        name: "São Paulo, Brazil",
        placeType: "CITY" as const,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should accept name with numbers", () => {
      const place = {
        name: "City 123",
        placeType: "TOWN" as const,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should accept name with punctuation", () => {
      const place = {
        name: "Saint-Etienne",
        placeType: "CITY" as const,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });
  });

  describe("Latitude validation", () => {
    it("should accept latitude at minimum value (-90)", () => {
      const place = {
        name: "South Pole",
        placeType: "OTHER" as const,
        latitude: -90,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should accept latitude at maximum value (90)", () => {
      const place = {
        name: "North Pole",
        placeType: "OTHER" as const,
        latitude: 90,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should accept latitude at 0", () => {
      const place = {
        name: "Equator",
        placeType: "OTHER" as const,
        latitude: 0,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should reject latitude below -90", () => {
      const place = {
        name: "Invalid",
        placeType: "CITY" as const,
        latitude: -91,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(false);
    });

    it("should reject latitude above 90", () => {
      const place = {
        name: "Invalid",
        placeType: "CITY" as const,
        latitude: 91,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(false);
    });

    it("should accept decimal latitude values", () => {
      const place = {
        name: "Test",
        placeType: "CITY" as const,
        latitude: 40.7128,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should reject non-numeric latitude", () => {
      const place = {
        name: "Test",
        placeType: "CITY" as const,
        latitude: "40.7128" as any,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(false);
    });
  });

  describe("Longitude validation", () => {
    it("should accept longitude at minimum value (-180)", () => {
      const place = {
        name: "Dateline West",
        placeType: "OTHER" as const,
        longitude: -180,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should accept longitude at maximum value (180)", () => {
      const place = {
        name: "Dateline East",
        placeType: "OTHER" as const,
        longitude: 180,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should accept longitude at 0", () => {
      const place = {
        name: "Prime Meridian",
        placeType: "OTHER" as const,
        longitude: 0,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should reject longitude below -180", () => {
      const place = {
        name: "Invalid",
        placeType: "CITY" as const,
        longitude: -181,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(false);
    });

    it("should reject longitude above 180", () => {
      const place = {
        name: "Invalid",
        placeType: "CITY" as const,
        longitude: 181,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(false);
    });

    it("should accept decimal longitude values", () => {
      const place = {
        name: "Test",
        placeType: "CITY" as const,
        longitude: -74.006,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(true);
    });

    it("should reject non-numeric longitude", () => {
      const place = {
        name: "Test",
        placeType: "CITY" as const,
        longitude: "-74.006" as any,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(false);
    });
  });

  describe("PlaceType validation", () => {
    it("should reject missing placeType", () => {
      const place = { name: "Test Place" };
      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(false);
    });

    it("should reject invalid placeType", () => {
      const place = {
        name: "Test",
        placeType: "INVALID_TYPE" as any,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(false);
    });

    it("should reject lowercase placeType", () => {
      const place = {
        name: "Test",
        placeType: "city" as any,
      };

      const result = placeCreateSchema.safeParse(place);
      expect(result.success).toBe(false);
    });
  });

  describe("Type inference", () => {
    it("should infer correct place create input type", () => {
      const place: PlaceCreateInput = {
        name: "Test City",
        placeType: "CITY",
        latitude: 40.0,
        longitude: -74.0,
      };

      expect(place.name).toBe("Test City");
      expect(place.placeType).toBe("CITY");
    });
  });
});

describe("placeUpdateSchema", () => {
  describe("Valid inputs", () => {
    it("should validate complete place update", () => {
      const update: PlaceUpdateInput = {
        id: "place-123",
        name: "Updated City",
        placeType: "CITY",
        latitude: 40.7128,
        longitude: -74.006,
        parentId: "state-456",
        description: "Updated description",
        alternativeNames: ["Alt Name"],
      };

      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it("should validate update with only id", () => {
      const update = { id: "place-123" };
      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it("should validate update with id and name", () => {
      const update = {
        id: "place-123",
        name: "New Name",
      };

      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it("should validate update with id and placeType", () => {
      const update = {
        id: "place-123",
        placeType: "TOWN" as const,
      };

      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it("should validate update with id and latitude", () => {
      const update = {
        id: "place-123",
        latitude: 40.7128,
      };

      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it("should validate update with id and longitude", () => {
      const update = {
        id: "place-123",
        longitude: -74.006,
      };

      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it("should omit name in update rather than set to null", () => {
      const update = {
        id: "place-123",
      };

      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it("should accept null latitude in update", () => {
      const update = {
        id: "place-123",
        latitude: null,
      };

      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it("should accept null longitude in update", () => {
      const update = {
        id: "place-123",
        longitude: null,
      };

      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it("should accept null parentId in update", () => {
      const update = {
        id: "place-123",
        parentId: null,
      };

      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it("should accept null description in update", () => {
      const update = {
        id: "place-123",
        description: null,
      };

      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it("should accept empty alternativeNames array (transforms to null)", () => {
      const update = {
        id: "place-123",
        alternativeNames: [],
      };

      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.alternativeNames).toBe(null);
      }
    });

    it("should accept null alternativeNames in update", () => {
      const update = {
        id: "place-123",
        alternativeNames: null,
      };

      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it("should accept id at exactly 1 character", () => {
      const update = {
        id: "1",
        name: "Test",
      };

      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });
  });

  describe("ID validation", () => {
    it("should reject missing id", () => {
      const update = { name: "Test" };
      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it("should reject empty id", () => {
      const update = { id: "", name: "Test" };
      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it("should reject null id", () => {
      const update = { id: null, name: "Test" };
      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });
  });

  describe("Name validation in updates", () => {
    it("should reject empty name in update", () => {
      const update = {
        id: "place-123",
        name: "",
      };

      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it("should reject name longer than 255 characters", () => {
      const update = {
        id: "place-123",
        name: "A".repeat(256),
      };

      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it("should accept name at exactly 255 characters in update", () => {
      const update = {
        id: "place-123",
        name: "A".repeat(255),
      };

      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it("should accept name at 1 character in update", () => {
      const update = {
        id: "place-123",
        name: "A",
      };

      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });
  });

  describe("PlaceType validation in updates", () => {
    it("should accept all valid place types in updates", () => {
      const placeTypes = [
        "COUNTRY",
        "STATE",
        "COUNTY",
        "CITY",
        "TOWN",
        "VILLAGE",
        "PARISH",
        "DISTRICT",
        "REGION",
        "PROVINCE",
        "TERRITORY",
        "OTHER",
      ];

      placeTypes.forEach((placeType) => {
        const update = {
          id: "place-123",
          placeType: placeType as any,
        };

        const result = placeUpdateSchema.safeParse(update);
        expect(result.success).toBe(true);
      });
    });

    it("should reject invalid placeType in update", () => {
      const update = {
        id: "place-123",
        placeType: "INVALID" as any,
      };

      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });
  });

  describe("Coordinate validation in updates", () => {
    it("should reject latitude below -90 in update", () => {
      const update = {
        id: "place-123",
        latitude: -91,
      };

      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it("should reject latitude above 90 in update", () => {
      const update = {
        id: "place-123",
        latitude: 91,
      };

      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it("should reject longitude below -180 in update", () => {
      const update = {
        id: "place-123",
        longitude: -181,
      };

      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it("should reject longitude above 180 in update", () => {
      const update = {
        id: "place-123",
        longitude: 181,
      };

      const result = placeUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });
  });

  describe("Type inference", () => {
    it("should infer correct place update input type", () => {
      const update: PlaceUpdateInput = {
        id: "place-123",
        name: "Updated",
      };

      expect(update.id).toBe("place-123");
    });
  });
});

describe("placePersonLinkCreateSchema", () => {
  describe("Valid inputs", () => {
    it("should validate complete person-place link creation", () => {
      const link: PlacePersonLinkCreateInput = {
        personId: "person-123",
        placeId: "place-456",
        fromYear: 1900,
        toYear: 1950,
        type: "LIVED",
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(true);
    });

    it("should validate link with only required fields", () => {
      const link = {
        personId: "person-123",
        placeId: "place-456",
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(true);
    });

    it("should validate link with fromYear only", () => {
      const link = {
        personId: "person-123",
        placeId: "place-456",
        fromYear: 1920,
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(true);
    });

    it("should validate link with toYear only", () => {
      const link = {
        personId: "person-123",
        placeId: "place-456",
        toYear: 1960,
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(true);
    });

    it("should validate link with type only", () => {
      const link = {
        personId: "person-123",
        placeId: "place-456",
        type: "BIRTH" as const,
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(true);
    });

    it("should accept all valid person place types", () => {
      const personPlaceTypes = [
        "BIRTH",
        "MARRIAGE",
        "DEATH",
        "LIVED",
        "WORKED",
        "STUDIED",
        "OTHER",
      ];

      personPlaceTypes.forEach((type) => {
        const link = {
          personId: "person-123",
          placeId: "place-456",
          type: type as any,
        };

        const result = placePersonLinkCreateSchema.safeParse(link);
        expect(result.success).toBe(true);
      });
    });

    it("should accept null fromYear", () => {
      const link = {
        personId: "person-123",
        placeId: "place-456",
        fromYear: null,
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(true);
    });

    it("should accept null toYear", () => {
      const link = {
        personId: "person-123",
        placeId: "place-456",
        toYear: null,
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(true);
    });

    it("should accept null type", () => {
      const link = {
        personId: "person-123",
        placeId: "place-456",
        type: null,
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(true);
    });

    it("should accept year 0", () => {
      const link = {
        personId: "person-123",
        placeId: "place-456",
        fromYear: 0,
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(true);
    });

    it("should accept negative years", () => {
      const link = {
        personId: "person-123",
        placeId: "place-456",
        fromYear: -100,
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(true);
    });

    it("should accept large year values", () => {
      const link = {
        personId: "person-123",
        placeId: "place-456",
        fromYear: 9999,
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(true);
    });
  });

  describe("PersonId validation", () => {
    it("should reject missing personId", () => {
      const link = { placeId: "place-456" };
      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(false);
    });

    it("should reject empty personId", () => {
      const link = {
        personId: "",
        placeId: "place-456",
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(false);
    });

    it("should reject null personId", () => {
      const link = {
        personId: null,
        placeId: "place-456",
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(false);
    });

    it("should accept personId at 1 character", () => {
      const link = {
        personId: "1",
        placeId: "place-456",
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(true);
    });
  });

  describe("PlaceId validation", () => {
    it("should reject missing placeId", () => {
      const link = { personId: "person-123" };
      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(false);
    });

    it("should reject empty placeId", () => {
      const link = {
        personId: "person-123",
        placeId: "",
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(false);
    });

    it("should reject null placeId", () => {
      const link = {
        personId: "person-123",
        placeId: null,
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(false);
    });

    it("should accept placeId at 1 character", () => {
      const link = {
        personId: "person-123",
        placeId: "1",
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(true);
    });
  });

  describe("Year validation", () => {
    it("should reject non-integer fromYear", () => {
      const link = {
        personId: "person-123",
        placeId: "place-456",
        fromYear: 1920.5,
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(false);
    });

    it("should reject non-integer toYear", () => {
      const link = {
        personId: "person-123",
        placeId: "place-456",
        toYear: 1950.5,
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(false);
    });

    it("should reject string fromYear", () => {
      const link = {
        personId: "person-123",
        placeId: "place-456",
        fromYear: "1920" as any,
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(false);
    });

    it("should reject string toYear", () => {
      const link = {
        personId: "person-123",
        placeId: "place-456",
        toYear: "1950" as any,
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(false);
    });
  });

  describe("Type validation", () => {
    it("should reject invalid type", () => {
      const link = {
        personId: "person-123",
        placeId: "place-456",
        type: "INVALID" as any,
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(false);
    });

    it("should reject lowercase type", () => {
      const link = {
        personId: "person-123",
        placeId: "place-456",
        type: "birth" as any,
      };

      const result = placePersonLinkCreateSchema.safeParse(link);
      expect(result.success).toBe(false);
    });
  });

  describe("Type inference", () => {
    it("should infer correct place person link input type", () => {
      const link: PlacePersonLinkCreateInput = {
        personId: "person-123",
        placeId: "place-456",
        type: "LIVED",
      };

      expect(link.personId).toBe("person-123");
      expect(link.placeId).toBe("place-456");
    });
  });
});
