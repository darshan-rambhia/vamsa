"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button, Input, Label } from "@vamsa/ui/primitives";
import { GedcomImportPreview } from "./gedcom-import-preview";
import type { ValidateGedcomResult } from "~/server/gedcom";
import { validateGedcom } from "~/server/gedcom";

export function GedcomImport() {
  const { t } = useTranslation(["admin", "common"]);
  const [validationResult, setValidationResult] =
    useState<ValidateGedcomResult | null>(null);
  const [gedcomFile, setGedcomFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const content = await file.text();
      return validateGedcom({
        data: { fileName: file.name, fileContent: content },
      });
    },
    onSuccess: (data) => {
      setValidationResult(data);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".ged")) {
        setError(t("admin:gedcomSelectGedFile"));
        return;
      }
      setGedcomFile(file);
      setError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gedcomFile) {
      setError(t("admin:backupSelectFile"));
      return;
    }
    mutation.mutate(gedcomFile);
  };

  const handleReset = () => {
    setValidationResult(null);
    setGedcomFile(null);
    setError(null);
  };

  if (validationResult && gedcomFile) {
    return (
      <GedcomImportPreview
        result={validationResult}
        file={gedcomFile}
        onReset={handleReset}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="gedcom-file">{t("admin:gedcomFileLabel")}</Label>
        <Input
          id="gedcom-file"
          type="file"
          accept=".ged"
          onChange={handleFileChange}
          className="cursor-pointer"
        />
        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>
      <p className="text-muted-foreground text-sm">
        {t("admin:gedcomImportInstructions")}
      </p>
      <Button type="submit" disabled={mutation.isPending || !gedcomFile}>
        {mutation.isPending ? (
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
            {t("admin:gedcomValidating")}
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
            {t("admin:gedcomValidateGedcom")}
          </>
        )}
      </Button>
    </form>
  );
}
