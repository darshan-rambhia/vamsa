import { Card, CardContent } from "@vamsa/ui/primitives";
import { Link } from "@tanstack/react-router";
import { AddRelationshipButton } from "./add-relationship-button";

interface Relationship {
  id: string;
  type: string;
  relatedPerson: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface RelationshipsTabProps {
  relationships: Relationship[];
  personId: string;
  personName: string;
  onRelationshipAdded?: () => void;
}

export function RelationshipsTab({
  relationships,
  personId,
  personName,
  onRelationshipAdded,
}: RelationshipsTabProps) {
  if (relationships.length === 0) {
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
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <h3 className="font-display text-foreground mb-2 text-xl">
            No Relationships Yet
          </h3>
          <p className="text-muted-foreground mb-4">
            Family relationships will appear here once added.
          </p>
          <AddRelationshipButton
            personId={personId}
            personName={personName}
            onSuccess={onRelationshipAdded}
          />
        </CardContent>
      </Card>
    );
  }

  // Group relationships by type
  const relationshipsByType = relationships.reduce(
    (acc, rel) => {
      const type = rel.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(rel);
      return acc;
    },
    {} as Record<string, Relationship[]>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <AddRelationshipButton
          personId={personId}
          personName={personName}
          onSuccess={onRelationshipAdded}
        />
      </div>
      {Object.entries(relationshipsByType).map(([type, rels]) => (
        <Card key={type}>
          <CardContent className="py-6">
            <h3 className="font-display text-foreground mb-4 text-lg">
              {formatRelationType(type)}
            </h3>
            <div className="space-y-3">
              {rels.map((rel) => (
                <Link
                  key={rel.id}
                  to="/people/$personId"
                  params={{ personId: rel.relatedPerson.id }}
                  className="border-border bg-card hover:border-primary/30 hover:bg-accent/5 group flex items-center justify-between rounded-md border-2 p-4 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full font-medium">
                      {rel.relatedPerson.firstName[0]}
                      {rel.relatedPerson.lastName[0]}
                    </div>
                    <div>
                      <div className="text-foreground group-hover:text-primary font-medium transition-colors">
                        {rel.relatedPerson.firstName}{" "}
                        {rel.relatedPerson.lastName}
                      </div>
                      <div className="text-muted-foreground text-sm">
                        {formatRelationType(type, true)}
                      </div>
                    </div>
                  </div>
                  <svg
                    className="text-muted-foreground group-hover:text-primary h-5 w-5 transition-colors"
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatRelationType(type: string, singular = false): string {
  const formatted = type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  if (singular) {
    return formatted;
  }

  // Pluralize for section headers
  if (type === "CHILD") return "Children";
  if (type === "SPOUSE") return "Spouses";
  if (type === "SIBLING") return "Siblings";
  if (type === "PARENT") return "Parents";
  return formatted + "s";
}
