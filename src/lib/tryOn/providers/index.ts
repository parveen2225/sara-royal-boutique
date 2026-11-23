import { tryOnSettings } from "../config";
import { createMockProvider } from "./mock";
import type { TryOnProvider } from "./types";

/**
 * Selects the provider from TRYON_PROVIDER. Only the local mock exists today. A live provider will be added here
 * (reading its own server-side secret) only after the owner approves the provider and billing. Unknown values
 * keep the feature disabled rather than guessing.
 */
export function getTryOnProvider(): TryOnProvider | null {
  const s = tryOnSettings();
  if (s.provider === "mock") return createMockProvider(s.mockDelayMs);
  return null;
}
