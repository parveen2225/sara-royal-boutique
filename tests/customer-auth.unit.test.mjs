// Customer accounts (Firebase email/password): validation rules, open-redirect guard, safe error messages, and
// static guarantees (admin login untouched, Collections/About untouched, no password storage, Firebase confined).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const R = await import("../src/lib/customerAuth/rules.ts");
const NR = await import("../../sara-royal-boutique-Native/src/lib/customerAuth/rules.ts");
const PC = await import("../src/lib/customerAuth/publicConfig.ts");
const root = path.resolve(import.meta.dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const walk = (dir, out = []) => { for (const f of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, f.name); if (f.isDirectory()) walk(p, out); else if (/\.(ts|tsx|js|jsx|mjs)$/.test(f.name)) out.push(p); } return out; };

test("name, email, password and confirm rules", () => {
  assert.equal(R.nameError("Simran Kaur"), null);
  assert.equal(R.nameError("सिमरन कौर"), null, "Hindi");
  assert.equal(R.nameError("ਸਿਮਰਨ ਕੌਰ"), null, "Punjabi");
  assert.equal(R.nameError("Anne-Marie O'Neil Jr."), null);
  assert.match(R.nameError(""), /full name/);
  assert.match(R.nameError("A"), /at least 2/);
  assert.match(R.nameError("x".repeat(61)), /at most 60/);
  assert.match(R.nameError("<script>"), /letters only/);
  assert.match(R.nameError("Simran123"), /letters only/);
  assert.equal(R.normalizeName("  Simran   Kaur "), "Simran Kaur");

  assert.equal(R.emailError("Simran@Example.com "), null);
  assert.equal(R.normalizeEmail("  Simran@Example.COM "), "simran@example.com");
  for (const bad of ["", "simran", "simran@", "@example.com", "simran@example", "si mran@example.com", `${"a".repeat(250)}@x.com`]) assert.ok(R.emailError(bad), bad);

  assert.equal(R.passwordError("Royal2026"), null);
  assert.match(R.passwordError(""), /enter a password/);
  assert.match(R.passwordError("short1A"), /at least 8 characters/);
  assert.match(R.passwordError("alllowercase1"), /uppercase/);
  assert.match(R.passwordError("ALLUPPERCASE1"), /lowercase/);
  assert.match(R.passwordError("NoNumbersHere"), /a number/);
  assert.match(R.passwordError(" Royal2026"), /start or end with a space/);
  assert.match(R.passwordError("Aa1" + "x".repeat(130)), /at most 128/);
  assert.deepEqual(R.PASSWORD_RULES.map((r) => r.test("Royal2026")), [true, true, true, true]);

  assert.equal(R.confirmError("Royal2026", "Royal2026"), null);
  assert.match(R.confirmError("Royal2026", ""), /confirm/);
  assert.match(R.confirmError("Royal2026", "Royal2027"), /do not match/);
});

test("open-redirect guard: only same-site paths, never auth/admin/api pages", () => {
  assert.equal(R.safeNextPath("/my-account"), "/my-account");
  assert.equal(R.safeNextPath("/suits/abc?x=1"), "/suits/abc?x=1");
  for (const bad of [undefined, "", "https://evil.com", "//evil.com", "/\\evil.com", "\\\\evil.com", "%2F%2Fevil.com", "/%2Fevil.com", "javascript:alert(1)",
    "/login", "/signup?x", "/admin", "/admin/dashboard", "/api/customer/me", "/\u0000x", "/" + "a".repeat(600), "%E0%A4%A"]) {
    assert.equal(R.safeNextPath(bad), "/my-account", String(bad));
  }
});

test("errors: login never reveals whether an email exists; config problems are generic; unknown codes are safe", () => {
  const same = ["auth/user-not-found", "auth/wrong-password", "auth/invalid-credential", "auth/invalid-login-credentials"].map((c) => R.authErrorMessage(c, "login"));
  assert.equal(new Set(same).size, 1);
  assert.equal(same[0], "Incorrect email or password.");
  assert.equal(R.authErrorMessage("auth/user-not-found", "reset"), "Something went wrong. Please try again.");
  assert.match(R.authErrorMessage("auth/email-already-in-use", "signup"), /already exists/);
  assert.match(R.authErrorMessage("auth/too-many-requests", "verify"), /wait a few minutes/);
  assert.match(R.authErrorMessage("auth/operation-not-allowed", "signup"), /not available/);
  assert.match(R.authErrorMessage("auth/unauthorized-continue-uri", "signup"), /not available/);
  assert.equal(R.authErrorMessage("auth/some-new-code", "login"), "Something went wrong. Please try again.");
  assert.equal(R.authErrorMessage(undefined, "login"), "Something went wrong. Please try again.");
  assert.equal(R.authErrorCode({ code: "auth/x" }), "auth/x");
  assert.equal(R.authErrorCode(new Error("boom")), "");
});

