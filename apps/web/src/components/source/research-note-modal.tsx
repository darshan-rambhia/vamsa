"use client";

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@vamsa/ui/primitives";

interface ResearchNote {
  id: string;
  eventType: string;
  findings: string;
  methodology: string | null;
  limitations: string | null;
  relatedSources: Array<string>;
  conclusionReliability: string | null;
  createdAt: string;
  updatedAt: string;
  source: {
    id: string;
    title: string;
    author: string | null;
    sourceType: string | null;
  };
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface ResearchNoteModalProps {
  note: ResearchNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (note: ResearchNote) => void;
  onDelete?: (noteId: string) => void;
  relatedSourcesData?: Array<{ id: string; title: string }>;
}

export function ResearchNoteModal({
  note,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  relatedSourcesData = [],
}: ResearchNoteModalProps) {
  if (!note) return null;

  const getSourceTitle = (sourceId: string) => {
    return relatedSourcesData.find((s) => s.id === sourceId)?.title || sourceId;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="flex-1">
              <DialogTitle className="font-display mb-2 text-2xl">
                Research Note
              </DialogTitle>
              <div className="space-y-1">
                <p className="text-foreground text-lg font-medium">
                  {note.source.title}
                </p>
                {note.source.author && (
                  <p className="text-muted-foreground text-sm">
                    by {note.source.author}
                  </p>
                )}
              </div>
            </div>
            {note.conclusionReliability && (
              <ReliabilityBadge reliability={note.conclusionReliability} />
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Type & Source Type */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{formatEventType(note.eventType)}</Badge>
            {note.source.sourceType && (
              <Badge variant="outline">
                {formatSourceType(note.source.sourceType)}
              </Badge>
            )}
          </div>

          {/* Findings */}
          <div>
            <h4 className="text-muted-foreground mb-2 text-sm font-medium">
              Findings
            </h4>
            <div className="bg-muted/30 text-foreground rounded-md p-4 leading-relaxed">
              <p className="whitespace-pre-wrap">{note.findings}</p>
            </div>
          </div>

          {/* Methodology */}
          {note.methodology && (
            <div>
              <h4 className="text-muted-foreground mb-2 text-sm font-medium">
                Methodology
              </h4>
              <div className="bg-muted/30 text-foreground rounded-md p-4 leading-relaxed">
                <p className="whitespace-pre-wrap">{note.methodology}</p>
              </div>
            </div>
          )}

          {/* Limitations */}
          {note.limitations && (
            <div>
              <h4 className="text-muted-foreground mb-2 text-sm font-medium">
                Limitations
              </h4>
              <div className="bg-muted/30 text-foreground rounded-md p-4 leading-relaxed">
                <p className="whitespace-pre-wrap">{note.limitations}</p>
              </div>
            </div>
          )}

          {/* Related Sources */}
          {note.relatedSources.length > 0 && (
            <div>
              <h4 className="text-muted-foreground mb-2 text-sm font-medium">
                Related Sources
              </h4>
              <div className="space-y-2">
                {note.relatedSources.map((sourceId) => (
                  <div
                    key={sourceId}
                    className="border-border bg-card hover:bg-accent/5 rounded-md border px-3 py-2 transition-colors"
                  >
                    <p className="text-foreground text-sm font-medium">
                      {getSourceTitle(sourceId)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="border-border border-t pt-4">
            <div className="text-muted-foreground space-y-1 text-xs">
              {note.createdBy && (
                <p>
                  Created by {note.createdBy.name || note.createdBy.email} on{" "}
                  {new Date(note.createdAt).toLocaleDateString()}
                </p>
              )}
              <p>
                Last updated: {new Date(note.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          {(onEdit || onDelete) && (
            <div className="flex items-center justify-end gap-3 pt-4">
              {onDelete && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Are you sure you want to delete this research note?"
                      )
                    ) {
                      onDelete(note.id);
                      onOpenChange(false);
                    }
                  }}
                  className="text-destructive hover:text-destructive"
                >
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete
                </Button>
              )}
              {onEdit && (
                <Button onClick={() => onEdit(note)}>
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReliabilityBadge({ reliability }: { reliability: string }) {
  const colors: Record<string, string> = {
    CONCLUSIVE:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    PROBABLE:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    POSSIBLE:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    SPECULATIVE:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  };

  return (
    <span
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${colors[reliability] || "bg-muted text-muted-foreground"}`}
    >
      {reliability.charAt(0) + reliability.slice(1).toLowerCase()}
    </span>
  );
}

function formatEventType(eventType: string): string {
  return eventType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function formatSourceType(sourceType: string): string {
  return sourceType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
