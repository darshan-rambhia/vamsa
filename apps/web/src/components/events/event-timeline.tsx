import { Badge } from "@vamsa/ui/primitives";
import { formatDate } from "@vamsa/lib";
import { type EventType } from "@vamsa/schemas";

interface EventTimelineProps {
  events: Array<{
    id: string;
    type: EventType;
    date: string | null;
    place: string | null;
    description: string | null;
    participants: Array<{
      id: string;
      person: {
        id: string;
        firstName: string;
        lastName: string;
      };
      role: string | null;
    }>;
  }>;
  onEventClick?: (eventId: string) => void;
}

export function EventTimeline({ events, onEventClick }: EventTimelineProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <div className="relative space-y-6 pl-8 sm:pl-12">
      {/* Vertical line */}
      <div className="bg-border absolute left-3 top-0 h-full w-0.5 sm:left-5" />

      {events.map((event, index) => {
        const eventTypeConfig = getEventTypeConfig(event.type);

        return (
          <div
            key={event.id}
            className="group relative"
            onClick={() => onEventClick?.(event.id)}
          >
            {/* Timeline dot */}
            <div
              className={`border-background absolute -left-8 top-1 flex h-6 w-6 items-center justify-center rounded-full border-4 sm:-left-12 ${eventTypeConfig.dotClass}`}
            />

            {/* Event content */}
            <div className="border-border bg-card hover:border-primary/30 hover:bg-accent/5 cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 sm:p-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={eventTypeConfig.badgeClass}
                    variant="outline"
                  >
                    {eventTypeConfig.label}
                  </Badge>
                  {event.date && (
                    <span className="text-muted-foreground font-mono text-sm">
                      {formatDate(new Date(event.date))}
                    </span>
                  )}
                </div>

                {event.place && (
                  <div className="flex items-start gap-2">
                    <svg
                      className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <p className="text-foreground text-sm">{event.place}</p>
                  </div>
                )}

                {event.description && (
                  <p className="text-muted-foreground line-clamp-2 text-sm">
                    {event.description}
                  </p>
                )}

                {event.participants.length > 0 && (
                  <div className="flex items-center gap-2">
                    <svg
                      className="text-muted-foreground h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                    <span className="text-muted-foreground text-sm">
                      {event.participants.length}{" "}
                      {event.participants.length === 1
                        ? "participant"
                        : "participants"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getEventTypeConfig(type: EventType): {
  label: string;
  badgeClass: string;
  dotClass: string;
} {
  switch (type) {
    case "BIRTH":
      return {
        label: "Birth",
        badgeClass:
          "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
        dotClass: "bg-green-500",
      };
    case "DEATH":
      return {
        label: "Death",
        badgeClass:
          "border-gray-500/50 bg-gray-500/10 text-gray-700 dark:text-gray-400",
        dotClass: "bg-gray-500",
      };
    case "MARRIAGE":
      return {
        label: "Marriage",
        badgeClass:
          "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400",
        dotClass: "bg-blue-500",
      };
    case "DIVORCE":
      return {
        label: "Divorce",
        badgeClass:
          "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400",
        dotClass: "bg-orange-500",
      };
    case "BURIAL":
      return {
        label: "Burial",
        badgeClass:
          "border-gray-500/50 bg-gray-500/10 text-gray-700 dark:text-gray-400",
        dotClass: "bg-gray-500",
      };
    case "GRADUATION":
      return {
        label: "Graduation",
        badgeClass:
          "border-purple-500/50 bg-purple-500/10 text-purple-700 dark:text-purple-400",
        dotClass: "bg-purple-500",
      };
    case "CUSTOM":
      return {
        label: "Event",
        badgeClass: "border-border bg-muted text-foreground",
        dotClass: "bg-muted-foreground",
      };
    default:
      return {
        label: "Event",
        badgeClass: "border-border bg-muted text-foreground",
        dotClass: "bg-muted-foreground",
      };
  }
}
