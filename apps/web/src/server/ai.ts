/**
 * AI server functions
 *
 * Server-side functions that check AI availability and proxy
 * requests to the AI sidecar service. These run on the server
 * and are called from React components via TanStack Start.
 */

import { createServerFn } from "@tanstack/react-start";
import { getAIClient, isAIEnabled } from "@vamsa/lib/ai";
import type { AIAvailability, StoryResult, SuggestResult } from "@vamsa/lib/ai";

/**
 * Check if the AI service is enabled and available
 *
 * Returns the AI availability status including feature config
 * if the service is reachable, or an error reason if not.
 *
 * Three states:
 * 1. Disabled: VAMSA_AI_ENABLED is not "true"
 * 2. Enabled but unavailable: sidecar is down or LLM unreachable
 * 3. Enabled and available: ready for AI requests
 */
export const getAIAvailabilityFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<AIAvailability> => {
    if (!isAIEnabled()) {
      return { available: false, reason: "AI features are disabled" };
    }

    const client = getAIClient();
    if (!client) {
      return { available: false, reason: "AI client not configured" };
    }

    return client.getAvailability();
  }
);

/**
 * Generate a biographical narrative for a person
 *
 * Proxies the request to the AI sidecar service.
 * Requires AI to be enabled and the sidecar to be reachable.
 */
interface StoryInput {
  personId: string;
  personName?: string;
  style?: "formal" | "casual" | "documentary";
  maxWords?: number;
}

export const generateStoryFn = createServerFn({ method: "POST" })
  .inputValidator((data: StoryInput) => data)
  .handler(async ({ data }): Promise<StoryResult> => {
    if (!isAIEnabled()) {
      throw new Error("AI features are disabled");
    }

    const client = getAIClient();
    if (!client) {
      throw new Error("AI client not configured");
    }

    return client.generateStory(data);
  });

/**
 * Get AI-powered missing data suggestions for a person
 *
 * Analyzes the person's record and family context to suggest
 * likely values for missing fields.
 */
interface SuggestInput {
  personId: string;
  personName?: string;
}

export const suggestFieldsFn = createServerFn({ method: "POST" })
  .inputValidator((data: SuggestInput) => data)
  .handler(async ({ data }): Promise<SuggestResult> => {
    if (!isAIEnabled()) {
      throw new Error("AI features are disabled");
    }

    const client = getAIClient();
    if (!client) {
      throw new Error("AI client not configured");
    }

    return client.suggest(data);
  });
