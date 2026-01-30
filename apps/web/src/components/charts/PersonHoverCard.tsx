"use client";

import { calculateAge, formatDate } from "@vamsa/lib";
import {
  Badge,
  Button,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@vamsa/ui/primitives";
import { User } from "lucide-react";
import { AvatarImage } from "~/components/ui/avatar-image";

export interface PersonHoverCardProps {
  person: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string | null;
    dateOfPassing: string | null;
    isLiving: boolean;
    photoUrl: string | null;
    gender: string | null;
  };
  children: React.ReactNode;
  onViewDetails?: (id: string) => void;
  /** Delay before showing hover card in milliseconds (default: 300) */
  openDelay?: number;
  /** Delay before hiding hover card in milliseconds (default: 200) */
  closeDelay?: number;
}

export function PersonHoverCard({
  person,
  children,
  onViewDetails,
  openDelay = 300,
  closeDelay = 200,
}: PersonHoverCardProps) {
  // Calculate age
  const age = calculateAge(
    person.dateOfBirth ? new Date(person.dateOfBirth) : null,
    person.dateOfPassing ? new Date(person.dateOfPassing) : null
  );

  // Format dates
  const birthDate = formatDate(person.dateOfBirth);
  const deathDate = formatDate(person.dateOfPassing);

  return (
    <HoverCard openDelay={openDelay} closeDelay={closeDelay}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80" sideOffset={8}>
        <div className="space-y-4">
          {/* Header with avatar and name */}
          <div className="flex items-start gap-3">
            <AvatarImage
              mediaId={null}
              alt={`${person.firstName} ${person.lastName}`}
              fallbackInitials={`${person.firstName.charAt(0)}${person.lastName.charAt(0)}`}
              size="lg"
              thumbnailPath={person.photoUrl}
              webpPath={person.photoUrl}
              filePath={person.photoUrl}
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-foreground truncate leading-tight font-medium">
                {person.firstName} {person.lastName}
              </h3>
              {person.isLiving && (
                <Badge
                  variant="secondary"
                  className="bg-chart-1/10 text-chart-1 mt-1 rounded-full border-0"
                >
                  Living
                </Badge>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2">
            {/* Birth date */}
            {birthDate && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground font-medium">Born:</span>
                <span className="text-foreground">{birthDate}</span>
              </div>
            )}

            {/* Death date or age */}
            {person.isLiving
              ? age !== null && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground font-medium">
                      Age:
                    </span>
                    <span className="text-foreground">{age} years</span>
                  </div>
                )
              : deathDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground font-medium">
                      Died:
                    </span>
                    <span className="text-foreground">
                      {deathDate}
                      {age !== null && ` (age ${age})`}
                    </span>
                  </div>
                )}

            {/* Gender */}
            {person.gender && (
              <div className="flex items-center gap-2 text-sm">
                <User className="text-muted-foreground h-4 w-4" />
                <span className="text-foreground capitalize">
                  {person.gender.toLowerCase()}
                </span>
              </div>
            )}
          </div>

          {/* Action button */}
          {onViewDetails && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewDetails(person.id)}
              className="w-full"
            >
              View Details
            </Button>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
