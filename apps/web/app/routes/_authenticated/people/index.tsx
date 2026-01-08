import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@vamsa/api/convex/_generated/api";

export const Route = createFileRoute("/_authenticated/people/")({
  component: PeopleListComponent,
});

function PeopleListComponent() {
  const { token } = Route.useRouteContext();
  const persons = useQuery(api.persons.list, { token });

  if (persons === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">People</h1>
        <Link
          to="/people/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Add Person
        </Link>
      </div>

      {persons.items.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">No people in your family tree yet.</p>
          <Link
            to="/people/new"
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add the first person
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {persons.items.map((person) => (
            <Link
              key={person._id}
              to="/people/$personId"
              params={{ personId: person._id }}
              className="block rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-accent"
            >
              <h3 className="font-medium text-foreground">
                {person.firstName} {person.lastName}
              </h3>
              {person.profession && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {person.profession}
                </p>
              )}
              {!person.isLiving && (
                <span className="mt-2 inline-block rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                  Deceased
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
