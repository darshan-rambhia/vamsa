"use client";

import { formatDate, calculateAge } from "@vamsa/lib";
import { Button } from "@vamsa/ui/primitives";
import { AvatarImage } from "~/components/ui/avatar-image";
import { cn } from "@vamsa/ui";

export interface ChartTooltipProps {
  node: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    dateOfPassing: string | null;
    isLiving: boolean;
    photoUrl: string | null;
    gender: string | null;
  };
  position: { x: number; y: number };
  rootPersonId: string;
  onSetAsCenter: (nodeId: string) => void;
  onViewProfile: (nodeId: string) => void;
  relationshipLabel?: string;
}

export function ChartTooltip({
  node,
  position,
  rootPersonId,
  onSetAsCenter,
  onViewProfile,
  relationshipLabel,
}: ChartTooltipProps) {
  // Calculate age
  const age = calculateAge(
    node.dateOfBirth ? new Date(node.dateOfBirth) : null,
    node.dateOfPassing ? new Date(node.dateOfPassing) : null
  );

  // Format dates
  const birthDate = formatDate(node.dateOfBirth);
  const deathDate = formatDate(node.dateOfPassing);

  // Determine tooltip position to avoid viewport overflow
  const tooltipWidth = 320;
  const tooltipHeight = 240;
  const padding = 16;

  const viewportWidth =
    typeof window !== "undefined" ? window.innerWidth : 1920;
  const viewportHeight =
    typeof window !== "undefined" ? window.innerHeight : 1080;

  let left = position.x + padding;
  let top = position.y + padding;

  // Adjust horizontal position if overflowing right edge
  if (left + tooltipWidth > viewportWidth - padding) {
    left = position.x - tooltipWidth - padding;
  }

  // Adjust horizontal position if overflowing left edge
  if (left < padding) {
    left = padding;
  }

  // Adjust vertical position if overflowing bottom edge
  if (top + tooltipHeight > viewportHeight - padding) {
    top = position.y - tooltipHeight - padding;
  }

  // Adjust vertical position if overflowing top edge
  if (top < padding) {
    top = padding;
  }

  const isRootPerson = node.id === rootPersonId;

  return (
    <div
      className={cn(
        // Positioning
        "fixed z-50",
        // Dimensions
        "w-80",
        // Visual styling
        "bg-card border-border text-card-foreground rounded-lg border-2 shadow-lg",
        // Animation
        "animate-in fade-in-0 zoom-in-95 duration-200"
      )}
      style={{
        left: `${left}px`,
        top: `${top}px`,
      }}
    >
      {/* Header with photo and name */}
      <div className="border-border flex items-start gap-3 border-b p-4">
        <AvatarImage
          mediaId={null}
          alt={`${node.firstName} ${node.lastName}`}
          fallbackInitials={`${node.firstName.charAt(0)}${node.lastName.charAt(0)}`}
          size="lg"
          thumbnailPath={node.photoUrl}
          webpPath={node.photoUrl}
          filePath={node.photoUrl}
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-foreground truncate text-lg leading-tight font-semibold">
            {node.firstName} {node.lastName}
          </h3>
          {relationshipLabel && !isRootPerson && (
            <p className="text-muted-foreground text-sm">{relationshipLabel}</p>
          )}
          {isRootPerson && (
            <p className="text-primary text-sm font-medium">Root Person</p>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 p-4">
        {/* Birth date */}
        {birthDate && (
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground text-sm font-medium">
              Born:
            </span>
            <span className="text-foreground flex-1 text-sm">{birthDate}</span>
          </div>
        )}

        {/* Death date or age */}
        {node.isLiving ? (
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground text-sm font-medium">
              Age:
            </span>
            <span className="text-foreground flex-1 text-sm">
              {age !== null ? `${age} years` : "Unknown"}
            </span>
          </div>
        ) : (
          deathDate && (
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground text-sm font-medium">
                Died:
              </span>
              <span className="text-foreground flex-1 text-sm">
                {deathDate}
                {age !== null && ` (age ${age})`}
              </span>
            </div>
          )
        )}

        {/* Gender */}
        {node.gender && (
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground text-sm font-medium">
              Gender:
            </span>
            <span className="text-foreground flex-1 text-sm capitalize">
              {node.gender.toLowerCase()}
            </span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="border-border flex gap-2 border-t p-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onViewProfile(node.id)}
          className="flex-1"
        >
          View Profile
        </Button>
        {!isRootPerson && (
          <Button
            size="sm"
            variant="default"
            onClick={() => onSetAsCenter(node.id)}
            className="flex-1"
          >
            Set as Center
          </Button>
        )}
      </div>
    </div>
  );
}
