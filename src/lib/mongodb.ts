import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var _mongoCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}

const MONGODB_URI = process.env.MONGODB_URI ?? "";
const VALID_SCHEME = /^mongodb(\+srv)?:\/\//i;

export const isMongoConfigured = (): boolean => VALID_SCHEME.test(MONGODB_URI);

if (!global._mongoCache) {
  global._mongoCache = { conn: null, promise: null };
}

const cache = global._mongoCache;

export default async function connectMongo(): Promise<typeof mongoose> {
  if (!isMongoConfigured()) {
    throw new Error(
      "MongoDB is not configured. Set MONGODB_URI in .env.local (e.g. mongodb://127.0.0.1:27017/boutique)",
    );
  }

  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
