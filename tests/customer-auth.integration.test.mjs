// /api/customer/me against an in-memory MongoDB. Google is never contacted: Firebase ID-token verification is replaced
// by a stub through the test-only hook (refused outside NODE_ENV=test).
import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { startTestEnv, makeReq } from "./helpers/testEnv.mjs";

let env, Customer, ME, V;
const TOKENS = {
  "tok-alice-0000000000000000": { uid: "uid-alice", email: "Alice@Example.com", email_verified: true, name: "Alice Kaur", firebase: { sign_in_provider: "password" } },
  "tok-bob-00000000000000000000": { uid: "uid-bob", email: "bob@example.com", email_verified: true, name: "", firebase: { sign_in_provider: "password" } },
  "tok-unverified-000000000000": { uid: "uid-new", email: "new@example.com", email_verified: false, firebase: { sign_in_provider: "password" } },
  "tok-google-0000000000000000": { uid: "uid-g", email: "g@example.com", email_verified: true, firebase: { sign_in_provider: "google.com" } },
  "tok-anon-00000000000000000000": { uid: "uid-anon", firebase: { sign_in_provider: "anonymous" } },
};

before(async () => {
  env = await startTestEnv();
  V = await import("../src/lib/customerAuth/verifyToken.ts");
  V.setCustomerTokenVerifierForTests(async (t) => { const d = TOKENS[t]; if (!d) throw new Error("bad token"); return d; });
  ({ default: Customer } = await import("../src/models/Customer.ts"));
  ME = await import("../src/app/api/customer/me/route.ts");
});
after(async () => { V?.setCustomerTokenVerifierForTests(null); await env?.stop(); });
beforeEach(() => env.reset());

let n = 0;
const call = async (method, { token, body, headers = {}, url = "/api/customer/me" } = {}) => {
  const h = { ...headers };
  if (token) h.authorization = `Bearer ${token}`;
  const req = await makeReq(url, { method, body, headers: h, ip: `10.55.0.${++n % 250}` });
  const res = await ME[method](req);
  return { status: res.status, body: await res.json().catch(() => null), cache: res.headers.get("cache-control"), setCookie: res.headers.get("set-cookie") };
};

test("401 without a valid Bearer ID token (missing, malformed, unknown/expired)", async () => {
  assert.equal((await call("GET")).status, 401);
  assert.equal((await call("GET", { headers: { authorization: "Basic abc" } })).status, 401);
  assert.equal((await call("GET", { headers: { authorization: "Bearer short" } })).status, 401);
  const r = await call("GET", { token: "tok-forged-000000000000000000" });
  assert.equal(r.status, 401);
  assert.match(r.body.message, /log in again/);
  assert.equal(await Customer.countDocuments(), 0);
});

test("403 for unverified emails and non email/password accounts", async () => {
  const r = await call("GET", { token: "tok-unverified-000000000000" });
  assert.equal(r.status, 403);
  assert.match(r.body.message, /verify your email/);
  assert.equal((await call("GET", { token: "tok-google-0000000000000000" })).status, 403);
  assert.equal((await call("GET", { token: "tok-anon-00000000000000000000" })).status, 403);
  assert.equal(await Customer.countDocuments(), 0, "nothing stored for refused tokens");
});

test("GET creates the profile on first visit (keyed by Firebase UID) and returns the same one afterwards; no cookies, no caching", async () => {
  const a = await call("GET", { token: "tok-alice-0000000000000000" });
  assert.equal(a.status, 200, JSON.stringify(a.body));
  assert.deepEqual({ uid: a.body.data.uid, email: a.body.data.email, name: a.body.data.name }, { uid: "uid-alice", email: "alice@example.com", name: "Alice Kaur" });
  assert.match(a.cache, /no-store/);
  assert.equal(a.setCookie, null, "customer API never sets cookies");
  const again = await call("GET", { token: "tok-alice-0000000000000000" });
  assert.equal(again.body.data.uid, "uid-alice");
  assert.equal(await Customer.countDocuments(), 1);
  const doc = await Customer.findOne({ firebaseUid: "uid-alice" }).lean();
  assert.deepEqual(Object.keys(doc).sort(), ["_id", "createdAt", "email", "firebaseUid", "lastSeenAt", "name", "updatedAt"], "no password/token fields");
});

