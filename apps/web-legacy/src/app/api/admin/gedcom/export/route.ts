import { exportGedcom } from "@/actions/gedcom";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check authentication
    const session = await getSession();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Export GEDCOM
    const result = await exportGedcom();

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    // Return as .ged file download
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `family-tree-${timestamp}.ged`;

    return new Response(result.gedcomContent, {
      headers: {
        "Content-Type": "application/vnd.familysearch.gedcom",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("GEDCOM export error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to export GEDCOM",
      },
      { status: 500 }
    );
  }
}
