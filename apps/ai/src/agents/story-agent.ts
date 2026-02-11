/**
 * Biographical narrative generation agent
 *
 * Gathers data about a person using tools, then generates
 * a narrative story from the collected facts.
 */

import { generateText, stepCountIs } from "ai";
import { createModel } from "../providers/llm";
import { storyTools } from "../tools";
import { STORY_SYSTEM_PROMPT } from "../prompts/story-system";
import { sanitizeOutput } from "../validation/response";

export interface StoryRequest {
  personId: string;
  personName?: string;
  style?: "formal" | "casual" | "documentary";
  maxWords?: number;
}

export interface StoryResult {
  narrative: string;
  personId: string;
  toolCallCount: number;
}

/**
 * Generate a biographical narrative for a person
 *
 * Uses generateText (non-streaming) because stories are generated
 * as a complete unit, not incrementally.
 */
export async function runStoryAgent(
  request: StoryRequest
): Promise<StoryResult> {
  const model = createModel();
  const maxWords = request.maxWords ?? 400;
  const style = request.style ?? "documentary";

  const userPrompt = request.personName
    ? `Write a ${style} biographical narrative (max ${maxWords} words) about ${request.personName} (ID: ${request.personId}). Start by looking up their details and family connections.`
    : `Write a ${style} biographical narrative (max ${maxWords} words) about the person with ID ${request.personId}. Start by looking up their details and family connections.`;

  const result = await generateText({
    model,
    system: STORY_SYSTEM_PROMPT,
    prompt: userPrompt,
    tools: storyTools,
    stopWhen: stepCountIs(6), // Gather data across multiple tool calls then generate
  });

  return {
    narrative: sanitizeOutput(result.text),
    personId: request.personId,
    toolCallCount: result.steps.reduce(
      (sum, step) => sum + (step.toolCalls?.length ?? 0),
      0
    ),
  };
}
