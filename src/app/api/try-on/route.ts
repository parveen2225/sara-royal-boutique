import { after, type NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import { jsonError } from "@/lib/api/utils";
import { isObjectId } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { isSameOriginRequest } from "@/lib/auth/origin";
import { TRYON_LIMITS, tryOnSettings } from "@/lib/tryOn/config";
import { TryOnInputError, normalizeCustomerImage } from "@/lib/tryOn/image";
import { getTryOnProvider } from "@/lib/tryOn/providers";
import { TRYON_CONSENT_VERSION, styleByKey } from "@/lib/tryOn/styles";
import { TryOnLimitError, clientHashOf, createJob, processJob, sweepExpired } from "@/lib/tryOn/service";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120; // the generation runs in after() inside this budget; the response itself returns at once

/** Run work after the response is sent (Next after()); outside a request scope (tests/scripts) just start it. */
function inBackground(task: () => Promise<void>) {
  try {
    after(task);
  } catch {
    void task().catch(() => undefined);
  }
}

/**
 * Create an AI Try-On job (multipart/form-data): suitId, style, consent=true, adult=true, consentVersion,
 * person (image), reference (image, Custom Reference Style only). Returns { id, token, status } immediately;
 * the client then polls GET /api/try-on/:id with the X-TryOn-Token header.
 */
export async function POST(req: NextRequest) {
  // Browsers always send Origin on cross-site POSTs: refuse those. The mobile app sends none and is allowed.
  if (!isSameOriginRequest("POST", req.headers.get("origin"), req.headers.get("host"), req.headers.get("x-forwarded-host"))) return jsonError("Cross-site request refused", 403);
  if (!getTryOnProvider()) return jsonError("AI Try-On is not available right now.", 503);
  if (!isMongoConfigured()) return jsonError("AI Try-On is not available right now.", 503);
  const ip = clientIp(req.headers);
  const burst = rateLimit(`tryon:${ip}`, tryOnSettings().burstPer10Min, 10 * 60_000);
  if (!burst.allowed) return NextResponse.json({ message: "Too many try-on requests. Please wait a few minutes." }, { status: 429, headers: { "Retry-After": String(burst.retryAfterSec) } });
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > TRYON_LIMITS.maxInputBytes * 2 + 64 * 1024) return jsonError("The photos are too large. Each image must be 4 MB or smaller.", 413);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Invalid upload. Please choose your photo again.", 400);
  }
  const suitId = String(form.get("suitId") ?? "");
  const style = styleByKey(String(form.get("style") ?? ""));
  if (!isObjectId(suitId)) return jsonError("This suit is not available for try-on.", 400);
  if (!style) return jsonError("Please choose a stitching style.", 400);
  if (form.get("consent") !== "true" || form.get("adult") !== "true") return jsonError("Please confirm you are 18 or older and agree to the photo processing terms.", 400);
  if (form.get("consentVersion") !== TRYON_CONSENT_VERSION) return jsonError("The privacy notice was updated. Please review it and try again.", 409);
  const person = form.get("person");
  const reference = form.get("reference");
  if (!(person instanceof File)) return jsonError("Please upload your full-body photo.", 400);
  if (style.needsReference && !(reference instanceof File)) return jsonError("Please upload a reference photo of the stitched design you like.", 400);

  try {
    const personImg = await normalizeCustomerImage(person, Buffer.from(await person.arrayBuffer()), "Your photo", TRYON_LIMITS.minPersonSide);
    const refImg = style.needsReference && reference instanceof File
      ? await normalizeCustomerImage(reference, Buffer.from(await reference.arrayBuffer()), "Reference photo", TRYON_LIMITS.minReferenceSide)
      : null;
    await connectMongo();
    await sweepExpired();
    const clientHash = clientHashOf(ip);
    // createJob enforces one active job per client and atomically reserves the daily/monthly caps.
    const created = await createJob({ suitId, style, person: personImg, reference: refImg, clientHash, testOutcome: req.headers.get("x-tryon-mock-outcome") ?? undefined });
    if (!created) return jsonError("This suit is not available for try-on.", 404);
    inBackground(() => processJob(created.jobId));
    return NextResponse.json({ data: { id: created.jobId, token: created.token, status: "queued" } }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof TryOnInputError) return jsonError(e.message, 400);
    if (e instanceof TryOnLimitError) return jsonError(e.message, 429);
    console.error("[API /try-on] create failed", e instanceof Error ? e.name : "error"); // no image data, no URLs
    return jsonError("We could not start your preview. Please try again.", 500);
  }
}
