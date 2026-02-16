import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, Container, PageHeader } from "@vamsa/ui";
import { getPerson } from "~/server/persons.functions";
import { PersonForm } from "~/components/person";
import { CompactRouteError } from "~/components/error";

export const Route = createFileRoute("/_authenticated/people/$personId_/edit")({
  component: EditPersonComponent,
  errorComponent: CompactRouteError,
});

function EditPersonComponent() {
  const { personId } = Route.useParams();
  const navigate = useNavigate();

  const { data: person, isLoading } = useQuery({
    queryKey: ["person", personId],
    queryFn: () => getPerson({ data: { id: personId } }),
  });

  const handleSuccess = () => {
    navigate({ to: "/people/$personId", params: { personId } });
  };

  const handleCancel = () => {
    navigate({ to: "/people/$personId", params: { personId } });
  };

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

  if (!person) {
    return (
      <Container>
        <div className="py-16 text-center">
          <h2 className="text-xl font-medium">Person not found</h2>
          <p className="text-muted-foreground mt-2">
            The person you&apos;re looking for doesn&apos;t exist.
          </p>
        </div>
      </Container>
    );
  }

  const personName = `${person.firstName} ${person.lastName}`;

  return (
    <Container className="max-w-2xl">
      <PageHeader
        title={`Edit ${personName}`}
        description="Update this person's information"
      />

      <Card>
        <CardContent className="pt-6">
          <PersonForm
            person={person}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>
    </Container>
  );
}
