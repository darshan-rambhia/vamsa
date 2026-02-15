/**
 * AI Chat Panel
 *
 * Slide-out conversational interface for the Vamsa AI assistant.
 * Only renders when AI features are enabled and the service is available.
 *
 * Features:
 * - Streaming text responses
 * - Multi-turn conversation with history
 * - Suggested starter prompts
 * - Responsive: sheet on desktop, full-screen on mobile
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, Trash2, X } from "lucide-react";
import { getAIClient } from "@vamsa/lib/ai";
import { useAI } from "../../contexts/ai-context";
import type { ChatMessage } from "@vamsa/lib/ai";

const STARTER_PROMPTS = [
  "Who are the oldest people in our family tree?",
  "Tell me about our family origins",
  "How many generations do we have recorded?",
  "Who has the most descendants?",
];

export function AIChatPanel() {
  const { isAvailable } = useAI();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<ChatMessage>>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMessage: ChatMessage = { role: "user", content: text.trim() };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsStreaming(true);
      setStreamingText("");

      try {
        const client = getAIClient();
        if (!client) throw new Error("AI client not available");

        const stream = await client.chat({
          message: userMessage.content,
          history: messages,
        });

        const reader = stream.getReader();
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += value;
          setStreamingText(fullText);
        }

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: fullText },
        ]);
        setStreamingText("");
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}`,
          },
        ]);
        setStreamingText("");
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, messages]
  );

  const clearConversation = () => {
    setMessages([]);
    setStreamingText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!isAvailable) return null;

  return (
    <>
      {/* Toggle button - fixed position */}
      <button
        onClick={() => setIsOpen(true)}
        className="bg-primary text-primary-foreground fixed right-6 bottom-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
        aria-label="Open AI assistant"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {/* Panel overlay + slide-out */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/20 md:bg-transparent"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="border-border bg-background fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l shadow-xl transition-transform duration-300 md:w-[420px]">
            {/* Header */}
            <div className="border-border flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <Bot className="text-primary h-5 w-5" />
                <h2 className="font-display text-foreground text-lg font-semibold">
                  Vamsa AI
                </h2>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={clearConversation}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-2 transition-colors"
                    aria-label="Clear conversation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-2 transition-colors"
                  aria-label="Close AI assistant"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 && !streamingText ? (
                <EmptyState onPromptClick={(prompt) => sendMessage(prompt)} />
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <MessageBubble key={i} message={msg} />
                  ))}
                  {streamingText && (
                    <MessageBubble
                      message={{ role: "assistant", content: streamingText }}
                      isStreaming
                    />
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input area */}
            <div className="border-border border-t px-4 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your family tree..."
                  className="border-border bg-muted/50 font-body text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary max-h-24 min-h-[40px] flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:ring-1 focus:outline-none"
                  rows={1}
                  disabled={isStreaming}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isStreaming}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:hover:bg-primary flex h-10 w-10 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
                  aria-label="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="text-muted-foreground mt-1.5 text-xs">
                AI responses are generated and may not be accurate.
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function EmptyState({
  onPromptClick,
}: {
  onPromptClick: (prompt: string) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <div className="bg-primary/10 mb-4 flex h-14 w-14 items-center justify-center rounded-full">
        <Sparkles className="text-primary h-7 w-7" />
      </div>
      <h3 className="font-display text-foreground text-lg font-semibold">
        Family History Assistant
      </h3>
      <p className="text-muted-foreground mt-1 text-sm">
        Ask questions about your family tree, find relationships, or explore
        your heritage.
      </p>
      <div className="mt-6 w-full space-y-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => onPromptClick(prompt)}
            className="border-border bg-card text-foreground hover:bg-muted w-full rounded-lg border px-3 py-2.5 text-left text-sm transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  isStreaming = false,
}: {
  message: ChatMessage;
  isStreaming?: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        <p className="font-body leading-relaxed whitespace-pre-wrap">
          {message.content}
          {isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current" />
          )}
        </p>
      </div>
    </div>
  );
}
