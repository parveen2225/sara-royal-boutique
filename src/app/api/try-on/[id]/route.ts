import { after, NextResponse, type NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import { jsonError } from "@/lib/api/utils";
import { isObjectId } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { isSameOriginRequest } from "@/lib/auth/origin";
import { deleteJob, loadJobForClient, needsKick, processJob, publicJob, reconcile } from "@/lib/tryOn/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
type Ctx = { params: Promise<{ id: string }> };
const NO_STORE = { "Cache-Control": "no-store" };

function inBackground(task: () => Promise<void>) {
  try { after(task); } catch { void task().catch(() => undefined); }
}

// Status of a job. Requires the access token returned at creation (X-TryOn-Token header); wrong token == not found.
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!rateLimit(`tryon-poll:${clientIp(req.headers)}`, 120, 60_000).allowed) return jsonError("Too many requests", 429);
  if (!isObjectId(id) || !isMongoConfigured()) return jsonError("Preview not found", 404);
  await connectMongo();
  const job = await loadJobForClient(id, req.headers.get("x-tryon-token"));
  if (!job) return jsonError("Preview not found", 404);
  const current = await reconcile(job);
  if (needsKick(current)) inBackground(() => processJob(id)); // after() did not run (e.g. instance recycled): start it now
  return NextResponse.json({ data: publicJob(current as never) }, { headers: NO_STORE });
}

// "Delete my photos now": removes every image of the job immediately.
export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!isSameOriginRequest("DELETE", req.headers.get("origin"), req.headers.get("host"), req.headers.get("x-forwarded-host"))) return jsonError("Cross-site request refused", 403);
  const { id } = await params;
  if (!isObjectId(id) || !isMongoConfigured()) return jsonError("Preview not found", 404);
  await connectMongo();
  const job = await loadJobForClient(id, req.headers.get("x-tryon-token"));
  if (!job) return jsonError("Preview not found", 404);
  await deleteJob(id);
  return NextResponse.json({ message: "Your photos and preview were deleted." }, { headers: NO_STORE });
}
