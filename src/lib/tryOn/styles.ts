// Stitching styles offered by AI Try-On. `prompt` is the provider-neutral styling instruction used by live providers.
// Keep keys stable: they are stored on jobs and sent by the website and the mobile app.

export type TryOnStyleKey = "default" | "straight" | "anarkali" | "palazzo" | "patiala" | "custom";

export type TryOnStyle = { key: TryOnStyleKey; label: string; description: string; prompt: string; needsReference?: boolean };

export const TRYON_STYLES: readonly TryOnStyle[] = [
  { key: "default", label: "Default Stitched Look", description: "A classic salwar-kameez with matching dupatta.", prompt: "a classic Punjabi salwar kameez: knee-length straight kameez with side slits, gathered salwar and a matching dupatta draped over one shoulder" },
  { key: "straight", label: "Straight Suit", description: "Long straight-cut kameez with straight pants.", prompt: "a straight-cut suit: long straight kameez reaching mid-calf with side slits, slim straight trousers and a dupatta" },
  { key: "anarkali", label: "Anarkali", description: "Fitted bodice flaring into a long flowing kameez.", prompt: "an Anarkali suit: fitted bodice with a high waist flaring into a floor-length, flowing, pleated kameez, churidar leggings and a dupatta" },
  { key: "palazzo", label: "Palazzo Suit", description: "Kurti paired with wide flowing palazzo pants.", prompt: "a palazzo suit: thigh-to-knee-length kurti with wide-leg flowing palazzo pants and a dupatta" },
  { key: "patiala", label: "Patiala Suit", description: "Short kameez with heavily pleated Patiala salwar.", prompt: "a Patiala suit: short kameez above the knee with a heavily pleated, voluminous Patiala salwar gathered at the ankle and a dupatta" },
  { key: "custom", label: "Custom Reference Style", description: "Upload a photo of a stitched design you like.", prompt: "the same cut, neckline, sleeves and silhouette as the stitched outfit shown in the reference design photo", needsReference: true },
];

export const styleByKey = (key: unknown): TryOnStyle | null => TRYON_STYLES.find((s) => s.key === key) ?? null;

export const TRYON_DISCLAIMER = "AI-generated styling preview. Actual stitching, colour, fit and appearance may vary.";
export const TRYON_CONSENT_VERSION = "2026-11-19";
