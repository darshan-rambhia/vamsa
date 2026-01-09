import { createFileRoute } from "@tanstack/react-router";
import { Container } from "@vamsa/ui";
import { SourceManagement } from "~/components/source/source-management";

export const Route = createFileRoute("/_authenticated/admin/sources")({
  component: AdminSourcesComponent,
});

function AdminSourcesComponent() {
  return (
    <Container>
      <SourceManagement />
    </Container>
  );
}
