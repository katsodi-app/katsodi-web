import { test, expect } from "@playwright/test";
import { localVideoRoom, seedLocalRooms } from "./local-rooms";
const pages = [
  ["welcome", "/"],
  ["home", "/home"],
  ["rooms", "/rooms"],
  ["create-local", "/rooms/create"],
  ["local-room", `/room/${localVideoRoom.id}`],
  ["saved", "/saved"],
  ["fandoms", "/fandoms"],
  ["fandom-detail", "/fandoms/cinema-6"],
  ["shared", "/network"],
  ["create-shared", "/network/create"],
  ["friends", "/friends"],
  ["profile", "/profile/unavailable_name"],
  ["account", "/account"],
  ["onboarding", "/onboarding"],
  ["settings", "/settings"],
  ["invitation", "/join"],
  ["credits", "/credits"],
  ["moderation", "/moderation"],
  ["login", "/login"],
  ["signup", "/signup"],
  ["forgot", "/forgot-password"],
  ["reset", "/reset-password"],
  ["verify", "/verify-email"],
  ["missing", "/brand-page-does-not-exist"],
];
for (const [name, route] of pages)
  test(`branded page ${name}`, async ({ page }, info) => {
    await seedLocalRooms(page);
    const response = await page.goto(route);
    expect(response?.status()).toBe(name === "missing" ? 404 : 200);
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.local/brand-pages/${name}-${info.project.name}.png`,
      fullPage: true,
      animations: "disabled",
    });
  });
test("fandom detail selection persists and planned friends remain honest", async ({
  page,
}) => {
  await page.goto("/fandoms/cinema-6");
  await expect(
    page.getByRole("heading", { name: "Dune", exact: false }),
  ).toBeVisible();
  const choose = page.getByRole("button", { name: "Выбрать", exact: true });
  await choose.click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Выбрано", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  // With a backend configured, signed-out visitors are asked to sign in and
  // come back to /friends afterwards.
  await page.goto("/friends");
  // Scoped to the page section: the shared footer has its own sign-in link.
  await expect(
    page
      .locator("main section")
      .getByRole("link", { name: "Войти", exact: true }),
  ).toHaveAttribute("href", "/login?next=/friends");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your people", exact: false, level: 1 }),
  ).toBeVisible();
});
test("path invitations redirect to a private fragment with no-referrer", async ({
  request,
}) => {
  const response = await request.get("/invite/" + "a".repeat(43), {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(307);
  expect(new URL(response.headers().location).pathname).toBe("/join");
  expect(new URL(response.headers().location).hash).toBe("#" + "a".repeat(43));
  expect(response.headers()["referrer-policy"]).toBe("no-referrer");
  expect(response.headers()["cache-control"]).toContain("no-store");
});
test("new pages retain the light theme and English layout", async ({
  page,
}, info) => {
  await page.goto("/settings");
  await page.getByRole("button", { name: /Paper/ }).click();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  for (const [name, path] of [
    ["welcome", "/"],
    ["friends", "/friends"],
    ["onboarding", "/onboarding"],
    ["fandom-detail", "/fandoms/cinema-6"],
    ["moderation", "/moderation"],
  ]) {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "paper");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.local/brand-pages/${name}-paper-${info.project.name}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
});
