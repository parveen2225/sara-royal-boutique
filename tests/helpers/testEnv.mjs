// Isolated test environment: an in-memory MongoDB and a throwaway JWT secret. Nothing here can reach the live Atlas
// database because MONGODB_URI is overwritten with a loopback address (and verified) before any app module loads.
import { MongoMemoryServer, MongoMemoryReplSet } from "mongodb-memory-server";
import crypto from "node:crypto";

export const TEST_SECRET = crypto.randomBytes(32).toString("hex");

export async function startTestEnv({ replSet = false } = {}) {
  const server = replSet ? await MongoMemoryReplSet.create({ replSet: { count: 1 } }) : await MongoMemoryServer.create();
  const uri = server.getUri("sara_royal_test");
  if (!/^mongodb:\/\/127\.0\.0\.1:\d+\//.test(uri)) throw new Error("Refusing to run: test database is not loopback");
  process.env.MONGODB_URI = uri;
  process.env.JWT_SECRET = TEST_SECRET;
  process.env.NODE_ENV = "test";
  for (const k of ["ADMIN_BOOTSTRAP_EMAIL", "ADMIN_BOOTSTRAP_PASSWORD", "NEXT_PUBLIC_WHATSAPP_NUMBER", "CLOUDINARY_URL", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) delete process.env[k];
  const { default: connectMongo } = await import("../../src/lib/mongodb.ts");
  const mongoose = await connectMongo();
  if (!/127\.0\.0\.1/.test(mongoose.connection.host)) throw new Error("Connected to a non-loopback host; aborting");
  return {
    mongoose,
    replSet,
    async reset() {
      await mongoose.connection.dropDatabase();
      // allSettled: a legacy model with conflicting index declarations must not break unrelated tests.
      await Promise.allSettled(Object.values(mongoose.models).map((m) => m.init()));
    },
    async stop() {
      await mongoose.disconnect();
      await server.stop();
    },
  };
}

export async function makeReq(url, { method = "GET", body, token, ip = "10.0.0.1", headers = {} } = {}) {
  const { NextRequest } = await import("next/server");
  const h = { "x-forwarded-for": ip, ...headers };
  if (token) h.cookie = `admin_session=${token}`;
  if (body !== undefined) h["content-type"] = "application/json";
  return new NextRequest(`http://localhost${url}`, { method, headers: h, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body) });
}

export const json = async (res) => ({ status: res.status, body: await res.json().catch(() => null), res });
