import {
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@vamsa/ui/primitives";
import type { SourceWithEvents } from "~/server/sources";

interface SourceDetailModalProps {
  source: SourceWithEvents | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SourceDetailModal({
  source,
  open,
  onOpenChange,
}: SourceDetailModalProps) {
  if (!source) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display pr-8 text-2xl">
            {source.title}
          </DialogTitle>
          {source.author && (
            <DialogDescription className="text-base">
              by {source.author}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* Event Types */}
          {source.eventTypes.length > 0 && (
            <div>
              <h4 className="text-muted-foreground mb-2 text-sm font-medium">
                Referenced in Events
              </h4>
              <div className="flex flex-wrap gap-2">
                {source.eventTypes.map((eventType) => (
                  <Badge key={eventType} variant="secondary">
                    {formatEventType(eventType)}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Publication Details */}
          {source.publicationDate && (
            <div>
              <h4 className="text-muted-foreground mb-1 text-sm font-medium">
                Publication Date
              </h4>
              <p className="text-foreground">{source.publicationDate}</p>
            </div>
          )}

          {/* Repository */}
          {source.repository && (
            <div>
              <h4 className="text-muted-foreground mb-1 text-sm font-medium">
                Repository
              </h4>
              <p className="text-foreground">{source.repository}</p>
            </div>
          )}

          {/* Description */}
          {source.description && (
            <div>
              <h4 className="text-muted-foreground mb-1 text-sm font-medium">
                Description
              </h4>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {source.description}
              </p>
            </div>
          )}

          {/* Notes */}
          {source.notes && (
            <div>
              <h4 className="text-muted-foreground mb-1 text-sm font-medium">
                Notes
              </h4>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                {source.notes}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatEventType(eventType: string): string {
  return eventType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
