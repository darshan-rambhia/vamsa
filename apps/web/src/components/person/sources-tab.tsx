"use client";

import { useState } from "react";
import { Card, CardContent, Badge, Button } from "@vamsa/ui/primitives";
import type { PersonSourcesResponse, SourceWithEvents } from "~/server/sources";
import { SourceDetailModal } from "./source-detail-modal";

interface SourcesTabProps {
  sources: PersonSourcesResponse;
}

export function SourcesTab({ sources }: SourcesTabProps) {
  const [selectedSource, setSelectedSource] = useState<SourceWithEvents | null>(
    null
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedEventTypes, setExpandedEventTypes] = useState<Set<string>>(
    new Set(Object.keys(sources))
  );

  const eventTypes = Object.keys(sources);
  const hasNoSources = eventTypes.length === 0;

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

  const handleSourceClick = (source: SourceWithEvents) => {
    setSelectedSource(source);
    setModalOpen(true);
  };

  if (hasNoSources) {
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
            No Sources Yet
          </h3>
          <p className="text-muted-foreground">
            Sources provide documentation and proof for life events. They will
            appear here once added.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {eventTypes.map((eventType) => {
        const eventSources = sources[eventType];
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
                <Badge variant="muted">{eventSources.length}</Badge>
              </button>

              {isExpanded && (
                <div className="mt-4 space-y-3 pl-8">
                  {eventSources.map((source) => (
                    <SourceCard
                      key={source.id}
                      source={source}
                      onClick={() => handleSourceClick(source)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <SourceDetailModal
        source={selectedSource}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}

interface SourceCardProps {
  source: SourceWithEvents;
  onClick: () => void;
}

function SourceCard({ source, onClick }: SourceCardProps) {
  return (
    <button
      onClick={onClick}
      className="border-border bg-card hover:border-primary/30 hover:bg-accent/5 group w-full rounded-md border-2 p-4 text-left transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h4 className="text-foreground group-hover:text-primary mb-1 font-medium transition-colors">
            {source.title}
          </h4>
          {source.author && (
            <p className="text-muted-foreground mb-2 text-sm">
              by {source.author}
            </p>
          )}
          {source.publicationDate && (
            <p className="text-muted-foreground font-mono text-xs">
              {source.publicationDate}
            </p>
          )}
        </div>
        <svg
          className="text-muted-foreground group-hover:text-primary h-5 w-5 shrink-0 transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

function formatEventType(eventType: string): string {
  return eventType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
