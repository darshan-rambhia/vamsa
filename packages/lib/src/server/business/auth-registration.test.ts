/**
 * Unit tests for the self sign-up policy
 */

import { describe, expect, it } from "vitest";
import { isSelfSignupEnabled } from "./auth-registration";

describe("isSelfSignupEnabled", () => {
  it("is off in production by default", () => {
    expect(isSelfSignupEnabled({ NODE_ENV: "production" })).toBe(false);
  });

  it("is on outside production by default", () => {
    expect(isSelfSignupEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(isSelfSignupEnabled({ NODE_ENV: "test" })).toBe(true);
    expect(isSelfSignupEnabled({})).toBe(true);
  });

  it("ALLOW_SELF_SIGNUP=true opens sign-up in production", () => {
    expect(
      isSelfSignupEnabled({ NODE_ENV: "production", ALLOW_SELF_SIGNUP: "true" })
    ).toBe(true);
  });

  it("ALLOW_SELF_SIGNUP=false closes sign-up outside production", () => {
    expect(
      isSelfSignupEnabled({
        NODE_ENV: "development",
        ALLOW_SELF_SIGNUP: "false",
      })
    ).toBe(false);
  });

  it("accepts surrounding whitespace and case", () => {
    expect(
      isSelfSignupEnabled({
        NODE_ENV: "production",
        ALLOW_SELF_SIGNUP: " TRUE ",
      })
    ).toBe(true);
  });

  it("treats unrecognised values as unset", () => {
    expect(
      isSelfSignupEnabled({ NODE_ENV: "production", ALLOW_SELF_SIGNUP: "yes" })
    ).toBe(false);
  });
});