test("PATCH edits only the caller's own name, validated; other fields and other customers are untouchable", async () => {
  await call("GET", { token: "tok-alice-0000000000000000" });
  await call("GET", { token: "tok-bob-00000000000000000000" });
  const ok = await call("PATCH", { token: "tok-bob-00000000000000000000", body: { name: "  Bobby   Singh " } });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(ok.body.data.name, "Bobby Singh");
  assert.equal((await call("PATCH", { token: "tok-bob-00000000000000000000", body: { name: "B" } })).status, 400);
  assert.equal((await call("PATCH", { token: "tok-bob-00000000000000000000", body: { name: "<b>x</b>" } })).status, 400);
  for (const body of [{ name: "Bob", email: "evil@example.com" }, { name: "Bob", firebaseUid: "uid-alice" }, { uid: "uid-alice" }, {}, "nope"]) {
    assert.equal((await call("PATCH", { token: "tok-bob-00000000000000000000", body })).status, 400, JSON.stringify(body));
  }
  // a uid in the URL is ignored: identity comes only from the verified token
  const sneaky = await call("PATCH", { token: "tok-bob-00000000000000000000", body: { name: "Hacked Name" }, url: "/api/customer/me?uid=uid-alice" });
  assert.equal(sneaky.body.data.uid, "uid-bob");
  const alice = await Customer.findOne({ firebaseUid: "uid-alice" }).lean();
  assert.equal(alice.name, "Alice Kaur");
  assert.equal(alice.email, "alice@example.com");
  assert.equal((await call("PATCH", { token: "tok-unverified-000000000000", body: { name: "New Person" } })).status, 403);
});

test("customer and admin sessions are separate: admin cookie is ignored here, customer token is refused by admin APIs", async () => {
  const withCookie = await call("GET", { headers: { cookie: "admin_session=anything" } });
  assert.equal(withCookie.status, 401, "admin cookie is not a customer session");
  const adminMe = await import("../src/app/api/auth/me/route.ts");
  const { makeReq: mk } = await import("./helpers/testEnv.mjs");
  const res = await adminMe.GET(await mk("/api/auth/me", { headers: { authorization: "Bearer tok-alice-0000000000000000" } }));
  assert.equal(res.status, 401, "a customer's Firebase token never grants admin access");
});

test("not configured: without a Firebase project id the API answers 503 and never contacts Google", async () => {
  V.setCustomerTokenVerifierForTests(null);
  const saved = { a: process.env.FIREBASE_PROJECT_ID, b: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID };
  delete process.env.FIREBASE_PROJECT_ID; delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  try {
    const r = await call("GET", { token: "tok-alice-0000000000000000" });
    assert.equal(r.status, 503);
    assert.equal(V.customerProjectId(), "");
    process.env.FIREBASE_PROJECT_ID = "Bad Id!";
    assert.equal(V.customerProjectId(), "", "malformed ids are ignored");
  } finally {
    if (saved.a === undefined) delete process.env.FIREBASE_PROJECT_ID; else process.env.FIREBASE_PROJECT_ID = saved.a;
    if (saved.b !== undefined) process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = saved.b;
    V.setCustomerTokenVerifierForTests(async (t) => { const d = TOKENS[t]; if (!d) throw new Error("bad token"); return d; });
  }
});

test("the test hook cannot be used outside tests", () => {
  const prev = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try { assert.throws(() => V.setCustomerTokenVerifierForTests(async () => ({})), /test hook only/); }
  finally { process.env.NODE_ENV = prev; }
});
