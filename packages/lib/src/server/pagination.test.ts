import { describe, expect, it } from "bun:test";
import { decodeCursor, encodeCursor, paginateQuery } from "./pagination";

describe("Pagination utilities", () => {
  describe("encodeCursor", () => {
    it("should encode an ID to base64", () => {
      const cursor = encodeCursor("person_123");
      expect(cursor).toBe("eyJpZCI6InBlcnNvbl8xMjMifQ==");
    });

    it("should throw on empty ID", () => {
      expect(() => encodeCursor("")).toThrow("Cannot encode empty ID");
    });

    it("should handle special characters", () => {
      const cursor = encodeCursor("person_!@#$%^&*()");
      const decoded = decodeCursor(cursor);
      expect(decoded).toBe("person_!@#$%^&*()");
    });
  });

  describe("decodeCursor", () => {
    it("should decode a base64 cursor back to ID", () => {
      const id = decodeCursor("eyJpZCI6InBlcnNvbl8xMjMifQ==");
      expect(id).toBe("person_123");
    });

    it("should throw on empty cursor", () => {
      expect(() => decodeCursor("")).toThrow("Cannot decode empty cursor");
    });

    it("should throw on invalid base64", () => {
      expect(() => decodeCursor("!!!invalid!!!")).toThrow(
        "Invalid cursor format"
      );
    });

    it("should throw on invalid payload", () => {
      const invalidPayload = Buffer.from(
        JSON.stringify({ foo: "bar" })
      ).toString("base64");
      expect(() => decodeCursor(invalidPayload)).toThrow(
        "Invalid cursor payload"
      );
    });
  });

  describe("paginateQuery", () => {
    const items = [
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
      { id: "3", name: "Charlie" },
      { id: "4", name: "David" },
      { id: "5", name: "Eve" },
    ];

    it("should return first page without cursor", () => {
      const result = paginateQuery(items, 2);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe("1");
      expect(result.items[1].id).toBe("2");
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).not.toBeNull();
    });

    it("should return next page with cursor", () => {
      const result1 = paginateQuery(items, 2);
      expect(result1.nextCursor).not.toBeNull();

      const result2 = paginateQuery(items, 2, result1.nextCursor!);
      expect(result2.items).toHaveLength(2);
      expect(result2.items[0].id).toBe("3");
      expect(result2.items[1].id).toBe("4");
      expect(result2.hasMore).toBe(true);
    });

    it("should return last page correctly", () => {
      const result1 = paginateQuery(items, 2);
      const result2 = paginateQuery(items, 2, result1.nextCursor!);
      const result3 = paginateQuery(items, 2, result2.nextCursor!);

      expect(result3.items).toHaveLength(1);
      expect(result3.items[0].id).toBe("5");
      expect(result3.hasMore).toBe(false);
      expect(result3.nextCursor).toBeNull();
    });

    it("should handle custom ID extractor", () => {
      const customItems = [
        { personId: "p1", name: "Alice" },
        { personId: "p2", name: "Bob" },
      ];

      const result = paginateQuery(
        customItems,
        1,
        undefined,
        (item) => item.personId
      );

      expect(result.items[0].personId).toBe("p1");
      expect(result.nextCursor).not.toBeNull();
    });

    it("should throw on invalid limit", () => {
      expect(() => paginateQuery(items, 0)).toThrow(
        "Limit must be greater than 0"
      );
    });

    it("should throw on non-array items", () => {
      expect(() => paginateQuery("not an array" as any, 10)).toThrow(
        "Items must be an array"
      );
    });

    it("should handle invalid cursor gracefully", () => {
      const result = paginateQuery(items, 2, "invalid_cursor");
      // Should return first page when cursor is invalid
      expect(result.items[0].id).toBe("1");
    });

    it("should return empty result for cursor beyond end", () => {
      const lastItemCursor = encodeCursor("5");
      const result = paginateQuery(items, 2, lastItemCursor);
      expect(result.items).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it("should handle limit larger than items", () => {
      const result = paginateQuery(items, 100);
      expect(result.items).toHaveLength(5);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it("should encode/decode cursor roundtrip", () => {
      const cursor1 = encodeCursor("person_100");
      const id = decodeCursor(cursor1);
      const cursor2 = encodeCursor(id);
      expect(cursor1).toBe(cursor2);
    });
  });
});
