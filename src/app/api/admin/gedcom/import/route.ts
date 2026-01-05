import { importGedcom, validateGedcomFile } from "@/actions/gedcom";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getSession();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the action parameter
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "import";

    // Get form data
    const formData = await request.formData();

    if (action === "validate") {
      // Validate the file
      const result = await validateGedcomFile(formData);
      return NextResponse.json(result);
    } else {
      // Import the file
      const result = await importGedcom(formData);
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error("GEDCOM import error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to import GEDCOM",
      },
      { status: 500 }
    );
  }
}