test("mobile app uses the same rules and messages as the website", () => {
  for (const k of ["NAME_MIN", "NAME_MAX", "PASSWORD_MIN", "PASSWORD_MAX", "EMAIL_MAX", "EMAIL_COOLDOWN_SECONDS"]) assert.equal(NR[k], R[k], k);
  const samples = ["", "A", "Simran Kaur", "सिमरन", "x1", "simran@example.com", "bad@", "Royal2026", "short", "NoNumbers", "Royal2026 "];
  for (const s of samples) {
    assert.equal(NR.nameError(s), R.nameError(s), `name ${s}`);
    assert.equal(NR.emailError(s), R.emailError(s), `email ${s}`);
    assert.equal(NR.passwordError(s), R.passwordError(s), `password ${s}`);
  }
  for (const c of ["auth/email-already-in-use", "auth/invalid-credential", "auth/too-many-requests", "auth/network-request-failed", "x"]) {
    for (const a of ["signup", "login", "reset", "verify"]) assert.equal(NR.authErrorMessage(c, a), R.authErrorMessage(c, a));
  }
});

test("header account link: hidden on Collections, About and admin; shown elsewhere only when configured", () => {
  for (const p of ["/collections", "/collections/abc", "/about", "/About", "/admin/login", "", null]) assert.equal(PC.isAccountLinkHiddenOn(p), true, String(p));
  for (const p of ["/", "/cart", "/suits/abc", "/my-account", "/collectionsx"]) assert.equal(PC.isAccountLinkHiddenOn(p), false, p);
  const header = read("src/components/common/header/Header.tsx");
  assert.match(header, /isCustomerAuthConfigured\(\) && !isAccountLinkHiddenOn\(pathname\)/);
  assert.doesNotMatch(header, /firebase/, "the shared header never loads the Firebase SDK");
});

test("static: Collections and About pages are byte-for-byte unchanged (git)", () => {
  const files = execFileSync("git", ["ls-files", "src/pages/CollectionsPage", "src/pages/AboutPage", "src/app/collections", "src/app/about"], { cwd: root, encoding: "utf8" }).trim().split("\n").filter(Boolean);
  assert.ok(files.length >= 4, files.join(","));
  const changed = execFileSync("git", ["status", "--porcelain", "--", ...files], { cwd: root, encoding: "utf8" }).trim();
  assert.equal(changed, "", `Collections/About must not change:\n${changed}`);
});

test("static: admin login, admin session and admin middleware are untouched", () => {
  const adminFiles = ["middleware.ts", "src/lib/auth", "src/lib/admin", "src/app/admin", "src/app/api/auth", "src/app/api/admin", "src/models/Admin.js"];
  const changed = execFileSync("git", ["status", "--porcelain", "--", ...adminFiles], { cwd: root, encoding: "utf8" }).trim();
  assert.equal(changed, "", `admin auth must not change:\n${changed}`);
});

test("static: Firebase confined to customer-account code; Admin SDK server-only; no service-account key; no password storage or logging", () => {
  const files = walk(path.join(root, "src"));
  const rel = (f) => path.relative(root, f).split(path.sep).join("/");
  const importsFirebase = files.filter((f) => /(from |import\()["']firebase(-admin)?\//.test(fs.readFileSync(f, "utf8"))).map(rel).sort();
  assert.deepEqual(importsFirebase, [
    "src/components/account/AuthProvider.tsx",
    "src/lib/customerAuth/firebaseClient.ts",
    "src/lib/customerAuth/verifyToken.ts",
  ]);
  const admin = read("src/lib/customerAuth/verifyToken.ts");
  assert.doesNotMatch(admin, /["']use client["']/);
  assert.doesNotMatch(admin.replace(/\/\/.*$/gm, ""), /credential|cert\(|private_key|GOOGLE_APPLICATION_CREDENTIALS/, "no service-account credentials (code, not comments)");
  for (const f of files.filter((f) => /["']use client["']/.test(fs.readFileSync(f, "utf8")))) assert.doesNotMatch(fs.readFileSync(f, "utf8"), /customerAuth\/verifyToken|firebase-admin/, rel(f));
  const accountCode = files.filter((f) => /components\/account\/|lib\/customerAuth\/|app\/\(account\)\/|api\/customer\//.test(rel(f)));
  assert.ok(accountCode.length >= 10);
  for (const f of accountCode) {
    const s = fs.readFileSync(f, "utf8").replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, ""); // code only, not comments
    assert.doesNotMatch(s, /console\.(log|info|debug|warn)\(/, `${rel(f)}: no console logging`);
    assert.doesNotMatch(s, /(localStorage|sessionStorage)\.setItem\([^)]*password/i, `${rel(f)}: never store passwords`);
    assert.doesNotMatch(s, /document\.cookie|cookies\(\)|admin_session|ADMIN_COOKIE_NAME/, `${rel(f)}: customer auth never uses cookies or the admin session`);
  }
  const model = read("src/models/Customer.ts");
  assert.doesNotMatch(model, /^\s*(password\w*|\w*[tT]oken|\w*[hH]ash)\s*:/m, "Customer model stores no credentials");
  const env = read(".env.example");
  for (const k of ["NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "NEXT_PUBLIC_FIREBASE_APP_ID", "FIREBASE_PROJECT_ID"]) assert.match(env, new RegExp(`^# ${k}=\\s`, "m"), k);
});
