"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { reviewSuggestion } from "@/actions/suggestion";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import type { SuggestionStatus, SuggestionType } from "@prisma/client";

interface SuggestionItem {
  id: string;
  type: SuggestionType;
  status: SuggestionStatus;
  suggestedData: unknown;
  reason: string | null;
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewNote: string | null;
  targetPerson: { id: string; firstName: string; lastName: string } | null;
  submittedBy: { id: string; name: string | null; email: string };
  reviewedBy: { id: string; name: string | null; email: string } | null;
}

interface SuggestionsListProps {
  suggestions: SuggestionItem[];
}

export function SuggestionsList({ suggestions }: SuggestionsListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const pending = suggestions.filter((s) => s.status === "PENDING");
  const approved = suggestions.filter((s) => s.status === "APPROVED");
  const rejected = suggestions.filter((s) => s.status === "REJECTED");

  async function handleReview(
    id: string,
    status: "APPROVED" | "REJECTED",
    reviewNote?: string
  ) {
    setLoading(id);
    try {
      await reviewSuggestion(id, { status, reviewNote });
      toast({ title: `Suggestion ${status.toLowerCase()}` });
      router.refresh();
    } catch (err) {
      toast({
        title: "Failed to review suggestion",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  }

  const renderSuggestion = (
    suggestion: SuggestionItem,
    showActions = false
  ) => (
    <Card key={suggestion.id}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {suggestion.type.replace("_", " ")}
            {suggestion.targetPerson && (
              <span className="ml-2 font-normal text-muted-foreground">
                for {suggestion.targetPerson.firstName}{" "}
                {suggestion.targetPerson.lastName}
              </span>
            )}
          </CardTitle>
          <span
            className={`rounded-full px-2 py-1 text-xs ${
              suggestion.status === "PENDING"
                ? "bg-yellow-100 text-yellow-800"
                : suggestion.status === "APPROVED"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
            }`}
          >
            {suggestion.status}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Submitted by{" "}
          {suggestion.submittedBy.name || suggestion.submittedBy.email} on{" "}
          {formatDate(suggestion.submittedAt)}
        </p>
        {suggestion.reason && (
          <p className="text-sm">
            <strong>Reason:</strong> {suggestion.reason}
          </p>
        )}
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            View suggested data
          </summary>
          <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
            {JSON.stringify(suggestion.suggestedData, null, 2)}
          </pre>
        </details>
        {suggestion.reviewedBy && (
          <p className="text-sm text-muted-foreground">
            Reviewed by{" "}
            {suggestion.reviewedBy.name || suggestion.reviewedBy.email} on{" "}
            {formatDate(suggestion.reviewedAt)}
            {suggestion.reviewNote && `: ${suggestion.reviewNote}`}
          </p>
        )}
        {showActions && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => handleReview(suggestion.id, "APPROVED")}
              disabled={loading === suggestion.id}
            >
              <Check className="mr-2 h-4 w-4" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleReview(suggestion.id, "REJECTED")}
              disabled={loading === suggestion.id}
            >
              <X className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Tabs defaultValue="pending">
      <TabsList>
        <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
        <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
        <TabsTrigger value="rejected">Rejected ({rejected.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="pending" className="space-y-4">
        {pending.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No pending suggestions
          </p>
        ) : (
          pending.map((s) => renderSuggestion(s, true))
        )}
      </TabsContent>
      <TabsContent value="approved" className="space-y-4">
        {approved.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No approved suggestions
          </p>
        ) : (
          approved.map((s) => renderSuggestion(s))
        )}
      </TabsContent>
      <TabsContent value="rejected" className="space-y-4">
        {rejected.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No rejected suggestions
          </p>
        ) : (
          rejected.map((s) => renderSuggestion(s))
        )}
      </TabsContent>
    </Tabs>
  );
}
