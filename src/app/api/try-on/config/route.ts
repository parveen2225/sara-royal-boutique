import { NextResponse } from "next/server";
import { TRYON_LIMITS, tryOnSettings } from "@/lib/tryOn/config";
import { PROVIDER_LABEL, getTryOnProvider } from "@/lib/tryOn/providers";
import { TRYON_CONSENT_VERSION, TRYON_DISCLAIMER, TRYON_STYLES } from "@/lib/tryOn/styles";

export const dynamic = "force-dynamic";

// Public, secret-free summary used by the website and the mobile app to decide whether to show "AI Try On Me".
export async function GET() {
  const provider = getTryOnProvider();
  const s = tryOnSettings();
  return NextResponse.json({
    data: {
      enabled: Boolean(provider),
      mode: provider ? (provider.isLive ? "live" : "mock") : "off",
      processor: provider?.isLive ? PROVIDER_LABEL[provider.id] ?? null : null, // named in the privacy notice
      styles: TRYON_STYLES.map(({ key, label, description, needsReference }) => ({ key, label, description, needsReference: Boolean(needsReference) })),
      maxImageBytes: TRYON_LIMITS.maxInputBytes,
      acceptedTypes: TRYON_LIMITS.acceptedTypes,
      minPersonSide: TRYON_LIMITS.minPersonSide,
      resultRetentionMinutes: s.resultTtlMinutes,
      dailyLimit: s.dailyPerClient,
      disclaimer: TRYON_DISCLAIMER,
      consentVersion: TRYON_CONSENT_VERSION,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
