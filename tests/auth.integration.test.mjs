import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { startTestEnv, makeReq, json, TEST_SECRET } from "./helpers/testEnv.mjs";

let env, Admin, AuditLog, signAdminToken, login, me, changePw, logout, catRoute, settingsRoute, publicSettings, uploadRoute, productsRoute, guard, mw;
const PW = "Correct-Horse-Battery-9"; // throwaway test password, only ever used against the in-memory database
let ipCounter = 0;
const ip = () => `10.1.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`;

before(async () => {
  env = await startTestEnv();
  ({ default: Admin } = await import("../src/models/Admin.js"));
  ({ default: AuditLog } = await import("../src/models/AuditLog.ts"));
  ({ signAdminToken } = await import("../src/lib/auth/session.ts"));
  login = (await import("../src/app/api/auth/login/route.ts")).POST;
  me = (await import("../src/app/api/auth/me/route.ts")).GET;
  changePw = (await import("../src/app/api/auth/change-password/route.ts")).POST;
  logout = (await import("../src/app/api/auth/logout/route.ts")).POST;
  catRoute = await import("../src/app/api/admin/suit-categories/route.ts");
  settingsRoute = await import("../src/app/api/admin/settings/route.ts");
  publicSettings = (await import("../src/app/api/settings/public/route.ts")).GET;
  uploadRoute = (await import("../src/app/api/upload/route.ts")).POST;
  productsRoute = await import("../src/app/api/products/route.ts");
  guard = await import("../src/lib/auth/guard.ts");
  mw = (await import("../middleware.ts")).middleware;
});
after(() => env?.stop());
beforeEach(() => env.reset());

const hash = () => bcrypt.hash(PW, 4);
const mk = async (over = {}) => Admin.create({ name: "N", email: `${crypto.randomUUID().slice(0, 8)}@test.local`, password: await hash(), ...over });
const tokenFor = (a) => signAdminToken({ id: String(a._id), email: a.email, role: a.role === "staff" ? "staff" : "owner" });
const doLogin = async (email, password = PW, ipAddr = ip()) => json(await login(await makeReq("/api/auth/login", { method: "POST", body: { email, password }, ip: ipAddr })));
const post = async (route, url, token, body) => json(await route.POST(await makeReq(url, { method: "POST", token, body })));


// Runs fn with console.error captured, returning the result and the log lines (the route logs configuration problems).
const withMutedErrors = async (fn) => { const logs = []; const orig = console.error; console.error = (...a) => logs.push(a.map(String).join(" ")); try { const r = await fn(); r.logs = logs; return r; } finally { console.error = orig; } };
const withEnv = async (vars, fn) => { const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]])); Object.assign(process.env, vars); try { return await fn(); } finally { for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } } };

// ---------------- login
test("login: owner and staff can sign in; httpOnly cookie is set; password hash never returned", async () => {
  const owner = await mk({ role: "owner" });
  const staff = await mk({ role: "staff", permissions: { products: true } });
  for (const [a, role] of [[owner, "owner"], [staff, "staff"]]) {
    const r = await doLogin(a.email);
    assert.equal(r.status, 200);
    assert.equal(r.body.data.user.role, role);
    assert.ok(!JSON.stringify(r.body).includes("password"));
    const cookie = r.res.headers.get("set-cookie");
    assert.match(cookie, /admin_session=/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=lax/i);
  }
});

test("login: legacy role 'admin' account still works and acts as owner (no migration needed)", async () => {
  const legacy = await mk({ role: "admin" });
  const r = await doLogin(legacy.email);
  assert.equal(r.status, 200);
  assert.equal(r.body.data.user.role, "owner");
  const u = await json(await me(await makeReq("/api/auth/me", { token: r.body.data.token })));
  assert.equal(u.body.data.role, "owner");
  assert.equal(u.body.data.permissions.reports, true);
});

