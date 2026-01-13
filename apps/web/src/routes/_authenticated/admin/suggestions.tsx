import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Container, PageHeader, Card, CardContent } from "@vamsa/ui";
import { getSuggestions } from "~/server/suggestions";
import { SuggestionsList } from "~/components/admin/suggestions-list";
import { AdminRouteError } from "~/components/admin/route-error";

export const Route = createFileRoute("/_authenticated/admin/suggestions")({
  component: SuggestionsPage,
  errorComponent: AdminRouteError,
});

function SuggestionsPage() {
  const {
    data: suggestions = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["suggestions"],
    queryFn: () => getSuggestions(),
  });

  return (
    <Container>
      <PageHeader
        title="Suggestions"
        description="Review and manage suggestions from family members"
      />

      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <svg
              className="text-muted-foreground mx-auto h-8 w-8 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <p className="text-muted-foreground mt-2">Loading suggestions...</p>
          </CardContent>
        </Card>
      ) : suggestions && suggestions.length > 0 ? (
        <SuggestionsList suggestions={suggestions} onRefresh={refetch} />
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <svg
              className="text-muted-foreground mx-auto mb-4 h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
              />
            </svg>
            <p className="font-medium">No suggestions yet</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Suggestions from family members will appear here
            </p>
          </CardContent>
        </Card>
      )}
    </Container>
  );
}
