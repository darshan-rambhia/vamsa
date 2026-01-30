import { Badge, Card, CardContent } from "@vamsa/ui/primitives";
import { formatDate } from "@vamsa/lib";
import type { EventType } from "@vamsa/schemas";

interface EventCardProps {
  event: {
    id: string;
    type: EventType;
    date: string | null;
    place: string | null;
    participants: Array<{
      id: string;
      person: {
        id: string;
        firstName: string;
        lastName: string;
      };
      role: string | null;
    }>;
  };
  onClick?: () => void;
}

export function EventCard({ event, onClick }: EventCardProps) {
  const eventTypeConfig = getEventTypeConfig(event.type);

  return (
    <Card
      className="hover:border-primary/30 hover:bg-accent/5 cursor-pointer transition-all duration-200"
      onClick={onClick}
    >
      <CardContent className="py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge className={eventTypeConfig.badgeClass} variant="outline">
                {eventTypeConfig.label}
              </Badge>
            </div>

            <div className="space-y-1">
              {event.date && (
                <p className="text-muted-foreground font-mono text-sm">
                  {formatDate(new Date(event.date))}
                </p>
              )}
              {event.place && (
                <p className="text-foreground text-sm">{event.place}</p>
              )}
            </div>

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

          <svg
            className="text-muted-foreground group-hover:text-primary h-5 w-5 shrink-0 transition-colors"
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
      </CardContent>
    </Card>
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
