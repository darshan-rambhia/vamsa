import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@vamsa/api/convex/_generated/api";
import {
  PageHeader,
  Button,
  Card,
  CardContent,
  Avatar,
  Badge,
} from "@vamsa/ui";

export const Route = createFileRoute("/_authenticated/people/")({
  component: PeopleListComponent,
});

function PeopleListComponent() {
  const { token } = Route.useRouteContext();
  const persons = useQuery(api.persons.list, { token });

  if (persons === undefined) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <div className="mx-auto h-12 w-12 animate-pulse rounded-full bg-primary/20" />
          <p className="text-muted-foreground">Loading your family...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="People"
        description="Everyone in your family tree"
        actions={
          <Button asChild>
            <Link to="/people/new">Add Person</Link>
          </Button>
        }
      />

      {persons.items.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <svg
                className="h-10 w-10 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                />
              </svg>
            </div>
            <h3 className="font-display text-xl font-medium">
              No people yet
            </h3>
            <p className="mt-2 text-muted-foreground max-w-sm mx-auto">
              Start building your family tree by adding the first person.
            </p>
            <Button asChild className="mt-6">
              <Link to="/people/new">Add the first person</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {persons.items.map((person, index) => (
            <Link
              key={person._id}
              to="/people/$personId"
              params={{ personId: person._id }}
              className="group block"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Card className="h-full transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar
                      alt={`${person.firstName} ${person.lastName}`}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-lg font-medium truncate">
                        {person.firstName} {person.lastName}
                      </h3>
                      {person.profession && (
                        <p className="mt-1 text-sm text-muted-foreground truncate">
                          {person.profession}
                        </p>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {!person.isLiving && (
                          <Badge variant="muted">Deceased</Badge>
                        )}
                        {person.gender && (
                          <Badge variant="outline" className="text-xs">
                            {person.gender.charAt(0) + person.gender.slice(1).toLowerCase()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
