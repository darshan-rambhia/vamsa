import type { ApiClient } from "./client";

export interface CursorPage<T> {
  items: Array<T>;
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

/**
 * Fetch page N (1-based) of a cursor-paginated list by following cursors.
 * The REST API only exposes cursors; this keeps `--page` simple for users.
 */
export async function fetchPage<T>(
  api: ApiClient,
  path: string,
  query: Record<string, string | number | boolean | undefined>,
  limit: number,
  page: number
): Promise<CursorPage<T>> {
  let cursor: string | undefined;
  for (let p = 1; ; p++) {
    const { data } = await api.request<CursorPage<T>>("GET", path, {
      query: { ...query, limit, cursor },
    });
    if (p === page || !data.hasMore || !data.nextCursor) {
      // Past the last page: report an empty page, keep the total
      return p === page ? data : { ...data, items: [], hasMore: false };
    }
    cursor = data.nextCursor;
  }
}
