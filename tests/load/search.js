/**
 * k6 Load Test: Search
 *
 * Tests search queries with varying complexity:
 * - Simple name searches (FTS)
 * - Multi-word searches
 * - Searches with filters (via API query param)
 *
 * Note: NLP relationship queries go through TanStack server functions,
 * not the REST API. This test covers the REST /persons?search= path.
 *
 * Usage:
 *   k6 run tests/load/search.js
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";
import {
  BASE_URL,
  TEST_EMAIL,
  TEST_PASSWORD,
  STANDARD_THRESHOLDS,
  STANDARD_STAGES,
  jsonHeaders,
  login,
} from "./config.js";

// Custom metrics
const searchDuration = new Trend("search_duration", true);

export const options = {
  stages: STANDARD_STAGES,
  thresholds: {
    ...STANDARD_THRESHOLDS,
    search_duration: ["p(95)<800"],
  },
};

// Sample search queries of varying complexity
const SEARCH_QUERIES = [
  // Simple single-word names
  "Hari",
  "Priya",
  "Ravi",
  "Kumar",
  "Sharma",
  // Multi-word names
  "Hari Kumar",
  "Ravi Sharma",
  // Partial matches
  "Har",
  "Pri",
  "Kum",
  // Unlikely matches (tests empty result perf)
  "Xyzzyqwrst",
  "Zzzznotfound",
];

export function setup() {
  const sessionCookie = login(http, TEST_EMAIL, TEST_PASSWORD);
  if (!sessionCookie) {
    throw new Error("Setup failed: could not authenticate");
  }
  return { sessionCookie };
}

export default function (data) {
  const { sessionCookie } = data;
  const headers = jsonHeaders(sessionCookie);

  // Pick a random search query
  const query =
    SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
  const encodedQuery = encodeURIComponent(query);

  const url = `${BASE_URL}/api/v1/persons?search=${encodedQuery}&limit=20`;
  const res = http.get(url, {
    headers,
    tags: { name: "GET /persons?search=" },
  });

  searchDuration.add(res.timings.duration);

  check(res, {
    "search status is 200": (r) => r.status === 200,
    "search returns items array": (r) => {
      try {
        return Array.isArray(JSON.parse(r.body).items);
      } catch {
        return false;
      }
    },
  });

  sleep(0.3);
}
