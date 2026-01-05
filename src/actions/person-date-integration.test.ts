// Integration tests for person date handling - requires database connection
// These tests verify that the date handling works end-to-end with the database
// Currently disabled due to database connection issues in test environment

/*
import { describe, test, expect, afterEach, mock } from "bun:test";
import { createPerson, updatePerson } from "./person";
import { db } from "@/lib/db";
import { formatDateForInput, formatDate } from "@/lib/utils";

// Mock the auth module
const mockSession = {
  id: "test-user-id",
  email: "test@example.com",
  role: "ADMIN" as const,
};

// Mock the auth functions
mock.module("@/lib/auth", () => ({
  requireAuth: mock().mockResolvedValue(mockSession),
  requireMember: mock().mockResolvedValue(mockSession),
  requireAdmin: mock().mockResolvedValue(mockSession),
}));

// Mock revalidatePath
mock.module("next/cache", () => ({
  revalidatePath: mock(),
}));

describe("Person Actions - Date Handling Integration", () => {
  let createdPersonIds: string[] = [];

  afterEach(async () => {
    // Clean up created persons
    if (createdPersonIds.length > 0) {
      await db.person.deleteMany({
        where: {
          id: {
            in: createdPersonIds,
          },
        },
      });
      createdPersonIds = [];
    }
  });

  describe("createPerson with dates", () => {
    test("creates person with valid birth date string", async () => {
      const personData = {
        firstName: "John",
        lastName: "DateTest",
        dateOfBirth: "1990-06-15", // String input
        isLiving: true,
      };

      const result = await createPerson(personData);
      expect(result.success).toBe(true);

      createdPersonIds.push(result.person.id);

      // Verify the date was stored correctly
      const person = await db.person.findUnique({
        where: { id: result.person.id },
      });

      expect(person).not.toBeNull();
      expect(person!.dateOfBirth).toBeInstanceOf(Date);
      expect(person!.dateOfBirth!.getUTCFullYear()).toBe(1990);
      expect(person!.dateOfBirth!.getUTCMonth()).toBe(5); // June (0-indexed)
      expect(person!.dateOfBirth!.getUTCDate()).toBe(15);
      expect(person!.dateOfBirth!.getUTCHours()).toBe(0);
      expect(person!.dateOfBirth!.getUTCMinutes()).toBe(0);
    });

    test("creates person with both birth and death dates", async () => {
      const personData = {
        firstName: "Jane",
        lastName: "Deceased",
        dateOfBirth: "1950-03-20",
        dateOfPassing: "2020-11-15",
        isLiving: false,
      };

      const result = await createPerson(personData);
      expect(result.success).toBe(true);

      createdPersonIds.push(result.person.id);

      const person = await db.person.findUnique({
        where: { id: result.person.id },
      });

      expect(person).not.toBeNull();

      // Verify birth date
      expect(person!.dateOfBirth).toBeInstanceOf(Date);
      expect(person!.dateOfBirth!.getUTCFullYear()).toBe(1950);
      expect(person!.dateOfBirth!.getUTCMonth()).toBe(2); // March
      expect(person!.dateOfBirth!.getUTCDate()).toBe(20);

      // Verify death date
      expect(person!.dateOfPassing).toBeInstanceOf(Date);
      expect(person!.dateOfPassing!.getUTCFullYear()).toBe(2020);
      expect(person!.dateOfPassing!.getUTCMonth()).toBe(10); // November
      expect(person!.dateOfPassing!.getUTCDate()).toBe(15);
    });

    test("handles null dates correctly", async () => {
      const personData = {
        firstName: "No",
        lastName: "Dates",
        dateOfBirth: null,
        dateOfPassing: null,
        isLiving: true,
      };

      const result = await createPerson(personData);
      expect(result.success).toBe(true);

      createdPersonIds.push(result.person.id);

      const person = await db.person.findUnique({
        where: { id: result.person.id },
      });

      expect(person).not.toBeNull();
      expect(person!.dateOfBirth).toBeNull();
      expect(person!.dateOfPassing).toBeNull();
    });

    test("handles empty string dates correctly", async () => {
      const personData = {
        firstName: "Empty",
        lastName: "Dates",
        dateOfBirth: "",
        dateOfPassing: "",
        isLiving: true,
      };

      const result = await createPerson(personData);
      expect(result.success).toBe(true);

      createdPersonIds.push(result.person.id);

      const person = await db.person.findUnique({
        where: { id: result.person.id },
      });

      expect(person).not.toBeNull();
      expect(person!.dateOfBirth).toBeNull();
      expect(person!.dateOfPassing).toBeNull();
    });

    test("handles invalid date strings gracefully", async () => {
      const personData = {
        firstName: "Invalid",
        lastName: "Dates",
        dateOfBirth: "invalid-date",
        dateOfPassing: "2023-13-45", // Invalid month and day
        isLiving: false,
      };

      const result = await createPerson(personData);
      expect(result.success).toBe(true);

      createdPersonIds.push(result.person.id);

      const person = await db.person.findUnique({
        where: { id: result.person.id },
      });

      expect(person).not.toBeNull();
      expect(person!.dateOfBirth).toBeNull();
      expect(person!.dateOfPassing).toBeNull();
    });

    test("handles leap year dates correctly", async () => {
      const personData = {
        firstName: "Leap",
        lastName: "Year",
        dateOfBirth: "2000-02-29", // Valid leap year
        isLiving: true,
      };

      const result = await createPerson(personData);
      expect(result.success).toBe(true);

      createdPersonIds.push(result.person.id);

      const person = await db.person.findUnique({
        where: { id: result.person.id },
      });

      expect(person).not.toBeNull();
      expect(person!.dateOfBirth).toBeInstanceOf(Date);
      expect(person!.dateOfBirth!.getUTCFullYear()).toBe(2000);
      expect(person!.dateOfBirth!.getUTCMonth()).toBe(1); // February
      expect(person!.dateOfBirth!.getUTCDate()).toBe(29);
    });

    test("rejects invalid leap year dates", async () => {
      const personData = {
        firstName: "Invalid",
        lastName: "LeapYear",
        dateOfBirth: "1900-02-29", // 1900 is not a leap year
        isLiving: true,
      };

      const result = await createPerson(personData);
      expect(result.success).toBe(true);

      createdPersonIds.push(result.person.id);

      const person = await db.person.findUnique({
        where: { id: result.person.id },
      });

      expect(person).not.toBeNull();
      expect(person!.dateOfBirth).toBeNull(); // Should be null due to invalid date
    });
  });

  describe("updatePerson with dates", () => {
    test("updates person dates correctly", async () => {
      // First create a person
      const createResult = await createPerson({
        firstName: "Update",
        lastName: "Test",
        dateOfBirth: "1985-07-04",
        isLiving: true,
      });

      expect(createResult.success).toBe(true);
      createdPersonIds.push(createResult.person.id);

      // Update the person's birth date
      const updateResult = await updatePerson(createResult.person.id, {
        dateOfBirth: "1985-07-05", // Change from July 4th to July 5th
      });

      expect(updateResult.success).toBe(true);

      const person = await db.person.findUnique({
        where: { id: createResult.person.id },
      });

      expect(person).not.toBeNull();
      expect(person!.dateOfBirth).toBeInstanceOf(Date);
      expect(person!.dateOfBirth!.getUTCFullYear()).toBe(1985);
      expect(person!.dateOfBirth!.getUTCMonth()).toBe(6); // July
      expect(person!.dateOfBirth!.getUTCDate()).toBe(5); // Changed to 5th
    });

    test("updates person from living to deceased with death date", async () => {
      // Create living person
      const createResult = await createPerson({
        firstName: "Living",
        lastName: "ThenDeceased",
        dateOfBirth: "1960-01-01",
        isLiving: true,
      });

      expect(createResult.success).toBe(true);
      createdPersonIds.push(createResult.person.id);

      // Update to deceased with death date
      const updateResult = await updatePerson(createResult.person.id, {
        isLiving: false,
        dateOfPassing: "2023-12-31",
      });

      expect(updateResult.success).toBe(true);

      const person = await db.person.findUnique({
        where: { id: createResult.person.id },
      });

      expect(person).not.toBeNull();
      expect(person!.isLiving).toBe(false);
      expect(person!.dateOfPassing).toBeInstanceOf(Date);
      expect(person!.dateOfPassing!.getUTCFullYear()).toBe(2023);
      expect(person!.dateOfPassing!.getUTCMonth()).toBe(11); // December
      expect(person!.dateOfPassing!.getUTCDate()).toBe(31);
    });

    test("clears dates when updated to null", async () => {
      // Create person with dates
      const createResult = await createPerson({
        firstName: "Clear",
        lastName: "Dates",
        dateOfBirth: "1990-06-15",
        dateOfPassing: "2020-12-25",
        isLiving: false,
      });

      expect(createResult.success).toBe(true);
      createdPersonIds.push(createResult.person.id);

      // Update to clear dates
      const updateResult = await updatePerson(createResult.person.id, {
        dateOfBirth: null,
        dateOfPassing: null,
        isLiving: true,
      });

      expect(updateResult.success).toBe(true);

      const person = await db.person.findUnique({
        where: { id: createResult.person.id },
      });

      expect(person).not.toBeNull();
      expect(person!.dateOfBirth).toBeNull();
      expect(person!.dateOfPassing).toBeNull();
      expect(person!.isLiving).toBe(true);
    });
  });

  describe("date formatting integration", () => {
    test("dates can be round-tripped through format functions", async () => {
      const originalDate = "1990-06-15";

      const createResult = await createPerson({
        firstName: "Format",
        lastName: "Test",
        dateOfBirth: originalDate,
        isLiving: true,
      });

      expect(createResult.success).toBe(true);
      createdPersonIds.push(createResult.person.id);

      const person = await db.person.findUnique({
        where: { id: createResult.person.id },
      });

      expect(person).not.toBeNull();

      // Test formatDateForInput
      const inputFormatted = formatDateForInput(person!.dateOfBirth);
      expect(inputFormatted).toBe(originalDate);

      // Test formatDate
      const displayFormatted = formatDate(person!.dateOfBirth);
      expect(displayFormatted).toBe("June 15, 1990");
    });

    test("edge case dates format correctly", async () => {
      const edgeCases = [
        { input: "2000-02-29", display: "February 29, 2000" }, // Leap year
        { input: "1999-12-31", display: "December 31, 1999" }, // Year end
        { input: "2001-01-01", display: "January 1, 2001" }, // Year start
        { input: "1985-07-04", display: "July 4, 1985" }, // Independence Day
      ];

      for (const testCase of edgeCases) {
        const createResult = await createPerson({
          firstName: "Edge",
          lastName: `Case${testCase.input.replace(/-/g, "")}`,
          dateOfBirth: testCase.input,
          isLiving: true,
        });

        expect(createResult.success).toBe(true);
        createdPersonIds.push(createResult.person.id);

        const person = await db.person.findUnique({
          where: { id: createResult.person.id },
        });

        expect(person).not.toBeNull();

        // Test round-trip formatting
        const inputFormatted = formatDateForInput(person!.dateOfBirth);
        expect(inputFormatted).toBe(testCase.input);

        const displayFormatted = formatDate(person!.dateOfBirth);
        expect(displayFormatted).toBe(testCase.display);
      }
    });
  });

  describe("timezone independence verification", () => {
    test("dates stored are timezone-agnostic", async () => {
      const testDate = "1990-06-15";

      const createResult = await createPerson({
        firstName: "Timezone",
        lastName: "Independent",
        dateOfBirth: testDate,
        isLiving: true,
      });

      expect(createResult.success).toBe(true);
      createdPersonIds.push(createResult.person.id);

      const person = await db.person.findUnique({
        where: { id: createResult.person.id },
      });

      expect(person).not.toBeNull();

      // Verify the date is stored at midnight UTC
      expect(person!.dateOfBirth!.getUTCHours()).toBe(0);
      expect(person!.dateOfBirth!.getUTCMinutes()).toBe(0);
      expect(person!.dateOfBirth!.getUTCSeconds()).toBe(0);
      expect(person!.dateOfBirth!.getUTCMilliseconds()).toBe(0);

      // Verify the date components are correct
      expect(person!.dateOfBirth!.getUTCFullYear()).toBe(1990);
      expect(person!.dateOfBirth!.getUTCMonth()).toBe(5); // June
      expect(person!.dateOfBirth!.getUTCDate()).toBe(15);
    });

    test("date retrieval is consistent regardless of system timezone", async () => {
      // This test verifies that date retrieval doesn't depend on system timezone
      const testDate = "1985-12-25";

      const createResult = await createPerson({
        firstName: "Christmas",
        lastName: "Baby",
        dateOfBirth: testDate,
        isLiving: true,
      });

      expect(createResult.success).toBe(true);
      createdPersonIds.push(createResult.person.id);

      // Retrieve the person multiple times to ensure consistency
      for (let i = 0; i < 3; i++) {
        const person = await db.person.findUnique({
          where: { id: createResult.person.id },
        });

        expect(person).not.toBeNull();
        expect(formatDateForInput(person!.dateOfBirth)).toBe(testDate);
        expect(formatDate(person!.dateOfBirth)).toBe("December 25, 1985");
      }
    });
  });
});
*/
