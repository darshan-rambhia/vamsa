import { PrismaAdapter } from "@auth/prisma-adapter";
import { type AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: UserRole;
      personId?: string | null;
      mustChangePassword: boolean;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: UserRole;
    personId?: string | null;
    mustChangePassword: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    personId?: string | null;
    mustChangePassword: boolean;
  }
}

// Exported for testing
export async function authorizeUser(credentials: any) {
  if (!credentials?.email || !credentials?.password) {
    throw new Error("Email and password are required");
  }

  const user = await db.user.findUnique({
    where: { email: credentials.email.toLowerCase() },
  });

  if (!user || !user.passwordHash) {
    throw new Error("Invalid email or password");
  }

  if (!user.isActive) {
    throw new Error("Account is disabled");
  }

  const isValidPassword = await bcrypt.compare(
    credentials.password,
    user.passwordHash
  );

  if (!isValidPassword) {
    throw new Error("Invalid email or password");
  }

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    personId: user.personId,
    mustChangePassword: user.mustChangePassword,
  };
}

// Exported for testing
export function buildOIDCProvider() {
  if (process.env.OIDC_ENABLED !== "true") {
    return null;
  }

  const OIDCProvider = require("next-auth/providers/oauth").default;
  return OIDCProvider({
    id: "oidc",
    name: process.env.OIDC_PROVIDER_NAME || "SSO",
    type: "oauth",
    wellKnown: `${process.env.OIDC_ISSUER}/.well-known/openid-configuration`,
    clientId: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
    authorization: { params: { scope: "openid email profile" } },
    idToken: true,
    checks: ["pkce", "state"],
    profile(profile: { sub: string; email: string; name?: string }) {
      return {
        id: profile.sub,
        email: profile.email,
        name: profile.name,
        role: "VIEWER" as UserRole,
        personId: null,
        mustChangePassword: false,
      };
    },
  });
}

const providers: AuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    authorize: authorizeUser,
  }),
];

const oidcProvider = buildOIDCProvider();
if (oidcProvider) {
  providers.push(oidcProvider);
}

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(db) as AuthOptions["adapter"],
  providers,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.personId = user.personId;
        token.mustChangePassword = user.mustChangePassword;
      }

      if (trigger === "update" && session) {
        token.role = session.role ?? token.role;
        token.personId = session.personId ?? token.personId;
        token.mustChangePassword =
          session.mustChangePassword ?? token.mustChangePassword;
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.personId = token.personId;
        session.user.mustChangePassword = token.mustChangePassword;
      }
      return session;
    },
  },
};
