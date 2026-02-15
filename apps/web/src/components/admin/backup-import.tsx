"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button, Input, Label } from "@vamsa/ui/primitives";
import { ImportPreview as ImportPreviewComponent } from "./import-preview";
import type { ImportPreview, ValidationResult } from "~/server/restore";
import { previewImport, validateBackup } from "~/server/restore";

type ImportStep = "upload" | "validation" | "preview";

export function BackupImport() {
  const { t } = useTranslation(["admin", "common"]);
  const [step, setStep] = useState<ImportStep>("upload");
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // Validation mutation
  const validationMutation = useMutation({
    mutationFn: async (_file: File) => {
      // For now, the server function doesn't accept file uploads
      // This is a placeholder - in production this would send the file
      return validateBackup();
    },
    onSuccess: (data: ValidationResult) => {
      if (data.isValid) {
        setError(null);
        // Automatically proceed to preview
        previewMutation.mutate();
      } else {
        setError(
          data.errors.length > 0
            ? data.errors.join(", ")
            : "Validation failed: Invalid backup file"
        );
      }
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async () => {
      return previewImport();
    },
    onSuccess: (data: ImportPreview) => {
      setImportPreview(data);
      setStep("preview");
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".zip")) {
        setError(t("admin:backupSelectZipFile"));
        return;
      }
      setBackupFile(file);
      setError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupFile) {
      setError(t("admin:backupSelectFile"));
      return;
    }
    setStep("validation");
    validationMutation.mutate(backupFile);
  };

  const handleReset = () => {
    setStep("upload");
    setBackupFile(null);
    setImportPreview(null);
    setError(null);
  };

  // Show import preview if available
  if (step === "preview" && importPreview && backupFile) {
    return (
      <ImportPreviewComponent
        preview={importPreview}
        file={backupFile}
        onReset={handleReset}
      />
    );
  }

  // Show validation step
  if (step === "validation") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <svg
              className="text-primary mx-auto h-12 w-12 animate-spin"
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
            <p className="text-muted-foreground mt-4 text-sm">
              {t("admin:backupValidatingBackup")}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            {error}
          </div>
        )}

        <Button variant="outline" onClick={handleReset}>
          {t("common:cancel")}
        </Button>
      </div>
    );
  }

  // Show upload form
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="backup-file">{t("admin:backupBackupFile")}</Label>
        <Input
          id="backup-file"
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          className="cursor-pointer"
        />
        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>

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
              {t("admin:backupImportantTitle")}
            </h3>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              {t("admin:backupImportantMessage")}
            </p>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground text-sm">
        {t("admin:backupImportInstructions")}
      </p>

      <Button
        type="submit"
        disabled={validationMutation.isPending || !backupFile}
      >
        {validationMutation.isPending ? (
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
            {t("admin:backupValidating")}
          </>
        ) : (
          <>
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
                d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
              />
            </svg>
            {t("admin:backupValidateBackup")}
          </>
        )}
      </Button>
    </form>
  );
}
