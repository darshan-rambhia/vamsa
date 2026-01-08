import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/tree")({
  component: TreeComponent,
});

function TreeComponent() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Family Tree</h1>
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Interactive family tree visualization coming soon.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          This will display an interactive tree view of your family relationships.
        </p>
      </div>
    </div>
  );
}
