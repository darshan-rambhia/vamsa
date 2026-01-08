import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@vamsa/api/convex/_generated/api";
import { useState, useRef } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
} from "@vamsa/ui";

export const Route = createFileRoute("/_authenticated/admin/backup")({
  component: BackupPage,
});

function BackupPage() {
  const { token } = Route.useRouteContext();
  const parsePreview = useMutation(api.gedcom.parsePreview);
  const importGedcom = useMutation(api.gedcom.importGedcom);
  const exportResult = useQuery(api.gedcom.exportGedcom, { token });

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{
    success: boolean;
    version?: string;
    charset?: string;
    people?: Array<{
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
      isLiving: boolean;
    }>;
    relationships?: number;
    errors?: Array<{ message: string }>;
    warnings?: string[];
    error?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    importedPeople?: number;
    importedRelationships?: number;
    error?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(null);
    setImportResult(null);
    setIsLoading(true);

    try {
      const content = await selectedFile.text();
      const result = await parsePreview({ token, content });
      setPreview(result);
    } catch (error) {
      setPreview({
        success: false,
        error: error instanceof Error ? error.message : "Failed to parse file",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsLoading(true);
    setImportResult(null);

    try {
      const content = await file.text();
      const result = await importGedcom({
        token,
        content,
        options: { ignoreMissingReferences: true },
      });
      setImportResult(result);
      if (result.success) {
        setFile(null);
        setPreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (error) {
      setImportResult({
        success: false,
        error: error instanceof Error ? error.message : "Failed to import",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (!exportResult?.success || !exportResult.content) return;

    const blob = new Blob([exportResult.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vamsa-export-${new Date().toISOString().split("T")[0]}.ged`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle>Import GEDCOM</CardTitle>
          <CardDescription>
            Import family tree data from GEDCOM 5.5.1 or 7.0 files (Ancestry,
            FamilySearch, Gramps, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".ged,.gedcom"
              onChange={handleFileSelect}
              className="hidden"
              id="gedcom-file"
            />
            <label htmlFor="gedcom-file">
              <Button variant="outline" asChild>
                <span>
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  Select File
                </span>
              </Button>
            </label>
            {file && (
              <span className="text-sm text-muted-foreground">{file.name}</span>
            )}
          </div>

          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="10" opacity="0.25" />
                <path d="M12 2a10 10 0 0110 10" />
              </svg>
              Processing...
            </div>
          )}

          {preview && preview.success && (
            <div className="rounded-lg border p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">GEDCOM {preview.version}</Badge>
                <Badge variant="muted">{preview.charset}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">People found</p>
                  <p className="text-2xl font-semibold">
                    {preview.people?.length || 0}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Relationships</p>
                  <p className="text-2xl font-semibold">
                    {preview.relationships || 0}
                  </p>
                </div>
              </div>

              {preview.people && preview.people.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Preview (first 5):</p>
                  <div className="space-y-1 text-sm">
                    {preview.people.slice(0, 5).map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1 border-b last:border-0"
                      >
                        <span>
                          {p.firstName} {p.lastName}
                        </span>
                        {!p.isLiving && (
                          <Badge variant="muted" className="text-xs">
                            Deceased
                          </Badge>
                        )}
                      </div>
                    ))}
                    {preview.people.length > 5 && (
                      <p className="text-muted-foreground">
                        ...and {preview.people.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {preview.warnings && preview.warnings.length > 0 && (
                <div className="rounded bg-yellow-50 dark:bg-yellow-900/20 p-3">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    {preview.warnings.length} warnings
                  </p>
                  <ul className="mt-1 text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside">
                    {preview.warnings.slice(0, 3).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button onClick={handleImport} disabled={isLoading}>
                {isLoading ? "Importing..." : "Import Data"}
              </Button>
            </div>
          )}

          {preview && !preview.success && (
            <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
              <p className="font-medium">Failed to parse file</p>
              <p className="text-sm">{preview.error}</p>
            </div>
          )}

          {importResult && importResult.success && (
            <div className="rounded-lg bg-primary/10 p-4 text-primary">
              <p className="font-medium">Import successful!</p>
              <p className="text-sm">
                Imported {importResult.importedPeople} people and{" "}
                {importResult.importedRelationships} relationships.
              </p>
            </div>
          )}

          {importResult && !importResult.success && (
            <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
              <p className="font-medium">Import failed</p>
              <p className="text-sm">{importResult.error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle>Export GEDCOM</CardTitle>
          <CardDescription>
            Export your family tree data as a GEDCOM 5.5.1 file for backup or
            use in other genealogy software
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {exportResult?.success && (
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                {exportResult.stats?.individuals} individuals,{" "}
                {exportResult.stats?.families} families ready for export
              </div>
              <Button onClick={handleExport}>
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download GEDCOM
              </Button>
            </div>
          )}

          {exportResult && !exportResult.success && (
            <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
              <p className="font-medium">Export failed</p>
              <p className="text-sm">{exportResult.error}</p>
            </div>
          )}

          {!exportResult && (
            <div className="text-sm text-muted-foreground">
              Loading export data...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
