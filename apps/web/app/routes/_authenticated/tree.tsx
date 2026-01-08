import { createFileRoute } from "@tanstack/react-router";
import { Container, PageHeader } from "@vamsa/ui";
import { Card, CardContent } from "@vamsa/ui/primitives";

export const Route = createFileRoute("/_authenticated/tree")({
  component: TreeComponent,
});

function TreeComponent() {
  return (
    <Container>
      <PageHeader
        title="Family Tree"
        subtitle="Visualize your family connections across generations"
      />

      {/* Tree visualization placeholder */}
      <Card className="min-h-[500px]">
        <CardContent className="flex flex-col items-center justify-center h-full py-16">
          {/* Decorative tree icon */}
          <div className="mb-6 text-primary/20">
            <svg
              className="h-24 w-24"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
              />
              <circle cx="12" cy="12" r="4" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16v5M9 21h6"
              />
            </svg>
          </div>

          <h3 className="font-display text-xl text-foreground mb-2">
            Interactive Tree Coming Soon
          </h3>
          <p className="text-muted-foreground text-center max-w-md">
            An elegant, interactive family tree visualization will display here,
            showing relationships across multiple generations.
          </p>

          {/* Feature preview pills */}
          <div className="mt-8 flex flex-wrap gap-2 justify-center">
            {[
              "Drag & Pan",
              "Zoom Controls",
              "Relationship Lines",
              "Photo Thumbnails",
              "Generation Layers",
            ].map((feature) => (
              <span
                key={feature}
                className="px-3 py-1 rounded-full bg-secondary/50 text-secondary-foreground text-sm font-medium"
              >
                {feature}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
