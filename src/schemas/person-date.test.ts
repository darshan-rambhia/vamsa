import { describe, it, expect } from "bun:test";
import { personCreateSchema } from "./person";

describe("Person Schema - Date Handling", () => {
  describe("date transformation and validation", () => {
    it("parses valid YYYY-MM-DD date strings to Date objects", () => {
      const validData = {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "1990-06-15",
      };

      const result = personCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dateOfBirth).toBeInstanceOf(Date);
        expect(result.data.dateOfBirth!.getUTCFullYear()).toBe(1990);
        expect(result.data.dateOfBirth!.getUTCMonth()).toBe(5); // June is month 5 (0-indexed)
        expect(result.data.dateOfBirth!.getUTCDate()).toBe(15);
        expect(result.data.dateOfBirth!.getUTCHours()).toBe(0);
        expect(result.data.dateOfBirth!.getUTCMinutes()).toBe(0);
        expect(result.data.dateOfBirth!.getUTCSeconds()).toBe(0);
      }
    });

    it("handles null and undefined dates", () => {
      const dataWithNull = {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: null,
      };

      const result1 = personCreateSchema.safeParse(dataWithNull);
      expect(result1.success).toBe(true);
      if (result1.success) {
        expect(result1.data.dateOfBirth).toBeNull();
      }

      const dataWithUndefined = {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: undefined,
      };

      const result2 = personCreateSchema.safeParse(dataWithUndefined);
      expect(result2.success).toBe(true);
      if (result2.success) {
        expect(result2.data.dateOfBirth).toBeNull();
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
    });

    it("handles both dateOfBirth and dateOfPassing", () => {
      const data = {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: "1950-03-15",
        dateOfPassing: "2020-11-22",
        isLiving: false,
      };

      const result = personCreateSchema.safeParse(data);
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
      const data = {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: birthDate,
      };

      const result = personCreateSchema.safeParse(data);
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
        const data = {
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: dateString,
        };

        const result = personCreateSchema.safeParse(data);
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

    it("handles invalid date formats by returning null", () => {
      const invalidFormats = ["invalid-date", "not-a-date", "abc-def-ghi", ""];

      invalidFormats.forEach((invalidDate) => {
        const data = {
          firstName: "John",
          lastName: "Doe",
          dateOfBirth: invalidDate,
        };

        const result = personCreateSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.dateOfBirth).toBeNull();
        }
      });
    });

    it("ensures timezone independence", () => {
      const testDate = "1990-06-15";
      const data = {
        firstName: "John",
        lastName: "Doe",
        dateOfBirth: testDate,
      };

      const result = personCreateSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        // Verify the date is stored at midnight UTC
        expect(result.data.dateOfBirth!.getUTCHours()).toBe(0);
        expect(result.data.dateOfBirth!.getUTCMinutes()).toBe(0);
        expect(result.data.dateOfBirth!.getUTCSeconds()).toBe(0);
        expect(result.data.dateOfBirth!.getUTCMilliseconds()).toBe(0);

        // Verify the date components are correct
        expect(result.data.dateOfBirth!.getUTCFullYear()).toBe(1990);
        expect(result.data.dateOfBirth!.getUTCMonth()).toBe(5); // June
        expect(result.data.dateOfBirth!.getUTCDate()).toBe(15);
      }
    });
  });
});