test("login: wrong password, unknown email, disabled account, bad input", async () => {
  const a = await mk();
  assert.equal((await doLogin(a.email, "wrong-password-123")).status, 401);
  assert.equal((await doLogin("nobody@test.local")).status, 401);
  const dis = await mk({ role: "staff", active: false });
  assert.equal((await doLogin(dis.email)).status, 401);
  assert.equal((await doLogin("", "")).status, 400);
  assert.equal((await doLogin("not-an-email", "x")).status, 400);
  assert.equal((await login(await makeReq("/api/auth/login", { method: "POST", body: "{{{", ip: ip() }))).status, 400);
});

test("login: the old hardcoded credentials no longer work (with or without a database account)", async () => {
  assert.equal((await doLogin("admin@sararoyal.com", "admin123")).status, 401);
  assert.equal(await Admin.countDocuments(), 0); // and no account is auto-created
});

test("login: first-run bootstrap only with env vars, only when no admin exists", async () => {
  process.env.ADMIN_BOOTSTRAP_EMAIL = "boot@test.local";
  process.env.ADMIN_BOOTSTRAP_PASSWORD = "Bootstrap-Pass-12345";
  try {
    assert.equal((await doLogin("boot@test.local", "wrong-wrong-wrong")).status, 401);
    assert.equal(await Admin.countDocuments(), 0);
    const ok = await doLogin("boot@test.local", "Bootstrap-Pass-12345");
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.user.role, "owner");
    // once an admin exists, bootstrap cannot mint another account
    await Admin.deleteOne({ email: "boot@test.local" });
    await mk();
    assert.equal((await doLogin("boot@test.local", "Bootstrap-Pass-12345")).status, 401);
  } finally {
    delete process.env.ADMIN_BOOTSTRAP_EMAIL;
    delete process.env.ADMIN_BOOTSTRAP_PASSWORD;
  }
});

test("login: rate limited after 8 failures from the same IP+email; success of another IP unaffected", async () => {
  const a = await mk();
  const attackerIp = ip();
  for (let i = 0; i < 8; i++) assert.equal((await doLogin(a.email, "bad-password-xx", attackerIp)).status, 401);
  const blocked = await doLogin(a.email, PW, attackerIp);
  assert.equal(blocked.status, 429);
  assert.ok(Number(blocked.res.headers.get("retry-after")) > 0);
  assert.equal((await doLogin(a.email, PW, ip())).status, 200);
});

test("login: an email is limited across ALL source IPs (rotating or spoofed X-Forwarded-For does not help)", async () => {
  const a = await mk();
  let last;
  for (let i = 0; i < 31; i++) last = await doLogin(a.email, "bad-password-xx", ip());
  assert.equal(last.status, 429, "31st attempt from a fresh IP is refused");
  assert.equal((await doLogin(a.email, PW, ip())).status, 429, "even the right password is refused while the email is throttled");
  const other = await mk();
  assert.equal((await doLogin(other.email, PW, ip())).status, 200, "other accounts are unaffected");
});

test("logout clears the cookie", async () => {
  const res = await logout();
  assert.match(res.headers.get("set-cookie"), /admin_session=;|Max-Age=0/);
});

// ---------------- permissions
test("staff permissions are enforced by the API (products)", async () => {
  const none = await mk({ role: "staff" });
  const withProducts = await mk({ role: "staff", permissions: { products: true } });
  const body = { name: "Cotton" };
  assert.equal((await post(catRoute, "/api/admin/suit-categories", tokenFor(none), body)).status, 403);
  assert.equal((await post(catRoute, "/api/admin/suit-categories", tokenFor(withProducts), body)).status, 201);
  assert.equal((await post(catRoute, "/api/admin/suit-categories", undefined, body)).status, 401);
  assert.equal((await json(await catRoute.GET(await makeReq("/api/admin/suit-categories", { token: tokenFor(none) })))).status, 403);
});

