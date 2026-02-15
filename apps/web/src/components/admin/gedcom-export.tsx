"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Button,
  Checkbox,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@vamsa/ui/primitives";
import { exportGedZip, exportGedcom } from "~/server/gedcom";

export function GedcomExport() {
  const { t } = useTranslation(["admin", "common"]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [includeMedia, setIncludeMedia] = useState(true);

  const gedcomMutation = useMutation({
    mutationFn: () => exportGedcom(),
    onSuccess: (data) => {
      if (data.success && data.gedcomContent) {
        // Download the file
        const blob = new Blob([data.gedcomContent], {
          type: "application/x-gedcom",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `vamsa-export-${new Date().toISOString().split("T")[0]}.ged`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setSuccess(true);
        setError(null);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.message);
      }
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const gedzipMutation = useMutation({
    mutationFn: () => exportGedZip({ data: { includeMedia } }),
    onSuccess: (data) => {
      if (data.success && data.zipBase64) {
        // Convert base64 to binary and download
        const binaryString = atob(data.zipBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "application/zip" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `vamsa-backup-${new Date().toISOString().split("T")[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setSuccess(true);
        setError(null);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.message);
      }
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const isPending = gedcomMutation.isPending || gedzipMutation.isPending;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="gedcom" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="gedcom">
            {t("admin:gedcomExportTitle")}
          </TabsTrigger>
          <TabsTrigger value="gedzip">
            {t("admin:gedcomFullBackupTitle")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gedcom" className="space-y-4 pt-4">
          <p className="text-muted-foreground text-sm">
            {t("admin:gedcomExportDescription")}
          </p>

          <Button
            onClick={() => gedcomMutation.mutate()}
            disabled={isPending}
            variant="outline"
          >
            {gedcomMutation.isPending ? (
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
                {t("admin:backupExporting")}
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
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
                {t("admin:gedcomExportButton")}
              </>
            )}
          </Button>
        </TabsContent>

        <TabsContent value="gedzip" className="space-y-4 pt-4">
          <p className="text-muted-foreground text-sm">
            {t("admin:gedcomFullBackupDescription")}
          </p>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-media"
              checked={includeMedia}
              onCheckedChange={(checked) => setIncludeMedia(checked === true)}
            />
            <Label htmlFor="include-media" className="text-sm font-normal">
              {t("admin:backupIncludePhotos")}
            </Label>
          </div>

          <Button
            onClick={() => gedzipMutation.mutate()}
            disabled={isPending}
            variant="outline"
          >
            {gedzipMutation.isPending ? (
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
                {t("admin:gedcomCreatingBackup")}
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
                    d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m6 4.125l2.25 2.25m0 0l2.25-2.25M12 13.875V3.375m0 0L9.75 5.625M12 3.375l2.25 2.25"
                  />
                </svg>
                {t("admin:gedcomDownloadFullBackup")}
              </>
            )}
          </Button>
        </TabsContent>
      </Tabs>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-900 dark:bg-green-950 dark:text-green-100">
          {t("admin:gedcomExportSuccessMessage")}
        </div>
      )}
    </div>
  );
}
