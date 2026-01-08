import { describe, it, expect } from "bun:test";
import { personCreateSchema, personUpdateSchema } from "./person";

describe("personCreateSchema", () => {
  it("validates valid person data", () => {
    const validData = {
      firstName: "John",
      lastName: "Doe",
    };

    const result = personCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("requires firstName", () => {
    const invalidData = {
      lastName: "Doe",
    };

    const result = personCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("requires lastName", () => {
    const invalidData = {
      firstName: "John",
    };

    const result = personCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("accepts optional fields", () => {
    const validData = {
      firstName: "John",
      lastName: "Doe",
      maidenName: "Smith",
      birthPlace: "New York",
      nativePlace: "Boston",
      bio: "A great person",
      email: "john@example.com",
      phone: "123-456-7890",
      profession: "Engineer",
      employer: "Tech Corp",
      isLiving: true,
    };

    const result = personCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maidenName).toBe("Smith");
      expect(result.data.isLiving).toBe(true);
    }
  });

  it("validates email format when provided", () => {
    const invalidData = {
      firstName: "John",
      lastName: "Doe",
      email: "not-an-email",
    };

    const result = personCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("accepts valid gender values", () => {
    const validData = {
      firstName: "John",
      lastName: "Doe",
      gender: "MALE",
    };

    const result = personCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects invalid gender values", () => {
    const invalidData = {
      firstName: "John",
      lastName: "Doe",
      gender: "INVALID",
    };

    const result = personCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("transforms date strings to Date objects", () => {
    const validData = {
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: "2000-01-15",
    };

    const result = personCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dateOfBirth).toBeInstanceOf(Date);
    }
  });

  it("handles Date objects for dates", () => {
    const validData = {
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: new Date(2000, 0, 15),
    };

    const result = personCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dateOfBirth).toBeInstanceOf(Date);
    }
  });

  it("accepts valid address", () => {
    const validData = {
      firstName: "John",
      lastName: "Doe",
      currentAddress: {
        street: "123 Main St",
        city: "Springfield",
        state: "IL",
        postalCode: "62701",
        country: "USA",
      },
    };

    const result = personCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("accepts valid social links", () => {
    const validData = {
      firstName: "John",
      lastName: "Doe",
      socialLinks: {
        facebook: "https://facebook.com/johndoe",
        twitter: "https://twitter.com/johndoe",
        linkedin: "https://linkedin.com/in/johndoe",
      },
    };

    const result = personCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects invalid social link URLs", () => {
    const invalidData = {
      firstName: "John",
      lastName: "Doe",
      socialLinks: {
        facebook: "not-a-url",
      },
    };

    const result = personCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("accepts empty string for email", () => {
    const validData = {
      firstName: "John",
      lastName: "Doe",
      email: "",
    };

    const result = personCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("accepts empty string for social links", () => {
    const validData = {
      firstName: "John",
      lastName: "Doe",
      socialLinks: {
        facebook: "",
        twitter: "",
      },
    };

    const result = personCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("accepts null for dateOfBirth", () => {
    const validData = {
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: null,
    };

    const result = personCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("accepts undefined for dateOfBirth", () => {
    const validData = {
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: undefined,
    };

    const result = personCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("accepts empty string for dateOfBirth", () => {
    const validData = {
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: "",
    };

    const result = personCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dateOfBirth).toBeNull();
    }
  });

  describe("date handling for timezone independence", () => {
    it("parses YYYY-MM-DD dates as UTC midnight", () => {
      const validData = {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "1990-06-15",
      };

      const result = personCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        const date = result.data.dateOfBirth!;
        expect(date.getUTCFullYear()).toBe(1990);
        expect(date.getUTCMonth()).toBe(5); // June is month 5 (0-indexed)
        expect(date.getUTCDate()).toBe(15);
        expect(date.getUTCHours()).toBe(0);
        expect(date.getUTCMinutes()).toBe(0);
        expect(date.getUTCSeconds()).toBe(0);
      }
    });

    it("handles invalid date strings by returning null", () => {
      const trulyInvalidDates = [
        "invalid-date",
        "not-a-date",
        "abc-def-ghi",
        "2023-13-01", // Invalid month
        "2023-01-32", // Invalid day
      ];

      trulyInvalidDates.forEach((invalidDate) => {
        const validData = {
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: invalidDate,
        };

        const result = personCreateSchema.safeParse(validData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.dateOfBirth).toBeNull();
        }
      });
    });
  });

  it("handles leap year dates correctly", () => {
    // Valid leap year
    const leapYearData = {
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: "2000-02-29",
    };

    const result1 = personCreateSchema.safeParse(leapYearData);
    expect(result1.success).toBe(true);
    if (result1.success) {
      expect(result1.data.dateOfBirth).toBeInstanceOf(Date);
      expect(result1.data.dateOfBirth!.getUTCFullYear()).toBe(2000);
      expect(result1.data.dateOfBirth!.getUTCMonth()).toBe(1); // February
      expect(result1.data.dateOfBirth!.getUTCDate()).toBe(29);
    }

    // Invalid leap year
    const invalidLeapYearData = {
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: "1900-02-29", // 1900 is not a leap year
    };

    const result2 = personCreateSchema.safeParse(invalidLeapYearData);
    expect(result2.success).toBe(true);
    if (result2.success) {
      expect(result2.data.dateOfBirth).toBeNull();
    }
  });

  it("handles both dateOfBirth and dateOfPassing", () => {
    const validData = {
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: "1950-03-15",
      dateOfPassing: "2020-11-22",
      isLiving: false,
    };

    const result = personCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dateOfBirth).toBeInstanceOf(Date);
      expect(result.data.dateOfBirth!.getUTCFullYear()).toBe(1950);
      expect(result.data.dateOfBirth!.getUTCMonth()).toBe(2); // March
      expect(result.data.dateOfBirth!.getUTCDate()).toBe(15);

      expect(result.data.dateOfPassing).toBeInstanceOf(Date);
      expect(result.data.dateOfPassing!.getUTCFullYear()).toBe(2020);
      expect(result.data.dateOfPassing!.getUTCMonth()).toBe(10); // November
      expect(result.data.dateOfPassing!.getUTCDate()).toBe(22);
    }
  });

  it("preserves Date objects without transformation", () => {
    const birthDate = new Date(Date.UTC(1985, 11, 25)); // Dec 25, 1985
    const validData = {
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: birthDate,
    };

    const result = personCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dateOfBirth).toBeInstanceOf(Date);
      expect(result.data.dateOfBirth!.getTime()).toBe(birthDate.getTime());
    }
  });

  it("handles edge case dates", () => {
    const edgeCases = [
      "2023-01-01", // New Year's Day
      "2023-12-31", // New Year's Eve
      "2000-02-29", // Leap year
      "1999-02-28", // Non-leap year February end
    ];

    edgeCases.forEach((dateString) => {
      const validData = {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: dateString,
      };

      const result = personCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dateOfBirth).toBeInstanceOf(Date);
        // Verify the date is stored at midnight UTC
        expect(result.data.dateOfBirth!.getUTCHours()).toBe(0);
        expect(result.data.dateOfBirth!.getUTCMinutes()).toBe(0);
        expect(result.data.dateOfBirth!.getUTCSeconds()).toBe(0);
      }
    });
  });

  it("handles whitespace in date strings", () => {
    const validData = {
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: "  1990-06-15  ",
    };

    const result = personCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      // parseDateString should handle trimming and parse correctly
      expect(result.data.dateOfBirth).toBeInstanceOf(Date);
      expect(result.data.dateOfBirth!.getUTCFullYear()).toBe(1990);
    }
  });
});

describe("personUpdateSchema", () => {
  it("allows partial updates", () => {
    const partialData = {
      firstName: "Jane",
    };

    const result = personUpdateSchema.safeParse(partialData);
    expect(result.success).toBe(true);
  });

  it("validates email if provided", () => {
    const invalidData = {
      email: "invalid-email",
    };

    const result = personUpdateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("accepts empty object", () => {
    const result = personUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
