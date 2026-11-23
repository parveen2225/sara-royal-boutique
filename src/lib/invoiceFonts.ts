// Fonts + script handling for PDF invoices (English, Hindi/Devanagari and Punjabi/Gurmukhi names, plus the ₹ sign).
import fs from "node:fs";
import path from "node:path";

export type FontKey = "latin" | "deva" | "guru";
export const FONT_FILES: Record<FontKey, { regular: string; bold: string }> = {
  latin: { regular: "NotoSans-Regular.ttf", bold: "NotoSans-Bold.ttf" },
  deva: { regular: "NotoSansDevanagari-Regular.ttf", bold: "NotoSansDevanagari-Bold.ttf" },
  guru: { regular: "NotoSansGurmukhi-Regular.ttf", bold: "NotoSansGurmukhi-Bold.ttf" },
};

/** Where the font files live. Next must be told to ship them (outputFileTracingIncludes in next.config.ts). */
export const fontDir = () => process.env.INVOICE_FONT_DIR || path.join(process.cwd(), "assets", "fonts");
export const fontPath = (file: string) => path.join(fontDir(), file);
const cache = new Map<string, Buffer>();
export function loadFont(file: string): Buffer {
  let b = cache.get(file);
  if (!b) {
    b = fs.readFileSync(path.join(fontDir(), file));
    cache.set(file, b);
  }
  return b;
}

export type Script = FontKey | "neutral";
/** Which font a code point belongs to. Spaces, digits, punctuation, currency signs and ZWJ/ZWNJ take the font of their neighbour. */
export function scriptOf(cp: number): Script {
  if ((cp >= 0x0900 && cp <= 0x097f) || (cp >= 0xa8e0 && cp <= 0xa8ff) || (cp >= 0x1cd0 && cp <= 0x1cff)) return "deva";
  if (cp >= 0x0a00 && cp <= 0x0a7f) return "guru";
  if (cp === 0x200c || cp === 0x200d) return "neutral";
  if (cp <= 0x40 || (cp >= 0x5b && cp <= 0x60) || (cp >= 0x7b && cp <= 0xbf) || (cp >= 0x2000 && cp <= 0x206f) || (cp >= 0x20a0 && cp <= 0x20cf)) return "neutral";
  return "latin";
}

export type Run = { font: FontKey; text: string };

/**
 * Split text into runs that each use one font. A character no embedded font can draw becomes "?" (in the Latin font)
 * instead of an empty box. `covers(font, codePoint)` says whether a font has a glyph.
 */
export function toRuns(text: string, covers: (font: FontKey, cp: number) => boolean): Run[] {
  const cps = Array.from(text.normalize("NFC")).map((ch) => ch.codePointAt(0)!);
  const scripts = cps.map(scriptOf);
  // neutrals follow the previous real script; leading neutrals follow the next one
  let prev: FontKey | null = null;
  const firstReal = (scripts.find((s) => s !== "neutral") as FontKey | undefined) ?? "latin";
  const wanted: FontKey[] = scripts.map((s) => {
    if (s !== "neutral") { prev = s; return s; }
    return prev ?? firstReal;
  });
  const runs: Run[] = [];
  cps.forEach((cp, i) => {
    let font: FontKey = wanted[i];
    let ch = String.fromCodePoint(cp);
    if (!covers(font, cp)) {
      if (covers("latin", cp)) font = "latin";
      else { font = "latin"; ch = "?"; }
    }
    const last = runs[runs.length - 1];
    if (last && last.font === font) last.text += ch;
    else runs.push({ font, text: ch });
  });
  return runs;
}
