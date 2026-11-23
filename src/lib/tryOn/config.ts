import crypto from "node:crypto";

// Server-only AI Try-On settings. Nothing here is ever sent to a client except the public summary built in
// publicTryOnConfig(); provider secrets are read only inside the provider modules.

const int = (name: string, fallback: number, min: number, max: number) => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v >= min && v <= max ? Math.floor(v) : fallback;
};

export const TRYON_LIMITS = {
  maxInputBytes: 4 * 1024 * 1024, // per image; hosts such as Vercel cap request bodies at ~4.5 MB, clients downscale first
  minPersonSide: 400,
  minReferenceSide: 256,
  maxOutputSide: 1536,
  maxInputPixels: 40_000_000,
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"] as const,
};

export function tryOnSettings() {
  return {
    provider: (process.env.TRYON_PROVIDER ?? "").trim().toLowerCase(), // "" | "off" = disabled, "mock" = local mock
    timeoutMs: int("TRYON_TIMEOUT_MS", 90_000, 5_000, 280_000),
    resultTtlMinutes: int("TRYON_RESULT_TTL_MINUTES", 60, 5, 24 * 60),
    inputTtlMinutes: int("TRYON_INPUT_TTL_MINUTES", 30, 5, 120), // hard ceiling; inputs are normally deleted right after generation
    dailyPerClient: int("TRYON_DAILY_LIMIT_PER_CLIENT", 5, 1, 100),
    dailyTotal: int("TRYON_DAILY_LIMIT_TOTAL", 100, 1, 100_000),
    burstPer10Min: int("TRYON_BURST_LIMIT", 4, 1, 1000), // per IP, per server instance
    mockDelayMs: int("TRYON_MOCK_DELAY_MS", 2500, 0, 60_000),
    mockTestHooks: process.env.TRYON_MOCK_TEST_HOOKS === "true",
  };
}

export const JOB_TTL_MS = 24 * 60 * 60 * 1000; // job metadata (no images) kept a day for rate limiting, then deleted

/** Key for signing result links and hashing client IPs. Derived from JWT_SECRET unless TRYON_SIGNING_SECRET is set. */
function signingKey(): Buffer {
  const own = process.env.TRYON_SIGNING_SECRET?.trim();
  const base = own && own.length >= 32 ? own : process.env.JWT_SECRET?.trim() ?? "";
  if (base.length < 16) throw new Error("TRYON signing key unavailable (set JWT_SECRET or TRYON_SIGNING_SECRET)");
  return crypto.createHmac("sha256", base).update("sara-royal:tryon:v1").digest();
}

export const hmac = (value: string) => crypto.createHmac("sha256", signingKey()).update(value).digest("base64url");
export const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
export const newAccessToken = () => crypto.randomBytes(24).toString("base64url");

export const safeEqual = (a: string, b: string) => {
  const ha = crypto.createHash("sha256").update(a).digest(), hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
};

/** Short-lived signed path for a result image (no token or cookie needed by <img>/<Image>). */
export function signedResultPath(jobId: string, ttlSeconds = 600, now = Date.now()) {
  const exp = Math.floor(now / 1000) + ttlSeconds;
  return `/api/try-on/${jobId}/result?exp=${exp}&sig=${hmac(`${jobId}.${exp}`)}`;
}

export function verifyResultSignature(jobId: string, exp: string | null, sig: string | null, now = Date.now()) {
  if (!exp || !sig || !/^\d{10}$/.test(exp)) return false;
  if (Number(exp) * 1000 < now) return false;
  return safeEqual(sig, hmac(`${jobId}.${exp}`));
}
