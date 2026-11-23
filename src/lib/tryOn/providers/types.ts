import type { TryOnStyle } from "../styles";

export type ProviderImage = { bytes: Buffer; contentType: string };

export type TryOnProviderInput = {
  person: ProviderImage;
  fabric: ProviderImage | null; // the suit's first fabric photo (public product image)
  reference: ProviderImage | null; // customer's custom stitched-design reference (Custom Reference Style only)
  style: TryOnStyle;
  prompt: string;
  suit: { name: string; fabric: string; color: string };
  testOutcome?: string; // mock provider only
};

export type TryOnProviderOutput = { bytes: Buffer; contentType: string };

export type ProviderErrorCode = "safety_blocked" | "invalid_input" | "rate_limited" | "timeout" | "unavailable" | "unknown";

export class TryOnProviderError extends Error {
  constructor(public code: ProviderErrorCode, message: string, public retryable = false) {
    super(message);
  }
}

export interface TryOnProvider {
  id: string;
  /** true when calls go to a real (possibly billable) AI service */
  isLive: boolean;
  generate(input: TryOnProviderInput, signal: AbortSignal): Promise<TryOnProviderOutput>;
}

/** Customer-facing wording for each failure; never includes provider internals. */
export const PUBLIC_ERROR: Record<ProviderErrorCode | "fabric_unavailable", string> = {
  safety_blocked: "This photo could not be used for a preview. Please try a different full-body photo with simple, everyday clothing.",
  invalid_input: "This photo could not be processed. Please choose a clear, well-lit full-body photo.",
  rate_limited: "The preview service is busy right now. Please try again in a minute.",
  timeout: "Generating your preview took too long. Please try again.",
  unavailable: "The preview service is temporarily unavailable. Please try again shortly.",
  unknown: "We could not create your preview. Please try again.",
  fabric_unavailable: "The fabric photo for this suit could not be loaded. Please try again later.",
};
