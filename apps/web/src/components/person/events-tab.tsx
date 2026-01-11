"use client";

import { useState } from "react";
import { Card, CardContent, Button } from "@vamsa/ui/primitives";
import { EventTimeline } from "../events/event-timeline";
import { EventDetailModal } from "./event-detail-modal";
import { EventFormModal } from "./event-form-modal";
import { type EventType } from "@vamsa/schemas";

interface EventData {
  id: string;
  type: EventType;
  date: string | null;
  place: string | null;
  description: string | null;
  participants: Array<{
    id: string;
    personId: string;
    role: string | null;
    person: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

interface EventsTabProps {
  events: EventData[];
  personId: string;
}

export function EventsTab({ events, personId }: EventsTabProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  if (events.length === 0) {
    return (
      <>
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="font-display text-foreground mb-2 text-xl">
              No Events Recorded
            </h3>
            <p className="text-muted-foreground mb-4">
              Life events and milestones will appear here once added.
            </p>
            <Button
              onClick={() => setIsFormModalOpen(true)}
              data-testid="add-event-button"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Event
            </Button>
          </CardContent>
        </Card>

        <EventFormModal
          personId={personId}
          open={isFormModalOpen}
          onOpenChange={setIsFormModalOpen}
        />
      </>
    );
  }

  // Group events by type
  const eventsByType = events.reduce(
    (acc, event) => {
      const type = event.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(event);
      return acc;
    },
    {} as Record<EventType, EventData[]>
  );

  // Sort events chronologically (most recent first)
  const sortedEvents = [...events].sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <>
      <div className="space-y-6">
        {/* Add Event Button */}
        <div className="flex justify-end">
          <Button
            onClick={() => setIsFormModalOpen(true)}
            data-testid="add-event-button"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Event
          </Button>
        </div>

        {/* Timeline view */}
        <Card>
          <CardContent className="py-6">
            <h3 className="font-display text-foreground mb-6 text-lg">
              Timeline
            </h3>
            <EventTimeline
              events={sortedEvents}
              onEventClick={(eventId) => setSelectedEventId(eventId)}
            />
          </CardContent>
        </Card>

        {/* Grouped by type */}
        <div className="space-y-4">
          <h3 className="font-display text-foreground text-lg">By Type</h3>
          {Object.entries(eventsByType).map(([type, typeEvents]) => (
            <Card key={type}>
              <CardContent className="py-4">
                <details open className="group">
                  <summary className="hover:text-primary flex cursor-pointer items-center justify-between transition-colors">
                    <h4 className="font-display text-foreground text-base">
                      {formatEventTypePlural(type as EventType)} (
                      {typeEvents.length})
                    </h4>
                    <svg
                      className="text-muted-foreground h-5 w-5 transition-transform group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </summary>
                  <div className="mt-4 space-y-2">
                    {typeEvents
                      .sort((a, b) => {
                        if (!a.date) return 1;
                        if (!b.date) return -1;
                        return (
                          new Date(b.date).getTime() -
                          new Date(a.date).getTime()
                        );
                      })
                      .map((event) => (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEventId(event.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedEventId(event.id);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          className="border-border hover:border-primary/30 hover:bg-accent/5 cursor-pointer rounded-md border p-3 transition-all duration-200"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-1">
                              {event.date && (
                                <p className="text-foreground font-mono text-sm font-medium">
                                  {new Date(event.date).toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                    }
                                  )}
                                </p>
                              )}
                              {event.place && (
                                <p className="text-muted-foreground text-sm">
                                  {event.place}
                                </p>
                              )}
                              {event.description && (
                                <p className="text-muted-foreground line-clamp-1 text-sm">
                                  {event.description}
                                </p>
                              )}
                            </div>
                            <svg
                              className="text-muted-foreground h-5 w-5 shrink-0"
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
                          </div>
                        </div>
                      ))}
                  </div>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Event detail modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          personId={personId}
          onClose={() => setSelectedEventId(null)}
        />
      )}

      {/* Event form modal */}
      <EventFormModal
        personId={personId}
        open={isFormModalOpen}
        onOpenChange={setIsFormModalOpen}
      />
    </>
  );
}

function formatEventTypePlural(type: EventType): string {
  switch (type) {
    case "BIRTH":
      return "Births";
    case "DEATH":
      return "Deaths";
    case "MARRIAGE":
      return "Marriages";
    case "DIVORCE":
      return "Divorces";
    case "BURIAL":
      return "Burials";
    case "GRADUATION":
      return "Graduations";
    case "CUSTOM":
      return "Custom Events";
    default:
      return "Events";
  }
}
