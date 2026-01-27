import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPerson } from "~/server/persons.functions";
import { getPersonEvents } from "~/server/events";
import { getPersonPlaces } from "~/server/places";
import { getPersonMedia } from "~/server/media";
import { formatDate, calculateAge } from "@vamsa/lib";
import { Container } from "@vamsa/ui";
import {
  Card,
  CardContent,
  Avatar,
  Badge,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@vamsa/ui/primitives";
import type { PersonDetail } from "~/server/persons.functions";
import { OverviewTab } from "~/components/person/overview-tab";
import { RelationshipsTab } from "~/components/person/relationships-tab";
import { EventsTab } from "~/components/person/events-tab";
import { PlacesTab } from "~/components/person/places-tab";
import { SourcesManagementTab } from "~/components/person/sources-management-tab";
import { MediaTab } from "~/components/media/media-tab";

export const Route = createFileRoute("/_authenticated/people/$personId")({
  component: PersonDetailComponent,
});

function PersonDetailComponent() {
  const { personId } = Route.useParams();

  const { data: person, isLoading } = useQuery<PersonDetail>({
    queryKey: ["person", personId],
    queryFn: () => getPerson({ data: { id: personId } }),
  });

  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ["personEvents", personId],
    queryFn: () => getPersonEvents({ data: { personId } }),
    enabled: !!person,
  });

  const { data: places = [], isLoading: isLoadingPlaces } = useQuery({
    queryKey: ["personPlaces", personId],
    queryFn: () => getPersonPlaces({ data: { personId } }),
    enabled: !!person,
  });

  const { data: mediaData, isLoading: isLoadingMedia } = useQuery({
    queryKey: ["personMedia", personId],
    queryFn: () => getPersonMedia({ data: { personId } }),
    enabled: !!person,
  });

  if (isLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center py-16">
          <div className="flex animate-pulse flex-col items-center gap-4">
            <div className="bg-muted h-24 w-24 rounded-full" />
            <div className="bg-muted h-6 w-48 rounded" />
            <div className="bg-muted h-4 w-32 rounded" />
          </div>
        </div>
      </Container>
    );
  }

  if (!person) {
    return (
      <Container>
        <Card className="mx-auto max-w-md">
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h2 className="font-display text-foreground mb-2 text-xl">
              Person Not Found
            </h2>
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
  const deathDate = person.dateOfPassing
    ? new Date(person.dateOfPassing)
    : null;
  const age = calculateAge(birthDate, deathDate);
  const initials =
    `${person.firstName?.[0] || ""}${person.lastName?.[0] || ""}`.toUpperCase();

  return (
    <Container>
      {/* Back link */}
      <Link
        to="/people"
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-2 text-sm transition-colors"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to People
      </Link>

      {/* Person header card */}
      <Card className="mb-6">
        <CardContent className="py-8">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <Avatar
              size="xl"
              fallback={initials}
              alt={`${person.firstName} ${person.lastName}`}
            />

            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h1 className="font-display text-foreground text-3xl">
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
                      {!person.isLiving &&
                        age !== null &&
                        deathDate &&
                        ` — ${formatDate(deathDate)} · lived ${age} years`}
                    </span>
                  )}
                  {birthDate && person.birthPlace && " · "}
                  {person.birthPlace && (
                    <span>Born in {person.birthPlace}</span>
                  )}
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

      {/* Tabbed content */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">
            Events
            {!isLoadingEvents && events.length > 0 && (
              <Badge variant="muted" className="ml-2">
                {events.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="places">
            Places
            {!isLoadingPlaces && places.length > 0 && (
              <Badge variant="muted" className="ml-2">
                {places.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="relationships">
            Relationships
            {person.relationships && person.relationships.length > 0 && (
              <Badge variant="muted" className="ml-2">
                {person.relationships.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sources">Sources</TabsTrigger>
          <TabsTrigger value="media">
            Media
            {!isLoadingMedia && mediaData && mediaData.total > 0 && (
              <Badge variant="muted" className="ml-2">
                {mediaData.total}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab person={person} />
        </TabsContent>

        <TabsContent value="events">
          {isLoadingEvents ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="flex animate-pulse flex-col items-center gap-4">
                  <div className="bg-muted h-12 w-12 rounded-full" />
                  <div className="bg-muted h-4 w-32 rounded" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <EventsTab events={events} personId={personId} />
          )}
        </TabsContent>

        <TabsContent value="places">
          {isLoadingPlaces ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="flex animate-pulse flex-col items-center gap-4">
                  <div className="bg-muted h-12 w-12 rounded-full" />
                  <div className="bg-muted h-4 w-32 rounded" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <PlacesTab places={places} personId={personId} />
          )}
        </TabsContent>

        <TabsContent value="relationships">
          <RelationshipsTab
            relationships={person.relationships || []}
            personId={personId}
            personName={`${person.firstName} ${person.lastName}`}
          />
        </TabsContent>

        <TabsContent value="sources">
          <SourcesManagementTab personId={personId} />
        </TabsContent>

        <TabsContent value="media">
          <MediaTab />
        </TabsContent>
      </Tabs>
    </Container>
  );
}
