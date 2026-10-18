/**
 * Self-service sign-up policy
 *
 * Public email/password sign-up is off in production so the instance is
 * invite-only. Invites, claim-profile and OIDC do not depend on this switch.
 */

/**
 * Whether public email/password sign-up is allowed.
 *
 * `ALLOW_SELF_SIGNUP=true|false` wins. Unset defaults to on outside
 * production (dev, test) and off in production.
 */
export function isSelfSignupEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  const raw = env.ALLOW_SELF_SIGNUP?.trim().toLowerCase();
  if (raw === "true") return true;
  if (raw === "false") return false;
  return env.NODE_ENV !== "production";
}
