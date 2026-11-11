import { test, expect } from "@playwright/test";
import { localMusicRoom, localVideoRoom, seedLocalRooms } from "./local-rooms";

// The CSP in next.config.ts is enforced, so a violation means a broken page
// (a blocked script, stylesheet, request or embed). Collect every violation
// the browser reports while key pages load and settle.
const routes = [
  "/",
  "/home",
  "/rooms",
  `/room/${localVideoRoom.id}`,
  `/room/${localMusicRoom.id}`,
  "/fandoms",
  "/fandoms/cinema-6",
  "/music",
  "/music/the-weeknd-blinding-lights",
  "/overview",
  "/login",
  "/settings",
];

test("pages load without Content Security Policy violations", async ({
  page,
}) => {
  await seedLocalRooms(page);
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { __csp: string[] }).__csp = seen;
    document.addEventListener("securitypolicyviolation", (event) =>
      seen.push(`${event.effectiveDirective} ${event.blockedURI}`),
    );
  });
  const response = await page.goto("/");
  expect(response?.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  for (const route of routes) {
    await page.goto(route);
    await page.waitForLoadState("networkidle").catch(() => {});
    const violations = await page.evaluate(
      () => (window as unknown as { __csp: string[] }).__csp,
    );
    expect(violations, route).toEqual([]);
  }
});
