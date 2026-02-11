/**
 * Context builder for efficient family data context
 *
 * Builds a concise context string from family data for injection
 * into LLM prompts. Keeps token usage minimal while providing
 * enough information for the model to work with.
 */

import type { ModelMessage } from "ai";

/**
 * Build a user context string from the viewing context
 * This is injected into the system prompt to give the model awareness
 * of what the user is currently looking at.
 */
export function buildUserContext(context?: {
  currentPersonId?: string;
  currentPersonName?: string;
  currentView?: string;
}): string {
  if (!context) return "";

  const parts: Array<string> = [];

  if (context.currentPersonName) {
    parts.push(
      `The user is currently viewing the profile of ${context.currentPersonName}${context.currentPersonId ? ` (ID: ${context.currentPersonId})` : ""}.`
    );
  }

  if (context.currentView) {
    parts.push(`They are on the ${context.currentView} view.`);
  }

  return parts.length > 0 ? `\n\n## Current Context\n${parts.join(" ")}` : "";
}

/**
 * Convert chat history to AI SDK message format
 */
export function buildMessages(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userMessage: string
): Array<ModelMessage> {
  const messages: Array<ModelMessage> = history.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  messages.push({ role: "user", content: userMessage });
  return messages;
}
