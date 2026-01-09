import { FullConfig } from "@playwright/test";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join } from "path";
import { Client } from "pg";
import bcrypt from "bcryptjs";

async function globalSetup(_config: FullConfig) {
  console.log("🌍 Running global setup for E2E tests...");

  // Load DATABASE_URL from .env first
  let databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    try {
      const envPath = join(process.cwd(), ".env");
      const envContent = readFileSync(envPath, "utf-8");
      const lines = envContent.split("\n");
      for (const line of lines) {
        if (line.startsWith("DATABASE_URL")) {
          const [, value] = line.split("=");
          databaseUrl = value.trim().replace(/^["']|["']$/g, "");
          break;
        }
      }
    } catch (e) {
      databaseUrl = "postgresql://vamsa:password@localhost:5432/vamsa";
    }
  }

  // Step 1: Connect to database and check if migrations are needed
  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    await client.connect();
    console.log("✅ Connected to database");

    // Check if User table exists
    let userTableExists = false;
    try {
      await client.query('SELECT 1 FROM "User" LIMIT 1');
      userTableExists = true;
    } catch {
      userTableExists = false;
    }

    if (!userTableExists) {
      console.log("📋 Applying database migrations...");
      try {
        const migrationsDir = join(process.cwd(), "prisma", "migrations");
        const migrationDirs = readdirSync(migrationsDir)
          .filter((f) => statSync(join(migrationsDir, f)).isDirectory())
          .sort();

        for (const dir of migrationDirs) {
          const sqlFile = join(migrationsDir, dir, "migration.sql");
          if (existsSync(sqlFile)) {
            const sql = readFileSync(sqlFile, "utf-8");
            // Split by semicolons and execute each statement
            const statements = sql
              .split(";")
              .map((s) => s.trim())
              .filter((s) => s.length > 0);
            for (const statement of statements) {
              try {
                await client.query(statement);
              } catch (err: any) {
                // Ignore "already exists" errors
                if (!err.message.includes("already exists")) {
                  console.warn(`Warning: ${err.message}`);
                }
              }
            }
          }
        }
        console.log("✅ Database migrations applied");
      } catch (err) {
        console.error("❌ Failed to apply migrations:", err);
        throw err;
      }
    } else {
      console.log("✅ Database already initialized");
    }

    // Check if admin user already exists
    const result = await client.query(
      'SELECT id FROM "User" WHERE email = $1 LIMIT 1',
      ["admin@family.local"]
    );

    if (result.rows.length > 0) {
      console.log("✅ Test data already exists, skipping seed");
      return;
    }

    console.log("📋 Seeding test data...");

    // Create admin user
    const adminHash = await bcrypt.hash("admin123", 12);
    await client.query(
      `INSERT INTO "User" (id, email, name, "passwordHash", role, "isActive", "mustChangePassword", "createdAt", "updatedAt") 
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      ["admin@family.local", "Admin User", adminHash, "ADMIN", true, false]
    );
    console.log("✅ Admin user created");

    // Create member user
    const memberHash = await bcrypt.hash("member123", 12);
    await client.query(
      `INSERT INTO "User" (id, email, name, "passwordHash", role, "isActive", "mustChangePassword", "createdAt", "updatedAt") 
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      ["member@family.local", "Member User", memberHash, "MEMBER", true, false]
    );
    console.log("✅ Member user created");

    // Create family settings if not exists
    const settingsResult = await client.query(
      'SELECT id FROM "FamilySettings" LIMIT 1'
    );

    if (settingsResult.rows.length === 0) {
      await client.query(
        `INSERT INTO "FamilySettings" (id, "familyName", "allowSelfRegistration", "requireApprovalForEdits", "createdAt", "updatedAt") 
         VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())`,
        ["Test Family", true, true]
      );
      console.log("✅ Family settings created");
    }

    console.log("✅ Global setup completed");
  } catch (error) {
    console.error("❌ Global setup failed:", error);
    throw error;
  } finally {
    await client.end();
  }
}

export default globalSetup;
