"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Badge,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
  Textarea,
} from "@vamsa/ui/primitives";
import { formatDate } from "@vamsa/lib";
import { reviewSuggestion } from "~/server/suggestions";

interface Suggestion {
  id: string;
  type: string;
  targetPersonId: string | null;
  suggestedData: Record<string, unknown>;
  reason: string | null;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewNote: string | null;
  targetPerson: { id: string; firstName: string; lastName: string } | null;
  submittedBy: { id: string; name: string | null; email: string };
  reviewedBy: { id: string; name: string | null; email: string } | null;
}

interface SuggestionsListProps {
  suggestions: Suggestion[];
  onRefresh?: () => void;
}

export function SuggestionsList({
  suggestions,
  onRefresh,
}: SuggestionsListProps) {
  const queryClient = useQueryClient();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [reviewDialog, setReviewDialog] = useState<{
    suggestion: Suggestion;
    action: "APPROVED" | "REJECTED";
  } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reviewMutation = useMutation({
    mutationFn: (params: {
      suggestionId: string;
      status: "APPROVED" | "REJECTED";
      reviewNote?: string;
    }) =>
      reviewSuggestion({
        data: {
          suggestionId: params.suggestionId,
          status: params.status,
          reviewNote: params.reviewNote,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      onRefresh?.();
      setReviewDialog(null);
      setReviewNote("");
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleReview = () => {
    if (!reviewDialog) return;
    setError(null);
    reviewMutation.mutate({
      suggestionId: reviewDialog.suggestion.id,
      status: reviewDialog.action,
      reviewNote: reviewNote || undefined,
    });
  };

  const pendingSuggestions = suggestions.filter((s) => s.status === "PENDING");
  const approvedSuggestions = suggestions.filter(
    (s) => s.status === "APPROVED"
  );
  const rejectedSuggestions = suggestions.filter(
    (s) => s.status === "REJECTED"
  );

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "CREATE":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "UPDATE":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "DELETE":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "ADD_RELATIONSHIP":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "APPROVED":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "REJECTED":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const renderSuggestionCard = (suggestion: Suggestion) => (
    <Card key={suggestion.id} className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Badge className={getTypeBadgeColor(suggestion.type)}>
              {suggestion.type}
            </Badge>
            <Badge className={getStatusBadgeColor(suggestion.status)}>
              {suggestion.status}
            </Badge>
          </div>
          {suggestion.targetPerson && (
            <span className="text-muted-foreground text-sm">
              Target: {suggestion.targetPerson.firstName}{" "}
              {suggestion.targetPerson.lastName}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          <span className="text-muted-foreground">Submitted by: </span>
          <span>
            {suggestion.submittedBy.name || suggestion.submittedBy.email}
          </span>
          <span className="text-muted-foreground ml-2">
            on {formatDate(suggestion.submittedAt)}
          </span>
        </div>

        {suggestion.reason && (
          <div className="text-sm">
            <span className="text-muted-foreground">Reason: </span>
            <span>{suggestion.reason}</span>
          </div>
        )}

        {suggestion.reviewedBy && (
          <div className="border-t pt-2 text-sm">
            <span className="text-muted-foreground">Reviewed by: </span>
            <span>
              {suggestion.reviewedBy.name || suggestion.reviewedBy.email}
            </span>
            {suggestion.reviewedAt && (
              <span className="text-muted-foreground ml-2">
                on {formatDate(suggestion.reviewedAt)}
              </span>
            )}
            {suggestion.reviewNote && (
              <p className="text-muted-foreground mt-1 italic">
                Note: {suggestion.reviewNote}
              </p>
            )}
          </div>
        )}

        {/* Expandable suggested data */}
        <div>
          <button
            className="text-primary text-sm underline"
            onClick={() => toggleExpand(suggestion.id)}
          >
            {expandedIds.has(suggestion.id)
              ? "Hide suggested data"
              : "View suggested data"}
          </button>
          {expandedIds.has(suggestion.id) && (
            <pre className="bg-muted mt-2 max-h-60 overflow-auto rounded-md p-3 text-xs">
              {JSON.stringify(suggestion.suggestedData, null, 2)}
            </pre>
          )}
        </div>

        {/* Action buttons for pending */}
        {suggestion.status === "PENDING" && (
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={() =>
                setReviewDialog({ suggestion, action: "APPROVED" })
              }
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setReviewDialog({ suggestion, action: "REJECTED" })
              }
            >
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingSuggestions.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedSuggestions.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedSuggestions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {pendingSuggestions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No pending suggestions</p>
              </CardContent>
            </Card>
          ) : (
            pendingSuggestions.map(renderSuggestionCard)
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-4">
          {approvedSuggestions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No approved suggestions</p>
              </CardContent>
            </Card>
          ) : (
            approvedSuggestions.map(renderSuggestionCard)
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4">
          {rejectedSuggestions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No rejected suggestions</p>
              </CardContent>
            </Card>
          ) : (
            rejectedSuggestions.map(renderSuggestionCard)
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog */}
      <Dialog
        open={!!reviewDialog}
        onOpenChange={(open) => {
          if (!open) {
            setReviewDialog(null);
            setReviewNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog?.action === "APPROVED"
                ? "Approve Suggestion"
                : "Reject Suggestion"}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog?.action === "APPROVED"
                ? "This will apply the suggested changes."
                : "This will reject the suggestion without making changes."}
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="review-note">Review Note (optional)</Label>
            <Textarea
              id="review-note"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Add a note about your decision..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewDialog(null)}
              disabled={reviewMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReview}
              disabled={reviewMutation.isPending}
              className={
                reviewDialog?.action === "REJECTED"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {reviewMutation.isPending
                ? "Processing..."
                : reviewDialog?.action === "APPROVED"
                  ? "Approve"
                  : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
