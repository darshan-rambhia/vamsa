/**
 * k6 Load Test: Mixed Realistic Scenario
 *
 * Simulates real user behavior with weighted scenarios:
 *   50% — Browse people list (most common action)
 *   25% — Search for people
 *   20% — View person detail
 *    5% — Login/logout cycle
 *
 * Usage:
 *   k6 run tests/load/mixed.js
 *   k6 run tests/load/mixed.js --env BASE_URL=http://localhost:3000
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";
import {
  BASE_URL,
  TEST_EMAIL,
  TEST_PASSWORD,
  STANDARD_THRESHOLDS,
  jsonHeaders,
  login,
} from "./config.js";

// Custom metrics per scenario
const browseDuration = new Trend("browse_duration", true);
const searchDuration = new Trend("search_duration", true);
const detailDuration = new Trend("detail_duration", true);
const authDuration = new Trend("auth_cycle_duration", true);

export const options = {
  scenarios: {
    mixed: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "15s", target: 10 },
        { duration: "30s", target: 20 },
        { duration: "15s", target: 30 },
        { duration: "30s", target: 30 },
        { duration: "15s", target: 0 },
      ],
    },
  },
  thresholds: {
    ...STANDARD_THRESHOLDS,
    browse_duration: ["p(95)<600"],
    search_duration: ["p(95)<800"],
    detail_duration: ["p(95)<400"],
    auth_cycle_duration: ["p(95)<1500"],
  },
};

const SEARCH_QUERIES = [
  "Hari",
  "Priya",
  "Kumar",
  "Sharma",
  "Hari Kumar",
  "Har",
  "Xyzzy",
];

export function setup() {
  const sessionCookie = login(http, TEST_EMAIL, TEST_PASSWORD);
  if (!sessionCookie) {
    throw new Error("Setup failed: could not authenticate");
  }

  // Fetch person IDs for detail requests
  const headers = jsonHeaders(sessionCookie);
  const listRes = http.get(`${BASE_URL}/api/v1/persons?limit=50`, { headers });

  let personIds = [];
  try {
    personIds = (JSON.parse(listRes.body).items || []).map((p) => p.id);
  } catch {
    // empty
  }

  if (personIds.length === 0) {
    personIds = ["placeholder-id"];
  }

  return { sessionCookie, personIds };
}

export default function (data) {
  const { sessionCookie, personIds } = data;
  const headers = jsonHeaders(sessionCookie);

  // Weighted random scenario selection
  const roll = Math.random();

  if (roll < 0.5) {
    // 50% — Browse people list
    scenarioBrowse(headers);
  } else if (roll < 0.75) {
    // 25% — Search
    scenarioSearch(headers);
  } else if (roll < 0.95) {
    // 20% — Person detail
    scenarioDetail(headers, personIds);
  } else {
    // 5% — Full auth cycle
    scenarioAuth();
  }
}

function scenarioBrowse(headers) {
  const limits = [10, 20, 50];
  const limit = limits[Math.floor(Math.random() * limits.length)];

  const res = http.get(
    `${BASE_URL}/api/v1/persons?limit=${limit}&sortBy=lastName`,
    {
      headers,
      tags: { name: "GET /persons (browse)" },
    }
  );

  browseDuration.add(res.timings.duration);

  check(res, {
    "browse: status 200": (r) => r.status === 200,
    "browse: has items": (r) => {
      try {
        return Array.isArray(JSON.parse(r.body).items);
      } catch {
        return false;
      }
    },
  });

  sleep(0.5 + Math.random() * 1.5); // Simulate reading time
}

function scenarioSearch(headers) {
  const query =
    SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
  const url = `${BASE_URL}/api/v1/persons?search=${encodeURIComponent(query)}&limit=20`;

  const res = http.get(url, {
    headers,
    tags: { name: "GET /persons?search= (mixed)" },
  });

  searchDuration.add(res.timings.duration);

  check(res, {
    "search: status 200": (r) => r.status === 200,
  });

  sleep(0.3 + Math.random());
}

function scenarioDetail(headers, personIds) {
  const id = personIds[Math.floor(Math.random() * personIds.length)];
  const res = http.get(`${BASE_URL}/api/v1/persons/${id}`, {
    headers,
    tags: { name: "GET /persons/:id (mixed)" },
  });

  detailDuration.add(res.timings.duration);

  check(res, {
    "detail: status 200 or 404": (r) => r.status === 200 || r.status === 404,
  });

  sleep(0.3 + Math.random() * 0.5);
}

function scenarioAuth() {
  const start = Date.now();

  // Login
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    { headers: jsonHeaders(), tags: { name: "POST /auth/login (mixed)" } }
  );

  check(loginRes, {
    "auth: login 200": (r) => r.status === 200,
  });

  sleep(0.3);

  // Extract cookie and logout
  const setCookie = loginRes.headers["Set-Cookie"] || "";
  const match = setCookie.match(/better-auth\.session_token=[^;]+/);
  const cookie = match ? match[0] : null;

  if (cookie) {
    const logoutRes = http.post(`${BASE_URL}/api/v1/auth/logout`, null, {
      headers: jsonHeaders(cookie),
      tags: { name: "POST /auth/logout (mixed)" },
    });

    check(logoutRes, {
      "auth: logout 200": (r) => r.status === 200,
    });
  }

  authDuration.add(Date.now() - start);
  sleep(0.5);
}
