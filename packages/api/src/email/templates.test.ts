/**
 * Unit Tests for Email Templates
 */
import { describe, expect, test } from "vitest";
import {
  createBirthdayReminderEmail,
  createEmailVerificationTemplate,
  createNewMemberEmail,
  createPasswordResetEmail,
  createSuggestionCreatedEmail,
  createSuggestionUpdatedEmail,
} from "./templates";

describe("Email Templates", () => {
  describe("createSuggestionCreatedEmail", () => {
    test("returns object with subject, html, and text properties", () => {
      const email = createSuggestionCreatedEmail(
        "John Doe",
        "Jane Smith",
        "CREATE",
        "https://example.com/admin"
      );

      expect(email).toBeDefined();
      expect(email.subject).toBeDefined();
      expect(email.html).toBeDefined();
      expect(email.text).toBeDefined();
    });

    test("generates correct subject for CREATE suggestion", () => {
      const email = createSuggestionCreatedEmail(
        "John Doe",
        "Jane Smith",
        "CREATE",
        "https://example.com/admin"
      );

      expect(email.subject).toBe("New New Person Suggestion Pending Review");
    });

    test("generates correct subject for UPDATE suggestion", () => {
      const email = createSuggestionCreatedEmail(
        "John Doe",
        "Jane Smith",
        "UPDATE",
        "https://example.com/admin"
      );

      expect(email.subject).toBe(
        "New Person Information Update Pending Review"
      );
    });

    test("generates correct subject for DELETE suggestion", () => {
      const email = createSuggestionCreatedEmail(
        "John Doe",
        "Jane Smith",
        "DELETE",
        "https://example.com/admin"
      );

      expect(email.subject).toBe("New Person Deletion Pending Review");
    });

    test("generates correct subject for ADD_RELATIONSHIP suggestion", () => {
      const email = createSuggestionCreatedEmail(
        "John Doe",
        "Jane Smith",
        "ADD_RELATIONSHIP",
        "https://example.com/admin"
      );

      expect(email.subject).toBe(
        "New New Relationship Suggestion Pending Review"
      );
    });

    test("handles unknown suggestion types", () => {
      const email = createSuggestionCreatedEmail(
        "John Doe",
        "Jane Smith",
        "CUSTOM_TYPE",
        "https://example.com/admin"
      );

      expect(email.subject).toBe("New CUSTOM_TYPE Pending Review");
    });

    test("includes submitter name in html", () => {
      const email = createSuggestionCreatedEmail(
        "John Doe",
        "Jane Smith",
        "CREATE",
        "https://example.com/admin"
      );

      expect(email.html).toContain("John Doe");
    });

    test("includes submitter name in text", () => {
      const email = createSuggestionCreatedEmail(
        "John Doe",
        "Jane Smith",
        "CREATE",
        "https://example.com/admin"
      );

      expect(email.text).toContain("John Doe");
    });

    test("includes target person name in html", () => {
      const email = createSuggestionCreatedEmail(
        "John Doe",
        "Jane Smith",
        "CREATE",
        "https://example.com/admin"
      );

      expect(email.html).toContain("Jane Smith");
    });

    test("includes target person name in text", () => {
      const email = createSuggestionCreatedEmail(
        "John Doe",
        "Jane Smith",
        "CREATE",
        "https://example.com/admin"
      );

      expect(email.text).toContain("Jane Smith");
    });

    test("includes dashboard URL in html", () => {
      const url = "https://example.com/admin/dashboard";
      const email = createSuggestionCreatedEmail(
        "John Doe",
        "Jane Smith",
        "CREATE",
        url
      );

      expect(email.html).toContain(url);
    });

    test("includes dashboard URL in text", () => {
      const url = "https://example.com/admin/dashboard";
      const email = createSuggestionCreatedEmail(
        "John Doe",
        "Jane Smith",
        "CREATE",
        url
      );

      expect(email.text).toContain(url);
    });

    test("handles empty target person name", () => {
      const email = createSuggestionCreatedEmail(
        "John Doe",
        "",
        "CREATE",
        "https://example.com/admin"
      );

      expect(email.html).toBeDefined();
      expect(email.text).toBeDefined();
      // Should not have "Target: " when name is empty
      expect(email.html).not.toContain("Target: <");
    });

    test("handles special characters in names", () => {
      const email = createSuggestionCreatedEmail(
        "José García",
        "María O'Brien",
        "CREATE",
        "https://example.com/admin"
      );

      expect(email.html).toContain("José García");
      expect(email.html).toContain("María O'Brien");
    });

    test("includes type label in html", () => {
      const email = createSuggestionCreatedEmail(
        "John Doe",
        "Jane Smith",
        "CREATE",
        "https://example.com/admin"
      );

      expect(email.html).toContain("New Person Suggestion");
    });

    test("includes type label in text", () => {
      const email = createSuggestionCreatedEmail(
        "John Doe",
        "Jane Smith",
        "CREATE",
        "https://example.com/admin"
      );

      expect(email.text).toContain("New Person Suggestion");
    });

    test("html is valid HTML structure", () => {
      const email = createSuggestionCreatedEmail(
        "John Doe",
        "Jane Smith",
        "CREATE",
        "https://example.com/admin"
      );

      expect(email.html).toContain("<!DOCTYPE html>");
      expect(email.html).toContain("<html>");
      expect(email.html).toContain("</html>");
      expect(email.html).toContain("<head>");
      expect(email.html).toContain("</head>");
      expect(email.html).toContain("<body>");
      expect(email.html).toContain("</body>");
    });

    test("html includes styling", () => {
      const email = createSuggestionCreatedEmail(
        "John Doe",
        "Jane Smith",
        "CREATE",
        "https://example.com/admin"
      );

      expect(email.html).toContain("<style>");
      expect(email.html).toContain("font-family:");
    });
  });

  describe("createSuggestionUpdatedEmail", () => {
    test("returns object with subject, html, and text properties", () => {
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "APPROVED",
        null,
        "Jane Smith",
        "https://example.com/dashboard"
      );

      expect(email).toBeDefined();
      expect(email.subject).toBeDefined();
      expect(email.html).toBeDefined();
      expect(email.text).toBeDefined();
    });

    test("generates correct subject for APPROVED status", () => {
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "APPROVED",
        null,
        "Jane Smith",
        "https://example.com/dashboard"
      );

      expect(email.subject).toBe("Your Suggestion Has Been Approved");
    });

    test("generates correct subject for REJECTED status", () => {
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "REJECTED",
        null,
        "Jane Smith",
        "https://example.com/dashboard"
      );

      expect(email.subject).toBe("Your Suggestion Has Been Rejected");
    });

    test("includes submitter name in html", () => {
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "APPROVED",
        null,
        "Jane Smith",
        "https://example.com/dashboard"
      );

      expect(email.html).toContain("John Doe");
    });

    test("includes target person name in html", () => {
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "APPROVED",
        null,
        "Jane Smith",
        "https://example.com/dashboard"
      );

      expect(email.html).toContain("Jane Smith");
    });

    test("includes APPROVED status badge in html", () => {
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "APPROVED",
        null,
        "Jane Smith",
        "https://example.com/dashboard"
      );

      expect(email.html).toContain("Approved");
      expect(email.html).toContain("status-badge");
    });

    test("includes REJECTED status badge in html", () => {
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "REJECTED",
        null,
        "Jane Smith",
        "https://example.com/dashboard"
      );

      expect(email.html).toContain("Rejected");
      expect(email.html).toContain("status-badge");
    });

    test("includes APPROVED status in text", () => {
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "APPROVED",
        null,
        "Jane Smith",
        "https://example.com/dashboard"
      );

      expect(email.text).toContain("Approved");
    });

    test("includes REJECTED status in text", () => {
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "REJECTED",
        null,
        "Jane Smith",
        "https://example.com/dashboard"
      );

      expect(email.text).toContain("Rejected");
    });

    test("includes review note in html when provided", () => {
      const note = "This suggestion needs more information";
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "REJECTED",
        note,
        "Jane Smith",
        "https://example.com/dashboard"
      );

      expect(email.html).toContain("Reviewer's Note:");
      expect(email.html).toContain(note);
    });

    test("includes review note in text when provided", () => {
      const note = "This suggestion needs more information";
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "REJECTED",
        note,
        "Jane Smith",
        "https://example.com/dashboard"
      );

      expect(email.text).toContain("Reviewer's Note:");
      expect(email.text).toContain(note);
    });

    test("omits review note section when null", () => {
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "APPROVED",
        null,
        "Jane Smith",
        "https://example.com/dashboard"
      );

      expect(email.html).not.toContain("Reviewer's Note:");
    });

    test("escapes HTML special characters in review note", () => {
      const note = '<script>alert("xss")</script>';
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "REJECTED",
        note,
        "Jane Smith",
        "https://example.com/dashboard"
      );

      // Should escape < and >
      expect(email.html).toContain("&lt;script&gt;");
      expect(email.html).not.toContain("<script>");
    });

    test("includes dashboard URL in html", () => {
      const url = "https://example.com/dashboard/suggestions/123";
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "APPROVED",
        null,
        "Jane Smith",
        url
      );

      expect(email.html).toContain(url);
    });

    test("includes dashboard URL in text", () => {
      const url = "https://example.com/dashboard/suggestions/123";
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "APPROVED",
        null,
        "Jane Smith",
        url
      );

      expect(email.text).toContain(url);
    });

    test("uses green color for APPROVED status", () => {
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "APPROVED",
        null,
        "Jane Smith",
        "https://example.com/dashboard"
      );

      expect(email.html).toContain("#2d5016");
    });

    test("uses red color for REJECTED status", () => {
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "REJECTED",
        null,
        "Jane Smith",
        "https://example.com/dashboard"
      );

      expect(email.html).toContain("#c62e2e");
    });

    test("handles special characters in names", () => {
      const email = createSuggestionUpdatedEmail(
        "José García",
        "APPROVED",
        null,
        "María O'Brien",
        "https://example.com/dashboard"
      );

      expect(email.subject).toContain("Approved");
      expect(email.html).toContain("José García");
    });

    test("html is valid HTML structure", () => {
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "APPROVED",
        null,
        "Jane Smith",
        "https://example.com/dashboard"
      );

      expect(email.html).toContain("<!DOCTYPE html>");
      expect(email.html).toContain("<html>");
      expect(email.html).toContain("</html>");
    });
  });

  describe("createNewMemberEmail", () => {
    test("returns object with subject, html, and text properties", () => {
      const email = createNewMemberEmail(
        "Alice Johnson",
        "alice@example.com",
        "Smith",
        "https://example.com/tree"
      );

      expect(email).toBeDefined();
      expect(email.subject).toBeDefined();
      expect(email.html).toBeDefined();
      expect(email.text).toBeDefined();
    });

    test("generates correct subject with new member name", () => {
      const email = createNewMemberEmail(
        "Alice Johnson",
        "alice@example.com",
        "Smith",
        "https://example.com/tree"
      );

      expect(email.subject).toBe("New Family Member Joined: Alice Johnson");
    });

    test("includes new member name in html", () => {
      const email = createNewMemberEmail(
        "Alice Johnson",
        "alice@example.com",
        "Smith",
        "https://example.com/tree"
      );

      expect(email.html).toContain("Alice Johnson");
    });

    test("includes new member email in html", () => {
      const email = createNewMemberEmail(
        "Alice Johnson",
        "alice@example.com",
        "Smith",
        "https://example.com/tree"
      );

      expect(email.html).toContain("alice@example.com");
    });

    test("includes family name in html", () => {
      const email = createNewMemberEmail(
        "Alice Johnson",
        "alice@example.com",
        "Smith",
        "https://example.com/tree"
      );

      expect(email.html).toContain("Smith");
    });

    test("includes tree URL in html", () => {
      const url = "https://example.com/tree/smith-family";
      const email = createNewMemberEmail(
        "Alice Johnson",
        "alice@example.com",
        "Smith",
        url
      );

      expect(email.html).toContain(url);
    });

    test("includes new member name in text", () => {
      const email = createNewMemberEmail(
        "Alice Johnson",
        "alice@example.com",
        "Smith",
        "https://example.com/tree"
      );

      expect(email.text).toContain("Alice Johnson");
    });

    test("includes new member email in text", () => {
      const email = createNewMemberEmail(
        "Alice Johnson",
        "alice@example.com",
        "Smith",
        "https://example.com/tree"
      );

      expect(email.text).toContain("alice@example.com");
    });

    test("includes family name in text", () => {
      const email = createNewMemberEmail(
        "Alice Johnson",
        "alice@example.com",
        "Smith",
        "https://example.com/tree"
      );

      expect(email.text).toContain("Smith");
    });

    test("includes tree URL in text", () => {
      const url = "https://example.com/tree/smith-family";
      const email = createNewMemberEmail(
        "Alice Johnson",
        "alice@example.com",
        "Smith",
        url
      );

      expect(email.text).toContain(url);
    });

    test("handles special characters in member name", () => {
      const email = createNewMemberEmail(
        "José García-López",
        "jose@example.com",
        "García",
        "https://example.com/tree"
      );

      expect(email.subject).toContain("José García-López");
      expect(email.html).toContain("José García-López");
    });

    test("handles special characters in email", () => {
      const email = createNewMemberEmail(
        "Alice Johnson",
        "alice.johnson+family@example.com",
        "Smith",
        "https://example.com/tree"
      );

      expect(email.html).toContain("alice.johnson+family@example.com");
    });

    test("handles special characters in family name", () => {
      const email = createNewMemberEmail(
        "Alice Johnson",
        "alice@example.com",
        "O'Brien-Murphy",
        "https://example.com/tree"
      );

      expect(email.html).toContain("O'Brien-Murphy");
    });

    test("html is valid HTML structure", () => {
      const email = createNewMemberEmail(
        "Alice Johnson",
        "alice@example.com",
        "Smith",
        "https://example.com/tree"
      );

      expect(email.html).toContain("<!DOCTYPE html>");
      expect(email.html).toContain("<html>");
      expect(email.html).toContain("</html>");
    });

    test("includes member card styling", () => {
      const email = createNewMemberEmail(
        "Alice Johnson",
        "alice@example.com",
        "Smith",
        "https://example.com/tree"
      );

      expect(email.html).toContain("member-card");
    });
  });

  describe("createBirthdayReminderEmail", () => {
    test("returns object with subject, html, and text properties", () => {
      const birthDate = new Date("1990-05-15");
      const email = createBirthdayReminderEmail(
        "John",
        "Alice",
        birthDate,
        "https://example.com/tree"
      );

      expect(email).toBeDefined();
      expect(email.subject).toBeDefined();
      expect(email.html).toBeDefined();
      expect(email.text).toBeDefined();
    });

    test("generates subject with celebrant name and birthday emoji", () => {
      const birthDate = new Date("1990-05-15");
      const email = createBirthdayReminderEmail(
        "John",
        "Alice",
        birthDate,
        "https://example.com/tree"
      );

      expect(email.subject).toContain("Alice");
      expect(email.subject).toContain("🎉");
    });

    test("includes recipient name in html", () => {
      const birthDate = new Date("1990-05-15");
      const email = createBirthdayReminderEmail(
        "John",
        "Alice",
        birthDate,
        "https://example.com/tree"
      );

      expect(email.html).toContain("John");
    });

    test("includes celebrant name in html", () => {
      const birthDate = new Date("1990-05-15");
      const email = createBirthdayReminderEmail(
        "John",
        "Alice",
        birthDate,
        "https://example.com/tree"
      );

      expect(email.html).toContain("Alice");
    });

    test("formats birth date correctly in html", () => {
      const birthDate = new Date("1990-05-15");
      const email = createBirthdayReminderEmail(
        "John",
        "Alice",
        birthDate,
        "https://example.com/tree"
      );

      // Should be formatted as "May 15" (month and day, no year)
      expect(email.html).toContain("May");
      expect(email.html).toContain("15");
    });

    test("formats birth date correctly in text", () => {
      const birthDate = new Date("1990-05-15");
      const email = createBirthdayReminderEmail(
        "John",
        "Alice",
        birthDate,
        "https://example.com/tree"
      );

      expect(email.text).toContain("May");
      expect(email.text).toContain("15");
    });

    test("handles January birthdays", () => {
      const birthDate = new Date("1990-01-05");
      const email = createBirthdayReminderEmail(
        "John",
        "Bob",
        birthDate,
        "https://example.com/tree"
      );

      expect(email.html).toContain("January");
      expect(email.html).toContain("5");
    });

    test("handles December birthdays", () => {
      const birthDate = new Date("1990-12-25");
      const email = createBirthdayReminderEmail(
        "John",
        "Chris",
        birthDate,
        "https://example.com/tree"
      );

      expect(email.html).toContain("December");
      expect(email.html).toContain("25");
    });

    test("includes tree URL in html", () => {
      const url = "https://example.com/tree/alice-profile";
      const birthDate = new Date("1990-05-15");
      const email = createBirthdayReminderEmail(
        "John",
        "Alice",
        birthDate,
        url
      );

      expect(email.html).toContain(url);
    });

    test("includes tree URL in text", () => {
      const url = "https://example.com/tree/alice-profile";
      const birthDate = new Date("1990-05-15");
      const email = createBirthdayReminderEmail(
        "John",
        "Alice",
        birthDate,
        url
      );

      expect(email.text).toContain(url);
    });

    test("includes birthday emoji in html", () => {
      const birthDate = new Date("1990-05-15");
      const email = createBirthdayReminderEmail(
        "John",
        "Alice",
        birthDate,
        "https://example.com/tree"
      );

      expect(email.html).toContain("🎉");
    });

    test("handles special characters in names", () => {
      const birthDate = new Date("1990-05-15");
      const email = createBirthdayReminderEmail(
        "José",
        "María",
        birthDate,
        "https://example.com/tree"
      );

      expect(email.subject).toContain("María");
      expect(email.html).toContain("José");
    });

    test("includes birthday card styling", () => {
      const birthDate = new Date("1990-05-15");
      const email = createBirthdayReminderEmail(
        "John",
        "Alice",
        birthDate,
        "https://example.com/tree"
      );

      expect(email.html).toContain("birthday-card");
    });

    test("html is valid HTML structure", () => {
      const birthDate = new Date("1990-05-15");
      const email = createBirthdayReminderEmail(
        "John",
        "Alice",
        birthDate,
        "https://example.com/tree"
      );

      expect(email.html).toContain("<!DOCTYPE html>");
      expect(email.html).toContain("<html>");
      expect(email.html).toContain("</html>");
    });

    test("handles leap year date correctly", () => {
      const birthDate = new Date("1990-02-29"); // Leap year
      const email = createBirthdayReminderEmail(
        "John",
        "Alice",
        birthDate,
        "https://example.com/tree"
      );

      expect(email.html).toBeDefined();
      expect(email.text).toBeDefined();
    });

    test("does not include year in formatted date", () => {
      const birthDate = new Date("1990-05-15");
      const email = createBirthdayReminderEmail(
        "John",
        "Alice",
        birthDate,
        "https://example.com/tree"
      );

      // The formatted date should not contain the year 1990
      const dateMatch = email.html.match(/May\s+15[^0-9]*$/m);
      if (dateMatch) {
        expect(dateMatch[0]).not.toContain("1990");
      }
    });
  });

  describe("HTML escaping", () => {
    test("escapes < character in review note", () => {
      const note = "This is < than that";
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "REJECTED",
        note,
        "Jane Smith",
        "https://example.com/dashboard"
      );

      expect(email.html).toContain("&lt;");
      expect(email.html).not.toContain("is < than");
    });

    test("escapes > character in review note", () => {
      const note = "This is > than that";
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "REJECTED",
        note,
        "Jane Smith",
        "https://example.com/dashboard"
      );

      expect(email.html).toContain("&gt;");
      expect(email.html).not.toContain("is > than");
    });

    test("escapes & character in review note", () => {
      const note = "This & that";
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "REJECTED",
        note,
        "Jane Smith",
        "https://example.com/dashboard"
      );

      expect(email.html).toContain("&amp;");
      expect(email.html).not.toContain("This & that");
    });

    test("escapes double quotes in review note", () => {
      const note = 'He said "hello"';
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "REJECTED",
        note,
        "Jane Smith",
        "https://example.com/dashboard"
      );

      expect(email.html).toContain("&quot;");
    });

    test("escapes single quotes in review note", () => {
      const note = "It's a test";
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "REJECTED",
        note,
        "Jane Smith",
        "https://example.com/dashboard"
      );

      expect(email.html).toContain("&#039;");
    });

    test("escapes multiple special characters together", () => {
      const note = '<script>alert("xss & evil")</script>';
      const email = createSuggestionUpdatedEmail(
        "John Doe",
        "REJECTED",
        note,
        "Jane Smith",
        "https://example.com/dashboard"
      );

      expect(email.html).toContain("&lt;");
      expect(email.html).toContain("&gt;");
      expect(email.html).toContain("&quot;");
      expect(email.html).toContain("&amp;");
      expect(email.html).not.toContain("<script>");
    });
  });

  describe("createEmailVerificationTemplate", () => {
    test("returns correct subject", () => {
      const template = createEmailVerificationTemplate(
        "John",
        "https://vamsa.app/verify?token=abc"
      );
      expect(template.subject).toBe("Verify your email address - Vamsa");
    });

    test("includes user name in html", () => {
      const template = createEmailVerificationTemplate(
        "John Doe",
        "https://example.com/verify"
      );
      expect(template.html).toContain("John Doe");
    });

    test("includes verification URL in html", () => {
      const url = "https://vamsa.app/api/auth/verify-email?token=abc123";
      const template = createEmailVerificationTemplate("Jane", url);
      expect(template.html).toContain(url);
    });

    test("includes verification URL in text", () => {
      const url = "https://vamsa.app/api/auth/verify-email?token=abc123";
      const template = createEmailVerificationTemplate("Jane", url);
      expect(template.text).toContain(url);
    });

    test("includes user name in text", () => {
      const template = createEmailVerificationTemplate(
        "John",
        "https://example.com/verify"
      );
      expect(template.text).toContain("John");
    });

    test("returns object with subject, html, and text properties", () => {
      const template = createEmailVerificationTemplate(
        "Alice",
        "https://example.com/verify"
      );
      expect(template).toBeDefined();
      expect(template.subject).toBeDefined();
      expect(template.html).toBeDefined();
      expect(template.text).toBeDefined();
    });

    test("html is valid HTML structure", () => {
      const template = createEmailVerificationTemplate(
        "John",
        "https://example.com/verify"
      );
      expect(template.html).toContain("<!DOCTYPE html>");
      expect(template.html).toContain("<html>");
      expect(template.html).toContain("</html>");
      expect(template.html).toContain("<head>");
      expect(template.html).toContain("</head>");
      expect(template.html).toContain("<body>");
      expect(template.html).toContain("</body>");
    });

    test("html includes styling", () => {
      const template = createEmailVerificationTemplate(
        "John",
        "https://example.com/verify"
      );
      expect(template.html).toContain("<style>");
      expect(template.html).toContain("font-family:");
    });

    test("includes Vamsa branding", () => {
      const template = createEmailVerificationTemplate(
        "John",
        "https://example.com/verify"
      );
      expect(template.html).toContain("Vamsa");
      expect(template.text).toContain("Vamsa");
    });

    test("includes footer disclaimer", () => {
      const template = createEmailVerificationTemplate(
        "John",
        "https://example.com/verify"
      );
      expect(template.html).toContain("automated message");
      expect(template.html).toContain("do not reply");
    });

    test("handles special characters in names", () => {
      const template = createEmailVerificationTemplate(
        "José García",
        "https://example.com/verify"
      );
      expect(template.html).toContain("José García");
      expect(template.text).toContain("José García");
    });

    test("text version removes HTML tags for readability", () => {
      const template = createEmailVerificationTemplate(
        "John",
        "https://example.com/verify"
      );
      expect(template.text).not.toContain("<");
      expect(template.text).not.toContain(">");
      expect(template.text).not.toContain("html");
      expect(template.text).not.toContain("body");
    });

    test("includes button link in html", () => {
      const url = "https://vamsa.app/api/auth/verify-email?token=abc123";
      const template = createEmailVerificationTemplate("John", url);
      expect(template.html).toContain('class="button"');
      expect(template.html).toContain(`href="${url}"`);
    });

    test("handles long verification URLs", () => {
      const longUrl =
        "https://vamsa.app/api/auth/verify-email?token=" + "a".repeat(200);
      const template = createEmailVerificationTemplate("John", longUrl);
      expect(template.html).toContain(longUrl);
      expect(template.text).toContain(longUrl);
    });
  });

  describe("createPasswordResetEmail", () => {
    test("returns object with subject, html, and text properties", () => {
      const email = createPasswordResetEmail(
        "https://vamsa.app/reset-password?token=abc123"
      );

      expect(email).toBeDefined();
      expect(email.subject).toBeDefined();
      expect(email.html).toBeDefined();
      expect(email.text).toBeDefined();
    });

    test("generates correct subject", () => {
      const email = createPasswordResetEmail(
        "https://vamsa.app/reset-password?token=abc123"
      );

      expect(email.subject).toBe("Reset your Vamsa password");
    });

    test("includes reset URL in html", () => {
      const url = "https://vamsa.app/reset-password?token=abc123";
      const email = createPasswordResetEmail(url);

      expect(email.html).toContain(url);
    });

    test("includes reset URL in text", () => {
      const url = "https://vamsa.app/reset-password?token=abc123";
      const email = createPasswordResetEmail(url);

      expect(email.text).toContain(url);
    });

    test("includes header text", () => {
      const email = createPasswordResetEmail(
        "https://vamsa.app/reset-password?token=abc123"
      );

      expect(email.html).toContain("Reset Your Password");
    });

    test("includes expiry warning", () => {
      const email = createPasswordResetEmail(
        "https://vamsa.app/reset-password?token=abc123"
      );

      expect(email.html).toContain("expires in 1 hour");
      expect(email.text).toContain("expires in 1 hour");
    });

    test("includes security note about ignoring email", () => {
      const email = createPasswordResetEmail(
        "https://vamsa.app/reset-password?token=abc123"
      );

      expect(email.html).toContain("did not request this");
      expect(email.text).toContain("did not request this");
    });

    test("includes button with reset URL", () => {
      const url = "https://vamsa.app/reset-password?token=abc123";
      const email = createPasswordResetEmail(url);

      expect(email.html).toContain('class="button"');
      expect(email.html).toContain(`href="${url}"`);
    });

    test("includes password protection advice", () => {
      const email = createPasswordResetEmail(
        "https://vamsa.app/reset-password?token=abc123"
      );

      expect(email.html).toContain("Never share your password");
      expect(email.html).toContain("unique password");
      expect(email.text).toContain("Never share your password");
      expect(email.text).toContain("unique password");
    });

    test("html is valid HTML structure", () => {
      const email = createPasswordResetEmail(
        "https://vamsa.app/reset-password?token=abc123"
      );

      expect(email.html).toContain("<!DOCTYPE html>");
      expect(email.html).toContain("<html>");
      expect(email.html).toContain("</html>");
      expect(email.html).toContain("<head>");
      expect(email.html).toContain("</head>");
      expect(email.html).toContain("<body>");
      expect(email.html).toContain("</body>");
    });

    test("html includes styling", () => {
      const email = createPasswordResetEmail(
        "https://vamsa.app/reset-password?token=abc123"
      );

      expect(email.html).toContain("<style>");
      expect(email.html).toContain("font-family:");
    });

    test("includes Vamsa branding", () => {
      const email = createPasswordResetEmail(
        "https://vamsa.app/reset-password?token=abc123"
      );

      expect(email.html).toContain("Vamsa");
      expect(email.text).toContain("Vamsa");
    });

    test("includes footer disclaimer", () => {
      const email = createPasswordResetEmail(
        "https://vamsa.app/reset-password?token=abc123"
      );

      expect(email.html).toContain("security notification");
      expect(email.html).toContain("do not reply");
    });

    test("handles long reset URLs", () => {
      const longUrl =
        "https://vamsa.app/reset-password?token=" + "a".repeat(200);
      const email = createPasswordResetEmail(longUrl);

      expect(email.html).toContain(longUrl);
      expect(email.text).toContain(longUrl);
    });

    test("includes warning box styling", () => {
      const email = createPasswordResetEmail(
        "https://vamsa.app/reset-password?token=abc123"
      );

      expect(email.html).toContain("warning-box");
    });

    test("text version removes HTML tags for readability", () => {
      const email = createPasswordResetEmail(
        "https://vamsa.app/reset-password?token=abc123"
      );

      expect(email.text).not.toContain("<");
      expect(email.text).not.toContain(">");
      expect(email.text).not.toContain("html");
      expect(email.text).not.toContain("body");
    });
  });

  describe("Common email features", () => {
    test("all emails include footer disclaimer", () => {
      const email1 = createSuggestionCreatedEmail(
        "John Doe",
        "Jane Smith",
        "CREATE",
        "https://example.com/admin"
      );
      expect(email1.html).toContain("automated notification");
      expect(email1.html).toContain("do not reply");

      const email2 = createNewMemberEmail(
        "Alice Johnson",
        "alice@example.com",
        "Smith",
        "https://example.com/tree"
      );
      expect(email2.html).toContain("automated notification");
      expect(email2.html).toContain("do not reply");
    });

    test("all emails include Vamsa branding", () => {
      const email1 = createSuggestionCreatedEmail(
        "John Doe",
        "Jane Smith",
        "CREATE",
        "https://example.com/admin"
      );
      expect(email1.html).toContain("Vamsa");

      const email2 = createSuggestionUpdatedEmail(
        "John Doe",
        "APPROVED",
        null,
        "Jane Smith",
        "https://example.com/dashboard"
      );
      expect(email2.html).toContain("Vamsa");

      const email3 = createNewMemberEmail(
        "Alice Johnson",
        "alice@example.com",
        "Smith",
        "https://example.com/tree"
      );
      expect(email3.html).toContain("Vamsa");

      const email4 = createBirthdayReminderEmail(
        "John",
        "Alice",
        new Date("1990-05-15"),
        "https://example.com/tree"
      );
      expect(email4.html).toContain("Vamsa");

      const email5 = createEmailVerificationTemplate(
        "John",
        "https://example.com/verify"
      );
      expect(email5.html).toContain("Vamsa");

      const email6 = createPasswordResetEmail(
        "https://vamsa.app/reset-password?token=abc123"
      );
      expect(email6.html).toContain("Vamsa");
    });

    test("text version removes HTML tags for readability", () => {
      const email = createNewMemberEmail(
        "Alice Johnson",
        "alice@example.com",
        "Smith",
        "https://example.com/tree"
      );

      expect(email.text).not.toContain("<");
      expect(email.text).not.toContain(">");
      expect(email.text).not.toContain("html");
      expect(email.text).not.toContain("body");
    });
  });
});
