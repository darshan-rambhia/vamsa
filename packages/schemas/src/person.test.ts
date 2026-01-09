import { describe, test, expect } from "bun:test";
import {
  personCreateSchema,
  personUpdateSchema,
  genderEnum,
  addressSchema,
  socialLinksSchema,
} from "./person";

describe("personCreateSchema", () => {
  test("validates valid person data", () => {
    const validPerson = {
      firstName: "John",
      lastName: "Doe",
    };

    const result = personCreateSchema.safeParse(validPerson);
    expect(result.success).toBe(true);
  });

  test("requires firstName", () => {
    const invalidPerson = {
      lastName: "Doe",
    };

    const result = personCreateSchema.safeParse(invalidPerson);
    expect(result.success).toBe(false);
  });

  test("requires lastName", () => {
    const invalidPerson = {
      firstName: "John",
    };

    const result = personCreateSchema.safeParse(invalidPerson);
    expect(result.success).toBe(false);
  });

  test("validates with all optional fields", () => {
    const fullPerson = {
      firstName: "John",
      lastName: "Doe",
      maidenName: "Smith",
      dateOfBirth: "1990-01-15",
      dateOfPassing: null,
      birthPlace: "New York",
      nativePlace: "Boston",
      gender: "MALE" as const,
      bio: "A test person",
      email: "john@example.com",
      phone: "555-1234",
      profession: "Engineer",
      employer: "Tech Corp",
      isLiving: true,
    };

    const result = personCreateSchema.safeParse(fullPerson);
    expect(result.success).toBe(true);
  });

  test("transforms date string to Date object", () => {
    const person = {
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: "1990-01-15",
    };

    const result = personCreateSchema.safeParse(person);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dateOfBirth).toBeInstanceOf(Date);
    }
  });

  test("accepts null for date fields", () => {
    const person = {
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: null,
    };

    const result = personCreateSchema.safeParse(person);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dateOfBirth).toBeNull();
    }
  });

  test("validates email format", () => {
    const person = {
      firstName: "John",
      lastName: "Doe",
      email: "invalid-email",
    };

    const result = personCreateSchema.safeParse(person);
    expect(result.success).toBe(false);
  });

  test("allows empty string for email", () => {
    const person = {
      firstName: "John",
      lastName: "Doe",
      email: "",
    };

    const result = personCreateSchema.safeParse(person);
    expect(result.success).toBe(true);
  });
});

describe("personUpdateSchema", () => {
  test("allows partial updates", () => {
    const partialUpdate = {
      firstName: "Jane",
    };

    const result = personUpdateSchema.safeParse(partialUpdate);
    expect(result.success).toBe(true);
  });

  test("allows empty object", () => {
    const result = personUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("genderEnum", () => {
  test("validates valid gender values", () => {
    expect(genderEnum.safeParse("MALE").success).toBe(true);
    expect(genderEnum.safeParse("FEMALE").success).toBe(true);
    expect(genderEnum.safeParse("OTHER").success).toBe(true);
    expect(genderEnum.safeParse("PREFER_NOT_TO_SAY").success).toBe(true);
  });

  test("rejects invalid gender values", () => {
    expect(genderEnum.safeParse("invalid").success).toBe(false);
    expect(genderEnum.safeParse("male").success).toBe(false);
  });
});

describe("addressSchema", () => {
  test("validates valid address", () => {
    const address = {
      street: "123 Main St",
      city: "Springfield",
      state: "IL",
      postalCode: "62701",
      country: "USA",
    };

    const result = addressSchema.safeParse(address);
    expect(result.success).toBe(true);
  });

  test("allows empty object", () => {
    const result = addressSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  test("allows partial address", () => {
    const address = {
      city: "Springfield",
    };

    const result = addressSchema.safeParse(address);
    expect(result.success).toBe(true);
  });
});

describe("socialLinksSchema", () => {
  test("validates valid social links", () => {
    const links = {
      facebook: "https://facebook.com/johndoe",
      twitter: "https://twitter.com/johndoe",
      linkedin: "https://linkedin.com/in/johndoe",
    };

    const result = socialLinksSchema.safeParse(links);
    expect(result.success).toBe(true);
  });

  test("allows empty string for links", () => {
    const links = {
      facebook: "",
      twitter: "",
    };

    const result = socialLinksSchema.safeParse(links);
    expect(result.success).toBe(true);
  });

  test("rejects invalid URLs", () => {
    const links = {
      facebook: "not-a-url",
    };

    const result = socialLinksSchema.safeParse(links);
    expect(result.success).toBe(false);
  });

  test("allows empty object", () => {
    const result = socialLinksSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
