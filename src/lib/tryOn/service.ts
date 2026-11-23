import connectMongo from "@/lib/mongodb";
import UnstitchedSuit from "@/models/UnstitchedSuit";
import TryOnJob from "@/models/TryOnJob";
import TryOnAsset from "@/models/TryOnAsset";
import { isCloudinaryImageUrl } from "@/lib/cloudinaryUrl";
import { JOB_TTL_MS, hmac, newAccessToken, safeEqual, sha256, signedResultPath, tryOnSettings } from "./config";
import { reencode, storedBytes, type NormalizedImage } from "./image";
import { buildTryOnPrompt } from "./prompt";
import { getTryOnProvider } from "./providers";
import { PUBLIC_ERROR, TryOnProviderError, type ProviderErrorCode, type ProviderImage } from "./providers/types";
import { TRYON_CONSENT_VERSION, styleByKey, type TryOnStyle } from "./styles";

const MIN = 60_000;
const STALE_QUEUE_MS = 15_000; // a queued job not picked up by after() within this is (re)started by a status poll
const FABRIC_FETCH_MS = 10_000;
const MAX_FABRIC_BYTES = 10 * 1024 * 1024;

export class TryOnLimitError extends Error {}

type JobDoc = {
  _id: { toString(): string }; status: string; suitId: unknown; suitName: string; style: string; provider: string; hasReference: boolean;
  tokenHash: string; attempts: number; startedAt: Date | null; finishedAt: Date | null; errorCode: string; resultExpiresAt: Date | null;
  testOutcome: string; createdAt: Date; expiresAt: Date;
};

export const clientHashOf = (ip: string) => hmac(`ip:${ip}`);

/** Cheap global sweep (TTL indexes do this too, but they may not exist yet and only run once a minute). */
export async function sweepExpired(now = new Date()) {
  await TryOnAsset.deleteMany({ expiresAt: { $lte: now } });
  await TryOnJob.deleteMany({ expiresAt: { $lte: now } });
}

export async function enforceLimits(clientHash: string, now = Date.now()) {
  const s = tryOnSettings();
  const since = new Date(now - 24 * 60 * MIN);
  const [mine, active, total] = await Promise.all([
    TryOnJob.countDocuments({ clientHash, createdAt: { $gte: since } }),
    TryOnJob.countDocuments({ clientHash, status: { $in: ["queued", "processing"] } }),
    TryOnJob.countDocuments({ createdAt: { $gte: since } }),
  ]);
  if (active > 0) throw new TryOnLimitError("Your previous preview is still being created. Please wait for it to finish.");
  if (mine >= s.dailyPerClient) throw new TryOnLimitError(`You have reached today's limit of ${s.dailyPerClient} previews. Please try again tomorrow.`);
  if (total >= s.dailyTotal) throw new TryOnLimitError("AI Try-On has reached today's limit. Please try again tomorrow.");
}

export async function createJob(args: { suitId: string; style: TryOnStyle; person: NormalizedImage; reference: NormalizedImage | null; clientHash: string; testOutcome?: string }) {
  const s = tryOnSettings();
  const provider = getTryOnProvider();
  if (!provider) throw new Error("provider unavailable");
  const suit = await UnstitchedSuit.findOne({ _id: args.suitId, status: "published" }).select("name").lean<{ _id: unknown; name: string }>();
  if (!suit) return null;
  const now = Date.now();
  const token = newAccessToken();
  const job = await TryOnJob.create({
    suitId: suit._id, suitName: suit.name, style: args.style.key, provider: provider.id, hasReference: Boolean(args.reference),
    consentAt: new Date(now), consentVersion: TRYON_CONSENT_VERSION, clientHash: args.clientHash, tokenHash: sha256(token),
    testOutcome: s.mockTestHooks && provider.id === "mock" ? args.testOutcome || process.env.TRYON_MOCK_FORCE_OUTCOME || "" : "",
    expiresAt: new Date(now + JOB_TTL_MS),
  });
  const inputExpiry = new Date(now + s.inputTtlMinutes * MIN);
  const assets = [{ jobId: job._id, kind: "person", contentType: args.person.contentType, width: args.person.width, height: args.person.height, bytes: args.person.bytes, expiresAt: inputExpiry }];
  if (args.reference) assets.push({ jobId: job._id, kind: "reference", contentType: args.reference.contentType, width: args.reference.width, height: args.reference.height, bytes: args.reference.bytes, expiresAt: inputExpiry });
  try {
    await TryOnAsset.insertMany(assets);
  } catch (e) {
    await TryOnJob.deleteOne({ _id: job._id });
    throw e;
  }
  return { jobId: String(job._id), token };
}

async function fetchFabric(url: string): Promise<ProviderImage | null> {
  if (!isCloudinaryImageUrl(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FABRIC_FETCH_MS) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > MAX_FABRIC_BYTES) return null;
    const img = await reencode(buf, 1536);
    return { bytes: img.bytes, contentType: img.contentType };
  } catch {
    return null;
  }
}

const deleteInputs = (jobId: unknown) => TryOnAsset.deleteMany({ jobId, kind: { $in: ["person", "reference"] } });

