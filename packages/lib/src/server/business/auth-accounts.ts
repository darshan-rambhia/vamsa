/**
 * Server-side account creation through Better Auth's internal adapter
 *
 * Creates a user and its `credential` Account row the same way sign-up does,
 * but without the public sign-up endpoint. Used by invite acceptance and
 * profile claiming, so they keep working when self sign-up is disabled.
 */

import { auth } from "./auth-better";
import type { UserRole } from "@vamsa/schemas";

type AuthContext = Awaited<typeof auth.$context>;

export interface CredentialAccountInput {
  email: string;
  name: string;
  password: string;
  /** Set true only when the email was proven (e.g. invite token) */
  emailVerified?: boolean;
  role?: UserRole;
  personId?: string | null;
  invitedById?: string | null;
  profileClaimStatus?: "PENDING" | "CLAIMED" | "SKIPPED" | "VERIFIED";
  profileClaimedAt?: Date | null;
}

export interface CredentialAccountDeps {
  getContext?: () => Promise<AuthContext>;
  /** Sends the verification email when the account is not yet verified */
  sendVerificationEmail?: (email: string) => Promise<unknown>;
}

const defaultSendVerificationEmail = (email: string) =>
  auth.api.sendVerificationEmail({ body: { email } });

/**
 * Create a user with a credential (email/password) account.
 *
 * Unverified accounts get a verification email, as they would through
 * sign-up. Without it, the account could never log in.
 *
 * @param input - Account fields. Vamsa fields are trusted server input.
 * @param deps - Injected Better Auth context and mailer (for tests)
 * @returns The new user's ID
 */
export async function createCredentialAccount(
  input: CredentialAccountInput,
  deps: CredentialAccountDeps = {}
): Promise<{ userId: string }> {
  const ctx = await (deps.getContext ?? (() => auth.$context))();
  const sendVerification =
    deps.sendVerificationEmail ?? defaultSendVerificationEmail;
  const email = input.email.toLowerCase();

  // Same hash function Better Auth uses to verify logins
  const passwordHash = await ctx.password.hash(input.password);

  const user = await ctx.internalAdapter.createUser(
    {
      email,
      name: input.name,
      emailVerified: input.emailVerified ?? false,
      role: input.role,
      personId: input.personId ?? null,
      invitedById: input.invitedById ?? null,
      profileClaimStatus: input.profileClaimStatus,
      profileClaimedAt: input.profileClaimedAt ?? null,
    },
    { method: "email-password" }
  );

  if (!user) {
    throw new Error("Failed to create user");
  }

  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: passwordHash,
  });

  if (!input.emailVerified) {
    try {
      await sendVerification(email);
    } catch {
      // Account exists; the user can request another verification email
    }
  }

  return { userId: user.id };
}
