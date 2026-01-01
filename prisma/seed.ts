import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function generateRandomPassword(length: number = 16): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function main() {
  console.log("Starting database seed...");

  const existingAdmin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN },
  });

  if (existingAdmin) {
    console.log("Admin user already exists. Skipping seed.");
    return;
  }

  const email = process.env.ADMIN_EMAIL || "admin@family.local";
  let password = process.env.ADMIN_PASSWORD;
  let mustChangePassword = false;

  if (!password) {
    password = generateRandomPassword();
    mustChangePassword = true;
    console.log("\n========================================");
    console.log("ADMIN CREDENTIALS (save these!)");
    console.log("========================================");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log("========================================");
    console.log("You will be required to change this password on first login.");
    console.log("========================================\n");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      name: "Administrator",
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
      mustChangePassword,
    },
  });

  console.log(`Admin user created: ${email}`);

  const existingSettings = await prisma.familySettings.findFirst();

  if (!existingSettings) {
    await prisma.familySettings.create({
      data: {
        familyName: process.env.NEXT_PUBLIC_APP_NAME || "Our Family",
        allowSelfRegistration: true,
        requireApprovalForEdits: true,
      },
    });
    console.log("Default family settings created.");
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
