import { getServerSession } from "next-auth";
import { authOptions } from "./auth-options";

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden: Admin access required");
  }
  return user;
}

export async function requireMember() {
  const user = await requireAuth();
  if (user.role === "VIEWER") {
    throw new Error("Forbidden: Member access required");
  }
  return user;
}
