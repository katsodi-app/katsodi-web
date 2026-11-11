import { writeFileSync, mkdirSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { captureAll, captureDir, skipCapture } from "./capture";
import { seedLocalRooms, localVideoRoom } from "./local-rooms";
import { musicTracks } from "../../src/lib/music";

// Before/after screenshots for the redesign (Task 1): every public page at
// 360/390/768/1280/1920 px. Run: CAPTURE_DIR=.local/redesign/before npx
// playwright test visual-capture --project=desktop
const pages: [string, string][] = [
  ["landing", "/"],
  ["home", "/home"],
  ["rooms", "/rooms"],
  ["create-local", "/rooms/create"],
  ["network", "/network"],
  ["network-create", "/network/create"],
  ["fandoms", "/fandoms"],
  ["fandom-detail", "/fandoms/cinema-6"],
  ["fandom-request", "/fandoms/request"],
  ["music", "/music"],
  ["music-track", `/music/${musicTracks[0].slug}`],
  ["saved", "/saved"],
  ["friends", "/friends"],
  ["settings", "/settings"],
  ["account", "/account"],
  ["onboarding", "/onboarding"],
  ["moderation", "/moderation"],
  ["credits", "/credits"],
  ["login", "/login"],
  ["signup", "/signup"],
  ["forgot", "/forgot-password"],
  ["verify", "/verify-email"],
  ["terms", "/terms"],
  ["privacy", "/privacy"],
  ["cookies", "/cookies"],
  ["guidelines", "/guidelines"],
  ["copyright", "/copyright"],
  ["contact", "/contact"],
  ["about", "/about"],
  ["missing", "/this-page-does-not-exist"],
];

for (const [name, path] of pages)
  test(`capture ${name}`, async ({ page }, info) => {
    test.skip(skipCapture(info), "set CAPTURE_DIR to capture");
    test.setTimeout(180000);
    mkdirSync(captureDir!, { recursive: true });
    await seedLocalRooms(page);
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("main")).toBeVisible();
    writeFileSync(
      `${captureDir}/overflow-${name}.json`,
      JSON.stringify(await captureAll(page, name)),
    );
  });

test("capture local room", async ({ page }, info) => {
  test.skip(skipCapture(info), "set CAPTURE_DIR to capture");
  test.setTimeout(180000);
  await seedLocalRooms(page);
  await page.goto(`/room/${localVideoRoom.id}`);
  await expect(page.locator("main")).toBeVisible();
  writeFileSync(
    `${captureDir}/overflow-local-room.json`,
    JSON.stringify(await captureAll(page, "local-room")),
  );
});
