"use client";

import { useState, useEffect } from "react";
import { Badge, Button } from "@vamsa/ui/primitives";

interface MediaViewerModalProps {
  media: {
    id: string;
    filePath: string;
    title: string | null;
    description: string | null;
    source: string | null;
    fileSize: number;
    format: string;
    width: number | null;
    height: number | null;
    uploadedAt: string;
  };
  allMediaIds: string[];
  relatedEvents?: Array<{
    id: string;
    eventType: string;
    personId: string;
  }>;
  onClose: () => void;
  onNavigate?: (mediaId: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function MediaViewerModal({
  media,
  allMediaIds,
  relatedEvents,
  onClose,
  onNavigate,
  onEdit,
  onDelete,
}: MediaViewerModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const currentIndex = allMediaIds.indexOf(media.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allMediaIds.length - 1;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft" && hasPrev && onNavigate) {
        onNavigate(allMediaIds[currentIndex - 1]);
      } else if (e.key === "ArrowRight" && hasNext && onNavigate) {
        onNavigate(allMediaIds[currentIndex + 1]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, allMediaIds, hasPrev, hasNext, onNavigate, onClose]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="bg-background/95 absolute inset-0 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close viewer"
      />

      {/* Modal */}
      <div className="border-border bg-card relative z-10 mx-4 flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border-2 shadow-2xl">
        {/* Header */}
        <div className="border-border flex shrink-0 items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-foreground text-xl">
              {media.title || "Photo"}
            </h2>
            <Badge variant="muted">{media.format}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit}>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Image viewer */}
          <div className="bg-muted/20 relative flex flex-1 items-center justify-center p-8">
            <img
              src={media.filePath}
              alt={media.title || "Photo"}
              className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
            />

            {/* Navigation arrows */}
            {onNavigate && hasPrev && (
              <button
                onClick={() => onNavigate(allMediaIds[currentIndex - 1])}
                className="border-border bg-card hover:border-primary hover:bg-primary/10 absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-2 shadow-lg transition-all"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
            {onNavigate && hasNext && (
              <button
                onClick={() => onNavigate(allMediaIds[currentIndex + 1])}
                className="border-border bg-card hover:border-primary hover:bg-primary/10 absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-2 shadow-lg transition-all"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Metadata sidebar */}
          <div className="border-border w-full shrink-0 space-y-6 overflow-y-auto border-t p-6 lg:w-80 lg:border-l lg:border-t-0">
            {/* Description */}
            {media.description && (
              <div>
                <span className="text-muted-foreground mb-2 block text-sm font-medium">
                  Description
                </span>
                <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
                  {media.description}
                </p>
              </div>
            )}

            {/* Source */}
            {media.source && (
              <div>
                <span className="text-muted-foreground mb-2 block text-sm font-medium">
                  Source
                </span>
                <p className="text-foreground text-sm">{media.source}</p>
              </div>
            )}

            {/* File info */}
            <div>
              <span className="text-muted-foreground mb-3 block text-sm font-medium">
                File Information
              </span>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Format</dt>
                  <dd className="text-foreground font-medium">
                    {media.format}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Size</dt>
                  <dd className="text-foreground font-medium">
                    {formatFileSize(media.fileSize)}
                  </dd>
                </div>
                {media.width && media.height && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Dimensions</dt>
                    <dd className="text-foreground font-medium">
                      {media.width} × {media.height}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Uploaded</dt>
                  <dd className="text-foreground font-medium">
                    {formatDate(media.uploadedAt)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Related events */}
            {relatedEvents && relatedEvents.length > 0 && (
              <div>
                <span className="text-muted-foreground mb-3 block text-sm font-medium">
                  Related Events
                </span>
                <div className="space-y-2">
                  {relatedEvents.map((event) => (
                    <div
                      key={event.id}
                      className="border-border rounded-md border p-3"
                    >
                      <p className="text-foreground text-sm font-medium">
                        {event.eventType}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="z-60 fixed inset-0 flex items-center justify-center">
          <button
            type="button"
            className="bg-background/80 absolute inset-0 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
            aria-label="Close delete confirmation"
          />
          <div className="bg-card border-border relative z-10 mx-4 w-full max-w-md rounded-lg border-2 p-6 shadow-xl">
            <h3 className="font-display text-foreground mb-4 text-xl">
              Delete Photo?
            </h3>
            <p className="text-muted-foreground mb-6 text-sm">
              This action cannot be undone. The photo will be permanently
              removed from the system.
            </p>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  onDelete?.();
                }}
                className="flex-1"
              >
                Delete
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
