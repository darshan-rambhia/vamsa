/**
 * Conversational chat agent
 *
 * Handles general family history questions using tool-use loops.
 * Supports streaming responses for real-time chat UX.
 */

import { stepCountIs, streamText } from "ai";
import { createModel } from "../providers/llm";
import { chatTools } from "../tools";
import { CHAT_SYSTEM_PROMPT } from "../prompts/chat-system";
import { buildMessages, buildUserContext } from "../context/builder";

export interface ChatRequest {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  context?: {
    currentPersonId?: string;
    currentPersonName?: string;
    currentView?: string;
  };
}

/**
 * Run the chat agent with streaming response
 *
 * Returns a StreamTextResult that can be converted to an HTTP response.
 * Uses AI SDK's tool-use loop (stopWhen) to automatically call tools
 * and incorporate results before generating the final response.
 */
export function runChatAgent(request: ChatRequest) {
  const model = createModel();
  const contextAddendum = buildUserContext(request.context);
  const systemPrompt = CHAT_SYSTEM_PROMPT + contextAddendum;
  const messages = buildMessages(request.history ?? [], request.message);

  return streamText({
    model,
    system: systemPrompt,
    messages,
    tools: chatTools,
    stopWhen: stepCountIs(5), // Allow up to 5 tool-use rounds
  });
}
