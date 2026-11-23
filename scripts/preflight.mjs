#!/usr/bin/env node
// Pre-deployment self-check. Prints PASS / WARN / FAIL lines and NEVER prints a secret value.
//   node scripts/preflight.mjs                 -> checks the environment variables only (safe anywhere, touches no database)
//   node --import tsx scripts/preflight.mjs --check-db
//        -> ALSO connects to the database in MONGODB_URI and runs READ-ONLY checks (replica set, indexes, default admin).
//           It writes nothing. Run it against production only when you have decided to.
import fs from "node:fs";
import path from "node:path";

const checkDb = process.argv.includes("--check-db");
const rows = [];
const add = (level, name, detail = "") => { rows.push({ level, name, detail }); console.log(`${level.padEnd(4)}  ${name}${detail ? `  —  ${detail}` : ""}`); };
const env = (k) => (process.env[k] ?? "").trim();
const production = env("NODE_ENV") === "production";
const weak = (v) => /^(.)\1+$/.test(v) || /(secret|password|changeme|dev|test|admin|example)/i.test(v) || new Set(v).size < 8;

// ---- environment (names and lengths only, never values)
add(production ? "PASS" : "WARN", "NODE_ENV", production ? "production" : `"${env("NODE_ENV") || "unset"}" (set to production on the live host)`);
const uri = env("MONGODB_URI");
if (!uri) add("FAIL", "MONGODB_URI", "not set");
else if (!/^mongodb(\+srv)?:\/\//i.test(uri)) add("FAIL", "MONGODB_URI", "does not start with mongodb:// or mongodb+srv://");
else if (/^mongodb:\/\/(?:[^@/]*@)?(127\.0\.0\.1|localhost)/i.test(uri)) add(production ? "FAIL" : "WARN", "MONGODB_URI", "points at a local database");
else add("PASS", "MONGODB_URI", /^mongodb\+srv:/i.test(uri) ? "Atlas-style SRV address (TLS on)" : "remote address");
const jwt = env("JWT_SECRET");
if (!jwt) add("FAIL", "JWT_SECRET", "not set");
else if (jwt.length < 32) add("FAIL", "JWT_SECRET", `only ${jwt.length} characters; needs at least 32`);
else if (weak(jwt)) add("FAIL", "JWT_SECRET", "long enough but looks guessable; use a random value (openssl rand -hex 32)");
else add("PASS", "JWT_SECRET", `${jwt.length} characters`);
const cron = env("CRON_SECRET");
if (!cron) add("WARN", "CRON_SECRET", "not set: the abandoned-upload cleanup cannot be scheduled");
else if (cron.length < 24 || weak(cron)) add("FAIL", "CRON_SECRET", "must be a random value of at least 24 characters");
else add("PASS", "CRON_SECRET", `${cron.length} characters`);
const cloud = env("CLOUDINARY_URL") ? /^cloudinary:\/\//.test(env("CLOUDINARY_URL")) : env("CLOUDINARY_CLOUD_NAME") && env("CLOUDINARY_API_KEY") && env("CLOUDINARY_API_SECRET");
add(cloud ? "PASS" : "FAIL", "Cloudinary credentials", cloud ? "configured" : "set CLOUDINARY_URL (or the three CLOUDINARY_* variables)");
add(env("ALLOW_SEED") ? "FAIL" : "PASS", "ALLOW_SEED", env("ALLOW_SEED") ? "is set: sample-data seeding could run in production; unset it" : "not set (seeding refused in production)");
if (env("ADMIN_BOOTSTRAP_EMAIL") || env("ADMIN_BOOTSTRAP_PASSWORD")) add("WARN", "ADMIN_BOOTSTRAP_*", "still set: remove after the first Owner login");
const wa = env("NEXT_PUBLIC_WHATSAPP_NUMBER");
if (wa) add(/^\+?\d[\d\s-]{9,16}$/.test(wa) ? "PASS" : "WARN", "NEXT_PUBLIC_WHATSAPP_NUMBER (legacy fallback)", "set; the Admin → Settings number takes priority");
const fontDir = env("INVOICE_FONT_DIR") || path.join(process.cwd(), "assets", "fonts");
const fonts = ["NotoSans-Regular.ttf", "NotoSans-Bold.ttf", "NotoSansDevanagari-Regular.ttf", "NotoSansDevanagari-Bold.ttf", "NotoSansGurmukhi-Regular.ttf", "NotoSansGurmukhi-Bold.ttf"].filter((f) => !fs.existsSync(path.join(fontDir, f)));
add(fonts.length ? "FAIL" : "PASS", "Invoice fonts", fonts.length ? `missing: ${fonts.join(", ")}` : "all six present");

// ---- optional read-only database checks
if (checkDb && uri) {
  const { default: mongoose } = await import("mongoose");
  const { default: bcrypt } = await import("bcryptjs");
  const host = uri.match(/@([^/?]+)/)?.[1] ?? uri.match(/\/\/([^/?]+)/)?.[1] ?? "unknown";
  console.log(`\nRead-only database checks against cluster host: ${host}`);
  try {
    // autoCreate:false is essential: without it, merely loading a model would create its (empty) collection. This check must write nothing.
    await mongoose.connect(uri, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 15000 });
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    add(hello.setName || hello.msg === "isdbgrid" ? "PASS" : "FAIL", "Replica set / transactions", hello.setName ? `replica set "${hello.setName}"` : hello.msg === "isdbgrid" ? "sharded cluster" : "standalone: order and stock changes would not be transactional");

    const names = ["UnstitchedSuit", "SuitCategory", "SiteSettings", "AuditLog", "StockMovement", "SuitOrder", "SuitReturn", "SuitRefund", "Invoice", "UploadedAsset", "Counter", "Admin"];
    const missing = [];
    for (const n of names) {
      const m = (await import(`../src/models/${n}.${n === "Admin" ? "js" : "ts"}`)).default;
      const have = await m.collection.indexes().catch(() => []); // a missing collection just means "no indexes yet"
      const key = (k) => JSON.stringify(k);
      for (const [k, o] of m.schema.indexes()) if (o?.unique && !have.some((h) => key(h.key) === key(k) && h.unique)) missing.push(`${m.modelName}${key(k)}`);
      for (const [path_, def] of Object.entries(m.schema.paths)) if (def.options?.unique && path_ !== "_id" && !have.some((h) => h.key[path_] === 1 && h.unique)) missing.push(`${m.modelName}.${path_}`);
    }
    add(missing.length ? "FAIL" : "PASS", "Unique indexes", missing.length ? `${missing.length} missing (run scripts/sync-indexes.mjs): ${missing.slice(0, 6).join(", ")}${missing.length > 6 ? "…" : ""}` : "all present");

    const admins = await mongoose.connection.db.collection("admins").find({}, { projection: { email: 1, role: 1, active: 1, password: 1 } }).toArray();
    add(admins.length ? "PASS" : "WARN", "Admin accounts", `${admins.length} found${admins.length ? "" : " (set ADMIN_BOOTSTRAP_* for the first login)"}`);
    const def = admins.find((a) => a.email === "admin@sararoyal.com");
    if (def) {
      const stillDefault = await bcrypt.compare("admin123", def.password ?? "");
      add(stillDefault ? "FAIL" : "PASS", "Default admin password", stillDefault ? 'the account admin@sararoyal.com still uses the well-known default password: change it in Admin → My Account' : "the default account exists but its password was changed");
    } else add("PASS", "Default admin account", "no account with the old default email");
    const legacy = admins.filter((a) => a.role === "admin").length;
    if (legacy) add("PASS", "Legacy admin role", `${legacy} account(s) with role "admin" are treated as Owner (no migration needed)`);
    await mongoose.disconnect();
  } catch (e) {
    add("FAIL", "Database connection", String(e?.message ?? e).replace(/mongodb(\+srv)?:\/\/\S+/gi, "[uri hidden]").slice(0, 160));
  }
} else if (checkDb) add("FAIL", "--check-db", "needs MONGODB_URI");

const fails = rows.filter((r) => r.level === "FAIL").length, warns = rows.filter((r) => r.level === "WARN").length;
console.log(`\n${fails ? "NOT READY" : "READY"}: ${rows.filter((r) => r.level === "PASS").length} passed, ${warns} warning(s), ${fails} failure(s).`);
process.exit(fails ? 1 : 0);
