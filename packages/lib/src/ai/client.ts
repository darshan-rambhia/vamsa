/**
 * AI Sidecar Client
 *
 * HTTP client for the Vamsa AI service. Handles:
 * - Chat (streaming SSE)
 * - Story generation
 * - Data suggestions
 * - Health detection with caching
 */

// ============================================
// Types
// ============================================

export interface AIConfig {
  baseURL: string;
  apiKey?: string;
  timeout?: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  message: string;
  history?: Array<ChatMessage>;
  context?: {
    currentPersonId?: string;
    currentPersonName?: string;
    currentView?: string;
  };
}

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

export interface Suggestion {
  field: string;
  suggestedValue: string;
  reasoning: string;
  confidence: "low" | "medium" | "high";
}

export interface SuggestRequest {
  personId: string;
  personName?: string;
}

export interface SuggestResult {
  personId: string;
  suggestions: Array<Suggestion>;
  rawResponse: string;
  toolCallCount: number;
}

export interface AIHealthStatus {
  status: "healthy" | "degraded";
  timestamp: string;
  llm: {
    provider: string;
    model: string;
    reachable: boolean;
    error?: string;
  };
}

export interface AIServiceConfig {
  provider: string;
  model: string;
  features: Array<string>;
  tools: Array<string>;
  toolMode: string;
  streaming: boolean;
}

export type AIAvailability =
  | { available: true; config: AIServiceConfig }
  | { available: false; reason: string };

// ============================================
// Client
// ============================================

export class AIClient {
  private config: AIConfig;
  private healthCache: { status: AIHealthStatus; checkedAt: number } | null =
    null;
  private static HEALTH_CACHE_TTL = 60_000; // 60 seconds

  constructor(config: AIConfig) {
    this.config = {
      timeout: 30_000,
      ...config,
    };
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }
    return headers;
  }

  /**
   * Check if the AI service is reachable and healthy
   * Results are cached for 60 seconds.
   */
  async checkHealth(): Promise<AIHealthStatus> {
    const now = Date.now();
    if (
      this.healthCache &&
      now - this.healthCache.checkedAt < AIClient.HEALTH_CACHE_TTL
    ) {
      return this.healthCache.status;
    }

    try {
      const response = await fetch(`${this.config.baseURL}/healthz`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const status = (await response.json()) as AIHealthStatus;
      this.healthCache = { status, checkedAt: now };
      return status;
    } catch (error) {
      const status: AIHealthStatus = {
        status: "degraded",
        timestamp: new Date().toISOString(),
        llm: {
          provider: "unknown",
          model: "unknown",
          reachable: false,
          error: error instanceof Error ? error.message : String(error),
        },
      };
      this.healthCache = { status, checkedAt: now };
      return status;
    }
  }

  /**
   * Get the AI service configuration and available features
   */
  async getConfig(): Promise<AIServiceConfig> {
    const response = await fetch(`${this.config.baseURL}/v1/config`, {
      headers: this.getHeaders(),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Config fetch failed: HTTP ${response.status}`);
    }

    return (await response.json()) as AIServiceConfig;
  }

  /**
   * Check if the AI service is available and return config or error
   */
  async getAvailability(): Promise<AIAvailability> {
    try {
      const health = await this.checkHealth();
      if (health.status === "degraded" || !health.llm.reachable) {
        return {
          available: false,
          reason: health.llm.error ?? "AI service is not healthy",
        };
      }

      const config = await this.getConfig();
      return { available: true, config };
    } catch (error) {
      return {
        available: false,
        reason: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Send a chat message and receive a streaming response
   *
   * Returns a ReadableStream of text chunks. The caller should
   * read from the stream to get the response incrementally.
   */
  async chat(request: ChatRequest): Promise<ReadableStream<string>> {
    const response = await fetch(`${this.config.baseURL}/v1/chat`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.config.timeout!),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(
        (error as { error?: string }).error ??
          `Chat failed: HTTP ${response.status}`
      );
    }

    if (!response.body) {
      throw new Error("No response body");
    }

    // Transform the raw byte stream into text chunks
    return response.body.pipeThrough(new TextDecoderStream());
  }

  /**
   * Generate a biographical narrative for a person
   */
  async generateStory(request: StoryRequest): Promise<StoryResult> {
    const response = await fetch(`${this.config.baseURL}/v1/story`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.config.timeout!),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(
        (error as { error?: string }).error ??
          `Story generation failed: HTTP ${response.status}`
      );
    }

    return (await response.json()) as StoryResult;
  }

  /**
   * Get missing data suggestions for a person
   */
  async suggest(request: SuggestRequest): Promise<SuggestResult> {
    const response = await fetch(`${this.config.baseURL}/v1/suggest`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(this.config.timeout!),
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ error: `HTTP ${response.status}` }));
      throw new Error(
        (error as { error?: string }).error ??
          `Suggestion failed: HTTP ${response.status}`
      );
    }

    return (await response.json()) as SuggestResult;
  }

  /**
   * Invalidate the health cache (e.g., after settings change)
   */
  clearHealthCache(): void {
    this.healthCache = null;
  }
}

// ============================================
// Factory
// ============================================

let defaultClient: AIClient | null = null;

/**
 * Get or create the default AI client from environment variables
 */
export function getAIClient(): AIClient | null {
  const enabled = process.env.VAMSA_AI_ENABLED === "true";
  if (!enabled) return null;

  if (!defaultClient) {
    const baseURL = process.env.VAMSA_AI_URL || "http://localhost:3100";
    const apiKey = process.env.AI_API_KEY;

    defaultClient = new AIClient({ baseURL, apiKey });
  }

  return defaultClient;
}

/**
 * Check if AI features are enabled via environment variable
 */
export function isAIEnabled(): boolean {
  return process.env.VAMSA_AI_ENABLED === "true";
}
