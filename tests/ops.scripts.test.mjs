import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { MongoMemoryReplSet, MongoMemoryServer } from "mongodb-memory-server";

// Async on purpose: the in-memory MongoDB's log pipes are read by THIS process, so blocking it (spawnSync) would freeze mongod
// as soon as an index build logs enough output.
const run = (script, args = [], env = {}) => new Promise((resolve) => {
  const child = spawn(process.execPath, ["--import", "tsx", `scripts/${script}`, ...args], { env: { PATH: process.env.PATH, HOME: process.env.HOME, ...env } });
  let out = "";
  child.stdout.on("data", (d) => (out += d));
  child.stderr.on("data", (d) => (out += d));
  const timer = setTimeout(() => child.kill("SIGKILL"), 120000);
  child.on("close", (code) => { clearTimeout(timer); resolve({ code, out }); });
});
const rand = (n = 64) => crypto.randomBytes(n).toString("hex");
const goodEnv = () => ({ NODE_ENV: "production", MONGODB_URI: `mongodb+srv://user:${rand(8)}@cluster0.example.mongodb.net/db`, JWT_SECRET: rand(32), CRON_SECRET: rand(16), CLOUDINARY_URL: `cloudinary://${rand(4)}:${rand(8)}@democloud` });

test("preflight (env only): a correct production environment is READY and prints no secret value", async () => {
  const env = goodEnv();
  const r = await run("preflight.mjs", [], env);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /READY: \d+ passed, 0 warning\(s\), 0 failure\(s\)/);
  for (const secret of [env.JWT_SECRET, env.CRON_SECRET, env.MONGODB_URI, env.CLOUDINARY_URL, env.MONGODB_URI.match(/:([^@]+)@/)[1]]) assert.ok(!r.out.includes(secret), "a secret value leaked into the output");
});

test("preflight (env only): weak or missing settings are FAILures with exit code 1", async () => {
  const cases = [
    [{ JWT_SECRET: "short-secret" }, /FAIL\s+JWT_SECRET.*only 12 characters/],
    [{ JWT_SECRET: "a".repeat(40) }, /FAIL\s+JWT_SECRET.*guessable/],
    [{ JWT_SECRET: "my-super-secret-password-for-the-boutique-site" }, /FAIL\s+JWT_SECRET.*guessable/],
    [{ JWT_SECRET: undefined }, /FAIL\s+JWT_SECRET.*not set/],
    [{ CRON_SECRET: "tooshort" }, /FAIL\s+CRON_SECRET/],
    [{ ALLOW_SEED: "true" }, /FAIL\s+ALLOW_SEED/],
    [{ MONGODB_URI: "mongodb://127.0.0.1:27017/x" }, /FAIL\s+MONGODB_URI.*local/],
    [{ MONGODB_URI: "postgres://x" }, /FAIL\s+MONGODB_URI/],
    [{ CLOUDINARY_URL: undefined }, /FAIL\s+Cloudinary credentials/],
  ];
  for (const [patch, re] of cases) {
    const env = { ...goodEnv(), ...patch };
    for (const k of Object.keys(env)) if (env[k] === undefined) delete env[k];
    const r = await run("preflight.mjs", [], env);
    assert.equal(r.code, 1, JSON.stringify(Object.keys(patch)) + "\n" + r.out);
    assert.match(r.out, re);
    assert.match(r.out, /NOT READY/);
  }
  const warn = await run("preflight.mjs", [], { ...goodEnv(), ADMIN_BOOTSTRAP_EMAIL: "o@x.test", CRON_SECRET: undefined });
  assert.match(warn.out, /WARN\s+ADMIN_BOOTSTRAP_\*/);
});

test("preflight --check-db against a missing-DB setup fails cleanly without leaking the connection string", async () => {
  const env = { ...goodEnv(), MONGODB_URI: "mongodb://user:supersecretpw@127.0.0.1:1/nope?serverSelectionTimeoutMS=500" };
  const r = await run("preflight.mjs", ["--check-db"], env);
  assert.equal(r.code, 1);
  assert.match(r.out, /FAIL\s+Database connection/);
  assert.ok(!r.out.includes("supersecretpw"), "the password must never be printed");
});

let rs, standalone, uri, conn;
before(async () => {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  uri = rs.getUri("ops_test");
  conn = await mongoose.createConnection(uri).asPromise();
});
after(async () => { await conn?.close(); await rs?.stop(); await standalone?.stop(); });

const dbEnv = (u) => ({ ...goodEnv(), NODE_ENV: "development", MONGODB_URI: u }); // loopback DB: only the database checks matter here
const collections = async () => (await conn.db.listCollections().toArray()).map((c) => c.name).sort();

