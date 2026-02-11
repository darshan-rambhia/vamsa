/**
 * Account Lockout Middleware for Better Auth Sign-In
 *
 * Intercepts sign-in requests to:
 * 1. Check if account is locked before authentication
 * 2. Track failed login attempts and trigger lockout
 * 3. Reset failed attempts on successful login
 * 4. Send lockout notification emails
 */

import { eq } from "drizzle-orm";
import {
  checkAccountLockout,
  recordFailedLoginAttempt,
  resetFailedLoginAttempts,
} from "@vamsa/lib/server/business";
import {
  createAccountLockedEmail,
  drizzleDb,
  drizzleSchema,
  emailService,
} from "@vamsa/api";
import { loggers } from "@vamsa/lib/logger";
import type { Context, Next } from "hono";

const log = loggers.api;

interface RequestBodyWithEmail {
  email?: string;
  password?: string;
}

/**
 * Account lockout middleware for email sign-in
 * Checks lockout status before auth and tracks attempts after
 */
export async function accountLockoutMiddleware(c: Context, next: Next) {
  // Only apply to email sign-in endpoint
  if (!c.req.path.includes("/sign-in/email")) {
    return next();
  }

  // Try to get email from request body
  let email: string | undefined;
  try {
    // Clone the request to avoid consuming the body
    const clonedReq = c.req.raw.clone();
    const text = await clonedReq.text();
    if (text) {
      const body = JSON.parse(text) as RequestBodyWithEmail;
      email = body?.email;
    }
  } catch (error) {
    // If we can't parse body, continue to auth
    log.debug(
      { error: String(error) },
      "Could not parse request body for lockout check"
    );
    return next();
  }

  if (!email) {
    return next(); // No email provided, let Better Auth handle it
  }

  // Check if account is locked before auth attempt
  try {
    const lockStatus = await checkAccountLockout(email);

    if (lockStatus.isLocked && lockStatus.lockedUntil) {
      const minutesRemaining = Math.ceil(lockStatus.remainingMs / 60000);

      log.warn(
        { email, minutesRemaining, failedAttempts: lockStatus.failedAttempts },
        "Login attempt on locked account"
      );

      return c.json(
        {
          status: "error",
          code: "ACCOUNT_LOCKED",
          message: `Account is temporarily locked. Try again in ${minutesRemaining} minute(s).`,
          lockedUntil: lockStatus.lockedUntil.toISOString(),
          remainingMs: lockStatus.remainingMs,
        },
        429
      );
    }
  } catch (error) {
    log.debug(
      { error: String(error) },
      "Could not perform pre-auth lockout check"
    );
    // Don't block the auth flow for our lockout check issues
  }

  // Call the next middleware/handler and get response
  await next();

  // Track login attempt result (success/failure)
  try {
    const status = c.res.status;

    if (status === 200) {
      // Successful login: reset failed attempts
      log.debug({ email }, "Successful login, resetting failed attempts");
      await resetFailedLoginAttempts(email);
    } else if (status === 401 || status === 403) {
      // Failed login: record attempt and possibly trigger lockout
      log.debug({ email, status }, "Failed login attempt, recording attempt");
      const result = await recordFailedLoginAttempt(email);

      if (result.locked && result.lockedUntil) {
        // Send lockout notification email (fire-and-forget)
        const user = await drizzleDb.query.users.findFirst({
          where: eq(drizzleSchema.users.email, email),
          columns: { id: true, name: true },
        });

        if (user) {
          const template = createAccountLockedEmail(
            user.name || "Family Member",
            result.lockedUntil,
            result.failedAttempts
          );

          // Fire-and-forget to not delay auth response
          void emailService
            .sendEmail(email, template, "account_locked", user.id)
            .catch(() => {
              // Log but don't throw - email failures shouldn't block auth
              log.warn(
                { email },
                "Failed to send account locked notification email"
              );
            });
        }
      }
    }
  } catch (error) {
    log.debug(
      { error: String(error) },
      "Could not perform post-auth lockout tracking"
    );
    // Don't block the auth response for our tracking issues
  }
}
