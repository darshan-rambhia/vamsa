import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@vamsa/api/convex/_generated/api";
import { formatDate, calculateAge } from "@vamsa/lib";
import { Id } from "@vamsa/api/convex/_generated/dataModel";
import { Container } from "@vamsa/ui";
import { Card, CardContent, Avatar, AvatarFallback, Badge, Button } from "@vamsa/ui/primitives";

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
      <Container>
        <div className="flex items-center justify-center py-16">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="h-24 w-24 rounded-full bg-muted" />
            <div className="h-6 w-48 rounded bg-muted" />
            <div className="h-4 w-32 rounded bg-muted" />
          </div>
        </div>
      </Container>
    );
  }

  if (person === null) {
    return (
      <Container>
        <Card className="max-w-md mx-auto">
          <CardContent className="py-12 text-center">
            <div className="mb-4 text-muted-foreground/50">
              <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="font-display text-xl text-foreground mb-2">Person Not Found</h2>
            <p className="text-muted-foreground mb-6">
              This person may have been removed or the link is incorrect.
            </p>
            <Button asChild>
              <Link to="/people">Back to People</Link>
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  const birthDate = person.dateOfBirth ? new Date(person.dateOfBirth) : null;
  const deathDate = person.dateOfPassing ? new Date(person.dateOfPassing) : null;
  const age = calculateAge(birthDate, deathDate);
  const initials = `${person.firstName?.[0] || ""}${person.lastName?.[0] || ""}`.toUpperCase();

  return (
    <Container>
      {/* Back link */}
      <Link
        to="/people"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to People
      </Link>

      {/* Person header card */}
      <Card className="mb-6">
        <CardContent className="py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Avatar className="h-24 w-24 text-2xl">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="font-display text-3xl text-foreground">
                  {person.firstName} {person.lastName}
                </h1>
                {person.isLiving ? (
                  <Badge variant="secondary">Living</Badge>
                ) : (
                  <Badge variant="outline">Deceased</Badge>
                )}
              </div>

              {(birthDate || person.birthPlace) && (
                <p className="text-muted-foreground">
                  {birthDate && (
                    <span className="font-mono text-sm">
                      {formatDate(birthDate)}
                      {person.isLiving && age !== null && ` · ${age} years old`}
                      {!person.isLiving && age !== null && ` — ${formatDate(deathDate!)} · lived ${age} years`}
                    </span>
                  )}
                  {birthDate && person.birthPlace && " · "}
                  {person.birthPlace && <span>Born in {person.birthPlace}</span>}
                </p>
              )}
            </div>

            <Button asChild variant="outline">
              <Link to="/people/$personId/edit" params={{ personId }}>
                Edit Profile
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Details grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Info */}
        <Card>
          <CardContent className="py-6">
            <h3 className="font-display text-lg text-foreground mb-4">Personal Information</h3>
            <dl className="space-y-4">
              <DetailRow label="Gender" value={person.gender ?? "Not specified"} />
              {person.profession && <DetailRow label="Profession" value={person.profession} />}
              {person.employer && <DetailRow label="Employer" value={person.employer} />}
            </dl>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardContent className="py-6">
            <h3 className="font-display text-lg text-foreground mb-4">Contact Information</h3>
            <dl className="space-y-4">
              {person.email ? (
                <DetailRow
                  label="Email"
                  value={
                    <a href={`mailto:${person.email}`} className="text-primary hover:underline">
                      {person.email}
                    </a>
                  }
                />
              ) : (
                <DetailRow label="Email" value="Not provided" muted />
              )}
              {person.phone ? (
                <DetailRow label="Phone" value={person.phone} />
              ) : (
                <DetailRow label="Phone" value="Not provided" muted />
              )}
            </dl>
          </CardContent>
        </Card>
      </div>

      {/* Bio section */}
      {person.bio && (
        <Card className="mt-6">
          <CardContent className="py-6">
            <h3 className="font-display text-lg text-foreground mb-4">About</h3>
            <p className="whitespace-pre-wrap text-foreground leading-relaxed">
              {person.bio}
            </p>
          </CardContent>
        </Card>
      )}
    </Container>
  );
}

function DetailRow({
  label,
  value,
  muted = false
}: {
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={muted ? "text-muted-foreground/60 text-sm" : "text-foreground"}>
        {value}
      </dd>
    </div>
  );
}