test("production has autoIndex OFF: duplicates slip in until the sync script runs; the script closes the gap safely", async () => {
  // 1) before: unique SKU index does not exist on a production-style startup
  await conn.collection("unstitchedsuits").insertOne({ sku: "SR-0001", name: "A" });
  await conn.collection("unstitchedsuits").insertOne({ sku: "SR-0001", name: "duplicate allowed (no index yet)" });
  assert.equal(await conn.collection("unstitchedsuits").countDocuments({ sku: "SR-0001" }), 2);
  await conn.collection("unstitchedsuits").deleteMany({});
  await conn.collection("admins").insertOne({ name: "Admin", email: "admin@sararoyal.com", role: "admin", password: await bcrypt.hash("admin123", 4), createdAt: new Date() });

  // 2) preflight --check-db reports the problems and changes NOTHING
  const snapshot = async () => JSON.stringify({ c: await collections(), admins: await conn.collection("admins").find({}).toArray() });
  const before = await snapshot();
  const pre = await run("preflight.mjs", ["--check-db"], dbEnv(uri));
  assert.match(pre.out, /PASS\s+Replica set/);
  assert.match(pre.out, /FAIL\s+Unique indexes\s+—\s+\d+ missing/);
  assert.match(pre.out, /FAIL\s+Default admin password.*admin@sararoyal\.com.*well-known default password/);
  assert.match(pre.out, /Legacy admin role.*treated as Owner/);
  assert.equal(pre.code, 1);
  assert.equal(await snapshot(), before, "the preflight must be strictly read-only");

  // 3) dry run: lists what it would do, changes nothing
  const dry = await run("sync-indexes.mjs", ["--dry-run"], { MONGODB_URI: uri });
  assert.equal(dry.code, 0, dry.out);
  assert.match(dry.out, /\[dry run\].*Target cluster host: 127\.0\.0\.1/);
  assert.match(dry.out, /nothing was changed/i);
  assert.equal(await snapshot(), before, "dry run must not create anything");
  assert.ok(!(await conn.collection("unstitchedsuits").indexes().catch(() => [])).some((i) => i.unique && i.key.sku));

  // 4) real run creates exactly the declared indexes; it is idempotent
  const real = await run("sync-indexes.mjs", [], { MONGODB_URI: uri });
  assert.equal(real.code, 0, real.out);
  const idx = async (name) => (await conn.collection(name).indexes()).map((i) => `${Object.keys(i.key).join("+")}${i.unique ? "!" : ""}`);
  assert.ok((await idx("unstitchedsuits")).includes("sku!"));
  assert.ok((await idx("suitorders")).includes("orderId!") && (await idx("suitorders")).includes("idempotencyKey!"));
  assert.ok((await idx("invoices")).includes("orderRef!") && (await idx("invoices")).includes("invoiceId!"));
  assert.ok((await idx("suitreturns")).includes("returnId!") && (await idx("suitrefunds")).includes("refundId!"));
  assert.ok((await idx("uploadedassets")).includes("url!"));
  assert.equal((await run("sync-indexes.mjs", [], { MONGODB_URI: uri })).code, 0, "running it twice is fine");
  await assert.rejects(conn.collection("unstitchedsuits").insertMany([{ sku: "SR-0002" }, { sku: "SR-0002" }]), /duplicate key|E11000/);
  assert.equal((await conn.collection("admins").find({}).toArray()).length, 1, "existing data untouched");

  // 5) preflight now sees the indexes; the default password still fails until it is changed
  const after1 = await run("preflight.mjs", ["--check-db"], dbEnv(uri));
  assert.match(after1.out, /PASS\s+Unique indexes\s+—\s+all present/);
  assert.match(after1.out, /FAIL\s+Default admin password/);
  await conn.collection("admins").updateOne({ email: "admin@sararoyal.com" }, { $set: { password: await bcrypt.hash("A-Much-Longer-New-Pass-1", 4) } });
  const after2 = await run("preflight.mjs", ["--check-db"], dbEnv(uri));
  assert.match(after2.out, /PASS\s+Default admin password.*was changed/);
  assert.equal(after2.code, 0, after2.out);
  assert.ok(!after2.out.includes("admin123") && !after2.out.includes("$2"), "no password or hash in the output");
});

test("preflight --check-db flags a standalone (non-transactional) server", async () => {
  standalone = await MongoMemoryServer.create();
  const r = await run("preflight.mjs", ["--check-db"], dbEnv(standalone.getUri("ops_standalone")));
  assert.match(r.out, /FAIL\s+Replica set \/ transactions\s+—\s+standalone/);
  assert.equal(r.code, 1);
});
