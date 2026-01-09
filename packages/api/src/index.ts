// Re-export Prisma client
export { prisma, type PrismaClient } from "./client";

// Re-export generated types from client.ts (Prisma 7 exports from client.ts)
export * from "./generated/prisma/client";