test("owner-only: staff (even with every permission) cannot read or change settings", async () => {
  const staff = await mk({ role: "staff", permissions: { products: true, orders: true, stock: true, returns: true, reports: true } });
  const owner = await mk({ role: "owner" });
  const t = tokenFor(staff);
  assert.equal((await json(await settingsRoute.GET(await makeReq("/api/admin/settings", { token: t })))).status, 403);
  const putJson = async (token, body) => json(await settingsRoute.PUT(await makeReq("/api/admin/settings", { method: "PUT", token, body })));
  assert.equal((await putJson(t, { whatsappNumber: "+919988854440" })).status, 403);
  assert.equal((await putJson(undefined, { whatsappNumber: "+919988854440" })).status, 401);
  assert.equal((await json(await settingsRoute.GET(await makeReq("/api/admin/settings", { token: tokenFor(owner) })))).status, 200);
});

test("settings: WhatsApp validation, GST defaults OFF, GSTIN required to enable, audit log, public endpoint", async () => {
  const owner = await mk({ role: "owner" });
  const t = tokenFor(owner);
  const put = async (body) => json(await settingsRoute.PUT(await makeReq("/api/admin/settings", { method: "PUT", token: t, body })));
  const get = await json(await settingsRoute.GET(await makeReq("/api/admin/settings", { token: t })));
  assert.equal(get.body.data.gst.enabled, false);
  assert.equal(get.body.data.whatsappNumber, "");
  assert.equal((await json(await publicSettings())).body.data.whatsappNumber, null); // nothing invented
  // legacy env fallback: a bare 10-digit Indian mobile (old deployments) is read as +91; junk still hides ordering
  for (const [envValue, expected] of [["9988854440", "919988854440"], ["+91 99888 54440", "919988854440"], ["12345", null], ["5988854440", null]]) {
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = envValue;
    assert.equal((await json(await publicSettings())).body.data.whatsappNumber, expected, envValue);
  }
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER = "9000000001"; // the admin setting below must win over the env fallback

  assert.equal((await put({ whatsappNumber: "9988854440" })).status, 400);
  assert.equal((await put({ whatsappNumber: "+91 12345 67890" })).status, 400);
  assert.equal((await put({ whatsappNumber: "+91 99888 54440" })).status, 200);
  assert.equal((await json(await publicSettings())).body.data.whatsappNumber, "919988854440");
  delete process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  assert.equal((await put({ email: "bad" })).status, 400);
  assert.equal((await put({ logo: { url: "javascript:alert(1)" } })).status, 400);
  assert.equal((await put({ gst: { enabled: true } })).status, 400);
  assert.equal((await put({ gst: { enabled: true, gstin: "03ABCDE1234F1Z5" } })).status, 200);
  assert.equal((await put({ gst: { enabled: false } })).status, 200);
  assert.equal((await put({ bogus: 1 })).status, 400);
  assert.equal(await AuditLog.countDocuments({ action: "settings.updated", actorId: String(owner._id) }), 3); // only the 3 successful saves are logged
});

// ---------------- disabled / changed / deleted accounts
test("a valid token stops working immediately when the account is disabled, demoted, or deleted", async () => {
  const staff = await mk({ role: "staff", permissions: { products: true } });
  const t = tokenFor(staff);
  const ping = async () => (await post(catRoute, "/api/admin/suit-categories", t, { name: crypto.randomUUID().slice(0, 6) })).status;
  assert.equal(await ping(), 201);
  await Admin.updateOne({ _id: staff._id }, { $set: { "permissions.products": false } });
  assert.equal(await ping(), 403); // permission revoked -> effective at once
  await Admin.updateOne({ _id: staff._id }, { $set: { "permissions.products": true } });
  assert.equal(await ping(), 201);
  await Admin.updateOne({ _id: staff._id }, { $set: { active: false } });
  assert.equal(await ping(), 401); // disabled
  assert.equal((await json(await me(await makeReq("/api/auth/me", { token: t })))).status, 401);
  await Admin.updateOne({ _id: staff._id }, { $set: { active: true } });
  await Admin.deleteOne({ _id: staff._id });
  assert.equal(await ping(), 401); // deleted
  const owner = await mk({ role: "owner" });
  const ot = tokenFor(owner);
  await Admin.updateOne({ _id: owner._id }, { $set: { role: "staff" } }); // demoted: stale "owner" token must not keep owner rights
  assert.equal((await json(await settingsRoute.GET(await makeReq("/api/admin/settings", { token: ot })))).status, 403);
});

