/**
 * AI Missing Data Suggestions
 *
 * Analyzes a person record and shows AI-powered suggestions for
 * missing fields. Only visible when AI is available and the person
 * has fields that could be filled in.
 *
 * Features:
 * - Lazy-loaded: suggestions fetched on user click
 * - Per-session rate limit: only one request per person
 * - Confidence indicators (high/medium/low)
 * - Accept (fills field) / Dismiss actions
 * - Accepted values surfaced to parent for form integration
 */

import { useCallback, useState } from "react";
import { Check, Lightbulb, Sparkles, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Badge, Button, Card, CardContent } from "@vamsa/ui/primitives";
import { useAI } from "../../contexts/ai-context";
import { suggestFieldsFn } from "../../server/ai";
import type { SuggestResult, Suggestion } from "@vamsa/lib/ai";

interface AISuggestionsProps {
  personId: string;
  personName: string;
  /** Fields that are already filled — suggestions for these are hidden */
  filledFields?: Array<string>;
  /** Called when the user accepts a suggestion */
  onAccept?: (field: string, value: string) => void;
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  medium:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const FIELD_LABELS: Record<string, string> = {
  dateOfBirth: "Date of Birth",
  dateOfPassing: "Date of Passing",
  birthPlace: "Birth Place",
  nativePlace: "Native Place",
  profession: "Profession",
  employer: "Employer",
  gender: "Gender",
  bio: "Biography",
};

export function AISuggestions({
  personId,
  personName,
  filledFields = [],
  onAccept,
}: AISuggestionsProps) {
  const { isAvailable } = useAI();
  const [suggestions, setSuggestions] = useState<Array<Suggestion>>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [hasRequested, setHasRequested] = useState(false);

  const suggestMutation = useMutation({
    mutationFn: async (): Promise<SuggestResult> => {
      const result = await suggestFieldsFn({
        data: { personId, personName },
      });
      return result;
    },
    onSuccess: (result) => {
      // Filter out suggestions for already-filled fields
      const filtered = result.suggestions.filter(
        (s) => !filledFields.includes(s.field)
      );
      setSuggestions(filtered);
      setHasRequested(true);
    },
    onError: () => {
      setHasRequested(true);
    },
  });

  const handleAccept = useCallback(
    (suggestion: Suggestion) => {
      setAccepted((prev) => new Set(prev).add(suggestion.field));
      onAccept?.(suggestion.field, suggestion.suggestedValue);
    },
    [onAccept]
  );

  const handleDismiss = useCallback((field: string) => {
    setDismissed((prev) => new Set(prev).add(field));
  }, []);

  if (!isAvailable) return null;

  const visibleSuggestions = suggestions.filter(
    (s) => !dismissed.has(s.field) && !accepted.has(s.field)
  );

  // Already requested, no suggestions left to show
  if (
    hasRequested &&
    visibleSuggestions.length === 0 &&
    !suggestMutation.isPending
  ) {
    return null;
  }

  // Not requested yet — show the trigger button
  if (!hasRequested && !suggestMutation.isPending) {
    return (
      <button
        onClick={() => suggestMutation.mutate()}
        className="border-border text-muted-foreground hover:border-primary/40 hover:text-foreground flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm transition-colors"
      >
        <Lightbulb className="h-3.5 w-3.5" />
        Get AI suggestions for missing fields
      </button>
    );
  }

  // Loading state
  if (suggestMutation.isPending) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Sparkles className="text-primary h-4 w-4 animate-pulse" />
            <span className="text-muted-foreground text-sm">
              Analyzing family data for suggestions...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (suggestMutation.isError) {
    return null;
  }

  return (
    <Card>
      <CardContent className="py-4">
        <div className="mb-3 flex items-center gap-2">
          <Lightbulb className="text-primary h-4 w-4" />
          <span className="text-foreground text-sm font-medium">
            AI Suggestions
          </span>
          <Badge variant="outline" className="text-xs">
            {visibleSuggestions.length}
          </Badge>
        </div>

        <div className="space-y-2">
          {visibleSuggestions.map((suggestion) => (
            <SuggestionCard
              key={suggestion.field}
              suggestion={suggestion}
              onAccept={() => handleAccept(suggestion)}
              onDismiss={() => handleDismiss(suggestion.field)}
            />
          ))}
        </div>

        <p className="text-muted-foreground mt-3 text-xs">
          AI-inferred from family context. Review before accepting.
        </p>
      </CardContent>
    </Card>
  );
}

function SuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
}: {
  suggestion: Suggestion;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const fieldLabel = FIELD_LABELS[suggestion.field] ?? suggestion.field;
  const confidenceClass =
    CONFIDENCE_COLORS[suggestion.confidence] ?? CONFIDENCE_COLORS.low;

  return (
    <div className="border-border bg-card flex items-start justify-between rounded-lg border px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-medium">
            {fieldLabel}
          </span>
          <span
            className={`inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ${confidenceClass}`}
          >
            {suggestion.confidence}
          </span>
        </div>
        <p className="text-foreground truncate text-sm font-medium">
          {suggestion.suggestedValue}
        </p>
        {suggestion.reasoning && (
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
            {suggestion.reasoning}
          </p>
        )}
      </div>
      <div className="ml-3 flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAccept}
          className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
          aria-label={`Accept suggestion for ${fieldLabel}`}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="text-muted-foreground hover:bg-muted h-7 w-7 p-0"
          aria-label={`Dismiss suggestion for ${fieldLabel}`}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
