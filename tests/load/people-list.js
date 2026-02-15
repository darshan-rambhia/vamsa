/**
 * k6 Load Test: People List (Paginated)
 *
 * Tests the paginated people list endpoint with varying page sizes.
 * Requires authentication — logs in during setup.
 *
 * Usage:
 *   k6 run tests/load/people-list.js
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
const listDuration = new Trend("people_list_duration", true);

export const options = {
  stages: STANDARD_STAGES,
  thresholds: {
    ...STANDARD_THRESHOLDS,
    people_list_duration: ["p(95)<600"],
  },
};

// Per-VU setup: authenticate once
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

  // Randomly vary page size to simulate real usage
  const limits = [10, 20, 50];
  const limit = limits[Math.floor(Math.random() * limits.length)];

  // Randomly vary sort field
  const sortFields = ["lastName", "firstName", "dateOfBirth", "createdAt"];
  const sortBy = sortFields[Math.floor(Math.random() * sortFields.length)];

  const url = `${BASE_URL}/api/v1/persons?limit=${limit}&sortBy=${sortBy}&sortOrder=asc`;
  const res = http.get(url, {
    headers,
    tags: { name: "GET /persons (list)" },
  });

  listDuration.add(res.timings.duration);

  check(res, {
    "list status is 200": (r) => r.status === 200,
    "list returns items": (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.items);
      } catch {
        return false;
      }
    },
  });

  // If we got a cursor, fetch the next page too
  try {
    const body = JSON.parse(res.body);
    if (body.nextCursor) {
      sleep(0.2);

      const nextUrl = `${BASE_URL}/api/v1/persons?limit=${limit}&sortBy=${sortBy}&sortOrder=asc&cursor=${body.nextCursor}`;
      const nextRes = http.get(nextUrl, {
        headers,
        tags: { name: "GET /persons (page 2)" },
      });

      listDuration.add(nextRes.timings.duration);

      check(nextRes, {
        "page 2 status is 200": (r) => r.status === 200,
      });
    }
  } catch {
    // Ignore parse errors
  }

  sleep(0.5);
}