test("forged / expired / wrong-algorithm / legacy-id tokens are rejected", async () => {
  const a = await mk({ role: "owner" });
  const b64u = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const sign = (payload, secret, alg = "HS256") => {
    const h = b64u({ alg, typ: "JWT" }), p = b64u(payload);
    return `${h}.${p}.${alg === "none" ? "" : crypto.createHmac("sha256", secret).update(`${h}.${p}`).digest("base64url")}`;
  };
  const now = Math.floor(Date.now() / 1000);
  const payload = { id: String(a._id), email: a.email, role: "owner" };
  const status = async (token) => (await json(await settingsRoute.GET(await makeReq("/api/admin/settings", { token })))).status;
  assert.equal(await status(sign({ ...payload, exp: now + 600 }, TEST_SECRET)), 200); // control: our own signing works
  assert.equal(await status(sign({ ...payload, exp: now + 600 }, "attacker-secret")), 401);
  assert.equal(await status(sign({ ...payload, exp: now - 10 }, TEST_SECRET)), 401);
  assert.equal(await status(sign({ ...payload, exp: now + 600 }, TEST_SECRET, "none")), 401);
  assert.equal(await status(sign({ id: "demo-admin", email: "x", role: "admin", exp: now + 600 }, TEST_SECRET)), 401); // old fallback-admin ids
  assert.equal(await status("garbage"), 401);
  assert.equal(await status(""), 401);
});

test("legacy requireAdmin (existing routes): owner/legacy-admin pass, staff and anonymous fail", async () => {
  const req = async (token) => makeReq("/api/products", { method: "POST", token });
  const owner = await mk({ role: "owner" }), legacy = await mk({ role: "admin" }), staff = await mk({ role: "staff", permissions: { products: true } });
  assert.equal(guard.requireAdmin(await req(tokenFor(owner))).ok, true);
  assert.equal(guard.requireAdmin(await req(signAdminToken({ id: String(legacy._id), email: legacy.email, role: "admin" }))).ok, true);
  assert.equal(guard.requireAdmin(await req(tokenFor(staff))).ok, false);
  assert.equal(guard.requireAdmin(await req(undefined)).ok, false);
});

test("upload route: staff with products permission reaches the upload logic; others are refused", async () => {
  const ok = await mk({ role: "staff", permissions: { products: true } });
  const no = await mk({ role: "staff", permissions: { orders: true } });
  const call = async (token) => (await uploadRoute(await makeReq("/api/upload", { method: "POST", token }))).status;
  assert.equal(await call(undefined), 401);
  assert.equal(await call(tokenFor(no)), 403);
  const s = await call(tokenFor(ok));
  assert.ok(s !== 401 && s !== 403, `expected to pass auth, got ${s}`); // later fails on missing Cloudinary config / file, which is fine here
});

// ---------------- change password
test("change-password: validation, success, old password stops working", async () => {
  const a = await mk({ role: "owner" });
  const t = tokenFor(a);
  const call = async (body, token = t) => json(await changePw(await makeReq("/api/auth/change-password", { method: "POST", token, body })));
  assert.equal((await call({ currentPassword: PW, newPassword: "short" })).status, 400);
  assert.equal((await call({ currentPassword: "wrong-current-pass", newPassword: "A-Brand-New-Passw0rd" })).status, 400);
  assert.equal((await call({ currentPassword: PW, newPassword: PW })).status, 400);
  assert.equal((await call({ currentPassword: PW, newPassword: "A-Brand-New-Passw0rd" }, null)).status, 401);
  assert.equal((await call({ currentPassword: PW, newPassword: "A-Brand-New-Passw0rd" })).status, 200);
  assert.equal((await doLogin(a.email, PW)).status, 401);
  assert.equal((await doLogin(a.email, "A-Brand-New-Passw0rd")).status, 200);
  assert.equal(await AuditLog.countDocuments({ action: "auth.password_changed" }), 1);
});

