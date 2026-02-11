/**
 * Missing data suggestions agent
 *
 * Analyzes a person record and their family context to suggest
 * likely values for missing fields.
 */

import { generateText, stepCountIs } from "ai";
import { createModel } from "../providers/llm";
import { suggestTools } from "../tools";
import { SUGGEST_SYSTEM_PROMPT } from "../prompts/suggest-system";
import { sanitizeOutput } from "../validation/response";

export interface SuggestRequest {
  personId: string;
  personName?: string;
}

export interface Suggestion {
  field: string;
  suggestedValue: string;
  reasoning: string;
  confidence: "low" | "medium" | "high";
}

export interface SuggestResult {
  personId: string;
  suggestions: Array<Suggestion>;
  rawResponse: string;
  toolCallCount: number;
}

/**
 * Generate missing data suggestions for a person
 */
export async function runSuggestAgent(
  request: SuggestRequest
): Promise<SuggestResult> {
  const model = createModel();

  const userPrompt = request.personName
    ? `Analyze the record for ${request.personName} (ID: ${request.personId}) and suggest values for any missing fields. Look up their details and family context first.`
    : `Analyze the record for person ID ${request.personId} and suggest values for any missing fields. Look up their details and family context first.`;

  const result = await generateText({
    model,
    system: SUGGEST_SYSTEM_PROMPT,
    prompt: userPrompt,
    tools: suggestTools,
    stopWhen: stepCountIs(5),
  });

  // Parse structured suggestions from the model's text response
  const suggestions = parseSuggestions(result.text);

  return {
    personId: request.personId,
    suggestions,
    rawResponse: sanitizeOutput(result.text),
    toolCallCount: result.steps.reduce(
      (sum, step) => sum + (step.toolCalls?.length ?? 0),
      0
    ),
  };
}

/**
 * Parse suggestion objects from model text output
 *
 * The model is prompted to output structured suggestions, but as text.
 * This parser extracts them best-effort.
 */
export function parseSuggestions(text: string): Array<Suggestion> {
  const suggestions: Array<Suggestion> = [];

  // Try to extract JSON array if the model outputs one
  const jsonMatch = text.match(/\[[\s\S]*?\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.field && item.suggestedValue) {
            suggestions.push({
              field: String(item.field),
              suggestedValue: String(item.suggestedValue),
              reasoning: String(item.reasoning ?? ""),
              confidence: ["low", "medium", "high"].includes(item.confidence)
                ? item.confidence
                : "low",
            });
          }
        }
        return suggestions;
      }
    } catch {
      // JSON parsing failed, fall through to text parsing
    }
  }

  // Fallback: try to extract from markdown-style bullet points
  const lines = text.split("\n");
  let current: Partial<Suggestion> | null = null;

  for (const line of lines) {
    const fieldMatch = line.match(/\*\*field\*\*:\s*["`]?(\w+)/i);
    const valueMatch = line.match(
      /\*\*suggestedValue\*\*:\s*["`]?(.+?)["`]?\s*$/i
    );
    const reasonMatch = line.match(/\*\*reasoning\*\*:\s*(.+?)$/i);
    const confMatch = line.match(/\*\*confidence\*\*:\s*(low|medium|high)/i);

    if (fieldMatch) {
      if (current?.field && current?.suggestedValue) {
        suggestions.push(current as Suggestion);
      }
      current = { field: fieldMatch[1] };
    }
    if (valueMatch && current) current.suggestedValue = valueMatch[1].trim();
    if (reasonMatch && current) current.reasoning = reasonMatch[1].trim();
    if (confMatch && current)
      current.confidence = confMatch[1] as Suggestion["confidence"];
  }

  if (current?.field && current?.suggestedValue) {
    suggestions.push({
      field: current.field,
      suggestedValue: current.suggestedValue,
      reasoning: current.reasoning ?? "",
      confidence: current.confidence ?? "low",
    } as Suggestion);
  }

  return suggestions;
}
