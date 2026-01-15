/**
 * Tests for application-specific metrics utilities
 *
 * These tests verify that the metrics helper functions work correctly
 * and produce well-formed metric attributes without throwing errors.
 */

import { describe, test, expect } from "bun:test";
import {
  recordChartMetrics,
  recordSearchMetrics,
  recordRelationshipCalc,
  recordGedcomImport,
  recordGedcomExport,
  recordGedcomValidation,
  recordMediaUpload,
  recordFeatureUsage,
} from "./application";

describe("application metrics", () => {
  describe("recordChartMetrics", () => {
    test("does not throw when recording chart metrics", () => {
      expect(() => {
        recordChartMetrics("ancestor", 25, 150);
      }).not.toThrow();
    });

    test("does not throw with optional userId", () => {
      expect(() => {
        recordChartMetrics("descendant", 50, 200, "user-123");
      }).not.toThrow();
    });

    test("handles all chart types", () => {
      const chartTypes = [
        "ancestor",
        "descendant",
        "hourglass",
        "fan",
        "timeline",
        "matrix",
        "bowtie",
        "compact",
        "statistics",
      ];
      for (const type of chartTypes) {
        expect(() => {
          recordChartMetrics(type, 10, 100);
        }).not.toThrow();
      }
    });

    test("handles zero nodes", () => {
      expect(() => {
        recordChartMetrics("ancestor", 0, 50);
      }).not.toThrow();
    });

    test("handles large node counts", () => {
      expect(() => {
        recordChartMetrics("descendant", 1000, 5000);
      }).not.toThrow();
    });
  });

  describe("recordSearchMetrics", () => {
    test("does not throw when recording search metrics", () => {
      expect(() => {
        recordSearchMetrics("john doe", 5, 45);
      }).not.toThrow();
    });

    test("does not throw with intent", () => {
      expect(() => {
        recordSearchMetrics("john", 3, 30, "person_name");
      }).not.toThrow();
    });

    test("handles zero results", () => {
      expect(() => {
        recordSearchMetrics("nonexistent person xyz", 0, 25);
      }).not.toThrow();
    });

    test("handles various query lengths", () => {
      const queries = [
        "j",
        "jo",
        "john",
        "john doe",
        "john doe smith",
        "a very long search query that should still work",
      ];
      for (const query of queries) {
        expect(() => {
          recordSearchMetrics(query, 1, 10);
        }).not.toThrow();
      }
    });

    test("handles various intents", () => {
      const intents = [
        "person_name",
        "person_list",
        "relationship",
        "location",
        "unknown",
      ];
      for (const intent of intents) {
        expect(() => {
          recordSearchMetrics("query", 1, 10, intent);
        }).not.toThrow();
      }
    });
  });

  describe("recordRelationshipCalc", () => {
    test("does not throw when recording path calculation", () => {
      expect(() => {
        recordRelationshipCalc("path", 100, 3, true);
      }).not.toThrow();
    });

    test("does not throw when recording common ancestor calculation", () => {
      expect(() => {
        recordRelationshipCalc("common_ancestor", 150, 2, true);
      }).not.toThrow();
    });

    test("does not throw when recording cousins calculation", () => {
      expect(() => {
        recordRelationshipCalc("cousins", 200, undefined, true);
      }).not.toThrow();
    });

    test("does not throw when recording tree layout calculation", () => {
      expect(() => {
        recordRelationshipCalc("tree_layout", 500, 50, true);
      }).not.toThrow();
    });

    test("handles not found results", () => {
      expect(() => {
        recordRelationshipCalc("path", 50, undefined, false);
      }).not.toThrow();
    });

    test("handles various path lengths", () => {
      for (let length = 0; length <= 10; length++) {
        expect(() => {
          recordRelationshipCalc("path", 10, length, true);
        }).not.toThrow();
      }
    });
  });

  describe("recordGedcomImport", () => {
    test("does not throw when recording successful import", () => {
      expect(() => {
        recordGedcomImport(100, 200, 5000, 0);
      }).not.toThrow();
    });

    test("does not throw with file size", () => {
      expect(() => {
        recordGedcomImport(50, 100, 3000, 0, 1024 * 1024);
      }).not.toThrow();
    });

    test("handles imports with errors", () => {
      expect(() => {
        recordGedcomImport(25, 50, 2000, 5);
      }).not.toThrow();
    });

    test("handles various person counts", () => {
      const counts = [0, 5, 25, 75, 150, 750, 2000];
      for (const count of counts) {
        expect(() => {
          recordGedcomImport(count, count * 2, 1000, 0);
        }).not.toThrow();
      }
    });
  });

  describe("recordGedcomExport", () => {
    test("does not throw when recording export", () => {
      expect(() => {
        recordGedcomExport(100, 200, 3000);
      }).not.toThrow();
    });

    test("handles various person counts", () => {
      const counts = [0, 10, 100, 500, 1500];
      for (const count of counts) {
        expect(() => {
          recordGedcomExport(count, count * 2, 1000);
        }).not.toThrow();
      }
    });
  });

  describe("recordGedcomValidation", () => {
    test("does not throw for valid file", () => {
      expect(() => {
        recordGedcomValidation(true, 0, 500);
      }).not.toThrow();
    });

    test("does not throw for invalid file", () => {
      expect(() => {
        recordGedcomValidation(false, 5, 1000);
      }).not.toThrow();
    });

    test("handles various error counts", () => {
      for (let errors = 0; errors <= 20; errors++) {
        expect(() => {
          recordGedcomValidation(errors === 0, errors, 100);
        }).not.toThrow();
      }
    });
  });

  describe("recordMediaUpload", () => {
    test("does not throw for successful upload", () => {
      expect(() => {
        recordMediaUpload(1024 * 1024, 500, 200, "image/jpeg", true);
      }).not.toThrow();
    });

    test("does not throw for failed upload", () => {
      expect(() => {
        recordMediaUpload(2 * 1024 * 1024, 1000, 0, "image/png", false);
      }).not.toThrow();
    });

    test("handles various file types", () => {
      const types = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "video/mp4",
        "application/pdf",
        "unknown/type",
      ];
      for (const type of types) {
        expect(() => {
          recordMediaUpload(1024 * 100, 200, 50, type, true);
        }).not.toThrow();
      }
    });

    test("handles various file sizes", () => {
      const sizes = [
        100, // tiny
        500 * 1024, // 500KB
        1 * 1024 * 1024, // 1MB
        5 * 1024 * 1024, // 5MB
        10 * 1024 * 1024, // 10MB
        50 * 1024 * 1024, // 50MB
      ];
      for (const size of sizes) {
        expect(() => {
          recordMediaUpload(size, 500, 100, "image/jpeg", true);
        }).not.toThrow();
      }
    });

    test("handles zero processing time", () => {
      expect(() => {
        recordMediaUpload(1024, 100, 0, "application/pdf", true);
      }).not.toThrow();
    });
  });

  describe("recordFeatureUsage", () => {
    test("does not throw when recording feature usage", () => {
      expect(() => {
        recordFeatureUsage("/api/persons");
      }).not.toThrow();
    });

    test("does not throw with userId", () => {
      expect(() => {
        recordFeatureUsage("/api/charts/ancestor", "user-123");
      }).not.toThrow();
    });

    test("normalizes paths with UUIDs", () => {
      expect(() => {
        recordFeatureUsage("/api/persons/550e8400-e29b-41d4-a716-446655440000");
      }).not.toThrow();
    });

    test("normalizes paths with numeric IDs", () => {
      expect(() => {
        recordFeatureUsage("/api/persons/12345/relationships");
      }).not.toThrow();
    });

    test("handles various endpoints", () => {
      const endpoints = [
        "/api/persons",
        "/api/relationships",
        "/api/charts/ancestor",
        "/api/gedcom/import",
        "/api/media/upload",
        "/api/search",
      ];
      for (const endpoint of endpoints) {
        expect(() => {
          recordFeatureUsage(endpoint);
        }).not.toThrow();
      }
    });
  });
});
