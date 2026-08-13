// Runs after `prisma generate` (see package.json "postinstall") to print a
// clear diagnostic block into the install/build log. Never prints secret
// values — only whether each is present — so it's safe to leave in deploy
// logs. Exists because this app's deploy host has repeatedly failed the
// build in ways that were hard to diagnose from the raw Next.js error alone
// (missing native SWC bindings, missing generated Prisma client, etc.).

const fs = require("fs");
const path = require("path");
try {
  require("dotenv").config({ quiet: true });
} catch {
  // dotenv not installed yet at this point in the install — fine, envs
  // may still be set directly by the host instead of via .env
}

function has(name) {
  return !!process.env[name];
}

console.log("\n──── build diagnostics ────");
console.log("node:", process.version, "| platform:", process.platform, "| arch:", process.arch);

const clientPath = path.join(__dirname, "..", "src", "generated", "prisma", "client.ts");
console.log("prisma client generated:", fs.existsSync(clientPath) ? "yes" : "NO — build will fail with 'Module not found'");

const required = ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASS", "DB_NAME", "NEXTAUTH_SECRET", "NEXTAUTH_URL"];
for (const name of required) {
  console.log(`${name}:`, has(name) ? "set" : "MISSING");
}

// Optional: push notifications silently no-op without these, so they don't
// block a build, but it's worth flagging if they're missing.
const optional = ["VAPID_PRIVATE_KEY", "NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_SUBJECT"];
for (const name of optional) {
  console.log(`${name}:`, has(name) ? "set" : "not set (push notifications disabled)");
}
console.log("────────────────────────────\n");
