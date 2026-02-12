/**
 * Shared k6 configuration for Vamsa load tests
 *
 * Environment variables:
 *   BASE_URL       — Target server (default: http://localhost:3000)
 *   TEST_EMAIL     — Login email for authenticated tests
 *   TEST_PASSWORD  — Login password for authenticated tests
 */

// Base URL for the target server
export const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

// Test user credentials
export const TEST_EMAIL = __ENV.TEST_EMAIL || "admin@vamsa.app";
export const TEST_PASSWORD = __ENV.TEST_PASSWORD || "password";

// Standard thresholds applied to all tests
export const STANDARD_THRESHOLDS = {
  http_req_duration: ["p(95)<500", "p(99)<1000"],
  http_req_failed: ["rate<0.01"],
};

// Standard stages for ramping load
export const STANDARD_STAGES = [
  { duration: "10s", target: 5 }, // Ramp up to 5 VUs
  { duration: "30s", target: 10 }, // Hold at 10 VUs
  { duration: "10s", target: 20 }, // Spike to 20 VUs
  { duration: "20s", target: 20 }, // Hold at 20 VUs
  { duration: "10s", target: 0 }, // Ramp down
];

// Light stages for quick smoke tests
export const SMOKE_STAGES = [
  { duration: "5s", target: 1 },
  { duration: "10s", target: 1 },
  { duration: "5s", target: 0 },
];

/**
 * Standard headers for JSON API requests
 */
export function jsonHeaders(sessionCookie) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (sessionCookie) {
    headers["Cookie"] = sessionCookie;
  }
  return headers;
}

/**
 * Login and return the session cookie string
 */
export function login(http, email, password) {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: jsonHeaders(), tags: { name: "login" } }
  );

  if (res.status !== 200) {
    console.error(`Login failed: ${res.status} ${res.body}`);
    return null;
  }

  // Extract session cookie from Set-Cookie header
  const setCookie = res.headers["Set-Cookie"] || "";
  const match = setCookie.match(/better-auth\.session_token=[^;]+/);
  return match ? match[0] : null;
}
