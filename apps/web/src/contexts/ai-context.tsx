/**
 * AI Availability Context
 *
 * Provides AI availability status to all components.
 * Checks the AI service status on mount and re-checks periodically.
 * All AI UI components should check this context before rendering.
 */

import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAIAvailabilityFn } from "../server/ai";
import type { ReactNode } from "react";
import type { AIAvailability } from "@vamsa/lib/ai";

interface AIContextValue {
  /** Whether the AI service is available and ready */
  isAvailable: boolean;
  /** Full availability details (config or error reason) */
  availability: AIAvailability | null;
  /** Whether the availability check is still loading */
  isLoading: boolean;
}

const AIContext = createContext<AIContextValue>({
  isAvailable: false,
  availability: null,
  isLoading: true,
});

export function AIProvider({ children }: { children: ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ["ai-availability"],
    queryFn: () => getAIAvailabilityFn(),
    staleTime: 60_000, // Re-check every 60s
    refetchInterval: 60_000,
    retry: false,
  });

  const value: AIContextValue = {
    isAvailable: data?.available ?? false,
    availability: data ?? null,
    isLoading,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

/**
 * Hook to check AI availability from any component
 *
 * @example
 * ```tsx
 * function StoryButton() {
 *   const { isAvailable } = useAI();
 *   if (!isAvailable) return null;
 *   return <Button>Generate Story</Button>;
 * }
 * ```
 */
export function useAI(): AIContextValue {
  return useContext(AIContext);
}
