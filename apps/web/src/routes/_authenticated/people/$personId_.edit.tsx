import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPerson } from "~/server/persons";
import { Container, PageHeader, Button, Card, CardContent } from "@vamsa/ui";

export const Route = createFileRoute("/_authenticated/people/$personId_/edit")({
  component: EditPersonComponent,
});

function EditPersonComponent() {
  const { personId } = Route.useParams();

  const { data: person, isLoading } = useQuery({
    queryKey: ["person", personId],
    queryFn: () => getPerson({ data: { id: personId } }),
  });

  if (isLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center py-16">
          <div className="flex animate-pulse flex-col items-center gap-4">
            <div className="bg-muted h-6 w-48 rounded" />
            <div className="bg-muted h-4 w-32 rounded" />
          </div>
        </div>
      </Container>
    );
  }

  const personName = person
    ? `${person.firstName} ${person.lastName}`
    : "Person";

  return (
    <Container className="max-w-2xl">
      <PageHeader
        title={`Edit ${personName}`}
        description="Update this person's information"
      />

      <Card>
        <CardContent className="py-12 text-center">
          <div className="bg-primary/10 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
            <svg
              className="text-primary h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
              />
            </svg>
          </div>
          <h3 className="font-display text-xl font-medium">
            Edit Form Coming Soon
          </h3>
          <p className="text-muted-foreground mx-auto mt-2 max-w-sm">
            The person edit form is being developed. Check back soon.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/people/$personId" params={{ personId }}>
              Back to Profile
            </Link>
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
}
