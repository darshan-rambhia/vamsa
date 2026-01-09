"use client";

import { Badge, Button } from "@vamsa/ui/primitives";
import { Link } from "@tanstack/react-router";
import { formatDate } from "@vamsa/lib";
import { type EventType } from "@vamsa/schemas";

interface EventDetailModalProps {
  event: {
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
  };
  onClose: () => void;
}

export function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const eventTypeConfig = getEventTypeConfig(event.type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="bg-background/80 absolute inset-0 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="bg-card border-border relative z-10 mx-4 w-full max-w-2xl rounded-lg border-2 shadow-xl">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-foreground text-2xl">
              Event Details
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="hover:bg-accent"
          >
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

        {/* Content */}
        <div className="max-h-[70vh] space-y-6 overflow-y-auto px-6 py-6">
          {/* Event Type */}
          <div>
            <label className="text-muted-foreground mb-2 block text-sm">
              Event Type
            </label>
            <Badge className={eventTypeConfig.badgeClass} variant="outline">
              {eventTypeConfig.label}
            </Badge>
          </div>

          {/* Date */}
          {event.date && (
            <div>
              <label className="text-muted-foreground mb-2 block text-sm">
                Date
              </label>
              <p className="text-foreground font-mono">
                {formatDate(new Date(event.date))}
              </p>
            </div>
          )}

          {/* Place */}
          {event.place && (
            <div>
              <label className="text-muted-foreground mb-2 block text-sm">
                Place
              </label>
              <p className="text-foreground">{event.place}</p>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div>
              <label className="text-muted-foreground mb-2 block text-sm">
                Description
              </label>
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {event.description}
              </p>
            </div>
          )}

          {/* Participants */}
          {event.participants.length > 0 && (
            <div>
              <label className="text-muted-foreground mb-3 block text-sm">
                Participants
              </label>
              <div className="space-y-2">
                {event.participants.map((participant) => (
                  <Link
                    key={participant.id}
                    to="/people/$personId"
                    params={{ personId: participant.person.id }}
                    className="border-border bg-card hover:border-primary/30 hover:bg-accent/5 group flex items-center justify-between rounded-md border-2 p-3 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium">
                        {participant.person.firstName[0]}
                        {participant.person.lastName[0]}
                      </div>
                      <div>
                        <div className="text-foreground group-hover:text-primary text-sm font-medium transition-colors">
                          {participant.person.firstName}{" "}
                          {participant.person.lastName}
                        </div>
                        {participant.role && (
                          <div className="text-muted-foreground text-xs">
                            {participant.role}
                          </div>
                        )}
                      </div>
                    </div>
                    <svg
                      className="text-muted-foreground group-hover:text-primary h-4 w-4 transition-colors"
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
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-border border-t px-6 py-4">
          <Button onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function getEventTypeConfig(type: EventType): {
  label: string;
  badgeClass: string;
} {
  switch (type) {
    case "BIRTH":
      return {
        label: "Birth",
        badgeClass:
          "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
      };
    case "DEATH":
      return {
        label: "Death",
        badgeClass:
          "border-gray-500/50 bg-gray-500/10 text-gray-700 dark:text-gray-400",
      };
    case "MARRIAGE":
      return {
        label: "Marriage",
        badgeClass:
          "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400",
      };
    case "DIVORCE":
      return {
        label: "Divorce",
        badgeClass:
          "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400",
      };
    case "BURIAL":
      return {
        label: "Burial",
        badgeClass:
          "border-gray-500/50 bg-gray-500/10 text-gray-700 dark:text-gray-400",
      };
    case "GRADUATION":
      return {
        label: "Graduation",
        badgeClass:
          "border-purple-500/50 bg-purple-500/10 text-purple-700 dark:text-purple-400",
      };
    case "CUSTOM":
      return {
        label: "Event",
        badgeClass: "border-border bg-muted text-foreground",
      };
    default:
      return {
        label: "Event",
        badgeClass: "border-border bg-muted text-foreground",
      };
  }
}
