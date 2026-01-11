"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@vamsa/ui/primitives";
import { importGedcom, type ValidateGedcomResult } from "~/server/gedcom";

interface GedcomImportPreviewProps {
  result: ValidateGedcomResult;
  file: File;
  onReset: () => void;
}

export function GedcomImportPreview({
  result,
  file,
  onReset,
}: GedcomImportPreviewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (f: File) => {
      const content = await f.text();
      return importGedcom({
        data: { fileName: f.name, fileContent: content },
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        setImportSuccess(true);
        setImportError(null);
        queryClient.invalidateQueries({ queryKey: ["persons"] });
        queryClient.invalidateQueries({ queryKey: ["relationships"] });
        setTimeout(() => {
          onReset();
          router.navigate({ to: "/people" });
        }, 2000);
      } else {
        setImportError(data.message);
      }
    },
    onError: (err: Error) => {
      setImportError(err.message);
    },
    onSettled: () => {
      setIsImporting(false);
    },
  });

  const handleImport = () => {
    setIsImporting(true);
    mutation.mutate(file);
  };

  const hasErrors = result.preview?.errors && result.preview.errors.length > 0;
  const errorCount =
    result.preview?.errors?.filter(
      (e) => e.type === "validation_error" || e.type === "mapping_error"
    ).length || 0;
  const warningCount =
    result.preview?.errors?.filter(
      (e) => e.type === "validation_warning" || e.type === "warning"
    ).length || 0;

  if (importSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="bg-primary/10 text-primary mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <svg
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="font-display text-xl font-semibold">
          Import Successful!
        </h3>
        <p className="text-muted-foreground mt-2">
          Redirecting to people list...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Validation complete. Review the data to be imported from{" "}
            <span className="font-semibold">{file.name}</span>.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground text-sm">People</div>
              <div className="text-2xl font-bold">
                {result.preview?.peopleCount || 0}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="text-muted-foreground text-sm">Families</div>
              <div className="text-2xl font-bold">
                {result.preview?.familiesCount || 0}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status card */}
      {result.valid && !hasErrors ? (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
          <CardContent className="flex items-center gap-3 pt-6">
            <svg
              className="h-5 w-5 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">
                Ready to Import
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">
                The GEDCOM file is valid and ready to be imported.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : !result.valid ? (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <CardContent className="flex items-center gap-3 pt-6">
            <svg
              className="h-5 w-5 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="font-medium text-red-900 dark:text-red-100">
                Validation Failed
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                The GEDCOM file has critical errors that prevent import. Please
                fix these issues and try again.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
          <CardContent className="flex items-center gap-3 pt-6">
            <svg
              className="h-5 w-5 text-yellow-600 dark:text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="font-medium text-yellow-900 dark:text-yellow-100">
                Warnings Detected
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                The file has some warnings but can still be imported. Review the
                issues below.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation issues */}
      {hasErrors && (
        <Card>
          <CardHeader>
            <CardTitle>
              Validation Issues ({errorCount} errors, {warningCount} warnings)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-60 space-y-2 overflow-auto">
              {result.preview?.errors?.map((error, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-3 text-sm ${
                    error.type === "validation_error" ||
                    error.type === "mapping_error"
                      ? "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
                      : "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {error.type === "validation_error" ||
                    error.type === "mapping_error" ? (
                      <svg
                        className="mt-0.5 h-4 w-4 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="mt-0.5 h-4 w-4 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    )}
                    <div>
                      <div className="font-medium">
                        {error.type === "validation_error" ||
                        error.type === "mapping_error"
                          ? "Error"
                          : "Warning"}
                      </div>
                      <div className="mt-1">{error.message}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import error */}
      {importError && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-red-900 dark:text-red-100">
              Import Error: {importError}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end space-x-4">
        <Button variant="outline" onClick={onReset} disabled={isImporting}>
          Cancel
        </Button>
        <Button onClick={handleImport} disabled={isImporting || !result.valid}>
          {isImporting && (
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
          )}
          {isImporting ? "Importing..." : "Confirm and Import"}
        </Button>
      </div>
    </div>
  );
}
