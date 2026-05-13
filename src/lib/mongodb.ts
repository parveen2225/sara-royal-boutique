import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var _mongoCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}

const VALID_SCHEME = /^mongodb(\+srv)?:\/\//i;

const getMongoUri = (): string => {
  const raw = process.env.MONGODB_URI ?? "";
  const trimmed = raw.trim();

  // Handle accidental wrapping quotes in env files.
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
};

export const isMongoConfigured = (): boolean => VALID_SCHEME.test(getMongoUri());

const getMongoOptions = (): mongoose.ConnectOptions => {
  const caFile = process.env.MONGODB_TLS_CA_FILE?.trim();

  return {
    autoIndex: process.env.NODE_ENV !== "production",
    bufferCommands: false,
    maxPoolSize: 10,
    minPoolSize: 1,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 15000,
    family: 4,
    tls: true,
    ...(caFile ? { tlsCAFile: caFile } : {}),
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getMaskedUri = (uri: string): string =>
  uri.replace(/\/\/([^:/?#]+):([^@]+)@/g, "//$1:***@");

const logMongoConnectionError = (error: unknown, uri: string): void => {
  const err = error as Record<string, unknown> & { message?: string; stack?: string };
  const cause = err?.cause as
    | (Record<string, unknown> & { message?: string; code?: string; name?: string })
    | undefined;

  console.error("[MongoDB] Connection failed");
  console.error("[MongoDB] URI:", getMaskedUri(uri));
  console.error("[MongoDB] Node:", process.version, "OpenSSL:", process.versions.openssl);
  console.error("[MongoDB] Platform:", process.platform, process.arch);
  console.error("[MongoDB] Error name:", err?.name ?? "Unknown");
  console.error("[MongoDB] Error message:", err?.message ?? String(error));
  console.error("[MongoDB] Error code:", (err?.code as string | undefined) ?? "N/A");
  if (cause) {
    console.error("[MongoDB] Cause name:", cause.name ?? "Unknown");
    console.error("[MongoDB] Cause code:", cause.code ?? "N/A");
    console.error("[MongoDB] Cause message:", cause.message ?? "N/A");
  }
  if (err?.stack) {
    console.error("[MongoDB] Stack:", err.stack);
  }
};

const isRetryableMongoError = (error: unknown): boolean => {
  const err = error as {
    message?: string;
    errorLabelSet?: Set<string>;
    cause?: { code?: string; message?: string };
  };

  const labels = err?.errorLabelSet;
  if (labels instanceof Set && (labels.has("RetryableError") || labels.has("SystemOverloadedError"))) {
    return true;
  }

  const text = `${err?.message || ""} ${err?.cause?.message || ""}`.toLowerCase();
  return (
    text.includes("tlsv1 alert internal error") ||
    text.includes("ssl3_read_bytes") ||
    text.includes("connection") ||
    text.includes("timeout") ||
    err?.cause?.code === "ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR"
  );
};

const connectWithRetry = async (
  uri: string,
  options: mongoose.ConnectOptions,
): Promise<typeof mongoose> => {
  const maxAttempts = Number(process.env.MONGODB_RETRY_ATTEMPTS || "3");

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (attempt > 1) {
        console.warn(`[MongoDB] Retrying connection (${attempt}/${maxAttempts})`);
      }
      return await mongoose.connect(uri, options);
    } catch (error: unknown) {
      logMongoConnectionError(error, uri);
      const isLast = attempt >= maxAttempts;
      if (isLast || !isRetryableMongoError(error)) {
        throw error;
      }
      await sleep(400 * attempt);
    }
  }

  throw new Error("MongoDB connection retry exhausted");
};

if (!global._mongoCache) {
  global._mongoCache = { conn: null, promise: null };
}

const cache = global._mongoCache;

export default async function connectMongo(): Promise<typeof mongoose> {
  const uri = getMongoUri();

  if (!isMongoConfigured()) {
    throw new Error(
      "MongoDB is not configured. Set MONGODB_URI in .env.local (e.g. mongodb://127.0.0.1:27017/boutique)",
    );
  }

  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = connectWithRetry(uri, getMongoOptions()).catch((error: unknown) => {
      cache.promise = null;
      throw error;
    });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
