import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Container, PageHeader, Card, CardContent } from "@vamsa/ui";
import { PersonForm } from "~/components/person";

export const Route = createFileRoute("/_authenticated/people/new")({
  component: NewPersonComponent,
});

function NewPersonComponent() {
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate({ to: "/people" });
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
