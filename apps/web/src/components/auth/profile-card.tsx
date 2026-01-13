"use client";

import { Card, Button, cn } from "@vamsa/ui";
import { formatDate } from "@vamsa/lib";

interface ProfileCardProps {
  person: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    dateOfBirth: Date | null;
  };
  onClaim: () => void;
  highlighted?: boolean;
  disabled?: boolean;
}

export function ProfileCard({
  person,
  onClaim,
  highlighted = false,
  disabled = false,
}: ProfileCardProps) {
  return (
    <Card
      className={cn(
        "p-4 transition-all",
        highlighted && "border-primary bg-primary/5"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h4 className="font-display truncate text-base font-medium">
            {person.firstName} {person.lastName}
          </h4>
          {person.email && (
            <p className="text-muted-foreground truncate text-sm">
              {person.email}
            </p>
          )}
          {person.dateOfBirth && (
            <p className="text-muted-foreground text-sm">
              Born: {formatDate(person.dateOfBirth)}
            </p>
          )}
        </div>
        <Button
          onClick={onClaim}
          disabled={disabled}
          size="sm"
          variant={highlighted ? "default" : "outline"}
        >
          Claim Profile
        </Button>
      </div>
    </Card>
  );
}
