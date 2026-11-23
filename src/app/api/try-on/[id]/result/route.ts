import type { NextRequest } from "next/server";
import connectMongo, { isMongoConfigured } from "@/lib/mongodb";
import TryOnAsset from "@/models/TryOnAsset";
import { isObjectId } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { verifyResultSignature } from "@/lib/tryOn/config";
import { storedBytes } from "@/lib/tryOn/image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

// Serves a generated preview only with a valid, unexpired signature (minted by the status endpoint, 10 minutes).
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!rateLimit(`tryon-result:${clientIp(req.headers)}`, 60, 60_000).allowed) return new Response("Too many requests", { status: 429 });
  const sp = req.nextUrl.searchParams;
  if (!isObjectId(id) || !verifyResultSignature(id, sp.get("exp"), sp.get("sig")) || !isMongoConfigured()) return notFound();
  await connectMongo();
  const asset = await TryOnAsset.findOne({ jobId: id, kind: "result", expiresAt: { $gt: new Date() } }).lean<{ bytes: unknown; contentType: string }>();
  if (!asset) return notFound();
  const download = sp.get("download") === "1";
  return new Response(new Uint8Array(storedBytes(asset.bytes)), {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "private, no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Referrer-Policy": "no-referrer",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="sara-royal-ai-preview.jpg"`,
    },
  });
}
