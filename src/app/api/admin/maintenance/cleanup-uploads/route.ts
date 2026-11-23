import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import UploadedAsset from "@/models/UploadedAsset";
import connectMongo from "@/lib/mongodb";
import { jsonError, jsonOk } from "@/lib/api/utils";
import { getAuthUser } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit";
import { isUrlReferenced } from "@/lib/assetRefs";
import { cloudinary, ensureCloudinary, uploadFolder } from "@/lib/cloudinary";
import { publicIdFromUrl } from "@/lib/cloudinaryUrl";

export const dynamic = "force-dynamic";
const GRACE_MS = 24 * 60 * 60 * 1000;

const safeEqual = (a: string, b: string) => {
  const ha = crypto.createHash("sha256").update(a).digest(), hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
};

/**
 * Remove uploads that were never attached to any record. Runs for the signed-in Owner or for a scheduler that sends the
 * CRON_SECRET (x-cron-secret header). Only files uploaded through the admin (tracked in UploadedAsset) and older than
 * 24 hours are considered, and a file is deleted only if NO record in the system references it. ?dryRun=true reports only.
 */
const cronAuthorised = (req: NextRequest) => {
  const secret = process.env.CRON_SECRET?.trim();
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const provided = req.headers.get("x-cron-secret") ?? bearer;
  return Boolean(secret && secret.length >= 24 && provided && safeEqual(provided, secret));
};

// Scheduler entry point (Vercel Cron sends GET with "Authorization: Bearer <CRON_SECRET>"). GET is ONLY for the
// scheduler: a signed-in browser session cannot trigger it (no state-changing GET for cookies).
export async function GET(req: NextRequest) {
  if (!cronAuthorised(req)) return jsonError("Unauthorized", 401);
  return run(req, { id: "cron", email: "cron", role: "owner" });
}

export async function POST(req: NextRequest) {
  let actor: { id: string; email: string; role: "owner" | "staff" } = { id: "cron", email: "cron", role: "owner" };
  if (!cronAuthorised(req)) {
    const user = await getAuthUser(req);
    if ("error" in user) return user.error;
    if (user.role !== "owner") return jsonError("Forbidden", 403);
    actor = user;
  }
  return run(req, actor);
}

async function run(req: NextRequest, actor: { id: string; email: string; role: "owner" | "staff" }) {
  const dryRun = req.nextUrl.searchParams.get("dryRun") === "true";
  await connectMongo();
  const cutoff = new Date(Date.now() - GRACE_MS);
  const candidates = await UploadedAsset.find({ createdAt: { $lt: cutoff } }).sort({ createdAt: 1 }).limit(100).lean();

  let deleted = 0, kept = 0, failed = 0;
  const cloudErr = dryRun ? null : ensureCloudinary();
  for (const asset of candidates) {
    if (await isUrlReferenced(asset.url)) { // in use: stop tracking it as "pending", never delete
      kept++;
      if (!dryRun) await UploadedAsset.deleteOne({ _id: asset._id });
      continue;
    }
    if (dryRun) { deleted++; continue; }
    const publicId = asset.publicId || publicIdFromUrl(asset.url);
    if (cloudErr || !publicId.startsWith(`${uploadFolder()}/`)) { failed++; continue; }
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
      await UploadedAsset.deleteOne({ _id: asset._id });
      deleted++;
    } catch (e) {
      failed++;
      console.error("[cleanup-uploads] could not delete", publicId, e instanceof Error ? e.message : e);
    }
  }
  if (!dryRun) await logAudit(actor, "maintenance.cleanup_uploads", {}, `deleted ${deleted}, kept ${kept}, failed ${failed}`);
  return jsonOk({ dryRun, checked: candidates.length, [dryRun ? "wouldDelete" : "deleted"]: deleted, stillInUse: kept, failed });
}
