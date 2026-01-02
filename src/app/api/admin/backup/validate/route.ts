import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { validateBackup } from "@/actions/restore";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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

    // Validate the backup
    const validationResult = await validateBackup(formData);

    return NextResponse.json(validationResult);
  } catch (error) {
    console.error("Backup validation error:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to validate backup" },
      { status: 500 }
    );
  }
}
