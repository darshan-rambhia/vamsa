"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Button, Card, CardContent } from "@vamsa/ui/primitives";

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

interface ResearchNotesListProps {
  notes: Record<string, Array<ResearchNote>>;
  onViewNote: (note: ResearchNote) => void;
  onEditNote: (note: ResearchNote) => void;
  onDeleteNote: (noteId: string) => void;
  isLoading?: boolean;
}

export function ResearchNotesList({
  notes,
  onViewNote,
  onEditNote,
  onDeleteNote,
  isLoading,
}: ResearchNotesListProps) {
  const { t } = useTranslation(["people", "common"]);
  const [expandedEventTypes, setExpandedEventTypes] = useState<Set<string>>(
    new Set(Object.keys(notes))
  );

  const eventTypes = Object.keys(notes);
  const hasNoNotes = eventTypes.length === 0;

  const toggleEventType = (eventType: string) => {
    setExpandedEventTypes((prev) => {
      const next = new Set(prev);
      if (next.has(eventType)) {
        next.delete(eventType);
      } else {
        next.add(eventType);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="flex animate-pulse flex-col items-center gap-4">
            <div className="bg-muted h-12 w-12 rounded-full" />
            <div className="bg-muted h-4 w-32 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasNoNotes) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="text-muted-foreground/50 mb-4">
            <svg
              className="mx-auto h-16 w-16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="font-display text-foreground mb-2 text-xl">
            {t("people:noResearchNotes")}
          </h3>
          <p className="text-muted-foreground">
            {t("people:noResearchNotesMessage")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {eventTypes.map((eventType) => {
        const eventNotes = notes[eventType];
        const isExpanded = expandedEventTypes.has(eventType);

        return (
          <Card key={eventType}>
            <CardContent className="py-4">
              <button
                onClick={() => toggleEventType(eventType)}
                className="group flex w-full items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <svg
                    className={`text-muted-foreground h-5 w-5 transition-transform duration-200 ${
                      isExpanded ? "rotate-90" : ""
                    }`}
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
                  <h3 className="font-display text-foreground group-hover:text-primary text-lg transition-colors">
                    {formatEventType(eventType)}
                  </h3>
                </div>
                <Badge variant="muted">{eventNotes.length}</Badge>
              </button>

              {isExpanded && (
                <div className="mt-4 space-y-3 pl-8">
                  {eventNotes.map((note) => (
                    <ResearchNoteCard
                      key={note.id}
                      note={note}
                      onView={() => onViewNote(note)}
                      onEdit={() => onEditNote(note)}
                      onDelete={() => onDeleteNote(note.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface ResearchNoteCardProps {
  note: ResearchNote;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ResearchNoteCard({
  note,
  onView,
  onEdit,
  onDelete,
}: ResearchNoteCardProps) {
  const { t } = useTranslation(["people", "common"]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete();
    } else {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 3000);
    }
  };

  // Truncate findings to first 150 characters
  const findingsSnippet =
    note.findings.length > 150
      ? note.findings.substring(0, 150) + "..."
      : note.findings;

  return (
    <div className="border-border bg-card hover:border-primary/30 group rounded-md border-2 p-4 transition-all duration-200">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h4 className="text-foreground mb-1 font-medium">
            {note.source.title}
          </h4>
          {note.source.author && (
            <p className="text-muted-foreground text-sm">
              {t("people:by")} {note.source.author}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {note.conclusionReliability && (
            <ReliabilityBadge reliability={note.conclusionReliability} />
          )}
          {note.source.sourceType && (
            <Badge variant="outline">
              {formatSourceType(note.source.sourceType)}
            </Badge>
          )}
        </div>
      </div>

      <p className="text-muted-foreground mb-3 text-sm leading-relaxed">
        {findingsSnippet}
      </p>

      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onView}>
          {t("people:viewDetails")}
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit}>
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
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className={showDeleteConfirm ? "text-destructive" : ""}
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
          </Button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="bg-destructive/10 text-destructive mt-3 rounded-md px-3 py-2 text-sm">
          {t("people:clickDeleteAgainToConfirm")}
        </div>
      )}
    </div>
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
      className={`rounded-md px-2 py-1 text-xs font-medium ${colors[reliability] || "bg-muted text-muted-foreground"}`}
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
