import { describe, it, expect } from "bun:test";
import { personCreateSchema } from "./person";

describe("Date Validation for Epic vamsa-h8g", () => {
  it("parses valid date strings to timezone-agnostic Date objects", () => {
    const data = {
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: "1990-06-15",
    };

    const result = personCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dateOfBirth).toBeInstanceOf(Date);
      expect(result.data.dateOfBirth!.getUTCFullYear()).toBe(1990);
      expect(result.data.dateOfBirth!.getUTCMonth()).toBe(5); // June
      expect(result.data.dateOfBirth!.getUTCDate()).toBe(15);
      expect(result.data.dateOfBirth!.getUTCHours()).toBe(0);
    }
  });

  it("handles null dates correctly", () => {
    const data = {
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: null,
    };

    const result = personCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dateOfBirth).toBeNull();
    }
  });

  it("handles empty string dates", () => {
    const data = {
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: "",
    };

    const result = personCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dateOfBirth).toBeNull();
    }
  });

  it("handles leap year dates", () => {
    const data = {
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: "2000-02-29",
    };

    const result = personCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dateOfBirth).toBeInstanceOf(Date);
      expect(result.data.dateOfBirth!.getUTCMonth()).toBe(1); // February
      expect(result.data.dateOfBirth!.getUTCDate()).toBe(29);
    }
  });

  it("stores dates at midnight UTC for timezone independence", () => {
    const data = {
      firstName: "John",
      lastName: "Doe",
      dateOfBirth: "1985-12-25",
    };

    const result = personCreateSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dateOfBirth!.getUTCHours()).toBe(0);
      expect(result.data.dateOfBirth!.getUTCMinutes()).toBe(0);
      expect(result.data.dateOfBirth!.getUTCSeconds()).toBe(0);
      expect(result.data.dateOfBirth!.getUTCMilliseconds()).toBe(0);
    }
  });
});
