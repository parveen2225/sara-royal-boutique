import { tryOnSettings } from "../config";
import { createGeminiProvider, geminiApiKey } from "./gemini";
import { createMockProvider } from "./mock";
import type { TryOnProvider } from "./types";

/**
 * Selects the provider from TRYON_PROVIDER:
 *  - "gemini": Google Gemini image model (LIVE, billable). Enabled only when GEMINI_API_KEY is also set.
 *  - "mock":   local simulated preview for isolated development and tests (not AI, no cost).
 *  - anything else (unset, "off", unknown): feature disabled. Never guesses.
 */
export function getTryOnProvider(): TryOnProvider | null {
  const s = tryOnSettings();
  if (s.provider === "mock") return createMockProvider(s.mockDelayMs);
  if (s.provider === "gemini") {
    const key = geminiApiKey();
    return key ? createGeminiProvider(key) : null;
  }
  return null;
}

/** Customer-facing name of the service that processes the photo (shown in the privacy notice). */
export const PROVIDER_LABEL: Record<string, string> = { gemini: "Google Gemini" };
