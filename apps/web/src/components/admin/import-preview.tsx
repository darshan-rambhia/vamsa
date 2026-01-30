"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@vamsa/ui/primitives";
import type {
  Conflict,
  ConflictResolutionStrategy,
  ImportPreview,
} from "@vamsa/schemas";
import type { ImportResult } from "~/server/restore";
import { importBackup } from "~/server/restore";

interface ImportPreviewProps {
  preview: ImportPreview;
  file: File;
  onReset: () => void;
}

export function ImportPreview({ preview, file, onReset }: ImportPreviewProps) {
  const [strategy, setStrategy] = useState<ConflictResolutionStrategy>("skip");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      // For now, the server function doesn't accept parameters
      // This is a placeholder - in production this would send the file and strategy
      return importBackup();
    },
    onSuccess: (data: ImportResult) => {
      setImportResult(data);
      setIsImporting(false);
    },
    onError: (err: Error) => {
      console.error("Import error:", err);
      setIsImporting(false);
    },
  });

  const handleImport = () => {
    setIsImporting(true);
    mutation.mutate();
  };

  // Show success result
  if (importResult && importResult.success) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-green-50 p-4 dark:bg-green-950/20">
          <div className="flex">
            <svg
              className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                Import Successful
              </h3>
              <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                Your data has been imported successfully.
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Import Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg border p-4">
                <div className="text-muted-foreground text-sm">People</div>
                <div className="text-2xl font-bold">
                  {importResult.statistics.peopleImported}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-muted-foreground text-sm">
                  Relationships
                </div>
                <div className="text-2xl font-bold">
                  {importResult.statistics.relationshipsImported}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-muted-foreground text-sm">Users</div>
                <div className="text-2xl font-bold">
                  {importResult.statistics.usersImported}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-muted-foreground text-sm">Photos</div>
                <div className="text-2xl font-bold">
                  {importResult.statistics.photosImported}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {importResult.warnings.length > 0 && (
          <div className="rounded-md bg-amber-50 p-4 dark:bg-amber-950/20">
            <h4 className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-200">
              Warnings
            </h4>
            <ul className="list-inside list-disc text-sm text-amber-700 dark:text-amber-300">
              {importResult.warnings.map((warning: string, i: number) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <Button onClick={onReset}>Done</Button>
      </div>
    );
  }

  const hasConflicts = preview.statistics.totalConflicts > 0;

  return (
    <div className="space-y-6">
      {/* Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle>Import Preview</CardTitle>
          <CardDescription>
            Review the data to be imported from{" "}
            <span className="font-semibold">{file.name}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground text-sm">New People</div>
              <div className="text-2xl font-bold">
                {preview.statistics.newItems.people}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground text-sm">
                New Relationships
              </div>
              <div className="text-2xl font-bold">
                {preview.statistics.newItems.relationships}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground text-sm">Conflicts</div>
              <div className="text-2xl font-bold">
                {preview.statistics.totalConflicts}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground text-sm">Users</div>
              <div className="text-2xl font-bold">
                {preview.statistics.newItems.users}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-muted-foreground text-sm">
              Estimated import time:{" "}
              <span className="font-medium">
                {preview.estimatedDuration.minSeconds}-
                {preview.estimatedDuration.maxSeconds} seconds
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Conflicts Alert */}
      {hasConflicts ? (
        <div className="rounded-md bg-amber-50 p-4 dark:bg-amber-950/20">
          <div className="flex">
            <svg
              className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Conflicts Detected
              </h3>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                Some data in the backup file already exists in the database.
                Choose a strategy to resolve these conflicts.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-md bg-green-50 p-4 dark:bg-green-950/20">
          <div className="flex">
            <svg
              className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                No Conflicts
              </h3>
              <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                The backup file can be imported without any conflicts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Resolution Strategy */}
      {hasConflicts && (
        <Card>
          <CardHeader>
            <CardTitle>Conflict Resolution</CardTitle>
            <CardDescription>
              Choose how to handle data that already exists
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="conflict-strategy"
                className="text-sm font-medium"
              >
                Conflict Strategy
              </label>
              <Select
                value={strategy}
                onValueChange={(value) =>
                  setStrategy(value as ConflictResolutionStrategy)
                }
              >
                <SelectTrigger id="conflict-strategy">
                  <SelectValue placeholder="Select a strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Skip Conflicting Data</SelectItem>
                  <SelectItem value="replace">Replace Existing Data</SelectItem>
                  <SelectItem value="merge">Merge Existing Data</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted/50 space-y-2 rounded-md p-4 text-sm">
              <p>
                <span className="font-semibold">Skip:</span> Keep existing data,
                ignore conflicting items from the backup. Safest option.
              </p>
              <p>
                <span className="font-semibold">Replace:</span> Overwrite
                existing data with data from the backup. Use when the backup has
                more recent information.
              </p>
              <p>
                <span className="font-semibold">Merge:</span> Combine existing
                and backup data. New fields are added, existing fields are
                updated. Best for reconciling partial backups.
              </p>
            </div>

            {/* Conflicts by Type */}
            {preview.conflicts.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">
                  Conflicts by Type ({preview.conflicts.length})
                </h4>
                <div className="space-y-2">
                  {Object.entries(preview.statistics.conflictsByType).map(
                    ([type, count]) => (
                      <div
                        key={type}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <span className="text-sm capitalize">{type}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Conflicts by Severity */}
            {Object.keys(preview.statistics.conflictsBySeverity).length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Conflicts by Severity</h4>
                <div className="space-y-2">
                  {Object.entries(preview.statistics.conflictsBySeverity).map(
                    ([severity, count]) => {
                      const severityColors = {
                        low: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
                        medium:
                          "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
                        high: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
                      };
                      return (
                        <div
                          key={severity}
                          className="flex items-center justify-between rounded-md border p-3"
                        >
                          <span className="text-sm capitalize">{severity}</span>
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${
                              severityColors[
                                severity as keyof typeof severityColors
                              ]
                            }`}
                          >
                            {count}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            {/* Sample Conflicts */}
            {preview.conflicts.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Sample Conflicts</h4>
                <div className="bg-muted/30 max-h-60 space-y-2 overflow-auto rounded-md p-3">
                  {preview.conflicts.slice(0, 10).map((conflict, i) => (
                    <ConflictItem key={i} conflict={conflict} />
                  ))}
                  {preview.conflicts.length > 10 && (
                    <p className="text-muted-foreground text-xs italic">
                      ... and {preview.conflicts.length - 10} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-4">
        <Button variant="outline" onClick={onReset} disabled={isImporting}>
          Cancel
        </Button>
        <Button onClick={handleImport} disabled={isImporting}>
          {isImporting ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Importing...
            </>
          ) : (
            "Confirm and Import"
          )}
        </Button>
      </div>
    </div>
  );
}

// Helper component to display individual conflicts
function ConflictItem({ conflict }: { conflict: Conflict }) {
  const severityColors = {
    low: "bg-blue-500",
    medium: "bg-amber-500",
    high: "bg-red-500",
  };

  return (
    <div className="flex items-start space-x-3 rounded-md border bg-white p-3 dark:bg-slate-950">
      <div
        className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${
          severityColors[conflict.severity]
        }`}
      />
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium capitalize">
            {conflict.type}
          </span>
          <span className="text-muted-foreground text-xs capitalize">
            {conflict.action}
          </span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {conflict.description}
        </p>
        {conflict.conflictFields.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {conflict.conflictFields.map((field, i) => (
              <span
                key={i}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              >
                {field}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
