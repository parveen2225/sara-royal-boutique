import type { TryOnStyle } from "./styles";

// Provider-neutral instruction for live image models. The mock provider ignores it; it is unit-tested so the
// wording that reaches a live provider is reviewed, stable and free of customer data.
export function buildTryOnPrompt(style: TryOnStyle, suit: { name: string; fabric?: string; color?: string }, hasReference: boolean) {
  const fabric = [suit.color, suit.fabric].filter(Boolean).join(" ").trim();
  return [
    "Image 1 is a photo of a customer. Image 2 is a flat photo of an UNSTITCHED Indian suit fabric set" + (fabric ? ` (${fabric})` : "") + ".",
    hasReference ? "Image 3 is a reference photo of a stitched design; copy only its cut and silhouette, never its fabric, person or face." : "",
    `Create a realistic photo of the SAME customer wearing this fabric stitched into ${style.prompt}.`,
    "Keep the customer's face, identity, skin tone, hair, body proportions, pose, background and lighting unchanged.",
    "Use the fabric's exact colours, print, pattern, border and embroidery from Image 2; do not invent new motifs or change colours.",
    "Natural garment fit and drape, modest and respectful styling, photorealistic, no text, no watermark.",
    "Show the full outfit from head to feet in one portrait photo; return the image only.",
  ].filter(Boolean).join(" ");
}
