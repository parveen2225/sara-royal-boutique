#!/usr/bin/env node
// One-off production step (RUN ONLY WITH YOUR APPROVAL, against the right database):
//   MONGODB_URI="mongodb+srv://..." node --import tsx scripts/sync-indexes.mjs [--dry-run]
// In production the app starts with autoIndex OFF (so deploys never rebuild indexes by surprise), which means the new
// collections' unique indexes (SKU, order id, invoice per order, idempotency key, ...) must be created explicitly.
// It only touches the NEW Unstitched-Suits collections, uses createIndexes() (idempotent, no data is read or changed),
// and never drops anything.
const dry = process.argv.includes("--dry-run");
const uri = process.env.MONGODB_URI?.trim();
if (!uri) { console.error("Set MONGODB_URI first."); process.exit(1); }
const host = (uri.match(/@([^/?]+)/)?.[1] ?? uri.match(/\/\/([^/?]+)/)?.[1] ?? "unknown host");
console.log(`${dry ? "[dry run] " : ""}Target cluster host: ${host}`);

const { default: mongoose } = await import("mongoose");
const names = ["UnstitchedSuit", "SuitCategory", "SiteSettings", "AuditLog", "StockMovement", "SuitOrder", "SuitReturn", "SuitRefund", "Invoice", "UploadedAsset", "Counter", "TryOnJob", "TryOnAsset", "TryOnUsage", "Customer", "Admin"];
const models = await Promise.all(names.map(async (n) => (await import(`../src/models/${n}.${n === "Admin" ? "js" : "ts"}`)).default));
// autoCreate:false: merely loading a model must not create its collection (so --dry-run really changes nothing).
// createIndexes() below creates a collection implicitly when it creates the first index on it.
await mongoose.connect(uri, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 15000 });
for (const m of models) {
  const wanted = m.schema.indexes().map(([k, o]) => `${JSON.stringify(k)}${o?.unique ? " unique" : ""}`);
  console.log(`- ${m.modelName}: ${wanted.length} declared index(es)`);
  if (!dry) { await m.createIndexes(); console.log(`  ensured on collection "${m.collection.name}"`); }
}
await mongoose.disconnect();
console.log(dry ? "Dry run complete: nothing was changed." : "Done.");
