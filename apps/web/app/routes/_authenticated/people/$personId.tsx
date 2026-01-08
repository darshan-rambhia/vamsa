import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@vamsa/api/convex/_generated/api";
import { formatDate, calculateAge } from "@vamsa/lib";
import { Id } from "@vamsa/api/convex/_generated/dataModel";

export const Route = createFileRoute("/_authenticated/people/$personId")({
  component: PersonDetailComponent,
});

function PersonDetailComponent() {
  const { personId } = Route.useParams();
  const { token } = Route.useRouteContext();

  const person = useQuery(api.persons.get, {
    token,
    id: personId as Id<"persons">
  });

  if (person === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (person === null) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <h2 className="text-xl font-semibold text-foreground">Person not found</h2>
        <Link
          to="/people"
          className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Back to People
        </Link>
      </div>
    );
  }

  const birthDate = person.dateOfBirth ? new Date(person.dateOfBirth) : null;
  const deathDate = person.dateOfPassing ? new Date(person.dateOfPassing) : null;
  const age = calculateAge(birthDate, deathDate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/people"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            &larr; Back to People
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-foreground">
            {person.firstName} {person.lastName}
          </h1>
        </div>
        <Link
          to="/people/$personId/edit"
          params={{ personId }}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Edit
        </Link>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-muted-foreground">Gender</dt>
            <dd className="mt-1 text-foreground">{person.gender ?? "Not specified"}</dd>
          </div>

          {birthDate && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Date of Birth</dt>
              <dd className="mt-1 text-foreground">
                {formatDate(birthDate)}
                {person.isLiving && age !== null && ` (${age} years old)`}
              </dd>
            </div>
          )}

          {!person.isLiving && deathDate && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Date of Passing</dt>
              <dd className="mt-1 text-foreground">
                {formatDate(deathDate)}
                {age !== null && ` (lived ${age} years)`}
              </dd>
            </div>
          )}

          {person.birthPlace && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Birth Place</dt>
              <dd className="mt-1 text-foreground">{person.birthPlace}</dd>
            </div>
          )}

          {person.profession && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Profession</dt>
              <dd className="mt-1 text-foreground">{person.profession}</dd>
            </div>
          )}

          {person.employer && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Employer</dt>
              <dd className="mt-1 text-foreground">{person.employer}</dd>
            </div>
          )}

          {person.email && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Email</dt>
              <dd className="mt-1 text-foreground">
                <a href={`mailto:${person.email}`} className="text-primary hover:underline">
                  {person.email}
                </a>
              </dd>
            </div>
          )}

          {person.phone && (
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
              <dd className="mt-1 text-foreground">{person.phone}</dd>
            </div>
          )}
        </dl>

        {person.bio && (
          <div className="mt-6 border-t pt-6">
            <dt className="text-sm font-medium text-muted-foreground">About</dt>
            <dd className="mt-2 whitespace-pre-wrap text-foreground">{person.bio}</dd>
          </div>
        )}
      </div>
    </div>
  );
}
