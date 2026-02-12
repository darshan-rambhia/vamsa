"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button, Checkbox, Input, Label } from "@vamsa/ui/primitives";
import type { ExportBackupResult } from "~/server/backup";
import { exportBackup } from "~/server/backup";

export function BackupExport() {
  const { t } = useTranslation(["admin", "common"]);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [includeAuditLogs, setIncludeAuditLogs] = useState(true);
  const [auditLogDays, setAuditLogDays] = useState(90);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      exportBackup({
        data: {
          includePhotos,
          includeAuditLogs,
          auditLogDays,
        },
      }),
    onSuccess: (data: ExportBackupResult) => {
      if (data.success && data.zipBase64 && data.filename) {
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
        a.download = data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setSuccess(true);
        setError(null);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.message || "Export failed");
      }
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const handleExport = () => {
    mutation.mutate();
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {t("admin:backupExportDescription")}
      </p>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="include-photos"
            checked={includePhotos}
            onCheckedChange={(checked) => setIncludePhotos(checked === true)}
          />
          <Label htmlFor="include-photos" className="text-sm font-normal">
            {t("admin:backupIncludePhotos")}
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="include-audit-logs"
            checked={includeAuditLogs}
            onCheckedChange={(checked) => setIncludeAuditLogs(checked === true)}
          />
          <Label htmlFor="include-audit-logs" className="text-sm font-normal">
            {t("admin:backupIncludeAuditLogs")}
          </Label>
        </div>

        {includeAuditLogs && (
          <div className="ml-6 space-y-2">
            <Label htmlFor="audit-log-days" className="text-sm">
              {t("admin:backupAuditLogDays")}
            </Label>
            <Input
              id="audit-log-days"
              type="number"
              min={1}
              max={365}
              value={auditLogDays}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (!isNaN(value) && value >= 1 && value <= 365) {
                  setAuditLogDays(value);
                }
              }}
              className="w-32"
            />
            <p className="text-muted-foreground text-xs">
              {t("admin:backupAuditLogDaysHelp")}
            </p>
          </div>
        )}
      </div>

      <Button onClick={handleExport} disabled={mutation.isPending}>
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
            {t("admin:backupDownloadBackup")}
          </>
        )}
      </Button>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-900 dark:bg-green-950 dark:text-green-100">
          {t("admin:backupExportSuccess")}
        </div>
      )}
    </div>
  );
}
