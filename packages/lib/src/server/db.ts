// Re-export the Prisma client singleton from @vamsa/api
// This is imported at runtime when the web app initializes; packages/lib provides
// the type definitions for consumers and re-exports the singleton.
export { prisma } from "@vamsa/api";