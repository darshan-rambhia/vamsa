/**
 * Shared utilities for tool implementations
 */

/**
 * Get the Vamsa web app URL for HTTP-based tool execution
 */
export function getVamsaAppURL(): string {
  return process.env.VAMSA_APP_URL || "http://localhost:3000";
}
