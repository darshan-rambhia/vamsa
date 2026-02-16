import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card, CardContent, Container, PageHeader } from "@vamsa/ui";
import { PersonForm } from "~/components/person";
import { CompactRouteError } from "~/components/error";

export const Route = createFileRoute("/_authenticated/people/new")({
  component: NewPersonComponent,
  errorComponent: CompactRouteError,
});

function NewPersonComponent() {
  const navigate = useNavigate();

  const handleSuccess = (createdId?: string) => {
    if (createdId) {
      // Navigate to the newly created person's detail page
      navigate({ to: "/people/$personId", params: { personId: createdId } });
    } else {
      navigate({ to: "/people" });
    }
  };

  const handleCancel = () => {
    navigate({ to: "/people" });
  };

  return (
    <Container className="max-w-2xl">
      <PageHeader
        title="Add Person"
        description="Add a new family member to your tree"
      />

      <Card>
        <CardContent className="pt-6">
          <PersonForm onSuccess={handleSuccess} onCancel={handleCancel} />
        </CardContent>
      </Card>
    </Container>
  );
}
