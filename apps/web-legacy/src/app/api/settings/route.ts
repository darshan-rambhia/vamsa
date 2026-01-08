import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(request: Request) {
  try {
    const session = await getSession();

    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = await request.json();

    const existing = await db.familySettings.findFirst();

    if (existing) {
      await db.familySettings.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await db.familySettings.create({ data });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings update error:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
