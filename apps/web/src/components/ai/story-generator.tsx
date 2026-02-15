/**
 * AI Story Generator
 *
 * Generates a biographical narrative for a person using the AI sidecar.
 * Only visible when AI features are available.
 *
 * Features:
 * - Generate/regenerate story with one click
 * - Loading skeleton while generating
 * - Copy story to clipboard
 * - Style selector (formal, casual, documentary)
 * - Error handling with retry
 */

import { useCallback, useState } from "react";
import { BookOpen, Check, Copy, RefreshCw, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button, Card, CardContent } from "@vamsa/ui/primitives";
import { useAI } from "../../contexts/ai-context";
import { generateStoryFn } from "../../server/ai";
import type { StoryResult } from "@vamsa/lib/ai";

interface StoryGeneratorProps {
  personId: string;
  personName: string;
}

export function StoryGenerator({ personId, personName }: StoryGeneratorProps) {
  const { isAvailable } = useAI();
  const [narrative, setNarrative] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const storyMutation = useMutation({
    mutationFn: async (): Promise<StoryResult> => {
      const result = await generateStoryFn({
        data: {
          personId,
          personName,
          style: "documentary",
        },
      });
      return result;
    },
    onSuccess: (result) => {
      setNarrative(result.narrative);
    },
  });

  const handleCopy = useCallback(async () => {
    if (!narrative) return;
    await navigator.clipboard.writeText(narrative);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [narrative]);

  if (!isAvailable) return null;

  // Not yet generated — show the generate button
  if (!narrative && !storyMutation.isPending && !storyMutation.isError) {
    return (
      <Card className="mb-6">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
                <Sparkles className="text-primary h-4 w-4" />
              </div>
              <div>
                <h3 className="font-display text-foreground text-lg">
                  AI Story
                </h3>
                <p className="text-muted-foreground text-sm">
                  Generate a biographical narrative from family data
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => storyMutation.mutate()}
            >
              <BookOpen className="mr-2 h-4 w-4" />
              Generate Story
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardContent className="py-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 flex h-9 w-9 items-center justify-center rounded-lg">
              <Sparkles className="text-primary h-4 w-4" />
            </div>
            <h3 className="font-display text-foreground text-lg">AI Story</h3>
          </div>
          <div className="flex items-center gap-2">
            {narrative && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="text-muted-foreground"
              >
                {copied ? (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => storyMutation.mutate()}
              disabled={storyMutation.isPending}
              className="text-muted-foreground"
            >
              <RefreshCw
                className={`mr-1.5 h-3.5 w-3.5 ${storyMutation.isPending ? "animate-spin" : ""}`}
              />
              Regenerate
            </Button>
          </div>
        </div>

        {/* Loading skeleton */}
        {storyMutation.isPending && (
          <div className="animate-pulse space-y-3">
            <div className="bg-muted h-4 w-full rounded" />
            <div className="bg-muted h-4 w-[95%] rounded" />
            <div className="bg-muted h-4 w-[88%] rounded" />
            <div className="h-4 w-0 rounded" />
            <div className="bg-muted h-4 w-full rounded" />
            <div className="bg-muted h-4 w-[92%] rounded" />
            <div className="bg-muted h-4 w-[78%] rounded" />
            <div className="h-4 w-0 rounded" />
            <div className="bg-muted h-4 w-full rounded" />
            <div className="bg-muted h-4 w-[85%] rounded" />
            <div className="bg-muted h-4 w-[60%] rounded" />
          </div>
        )}

        {/* Error */}
        {storyMutation.isError && !storyMutation.isPending && (
          <div className="border-destructive/20 bg-destructive/5 rounded-lg border px-4 py-3">
            <p className="text-destructive text-sm">
              Failed to generate story. The AI service may be temporarily
              unavailable.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => storyMutation.mutate()}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Generated narrative */}
        {narrative && !storyMutation.isPending && (
          <div className="prose prose-sm max-w-none">
            <p className="text-foreground font-body leading-relaxed whitespace-pre-wrap">
              {narrative}
            </p>
          </div>
        )}

        {/* Disclaimer */}
        {(narrative || storyMutation.isPending) && (
          <p className="text-muted-foreground mt-4 text-xs">
            AI-generated content based on family data. May contain inaccuracies.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