// ---------------- middleware
test("middleware: redirects anonymous/forged/expired admin requests, allows valid ones, ignores public paths", async () => {
  const a = await mk({ role: "owner" });
  const good = tokenFor(a);
  const b64u = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const h = b64u({ alg: "HS256", typ: "JWT" }), p = b64u({ id: String(a._id), role: "owner", exp: Math.floor(Date.now() / 1000) + 600 });
  const forged = `${h}.${p}.${crypto.createHmac("sha256", "wrong").update(`${h}.${p}`).digest("base64url")}`;
  const run = async (path, token) => {
    const { NextRequest } = await import("next/server");
    return mw(new NextRequest(`http://localhost${path}`, { headers: token ? { cookie: `admin_session=${token}` } : {} }));
  };
  const redirectsTo = (res) => (res.status >= 300 && res.status < 400 ? new URL(res.headers.get("location")).pathname : null);

  assert.equal(redirectsTo(await run("/admin/dashboard")), "/admin/login");
  assert.equal(redirectsTo(await run("/admin/dashboard", "a.b.c")), "/admin/login");
  const forgedRes = await run("/admin/dashboard", forged);
  assert.equal(redirectsTo(forgedRes), "/admin/login"); // old middleware accepted anything shaped like a JWT
  assert.match(forgedRes.headers.get("set-cookie") ?? "", /admin_session=;|Max-Age=0/);
  assert.equal(redirectsTo(await run("/admin/dashboard", good)), null);
  assert.equal(redirectsTo(await run("/admin/login", good)), "/admin/dashboard");
  assert.equal(redirectsTo(await run("/admin/login")), null);
  assert.equal(redirectsTo(await run("/collections")), null);
  assert.equal(redirectsTo(await run("/api/products")), null);
});

// ---------------- existing public API untouched
test("existing public products API still responds against an empty database", async () => {
  const res = await productsRoute.GET(await makeReq("/api/products"));
  assert.equal(res.status, 200);
  assert.ok("data" in (await res.json()));
});

test("missing JWT_SECRET fails closed (no hardcoded fallback)", async () => {
  const saved = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  try {
    assert.throws(() => signAdminToken({ id: "1", email: "x", role: "owner" }), /JWT_SECRET/);
    const a = await mk();
    const r = await withMutedErrors(() => doLogin(a.email));
    assert.equal(r.status, 503); // refuses to mint a token, and says so uniformly (see the production tests below)
    assert.ok(!/admin_session=/.test(r.res.headers.get("set-cookie") ?? ""));
  } finally {
    process.env.JWT_SECRET = saved;
  }
});

test("production requires a JWT_SECRET of at least 32 characters", async () => {
  const savedSecret = process.env.JWT_SECRET, savedEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "short-secret";
    assert.throws(() => signAdminToken({ id: "1", email: "x", role: "owner" }), /at least 32/);
    process.env.JWT_SECRET = crypto.randomBytes(32).toString("hex");
    assert.ok(signAdminToken({ id: "1", email: "x", role: "owner" }));
  } finally {
    process.env.JWT_SECRET = savedSecret;
    process.env.NODE_ENV = savedEnv;
  }
});

