import { geminiSettings } from "../config";
import { TryOnProviderError, type ProviderErrorCode, type TryOnProvider, type TryOnProviderInput, type TryOnProviderOutput } from "./types";

// LIVE provider: Google Gemini image model (default "gemini-nano-banana-2.1") through the Gemini Interactions API.
// BILLABLE: every call is charged to the Google project that owns GEMINI_API_KEY. Server-side only; the key is read
// here and nowhere else, never logged, never returned to a client.
//
// Privacy: `store: false` on every request, so Google does not keep the interaction (customer photo, prompt or result)
// for later retrieval (the API stores interactions for up to 55 days unless told not to). Errors are mapped to the
// provider-neutral codes in ./types; no response body, image data or key ever reaches a log or a customer.

export const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const MAX_RESULT_BYTES = 20 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type Json = Record<string, unknown>;
const obj = (v: unknown): Json | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Json) : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown) => (typeof v === "string" ? v : "");

export function geminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key && key.length >= 20 && !/\s/.test(key) ? key : null;
}

/** Request body for one try-on generation (exported for tests; contains image data, so never log it). */
export function buildGeminiRequest(input: TryOnProviderInput, s = geminiSettings()) {
  const image = (img: { bytes: Buffer; contentType: string }) => ({ type: "image", mime_type: img.contentType, data: img.bytes.toString("base64") });
  const parts: Json[] = [{ type: "text", text: input.prompt }, image(input.person)];
  if (input.fabric) parts.push(image(input.fabric));
  if (input.reference) parts.push(image(input.reference));
  return {
    model: s.model,
    input: parts,
    response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: s.aspectRatio, image_size: s.imageSize },
    ...(s.thinkingLevel ? { generation_config: { thinking_level: s.thinkingLevel } } : {}),
    store: false,
  };
}

const SAFETY = /safety|blocked|block_reason|prohibited|policy|responsible ai|harm|sensitive|person generation|minor/i;

/** Maps an HTTP error from the API to a provider-neutral error (message is generic: no upstream text is kept). */
export function geminiHttpError(status: number, body: unknown): TryOnProviderError {
  const e = obj(obj(body)?.error);
  const text = `${str(e?.status)} ${str(e?.message)}`;
  let code: ProviderErrorCode = "unknown";
  let retryable = false;
  if (status === 429) { code = "rate_limited"; retryable = true; } // includes RESOURCE_EXHAUSTED (quota / spend cap)
  else if (status === 408 || status === 504) { code = "timeout"; }
  else if (status >= 500) { code = "unavailable"; retryable = true; }
  else if (status === 401 || status === 403 || status === 404) code = "unavailable"; // bad key, billing off, model unavailable: owner must fix
  else if (/api[ _]?key|billing|FAILED_PRECONDITION|PERMISSION_DENIED|UNAUTHENTICATED/i.test(text)) code = "unavailable"; // e.g. 400 "API key not valid"
  else if (status === 400 || status === 413 || status === 422) code = SAFETY.test(text) ? "safety_blocked" : "invalid_input";
  return new TryOnProviderError(code, `gemini http ${status}`, retryable);
}

/**
 * Extracts the generated image from an Interaction. Final output lives in `steps[]` of type "model_output" as content
 * blocks `{ type: "image", mime_type, data }`; the LAST image block is the final one (earlier ones can be interim).
 * `outputs[]` / legacy `candidates[].content.parts[].inlineData` are accepted defensively.
 */
export function parseGeminiInteraction(body: unknown): TryOnProviderOutput {
  const root = obj(body);
  if (!root) throw new TryOnProviderError("unknown", "gemini: empty response", true);
  const status = str(root.status);
  const errors = arr(root.errors).map((x) => `${str(obj(x)?.code)} ${str(obj(x)?.message)}`).join(" ");
  const blockReason = str(obj(root.promptFeedback)?.blockReason) || str(obj(root.prompt_feedback)?.block_reason);
  if (blockReason || (status === "failed" && SAFETY.test(errors))) throw new TryOnProviderError("safety_blocked", "gemini: blocked");
  if (status === "failed") throw new TryOnProviderError("unavailable", "gemini: interaction failed", true);
  if (status && !["completed", "incomplete"].includes(status)) throw new TryOnProviderError("unknown", `gemini: status ${status.slice(0, 30)}`);

  const blocks: Json[] = [];
  const steps = arr(root.steps).map(obj).filter(Boolean) as Json[];
  const outputs = steps.some((s) => str(s.type)) ? steps.filter((s) => str(s.type) === "model_output") : steps;
  for (const s of outputs) for (const c of arr(s.content)) { const b = obj(c); if (b) blocks.push(b); }
  for (const c of arr(root.outputs)) { const b = obj(c); if (b) blocks.push(b); }
  for (const cand of arr(root.candidates)) {
    const reason = str(obj(cand)?.finishReason);
    if (SAFETY.test(reason) || reason === "IMAGE_SAFETY" || reason === "PROHIBITED_CONTENT") throw new TryOnProviderError("safety_blocked", "gemini: blocked");
    for (const p of arr(obj(obj(cand)?.content)?.parts)) {
      const inline = obj(obj(p)?.inlineData) ?? obj(obj(p)?.inline_data);
      if (inline) blocks.push({ type: "image", mime_type: str(inline.mimeType) || str(inline.mime_type), data: inline.data });
    }
  }
  const images = blocks.filter((b) => str(b.type) === "image" && str(b.data));
  const last = images[images.length - 1];
  // Completed with text only (no image) means the model declined this photo/request.
  if (!last) throw new TryOnProviderError("safety_blocked", "gemini: no image returned");
  const contentType = str(last.mime_type) || "image/png";
  if (!IMAGE_TYPES.has(contentType)) throw new TryOnProviderError("unknown", "gemini: unexpected image type");
  const bytes = Buffer.from(str(last.data), "base64");
  if (!bytes.length || bytes.length > MAX_RESULT_BYTES) throw new TryOnProviderError("unknown", "gemini: bad image size");
  return { bytes, contentType };
}

export function createGeminiProvider(apiKey: string): TryOnProvider {
  return {
    id: "gemini",
    isLive: true,
    async generate(input: TryOnProviderInput, signal: AbortSignal) {
      // A live model must see the real suit fabric (service.ts also enforces this before calling).
      if (!input.fabric) throw new TryOnProviderError("invalid_input", "gemini: fabric image missing");
      let res: Response;
      try {
        res = await fetch(GEMINI_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify(buildGeminiRequest(input)),
          signal,
          cache: "no-store",
        });
      } catch (e) {
        const name = e instanceof Error ? e.name : "";
        if (name === "AbortError" || name === "TimeoutError") throw new TryOnProviderError("timeout", "gemini: timed out");
        throw new TryOnProviderError("unavailable", "gemini: network error", true);
      }
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) throw geminiHttpError(res.status, body);
      return parseGeminiInteraction(body);
    },
  };
}
