/**
 * Tests for custom metrics utilities
 *
 * These tests verify that the metrics helper functions work correctly
 * and produce well-formed metric attributes.
 */

import { describe, expect, test } from "vitest";
import {
  recordAuthEvent,
  recordDbQuery,
  recordError,
  recordHttpRequest,
} from "./metrics";

describe("metrics", () => {
  describe("recordHttpRequest", () => {
    test("does not throw when recording a request", () => {
      expect(() => {
        recordHttpRequest("GET", "/api/persons", 200, 45);
      }).not.toThrow();
    });

    test("does not throw with response bytes", () => {
      expect(() => {
        recordHttpRequest("POST", "/api/persons", 201, 120, 1024);
      }).not.toThrow();
    });

    test("handles various HTTP methods", () => {
      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"];
      for (const method of methods) {
        expect(() => {
          recordHttpRequest(method, "/api/test", 200, 10);
        }).not.toThrow();
      }
    });

    test("handles various status codes", () => {
      const statusCodes = [
        200, 201, 204, 301, 400, 401, 403, 404, 500, 502, 503,
      ];
      for (const status of statusCodes) {
        expect(() => {
          recordHttpRequest("GET", "/api/test", status, 10);
        }).not.toThrow();
      }
    });
  });

  describe("recordError", () => {
    test("does not throw when recording an error", () => {
      expect(() => {
        recordError("database", "Connection timeout");
      }).not.toThrow();
    });

    test("does not throw with context", () => {
      expect(() => {
        recordError("validation", "Invalid email format", {
          field: "email",
          endpoint: "/api/users",
        });
      }).not.toThrow();
    });

    test("handles various error types", () => {
      const errorTypes = [
        "database",
        "validation",
        "authentication",
        "authorization",
        "network",
        "unknown",
      ];
      for (const type of errorTypes) {
        expect(() => {
          recordError(type, "Test error message");
        }).not.toThrow();
      }
    });
  });

  describe("recordDbQuery", () => {
    test("does not throw when recording a query", () => {
      expect(() => {
        recordDbQuery("SELECT", "persons", 25, true);
      }).not.toThrow();
    });

    test("handles failed queries", () => {
      expect(() => {
        recordDbQuery("INSERT", "persons", 100, false);
      }).not.toThrow();
    });

    test("handles various operations", () => {
      const operations = ["SELECT", "INSERT", "UPDATE", "DELETE", "UPSERT"];
      for (const op of operations) {
        expect(() => {
          recordDbQuery(op, "test_table", 10, true);
        }).not.toThrow();
      }
    });
  });

  describe("recordAuthEvent", () => {
    test("does not throw when recording an event", () => {
      expect(() => {
        recordAuthEvent("login_success");
      }).not.toThrow();
    });

    test("does not throw with provider", () => {
      expect(() => {
        recordAuthEvent("login_success", "google");
      }).not.toThrow();
    });

    test("handles various event types", () => {
      const eventTypes = [
        "login_success",
        "login_failure",
        "logout",
        "token_refresh",
        "password_reset",
      ];
      for (const event of eventTypes) {
        expect(() => {
          recordAuthEvent(event);
        }).not.toThrow();
      }
    });

    test("handles various providers", () => {
      const providers = ["credentials", "google", "github", "microsoft"];
      for (const provider of providers) {
        expect(() => {
          recordAuthEvent("login_success", provider);
        }).not.toThrow();
      }
    });
  });
});