// ---------------- production configuration (the live-site "Login failed" 500)
test("production with a too-short JWT_SECRET: every login attempt gets the same 503 (no 401/500 oracle), no cookie, actionable log without secrets", async () => {
  const a = await mk();
  await withEnv({ NODE_ENV: "production", JWT_SECRET: "fifteen-chars-x" }, async () => {
    const good = await withMutedErrors(() => doLogin(a.email, PW));
    const wrong = await withMutedErrors(() => doLogin(a.email, "definitely-wrong-password"));
    const unknown = await withMutedErrors(() => doLogin("nobody@test.local", "whatever-password-1"));
    for (const r of [good, wrong, unknown]) {
      assert.equal(r.status, 503);
      assert.equal(r.body.message, "Admin login is temporarily unavailable. Please contact the site developer.");
      assert.ok(!/admin_session=/.test(r.res.headers.get("set-cookie") ?? ""), "no session cookie");
    }
    assert.deepEqual(good.body, wrong.body, "correct and wrong passwords are indistinguishable");
    const log = good.logs.join("\n");
    assert.match(log, /JWT_SECRET must be at least 32 characters in production/, "the log tells the operator what to fix");
    for (const secretish of [PW, a.email, "fifteen-chars-x", "$2a$", "$2b$"]) assert.ok(!log.includes(secretish) && !JSON.stringify(good.body).includes(secretish), `never leaks ${secretish}`);
  });
  // malformed input is still a plain 400 and is not rate-limit-consuming
  await withEnv({ NODE_ENV: "production", JWT_SECRET: "fifteen-chars-x" }, async () => assert.equal((await withMutedErrors(() => doLogin("", ""))).status, 400));
});

test("production with a proper (32+ char) JWT_SECRET: login works, wrong password is 401 (not 500), cookie is HttpOnly + Secure + SameSite", async () => {
  const a = await mk();
  await withEnv({ NODE_ENV: "production", JWT_SECRET: crypto.randomBytes(32).toString("hex") }, async () => {
    const ok = await doLogin(a.email, PW);
    assert.equal(ok.status, 200);
    const cookie = ok.res.headers.get("set-cookie");
    assert.match(cookie, /admin_session=/); assert.match(cookie, /HttpOnly/i); assert.match(cookie, /Secure/i); assert.match(cookie, /SameSite=lax/i); assert.match(cookie, /Max-Age=604800/);
    assert.equal((await doLogin(a.email, "wrong-password-123")).status, 401);
    assert.equal((await doLogin("nobody@test.local", "whatever-password-1")).status, 401);
    assert.equal((await doLogin("", "")).status, 400);
    const loggedOut = await json(await logout());
    assert.match(loggedOut.res.headers.get("set-cookie"), /admin_session=;|admin_session=""|Max-Age=0/i);
    assert.match(loggedOut.res.headers.get("set-cookie"), /Secure/i);
  });
});

test("unexpected backend failures after the password check are logged server-side but only a generic 500 reaches the client", async () => {
  const a = await mk();
  const orig = Admin.updateOne; Admin.updateOne = async () => { throw new Error("simulated Atlas outage: mongodb+srv://user:hunter2@cluster/db"); };
  try {
    const r = await withMutedErrors(() => doLogin(a.email, PW));
    assert.equal(r.status, 500); assert.deepEqual(r.body, { message: "Login failed" });
    assert.ok(!JSON.stringify(r.body).includes("hunter2") && !/admin_session=/.test(r.res.headers.get("set-cookie") ?? ""));
    assert.match(r.logs.join(" "), /\[API \/auth\/login\]/, "logged for the operator");
  } finally { Admin.updateOne = orig; }
});

test("adminAuthConfigProblem reports the rule, never the secret value", async () => {
  const { adminAuthConfigProblem } = await import("../src/lib/auth/session.ts");
  await withEnv({ NODE_ENV: "production", JWT_SECRET: "super-secret-value" }, async () => { const m = adminAuthConfigProblem(); assert.match(m, /at least 32/); assert.ok(!m.includes("super-secret-value")); });
  await withEnv({ NODE_ENV: "production", JWT_SECRET: "x".repeat(32) }, async () => assert.equal(adminAuthConfigProblem(), null));
  await withEnv({ NODE_ENV: "development", JWT_SECRET: "short" }, async () => assert.equal(adminAuthConfigProblem(), null)); // dev keeps working locally
  await withEnv({ JWT_SECRET: "" }, async () => assert.match(adminAuthConfigProblem(), /JWT_SECRET is not set/));
});
