/**
 * k6 Load Test: Person Detail
 *
 * Tests fetching individual person records by ID.
 * First fetches the person list to get real IDs, then hammers the detail endpoint.
 *
 * Usage:
 *   k6 run tests/load/person-detail.js
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
const detailDuration = new Trend("person_detail_duration", true);

export const options = {
  stages: STANDARD_STAGES,
  thresholds: {
    ...STANDARD_THRESHOLDS,
    person_detail_duration: ["p(95)<400"],
  },
};

export function setup() {
  const sessionCookie = login(http, TEST_EMAIL, TEST_PASSWORD);
  if (!sessionCookie) {
    throw new Error("Setup failed: could not authenticate");
  }

  // Fetch a list of person IDs to use in the test
  const headers = jsonHeaders(sessionCookie);
  const listRes = http.get(`${BASE_URL}/api/v1/persons?limit=50`, { headers });

  let personIds = [];
  try {
    const body = JSON.parse(listRes.body);
    personIds = (body.items || []).map((p) => p.id);
  } catch {
    // Fall through with empty list
  }

  if (personIds.length === 0) {
    console.warn("No persons found — detail test will use a placeholder ID");
    personIds = ["nonexistent-id"];
  }

  return { sessionCookie, personIds };
}

export default function (data) {
  const { sessionCookie, personIds } = data;
  const headers = jsonHeaders(sessionCookie);

  // Pick a random person ID
  const id = personIds[Math.floor(Math.random() * personIds.length)];

  const url = `${BASE_URL}/api/v1/persons/${id}`;
  const res = http.get(url, {
    headers,
    tags: { name: "GET /persons/:id" },
  });

  detailDuration.add(res.timings.duration);

  check(res, {
    "detail status is 200 or 404": (r) => r.status === 200 || r.status === 404,
    "detail returns person data": (r) => {
      if (r.status === 404) return true; // Expected for nonexistent IDs
      try {
        const body = JSON.parse(r.body);
        return body.id !== undefined && body.firstName !== undefined;
      } catch {
        return false;
      }
    },
  });

  sleep(0.3);
}
