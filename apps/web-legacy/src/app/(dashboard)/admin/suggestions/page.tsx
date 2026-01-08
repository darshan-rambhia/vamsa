import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getSuggestions } from "@/actions/suggestion";
import { SuggestionsList } from "@/components/admin/suggestions-list";

export default async function SuggestionsPage() {
  const session = await getSession();

  if (session?.user?.role !== "ADMIN") {
    redirect("/tree");
  }

  const suggestions = await getSuggestions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Suggestions</h1>
        <p className="text-muted-foreground">
          Review and approve suggested changes
        </p>
      </div>
      <SuggestionsList suggestions={suggestions} />
    </div>
  );
}
