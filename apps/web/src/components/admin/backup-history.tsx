"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button } from "@vamsa/ui";
import {
  listBackups,
  downloadBackup,
  verifyBackup,
  deleteBackup,
} from "~/server/backup";
import { Download, CheckCircle, Trash2 } from "lucide-react";

// Helper function to format bytes to human-readable size
function formatBytes(bytes: bigint | number | null | undefined): string {
  if (bytes == null) return "N/A";

  const numBytes = typeof bytes === "bigint" ? Number(bytes) : bytes;

  if (numBytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(numBytes) / Math.log(k));

  return `${(numBytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// Helper function to format date
function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function BackupHistory() {
  const queryClient = useQueryClient();
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  // Fetch backups
  const { data, isLoading, error } = useQuery({
    queryKey: ["backups"],
    queryFn: () => listBackups({ data: { limit: 50, offset: 0 } }),
  });

  // Download mutation
  const downloadMutation = useMutation({
    mutationFn: (backupId: string) => downloadBackup({ data: { backupId } }),
    onSuccess: (result) => {
      if (result.downloadUrl) {
        // In a real implementation, this would trigger a file download
        window.open(result.downloadUrl, "_blank");
      }
      setActiveActionId(null);
    },
    onError: () => {
      setActiveActionId(null);
    },
  });

  // Verify mutation
  const verifyMutation = useMutation({
    mutationFn: (backupId: string) => verifyBackup({ data: { backupId } }),
    onSuccess: () => {
      setActiveActionId(null);
    },
    onError: () => {
      setActiveActionId(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (backupId: string) => deleteBackup({ data: { backupId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      setActiveActionId(null);
    },
    onError: () => {
      setActiveActionId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <svg
          className="text-primary h-8 w-8 animate-spin"
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
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
        Failed to load backup history: {error.message}
      </div>
    );
  }

  if (!data?.items || data.items.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center justify-center py-8 text-center">
        <svg
          className="mb-2 h-12 w-12 opacity-50"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
        <p className="text-sm">No backups found</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Create your first backup to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Table Container with max height and scroll */}
      <div className="max-h-[400px] overflow-y-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0">
            <tr className="border-b">
              <th className="px-3 py-2 text-left font-semibold">Date</th>
              <th className="px-3 py-2 text-left font-semibold">Type</th>
              <th className="px-3 py-2 text-left font-semibold">Size</th>
              <th className="px-3 py-2 text-left font-semibold">Status</th>
              <th className="px-3 py-2 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((backup) => (
              <tr
                key={backup.id}
                className="hover:bg-muted/30 border-b last:border-0"
              >
                <td className="px-3 py-3 text-xs">
                  {formatDate(backup.createdAt)}
                </td>
                <td className="px-3 py-3">
                  <Badge
                    variant={
                      backup.type === "MANUAL"
                        ? "default"
                        : backup.type === "DAILY"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {backup.type}
                  </Badge>
                </td>
                <td className="text-muted-foreground px-3 py-3 text-xs">
                  {formatBytes(backup.size)}
                </td>
                <td className="px-3 py-3">
                  <Badge
                    variant={
                      backup.status === "COMPLETED"
                        ? "secondary"
                        : backup.status === "FAILED"
                          ? "destructive"
                          : "muted"
                    }
                  >
                    {backup.status}
                  </Badge>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {backup.status === "COMPLETED" && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setActiveActionId(backup.id);
                            downloadMutation.mutate(backup.id);
                          }}
                          disabled={
                            activeActionId === backup.id &&
                            downloadMutation.isPending
                          }
                          title="Download"
                          className="h-8 w-8 p-0"
                        >
                          {activeActionId === backup.id &&
                          downloadMutation.isPending ? (
                            <svg
                              className="h-4 w-4 animate-spin"
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
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setActiveActionId(backup.id);
                            verifyMutation.mutate(backup.id);
                          }}
                          disabled={
                            activeActionId === backup.id &&
                            verifyMutation.isPending
                          }
                          title="Verify"
                          className="h-8 w-8 p-0"
                        >
                          {activeActionId === backup.id &&
                          verifyMutation.isPending ? (
                            <svg
                              className="h-4 w-4 animate-spin"
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
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (
                          confirm(
                            "Are you sure you want to delete this backup? This action cannot be undone."
                          )
                        ) {
                          setActiveActionId(backup.id);
                          deleteMutation.mutate(backup.id);
                        }
                      }}
                      disabled={
                        activeActionId === backup.id && deleteMutation.isPending
                      }
                      title="Delete"
                      className="text-destructive hover:text-destructive h-8 w-8 p-0"
                    >
                      {activeActionId === backup.id &&
                      deleteMutation.isPending ? (
                        <svg
                          className="h-4 w-4 animate-spin"
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
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Status Messages */}
      {downloadMutation.isSuccess && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-900 dark:bg-green-950 dark:text-green-100">
          Download initiated successfully!
        </div>
      )}
      {downloadMutation.isError && (
        <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
          Download failed: {downloadMutation.error?.message}
        </div>
      )}

      {verifyMutation.isSuccess && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-900 dark:bg-green-950 dark:text-green-100">
          Backup verified successfully!
        </div>
      )}
      {verifyMutation.isError && (
        <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
          Verification failed: {verifyMutation.error?.message}
        </div>
      )}

      {deleteMutation.isSuccess && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-900 dark:bg-green-950 dark:text-green-100">
          Backup deleted successfully!
        </div>
      )}
      {deleteMutation.isError && (
        <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
          Delete failed: {deleteMutation.error?.message}
        </div>
      )}

      {data.hasMore && (
        <p className="text-muted-foreground text-center text-xs">
          Showing {data.items.length} of {data.total} backups
        </p>
      )}
    </div>
  );
}
