/**
 * k6 Load Test: Authentication Flow
 *
 * Tests login throughput and session creation under concurrency.
 *
 * Usage:
 *   k6 run tests/load/auth.js
 *   k6 run tests/load/auth.js --env BASE_URL=http://localhost:3000
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import {
  BASE_URL,
  TEST_EMAIL,
  TEST_PASSWORD,
  STANDARD_THRESHOLDS,
  STANDARD_STAGES,
  jsonHeaders,
} from "./config.js";

// Custom metrics
const loginSuccess = new Rate("login_success");
const loginDuration = new Trend("login_duration", true);
const logoutDuration = new Trend("logout_duration", true);

export const options = {
  stages: STANDARD_STAGES,
  thresholds: {
    ...STANDARD_THRESHOLDS,
    login_success: ["rate>0.95"],
    login_duration: ["p(95)<800"],
  },
};

export default function () {
  // --- Login ---
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    { headers: jsonHeaders(), tags: { name: "POST /auth/login" } }
  );

  loginDuration.add(loginRes.timings.duration);

  const loginOk = check(loginRes, {
    "login status is 200": (r) => r.status === 200,
    "login returns user": (r) => {
      try {
        return JSON.parse(r.body).user !== undefined;
      } catch {
        return false;
      }
    },
  });

  loginSuccess.add(loginOk ? 1 : 0);

  if (!loginOk) {
    sleep(1);
    return;
  }

  // Extract session cookie
  const setCookie = loginRes.headers["Set-Cookie"] || "";
  const match = setCookie.match(/better-auth\.session_token=[^;]+/);
  const sessionCookie = match ? match[0] : null;

  sleep(0.5);

  // --- Logout ---
  if (sessionCookie) {
    const logoutRes = http.post(`${BASE_URL}/api/v1/auth/logout`, null, {
      headers: jsonHeaders(sessionCookie),
      tags: { name: "POST /auth/logout" },
    });

    logoutDuration.add(logoutRes.timings.duration);

    check(logoutRes, {
      "logout status is 200": (r) => r.status === 200,
    });
  }

  sleep(0.5);
}
