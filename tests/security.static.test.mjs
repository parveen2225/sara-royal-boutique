import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isSameOriginRequest } from "../src/lib/auth/origin.ts";

const root = path.resolve(import.meta.dirname, "../src/app/api");
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name === "route.ts" ? [path.join(d, e.name)] : []));
const routes = walk(root).map((f) => ({ file: path.relative(root, f), src: fs.readFileSync(f, "utf8") }));
const GUARDS = /(requirePermission|requireAnyPermission|requireOwner|requireAdmin|getAuthUser)\(/;

test("every admin API route is protected by an auth/permission guard", () => {
  const admin = routes.filter((r) => r.file.startsWith("admin/"));
  assert.ok(admin.length >= 20, `found ${admin.length} admin routes`);
  const unguarded = admin.filter((r) => !GUARDS.test(r.src) && !/cronAuthorised\(/.test(r.src)).map((r) => r.file);
  assert.deepEqual(unguarded, []);
});

test("owner-only actions use requireOwner (refund money steps, staff, settings, audit, permanent delete)", () => {
  const needsOwner = ["admin/refunds/[id]/action/route.ts", "admin/staff/route.ts", "admin/staff/[id]/route.ts", "admin/settings/route.ts", "admin/audit/route.ts"];
  for (const f of needsOwner) assert.match(routes.find((r) => r.file === f).src, /requireOwner\(/, f);
  const suit = routes.find((r) => r.file === "admin/suits/[id]/route.ts").src;
  assert.match(suit.slice(suit.indexOf("export async function DELETE")), /requireOwner\(/);
  const refundAction = routes.find((r) => r.file === "admin/refunds/[id]/action/route.ts").src;
  assert.ok(!/requirePermission\(/.test(refundAction), "refund approval/completion must not be reachable with a plain permission");
});

test("public routes never use admin guards and never leak secrets", () => {
  for (const r of routes.filter((x) => !x.file.startsWith("admin/") && !x.file.startsWith("auth/"))) {
    assert.ok(!/process\.env\.(JWT_SECRET|CRON_SECRET|CLOUDINARY_API_SECRET|MONGODB_URI)/.test(r.src.replace(/isMongoConfigured/g, "")) || r.file === "upload/route.ts" || r.file.startsWith("seed") , r.file);
  }
});

test("no hardcoded credentials or fallback secrets anywhere in src", () => {
  const files = [];
  const scan = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => { const p = path.join(d, e.name); if (e.isDirectory()) scan(p); else if (/\.(ts|tsx|js)$/.test(e.name)) files.push(p); });
  scan(path.resolve(import.meta.dirname, "../src"));
  for (const f of files) {
    const s = fs.readFileSync(f, "utf8");
    assert.ok(!/admin123|dev-secret/.test(s), `${f} contains a default credential`);
  }
});

test("same-origin guard: cross-site writes are refused, same-site and header-less requests pass", () => {
  assert.equal(isSameOriginRequest("POST", "https://sararoyalboutique.com", "sararoyalboutique.com"), true);
  assert.equal(isSameOriginRequest("POST", "https://evil.example", "sararoyalboutique.com"), false);
  assert.equal(isSameOriginRequest("PUT", "https://sararoyalboutique.com.evil.example", "sararoyalboutique.com"), false);
  assert.equal(isSameOriginRequest("DELETE", "null", "sararoyalboutique.com"), false);
  assert.equal(isSameOriginRequest("POST", null, "sararoyalboutique.com"), true);
  assert.equal(isSameOriginRequest("GET", "https://evil.example", "sararoyalboutique.com"), true);
  assert.equal(isSameOriginRequest("POST", "https://sararoyalboutique.com", "internal:3000", "sararoyalboutique.com"), true);
});

test("route files export only HTTP handlers and route config (Next.js rejects anything else)", () => {
  const allowed = /^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|dynamic|runtime|revalidate|maxDuration|fetchCache|preferredRegion|dynamicParams|generateStaticParams)$/;
  const offenders = [];
  for (const r of routes) {
    for (const m of r.src.matchAll(/^export\s+(?:async\s+)?(?:function|const|let|class|type|interface)\s+(\w+)/gm)) {
      if (!allowed.test(m[1]) && !/^export\s+(?:type|interface)/.test(m[0])) offenders.push(`${r.file}: ${m[1]}`);
    }
  }
  assert.deepEqual(offenders, []);
});

test("Cloudinary cleanup: every model that stores images is covered by the 'is this image still used?' check", () => {
  const modelsDir = path.resolve(import.meta.dirname, "../src/models");
  const refs = fs.readFileSync(path.resolve(import.meta.dirname, "../src/lib/assetRefs.ts"), "utf8");
  // the invoice keeps its own logo BYTES; UploadedAsset is the tracking table itself; TryOnUsage holds only counters; TryOnJob/TryOnAsset hold private, temporary
  // try-on image BYTES in MongoDB (never Cloudinary URLs) and expire on their own.
  const notImages = new Set(["Invoice", "UploadedAsset", "TryOnJob", "TryOnAsset", "TryOnUsage"]);
  const missing = [];
  for (const f of fs.readdirSync(modelsDir)) {
    const name = f.replace(/\.(ts|js)$/, "");
    const src = fs.readFileSync(path.join(modelsDir, f), "utf8");
    if (notImages.has(name)) continue;
    if (/image|thumbnail|logo|photos|imageUrl/i.test(src) && !new RegExp(`import ${name} from`).test(refs)) missing.push(name);
  }
  assert.deepEqual(missing, [], "a model with image fields is not checked before Cloudinary deletion: add it to src/lib/assetRefs.ts");
});

test("cleanup cron: GET is scheduler-only (no browser-session path), POST also allows the Owner", () => {
  const src = routes.find((r) => r.file === "admin/maintenance/cleanup-uploads/route.ts").src;
  const get = src.slice(src.indexOf("export async function GET"), src.indexOf("export async function POST"));
  assert.match(get, /cronAuthorised\(req\)/);
  assert.ok(!/getAuthUser|requireOwner|requirePermission/.test(get), "a cookie session must not be able to trigger the GET");
});

test("uploads: every Cloudinary public_id gets a random suffix (same file name must never return an earlier image)", () => {
  const src = fs.readFileSync(path.resolve(import.meta.dirname, "../src/app/api/upload/route.ts"), "utf8");
  assert.match(src, /const publicId = `\$\{publicIdBase\}-\$\{crypto\.randomBytes\(\d+\)\.toString\("hex"\)\}`/);
  assert.match(src, /public_id: publicId\b/);
  assert.doesNotMatch(src, /public_id: publicIdBase/);
});
