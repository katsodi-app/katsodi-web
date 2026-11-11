// Local scheduler for the voice/screen revocation worker. Calls
// POST /api/internal/voice-worker every 30 seconds, one run at a time, so
// voice and screen sharing become available in development. Production needs
// a trusted scheduler instead (see docs/Voice Setup.md).
// Usage: npm run voice:worker            (loop; Ctrl+C to stop)
//        npm run voice:worker -- --once  (single run)
import { readFileSync } from "node:fs";

const env = { ...process.env };
try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match && env[match[1]] === undefined)
      env[match[1]] = match[2].replace(/^["']|["']$/g, "").trim();
  }
} catch {
  /* Environment variables alone are enough. */
}
const secret = env.VOICE_WORKER_SECRET;
const base = env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
if (!secret) {
  console.error("VOICE_WORKER_SECRET is not set in .env.local.");
  process.exit(1);
}
const url = new URL("/api/internal/voice-worker", base);
// Room lifecycle (Task 3.1) uses the same trusted scheduler.
const lifecycle = new URL("/api/internal/rooms-lifecycle", base);
if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
  // This helper is for development; never send the secret elsewhere.
  console.error(`Refusing to call ${url.origin}: use a trusted scheduler.`);
  process.exit(1);
}
const once = process.argv.includes("--once");

async function run() {
  const time = new Date().toLocaleTimeString("en-GB");
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(25000),
    });
    const body = await response.json().catch(() => ({}));
    console.log(
      `${time} worker ${response.status}${body.error ? ` (${body.error})` : ""}`,
    );
    const rooms = await fetch(lifecycle, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(25000),
    })
      .then(async (r) => [r.status, await r.json().catch(() => ({}))])
      .catch(() => [0, {}]);
    if (rooms[0] !== 200)
      console.log(`${time} rooms lifecycle ${rooms[0] || "unreachable"}`);
    else if (rooms[1].inactive || rooms[1].deleted)
      console.log(
        `${time} rooms: ${rooms[1].inactive} marked inactive, ${rooms[1].deleted} deleted`,
      );
    return response.ok;
  } catch (error) {
    console.log(`${time} worker unreachable: ${error.message}`);
    return false;
  }
}

if (once) process.exit((await run()) ? 0 : 1);
console.log(`Calling ${url.href} every 30 s. Ctrl+C to stop.`);
for (;;) {
  const started = Date.now();
  await run();
  await new Promise((resolve) =>
    setTimeout(resolve, Math.max(0, 30000 - (Date.now() - started))),
  );
}
