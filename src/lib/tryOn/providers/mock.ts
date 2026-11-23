import sharp from "sharp";
import type { TryOnProvider, TryOnProviderInput } from "./types";
import { TryOnProviderError } from "./types";

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(new TryOnProviderError("timeout", "aborted", true));
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { clearTimeout(t); reject(new TryOnProviderError("timeout", "aborted", true)); }, { once: true });
  });

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

/**
 * LOCAL MOCK — not AI. Lays the suit's fabric photo over the torso area of the customer's photo and stamps a clear
 * "MOCK PREVIEW" banner, so the full flow (upload, jobs, polling, result, download, cleanup) can be tested without
 * any external service or cost.
 */
export function createMockProvider(delayMs: number): TryOnProvider {
  return {
    id: "mock",
    isLive: false,
    async generate(input: TryOnProviderInput, signal: AbortSignal) {
      const outcome = input.testOutcome ?? "";
      if (outcome === "timeout") await sleep(10 * 60_000, signal);
      await sleep(delayMs, signal);
      if (outcome === "fail") throw new TryOnProviderError("unavailable", "mock failure", true);
      if (outcome === "safety") throw new TryOnProviderError("safety_blocked", "mock safety block");

      const base = sharp(input.person.bytes).resize({ width: 768, height: 1152, fit: "inside" });
      const { width = 768, height = 1152 } = await base.clone().toBuffer({ resolveWithObject: true }).then((r) => r.info);
      const w = Math.round(width * 0.5), h = Math.round(height * 0.42), left = Math.round(width * 0.25), top = Math.round(height * 0.3);
      const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${Math.round(w * 0.18)}" fill="#fff" fill-opacity="0.82"/></svg>`);
      const fabricLayer = input.fabric
        ? await sharp(input.fabric.bytes).resize(w, h, { fit: "cover" }).ensureAlpha().composite([{ input: mask, blend: "dest-in" }]).png().toBuffer()
        : await sharp({ create: { width: w, height: h, channels: 4, background: { r: 201, g: 168, b: 76, alpha: 0.7 } } }).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
      const band = Math.max(54, Math.round(height * 0.075));
      const label = Buffer.from(
        `<svg width="${width}" height="${band}"><rect width="100%" height="100%" fill="#0b0d12" fill-opacity="0.82"/>` +
          `<text x="50%" y="42%" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(band * 0.3)}" font-weight="700" fill="#e8c873">MOCK PREVIEW · not AI-generated</text>` +
          `<text x="50%" y="78%" text-anchor="middle" font-family="sans-serif" font-size="${Math.round(band * 0.22)}" fill="#f3efe6">${esc(input.style.label)} · ${esc(input.suit.name).slice(0, 60)}</text></svg>`,
      );
      const bytes = await base
        .composite([{ input: fabricLayer, left, top }, { input: label, left: 0, top: height - band }])
        .jpeg({ quality: 86 })
        .toBuffer();
      return { bytes, contentType: "image/jpeg" };
    },
  };
}
