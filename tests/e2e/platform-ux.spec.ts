import { test, expect } from "@playwright/test";
import { localVideoRoom, seedLocalRooms } from "./local-rooms";

test("quick search finds real music, updates query and opens the selected track", async ({
  page,
}) => {
  await page.goto("/home");
  await page.locator(".topbar-search-trigger").click();
  const modal = page.getByRole("dialog");
  await modal.getByRole("button", { name: "Музыка", exact: true }).click();
  await modal.getByRole("searchbox").fill("weeknd lights");
  const hit = modal.getByRole("link", { name: /Blinding Lights/ });
  await expect(hit).toBeVisible();
  await modal.getByRole("searchbox").fill("zzznothing123");
  await expect(hit).toHaveCount(0);
  await expect(
    modal.getByText("Ничего не найдено", { exact: false }),
  ).toBeVisible();
  await modal.getByRole("searchbox").fill("Blinding Lights");
  await modal.getByRole("link", { name: /Blinding Lights/ }).click();
  await expect(page).toHaveURL(/\/music\/the-weeknd-blinding-lights/);
  await expect(page.locator('.sidebar a[href="/music"]')).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("an older search response cannot replace a newer query; failures offer retry", async ({
  page,
}) => {
  await page.route("**/api/search?**", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("q");
    if (query === "old")
      await new Promise((resolve) => setTimeout(resolve, 900));
    if (query === "failed")
      return route.fulfill({ status: 503, body: "unavailable" });
    await route.fulfill({
      json: {
        results: query
          ? [
              {
                id: query,
                type: "music",
                title: query,
                subtitle: "artist",
                href: "/music",
              },
            ]
          : [],
        partial: false,
      },
    });
  });
  await page.goto("/home");
  await page.locator(".topbar-search-trigger").click();
  const modal = page.getByRole("dialog");
  const input = modal.getByRole("searchbox");
  await input.fill("old");
  await page.waitForRequest((request) => request.url().includes("q=old"));
  await input.fill("new");
  await expect(modal.getByRole("link", { name: "new artist" })).toBeVisible();
  await page.waitForTimeout(1000);
  await expect(modal.getByRole("link", { name: "old artist" })).toHaveCount(0);
  await input.fill("failed");
  await expect(
    modal.getByRole("button", { name: /Повторить|Попробовать/ }),
  ).toBeVisible();
  await modal.getByRole("button", { name: /Закрыть поиск/ }).click();
  await expect(modal).toHaveCount(0);
});

test("room fullscreen retains panels, exits and respects reduced motion", async ({
  page,
}) => {
  await seedLocalRooms(page);
  await page.goto(`/room/${localVideoRoom.id}`);
  await page
    .getByRole("button", { name: "На весь экран", exact: true })
    .click();
  await expect(page.locator(".room-fullscreen")).toHaveClass(/is-fullscreen/);
  await expect(
    page.getByRole("tab", { name: "Чат", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Выйти из полного экрана", exact: true })
    .click();
  await expect(page.locator(".room-fullscreen")).not.toHaveClass(
    /is-fullscreen/,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".vinyl-disc").first()).toHaveCSS(
    "animation-name",
    "none",
  );
  await expect(
    page
      .locator(".room-bar .room-vinyl, .page-heading .room-vinyl")
      .first()
      .locator("img"),
  ).toHaveAttribute("src", "/icon.svg");
});

test("home music destinations and query links work in both locales", async ({
  page,
}) => {
  await page.goto("/home");
  const section = page.locator(".home-music-feature");
  await expect(
    section.getByRole("link", { name: "Открыть музыку" }),
  ).toHaveAttribute("href", "/music");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(
    section.getByRole("link", { name: "Explore music" }),
  ).toBeVisible();
  await expect(
    section.getByRole("link", { name: "Listen together" }),
  ).toHaveAttribute("href", "/network/create?format=music");
  await page.goto("/music?collection=soundcloud&q=XO%20TOUR");
  await expect(page.locator(".music-discovery-search input")).toHaveValue(
    "XO TOUR",
  );
  await expect(
    page.locator(".music-chart-tabs button[aria-pressed=true]"),
  ).toContainText("SoundCloud");
});

test("search API bounds invalid input and never caches visitor results publicly", async ({
  request,
}) => {
  const invalid = await request.get(`/api/search?q=${"x".repeat(201)}`);
  expect(invalid.status()).toBe(400);
  const response = await request.get(
    "/api/search?filter=music&q=weeknd%20lights",
  );
  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect((await response.json()).results).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ title: "Blinding Lights", type: "music" }),
    ]),
  );
});

test("profile media changes refresh navigation avatars without leaving the page", async ({
  page,
}) => {
  let version = "v1";
  let available = true;
  await page.route("**/api/account/avatar", (route) =>
    route.fulfill({
      json: {
        id: "10000000-0000-4000-8000-000000000001",
        name: "Луна",
        available,
        version,
      },
    }),
  );
  await page.route("**/api/profile-media/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#d8f18c"/></svg>',
    }),
  );
  await page.goto("/home");
  for (const selector of [".demo-profile", ".account-access"]) {
    await expect(page.locator(`${selector} .user-avatar img`)).toHaveAttribute(
      "src",
      /v=v1/,
    );
  }
  version = "v2";
  await page.evaluate(() =>
    window.dispatchEvent(new Event("katsodi:profile-media")),
  );
  for (const selector of [".demo-profile", ".account-access"]) {
    await expect(page.locator(`${selector} .user-avatar img`)).toHaveAttribute(
      "src",
      /v=v2/,
    );
  }
  available = false;
  await page.evaluate(() =>
    window.dispatchEvent(new Event("katsodi:profile-media")),
  );
  await expect(page.locator(".demo-profile .user-avatar > span")).toHaveText(
    "Л",
  );
  await expect(page.locator(".account-access .user-avatar svg")).toHaveCount(1);
  await expect(page).toHaveURL(/\/home$/);
});
