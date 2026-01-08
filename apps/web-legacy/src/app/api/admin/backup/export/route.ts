import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { gatherBackupData, logBackupExport } from "@/actions/backup";
import { getStorageAdapter } from "@/lib/storage";
import { backupExportSchema } from "@/schemas/backup";
import archiver from "archiver";
import { join } from "path";
import { readFile } from "fs/promises";

// Rate limiting: store last export time per user
const lastExportTimes = new Map<string, number>();
const EXPORT_COOLDOWN = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userId = session.user.id;

    // Rate limiting check
    const now = Date.now();
    const lastExport = lastExportTimes.get(userId) || 0;

    if (now - lastExport < EXPORT_COOLDOWN) {
      const remainingTime = Math.ceil(
        (EXPORT_COOLDOWN - (now - lastExport)) / 1000
      );
      return NextResponse.json(
        {
          error: `Please wait ${remainingTime} seconds before creating another export`,
          remainingTime,
        },
        { status: 429 }
      );
    }

    // Parse and validate input
    const body = await request.json();
    const input = backupExportSchema.parse(body);

    // Update rate limiting
    lastExportTimes.set(userId, now);

    // Gather all backup data
    const { metadata, data, photos } = await gatherBackupData(input);

    // Create ZIP archive
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Maximum compression
    });

    // Set up response headers for streaming download
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `vamsa-backup-${timestamp}.zip`;

    const headers = new Headers({
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache",
    });

    // Create a readable stream from the archive
    const stream = new ReadableStream({
      start(controller) {
        archive.on("data", (chunk) => {
          controller.enqueue(new Uint8Array(chunk));
        });

        archive.on("end", () => {
          controller.close();
        });

        archive.on("error", (err) => {
          console.error("Archive error:", err);
          controller.error(err);
        });

        // Add metadata file
        archive.append(JSON.stringify(metadata, null, 2), {
          name: "metadata.json",
        });

        // Add data files
        archive.append(JSON.stringify(data.people, null, 2), {
          name: "data/people.json",
        });
        archive.append(JSON.stringify(data.relationships, null, 2), {
          name: "data/relationships.json",
        });
        archive.append(JSON.stringify(data.users, null, 2), {
          name: "data/users.json",
        });
        archive.append(JSON.stringify(data.suggestions, null, 2), {
          name: "data/suggestions.json",
        });
        archive.append(JSON.stringify(data.settings, null, 2), {
          name: "data/settings.json",
        });

        if (data.auditLogs) {
          archive.append(JSON.stringify(data.auditLogs, null, 2), {
            name: "data/audit-logs.json",
          });
        }

        // Add photos if requested
        if (input.includePhotos && photos.length > 0) {
          addPhotosToArchive(archive, photos);
        } else {
          // Finalize archive if no photos to add
          archive.finalize();
        }
      },
    });

    // Log the export action
    await logBackupExport();

    return new Response(stream, { headers });
  } catch (error) {
    console.error("Backup export error:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create backup" },
      { status: 500 }
    );
  }
}

async function addPhotosToArchive(
  archive: archiver.Archiver,
  photos: Array<{ id: string; photoUrl: string | null }>
) {
  const _storage = getStorageAdapter();
  let processedPhotos = 0;

  for (const person of photos) {
    if (!person.photoUrl) continue;

    try {
      // Extract the file path from the URL
      // For local storage, URLs are like: http://localhost:3000/api/uploads/1234567890-photo.jpg
      const urlParts = person.photoUrl.split("/api/uploads/");
      if (urlParts.length !== 2) continue;

      const filePath = urlParts[1];
      const storagePath = process.env.STORAGE_LOCAL_PATH || "./data/uploads";
      const fullPath = join(storagePath, filePath);

      // Read the file
      const fileBuffer = await readFile(fullPath);

      // Extract original filename from the stored path
      // Stored paths are like: 1234567890-original_name.jpg
      const originalName = filePath.split("-").slice(1).join("-");

      // Add to archive under photos/{personId}/
      archive.append(fileBuffer, {
        name: `photos/${person.id}/${originalName}`,
      });

      processedPhotos++;
    } catch (error) {
      console.warn(`Failed to add photo for person ${person.id}:`, error);
      // Continue processing other photos
    }
  }

  console.log(`Added ${processedPhotos} photos to backup archive`);

  // Finalize the archive after all photos are processed
  archive.finalize();
}
