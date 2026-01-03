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
