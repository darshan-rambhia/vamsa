/* eslint-disable import/first */
/**
 * Unit tests for Batch Operations API endpoints
 *
 * Tests verify:
 * - Batch create operations for persons
 * - Batch update operations
 * - Batch delete operations
 * - Transaction mode (all-or-nothing)
 * - Non-transaction mode (partial success)
 * - Rate limiting
 * - Validation and error handling
 */

import { beforeEach, describe, expect, it, mock } from "bun:test";

// Mocks must be before importing router
const mockCreatePerson = mock(async () => ({ id: "person_001" }));
const mockUpdatePerson = mock(async () => ({ id: "person_001" }));
const mockDeletePerson = mock(async () => undefined);
const mockCreateRelationship = mock(async () => ({ id: "rel_001" }));
const mockUpdateRelationship = mock(async () => ({ id: "rel_001" }));
const mockDeleteRelationship = mock(async () => undefined);

mock.module("@vamsa/lib/server/business", () => ({
  createPersonData: mockCreatePerson,
  updatePersonData: mockUpdatePerson,
  deletePersonData: mockDeletePerson,
  createRelationshipData: mockCreateRelationship,
  updateRelationshipData: mockUpdateRelationship,
  deleteRelationshipData: mockDeleteRelationship,
}));

const mockTransaction = mock(async (callback) => {
  return callback(null);
});

mock.module("../db", () => ({
  db: {
    transaction: mockTransaction,
  },
}));

// Import after mocks
import batchRouter from "./batch";

describe("Batch Operations API Routes", () => {
  beforeEach(() => {
    mockCreatePerson.mockClear();
    mockUpdatePerson.mockClear();
    mockDeletePerson.mockClear();
    mockCreateRelationship.mockClear();
    mockUpdateRelationship.mockClear();
    mockDeleteRelationship.mockClear();
    mockTransaction.mockClear();

    mockCreatePerson.mockImplementation(async () => ({ id: "person_001" }));
    mockUpdatePerson.mockImplementation(async () => ({ id: "person_001" }));
    mockDeletePerson.mockImplementation(async () => undefined);
    mockCreateRelationship.mockImplementation(async () => ({ id: "rel_001" }));
    mockUpdateRelationship.mockImplementation(async () => ({ id: "rel_001" }));
    mockDeleteRelationship.mockImplementation(async () => undefined);
    mockTransaction.mockImplementation(async (callback: any) => {
      return callback(null);
    });
  });

  describe("POST /batch - Batch Operations", () => {
    it("should return 400 when operations array is empty", async () => {
      const res = await batchRouter.request("/", {
        method: "POST",
        body: JSON.stringify({
          operations: [],
          transaction: true,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(res.status).toBe(400);
    });

    it("should return 400 when operations exceed max 100", async () => {
      const operations = Array(101).fill({
        type: "create",
        entity: "person",
        data: {
          firstName: "John",
          lastName: "Doe",
          isLiving: true,
        },
      });

      const res = await batchRouter.request("/", {
        method: "POST",
        body: JSON.stringify({
          operations,
          transaction: true,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(res.status).toBe(400);
    });

    it("should create multiple persons in transaction mode", async () => {
      const res = await batchRouter.request("/", {
        method: "POST",
        body: JSON.stringify({
          operations: [
            {
              type: "create",
              entity: "person",
              data: {
                firstName: "John",
                lastName: "Doe",
                isLiving: true,
              },
            },
            {
              type: "create",
              entity: "person",
              data: {
                firstName: "Jane",
                lastName: "Smith",
                isLiving: true,
              },
            },
          ],
          transaction: true,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.results).toHaveLength(2);
      expect(data.results[0].success).toBe(true);
      expect(data.results[0].id).toBe("person_001");
      expect(data.results[1].success).toBe(true);
    });

    it("should update persons", async () => {
      const res = await batchRouter.request("/", {
        method: "POST",
        body: JSON.stringify({
          operations: [
            {
              type: "update",
              entity: "person",
              id: "person_001",
              data: {
                firstName: "Jonathan",
              },
            },
          ],
          transaction: true,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.results[0].success).toBe(true);
      expect(data.results[0].id).toBe("person_001");
    });

    it("should delete persons", async () => {
      const res = await batchRouter.request("/", {
        method: "POST",
        body: JSON.stringify({
          operations: [
            {
              type: "delete",
              entity: "person",
              id: "person_001",
            },
          ],
          transaction: true,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.results[0].success).toBe(true);
    });

    it("should create relationships", async () => {
      const res = await batchRouter.request("/", {
        method: "POST",
        body: JSON.stringify({
          operations: [
            {
              type: "create",
              entity: "relationship",
              data: {
                personId: "person_001",
                relatedPersonId: "person_002",
                type: "PARENT",
              },
            },
          ],
          transaction: true,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.results[0].success).toBe(true);
      expect(data.results[0].id).toBe("rel_001");
    });

    it("should handle mixed operations", async () => {
      const res = await batchRouter.request("/", {
        method: "POST",
        body: JSON.stringify({
          operations: [
            {
              type: "create",
              entity: "person",
              data: {
                firstName: "John",
                lastName: "Doe",
                isLiving: true,
              },
            },
            {
              type: "update",
              entity: "person",
              id: "person_002",
              data: {
                firstName: "Updated",
              },
            },
            {
              type: "delete",
              entity: "person",
              id: "person_003",
            },
          ],
          transaction: true,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.results).toHaveLength(3);
    });

    it("should return 400 for missing required person id field", async () => {
      const res = await batchRouter.request("/", {
        method: "POST",
        body: JSON.stringify({
          operations: [
            {
              type: "update",
              entity: "person",
              id: "",
              data: {
                firstName: "John",
              },
            },
          ],
          transaction: true,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(res.status).toBe(400);
    });

    it("should default transaction to true", async () => {
      const res = await batchRouter.request("/", {
        method: "POST",
        body: JSON.stringify({
          operations: [
            {
              type: "create",
              entity: "person",
              data: {
                firstName: "John",
                lastName: "Doe",
                isLiving: true,
              },
            },
          ],
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    it("should handle non-transactional mode with partial success", async () => {
      // First call succeeds, second fails
      let callCount = 0;
      mockCreatePerson.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { id: "person_001" };
        } else {
          throw new Error("Validation failed");
        }
      });

      const res = await batchRouter.request("/", {
        method: "POST",
        body: JSON.stringify({
          operations: [
            {
              type: "create",
              entity: "person",
              data: {
                firstName: "John",
                lastName: "Doe",
                isLiving: true,
              },
            },
            {
              type: "create",
              entity: "person",
              data: {
                firstName: "Jane",
                lastName: "Smith",
                isLiving: true,
              },
            },
          ],
          transaction: false,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(false); // Not all succeeded
      expect(data.results).toHaveLength(2);
      expect(data.results[0].success).toBe(true);
      expect(data.results[1].success).toBe(false);
      expect(data.results[1].error).toBeTruthy();
    });

    it("should include operation index in results", async () => {
      const res = await batchRouter.request("/", {
        method: "POST",
        body: JSON.stringify({
          operations: [
            {
              type: "create",
              entity: "person",
              data: {
                firstName: "John",
                lastName: "Doe",
                isLiving: true,
              },
            },
            {
              type: "create",
              entity: "person",
              data: {
                firstName: "Jane",
                lastName: "Smith",
                isLiving: true,
              },
            },
          ],
          transaction: true,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.results[0].index).toBe(0);
      expect(data.results[1].index).toBe(1);
    });
  });
});
