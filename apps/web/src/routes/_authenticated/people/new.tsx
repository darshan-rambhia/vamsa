import { createFileRoute, Link } from "@tanstack/react-router";
import { Container, PageHeader, Button, Card, CardContent } from "@vamsa/ui";

export const Route = createFileRoute("/_authenticated/people/new")({
  component: NewPersonComponent,
});

function NewPersonComponent() {
  return (
    <Container className="max-w-2xl">
      <PageHeader
        title="Add Person"
        description="Add a new family member to your tree"
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
                d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"
              />
            </svg>
          </div>
          <h3 className="font-display text-xl font-medium">Form Coming Soon</h3>
          <p className="text-muted-foreground mx-auto mt-2 max-w-sm">
            The person creation form is being developed. Check back soon.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/people">Back to People</Link>
          </Button>
        </CardContent>
      </Card>
    </Container>
  );
}
