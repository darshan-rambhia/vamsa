import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { importBackup } from "@/actions/restore";
import { conflictResolutionStrategy } from "@/schemas/backup";

// Rate limiting: store last import time per user
const lastImportTimes = new Map<string, number>();
const IMPORT_COOLDOWN = 10 * 60 * 1000; // 10 minutes in milliseconds

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = session.user.id;

    // Rate limiting check
    const now = Date.now();
    const lastImport = lastImportTimes.get(userId) || 0;

    if (now - lastImport < IMPORT_COOLDOWN) {
      const remainingTime = Math.ceil(
        (IMPORT_COOLDOWN - (now - lastImport)) / 1000
      );
      return NextResponse.json(
        {
          error: `Please wait ${remainingTime} seconds before starting another import`,
          remainingTime,
        },
        { status: 429 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const strategy = formData.get("strategy") as string;
    const createBackupBeforeImport =
      formData.get("createBackupBeforeImport") === "true";
    const importPhotos = formData.get("importPhotos") === "true";
    const importAuditLogs = formData.get("importAuditLogs") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate strategy
    const validationResult = conflictResolutionStrategy.safeParse(strategy);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid conflict resolution strategy" },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 100MB limit" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith(".zip")) {
      return NextResponse.json(
        { error: "File must be a ZIP archive" },
        { status: 400 }
      );
    }

    // Update rate limiting
    lastImportTimes.set(userId, now);

    // Import the backup
    const importResult = await importBackup(formData, validationResult.data, {
      createBackupBeforeImport,
      importPhotos,
      importAuditLogs,
    });

    return NextResponse.json(importResult);
  } catch (error) {
    console.error("Backup import error:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to import backup" },
      { status: 500 }
    );
  }
}
