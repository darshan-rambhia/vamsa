/**
 * First-admin bootstrap for production.
 *
 * If no ADMIN user exists, the account for ADMIN_EMAIL is made ADMIN:
 * - no user with that email: a passwordless user is created
 * - a user with that email exists: promoted to ADMIN
 *
 * The passwordless account is claimed by signing in through the configured
 * OIDC provider with the same email. Better Auth links the OIDC identity to
 * the existing row (oidc is a trusted provider and the row is email-verified).
 *
 * Idempotent: does nothing once any ADMIN exists. Creates no demo data.
 */

import { eq } from "drizzle-orm";

import { drizzleDb, drizzleSchema } from "../client";

import type { DrizzleDB } from "./db";

export interface BootstrapAdminDeps {
  db?: DrizzleDB;
  schema?: typeof drizzleSchema;
}

export type BootstrapAdminResult =
  | { action: "exists" }
  | { action: "created"; userId: string }
  | { action: "promoted"; userId: string };

export async function bootstrapAdminUser(
  adminEmail: string,
  { db = drizzleDb, schema = drizzleSchema }: BootstrapAdminDeps = {}
): Promise<BootstrapAdminResult> {
  const [existingAdmin] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.role, "ADMIN"))
    .limit(1);

  if (existingAdmin) {
    return { action: "exists" };
  }

  const email = adminEmail.trim().toLowerCase();
  const now = new Date();

  const [existingUser] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (existingUser) {
    await db
      .update(schema.users)
      .set({ role: "ADMIN", isActive: true, updatedAt: now })
      .where(eq(schema.users.id, existingUser.id));
    return { action: "promoted", userId: existingUser.id };
  }

  const userId = crypto.randomUUID();
  await db.insert(schema.users).values({
    id: userId,
    email,
    role: "ADMIN",
    isActive: true,
    emailVerified: true,
    updatedAt: now,
  });
  return { action: "created", userId };
}
