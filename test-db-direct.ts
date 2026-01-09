import { prisma } from "./packages/api/src/client";

async function main() {
  try {
    const count = await prisma.user.count();
    console.log("✓ Database connection successful!");
    console.log("User count:", count);
  } catch (error) {
    console.error("✗ Database connection failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