/** Runs one job to completion. Safe to call more than once: only the caller that claims the queued job proceeds. */
export async function processJob(jobId: string) {
  await connectMongo();
  const s = tryOnSettings();
  const job = await TryOnJob.findOneAndUpdate(
    { _id: jobId, status: "queued" },
    { $set: { status: "processing", startedAt: new Date() }, $inc: { attempts: 1 } },
    { new: true },
  ).lean<JobDoc>();
  if (!job) return;
  const fail = async (code: ProviderErrorCode | "fabric_unavailable") => {
    await TryOnJob.updateOne({ _id: job._id, status: "processing" }, { $set: { status: "failed", errorCode: code, finishedAt: new Date() } });
  };
  try {
    const provider = getTryOnProvider();
    const style = styleByKey(job.style);
    if (!provider || !style) return await fail("unavailable");
    const [suit, inputs] = await Promise.all([
      UnstitchedSuit.findById(job.suitId).select("name fabric color fabricImages").lean<{ name: string; fabric?: string; color?: string; fabricImages?: { url: string }[] }>(),
      TryOnAsset.find({ jobId: job._id, kind: { $in: ["person", "reference"] } }).lean<{ kind: string; bytes: unknown; contentType: string }[]>(),
    ]);
    const person = inputs.find((a) => a.kind === "person");
    const reference = inputs.find((a) => a.kind === "reference") ?? null;
    if (!suit || !person) return await fail("invalid_input");
    const fabric = await fetchFabric(suit.fabricImages?.[0]?.url ?? "");
    if (!fabric && provider.isLive) return await fail("fabric_unavailable"); // a live model must see the real fabric
    const deadline = Date.now() + s.timeoutMs;
    const input = {
      person: { bytes: storedBytes(person.bytes), contentType: person.contentType },
      fabric,
      reference: reference ? { bytes: storedBytes(reference.bytes), contentType: reference.contentType } : null,
      style,
      prompt: buildTryOnPrompt(style, { name: suit.name, fabric: suit.fabric, color: suit.color }, Boolean(reference)),
      suit: { name: suit.name, fabric: suit.fabric ?? "", color: suit.color ?? "" },
      testOutcome: job.testOutcome || undefined,
    };
    // One automatic retry for transient provider errors, within the same overall time budget.
    for (let attempt = 1; ; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) return await fail("timeout");
      try {
        const out = await provider.generate(input, AbortSignal.timeout(remaining));
        const result = await reencode(out.bytes);
        const resultExpiresAt = new Date(Date.now() + s.resultTtlMinutes * MIN);
        await TryOnAsset.create({ jobId: job._id, kind: "result", contentType: result.contentType, width: result.width, height: result.height, bytes: result.bytes, expiresAt: resultExpiresAt });
        await TryOnJob.updateOne({ _id: job._id, status: "processing" }, { $set: { status: "succeeded", finishedAt: new Date(), resultExpiresAt } });
        return;
      } catch (e) {
        const err = e instanceof TryOnProviderError ? e : new TryOnProviderError(isAbort(e) ? "timeout" : "unknown", "provider error");
        if (err.retryable && attempt < 2 && deadline - Date.now() > 5_000 && err.code !== "timeout") continue;
        return await fail(err.code);
      }
    }
  } catch (e) {
    // Never log image data or URLs; the error class/message is enough.
    console.error("[tryon] job failed", e instanceof Error ? e.name : "error");
    await fail("unknown");
  } finally {
    await deleteInputs(job._id).catch(() => undefined); // customer photos are never kept after generation
  }
}

const isAbort = (e: unknown) => e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError");

export async function loadJobForClient(jobId: string, token: string | null) {
  if (!token || token.length < 20 || token.length > 100) return null;
  const job = await TryOnJob.findById(jobId).lean<JobDoc>();
  if (!job || job.status === "deleted" || job.expiresAt.getTime() <= Date.now()) return null;
  return safeEqual(job.tokenHash, sha256(token)) ? job : null;
}

/** Marks stuck jobs as timed out and reports whether a queued job should be (re)started. */
export async function reconcile(job: JobDoc, now = Date.now()) {
  const s = tryOnSettings();
  if (job.status === "processing" && job.startedAt && now - job.startedAt.getTime() > s.timeoutMs + 30_000) {
    await TryOnJob.updateOne({ _id: job._id, status: "processing" }, { $set: { status: "failed", errorCode: "timeout", finishedAt: new Date(now) } });
    await deleteInputs(job._id);
    return { ...job, status: "failed", errorCode: "timeout" };
  }
  if (job.status === "succeeded" && job.resultExpiresAt && job.resultExpiresAt.getTime() <= now) {
    await TryOnAsset.deleteMany({ jobId: job._id });
    return { ...job, status: "expired" };
  }
  return job;
}

export const needsKick = (job: { status: string; createdAt: Date }, now = Date.now()) => job.status === "queued" && now - new Date(job.createdAt).getTime() > STALE_QUEUE_MS;

export function publicJob(job: JobDoc & { status: string }) {
  const id = String(job._id);
  const base = { id, status: job.status, style: job.style, suitName: job.suitName, createdAt: job.createdAt };
  if (job.status === "succeeded") return { ...base, resultUrl: signedResultPath(id), resultExpiresAt: job.resultExpiresAt };
  if (job.status === "failed") return { ...base, error: PUBLIC_ERROR[(job.errorCode as keyof typeof PUBLIC_ERROR)] ?? PUBLIC_ERROR.unknown, errorCode: job.errorCode || "unknown" };
  if (job.status === "expired") return { ...base, error: "This preview has expired and was deleted. Please generate a new one." };
  return base;
}

export async function deleteJob(jobId: string) {
  await TryOnAsset.deleteMany({ jobId });
  await TryOnJob.updateOne({ _id: jobId }, { $set: { status: "deleted", errorCode: "" } });
}
