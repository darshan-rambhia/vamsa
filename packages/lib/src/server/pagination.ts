/**
 * Pagination utilities for cursor-based pagination
 *
 * Uses ID-based cursors encoded in base64 for stable, sortable pagination
 * that works well with database queries.
 */

/**
 * Encodes an ID into a base64 cursor string
 * @param id - The item ID to encode
 * @returns Base64-encoded cursor string
 * @example
 * const cursor = encodeCursor("person_123");
 * // Result: "cGVyc29uXzEyMw=="
 */
export function encodeCursor(id: string): string {
  if (!id) {
    throw new Error("Cannot encode empty ID");
  }
  const payload = JSON.stringify({ id });
  return Buffer.from(payload).toString("base64");
}

/**
 * Decodes a base64 cursor string to extract the ID
 * @param cursor - The base64-encoded cursor string
 * @returns The decoded ID
 * @throws Error if cursor is invalid or malformed
 * @example
 * const id = decodeCursor("cGVyc29uXzEyMw==");
 * // Result: "person_123"
 */
export function decodeCursor(cursor: string): string {
  if (!cursor) {
    throw new Error("Cannot decode empty cursor");
  }

  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const payload = JSON.parse(decoded);

    if (!payload.id || typeof payload.id !== "string") {
      throw new Error("Invalid cursor payload");
    }

    return payload.id;
  } catch (error) {
    // Re-throw specific payload validation errors
    if (error instanceof Error && error.message === "Invalid cursor payload") {
      throw error;
    }
    // Convert other errors to format error
    throw new Error("Invalid cursor format");
  }
}

/**
 * Paginates an array of items using cursor-based pagination
 *
 * @template T
 * @param items - Array of items to paginate
 * @param limit - Number of items to return (must be positive)
 * @param cursor - Optional cursor from previous response (ID of last item)
 * @param getItemId - Function to extract ID from item (default: item.id)
 * @returns Paginated result with items, nextCursor, and hasMore flag
 * @example
 * const result = paginateQuery(persons, 20, "person_100", p => p.id);
 * // Result: { items: [...20 items...], nextCursor: "...", hasMore: true }
 */
export function paginateQuery<T>(
  items: Array<T>,
  limit: number,
  cursor?: string,
  getItemId?: (item: T) => string
): {
  items: Array<T>;
  nextCursor: string | null;
  hasMore: boolean;
} {
  if (!Array.isArray(items)) {
    throw new Error("Items must be an array");
  }

  if (limit < 1) {
    throw new Error("Limit must be greater than 0");
  }

  // Default ID extractor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const extractId = getItemId || ((item: T) => (item as any).id);

  let startIndex = 0;

  // If cursor is provided, find the item with that ID and start after it
  if (cursor) {
    try {
      const cursorId = decodeCursor(cursor);
      startIndex = items.findIndex((item) => extractId(item) === cursorId) + 1;

      if (startIndex === 0) {
        // Cursor ID not found, start from beginning
        startIndex = 0;
      }
    } catch {
      // Invalid cursor, start from beginning
      startIndex = 0;
    }
  }

  // Get limit + 1 items to determine if there are more
  const paginatedItems = items.slice(startIndex, startIndex + limit + 1);

  const hasMore = paginatedItems.length > limit;
  const itemsToReturn = hasMore
    ? paginatedItems.slice(0, limit)
    : paginatedItems;

  // Generate next cursor from last item
  const nextCursor =
    hasMore && itemsToReturn.length > 0
      ? encodeCursor(extractId(itemsToReturn[itemsToReturn.length - 1]))
      : null;

  return {
    items: itemsToReturn,
    nextCursor,
    hasMore,
  };
}
