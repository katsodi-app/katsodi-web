import { expect, test } from "@playwright/test";
test("poster opens an attributed fandom page and preselects its room fandom", async ({
  page,
}) => {
  await page.goto("/fandoms?q=Dune");
  const poster = page
    .getByRole("main")
    .locator('.fandom-poster-link[href="/fandoms/cinema-6"]');
  await expect(poster.locator("img")).toHaveAttribute(
    "src",
    "/images/fandoms/cinema-6.webp",
  );
  await expect
    .poll(() =>
      poster
        .locator("img")
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  await poster.click();
  await expect(page).toHaveURL(/\/fandoms\/cinema-6$/);
  await expect(
    page.getByRole("heading", { name: "Об этой истории" }),
  ).toBeVisible();
  await expect(
    page.getByRole("main").locator(".fandom-about a"),
  ).toHaveAttribute("href", /wikipedia.org/);
  await expect(
    page.getByRole("main").locator(".fandom-watch .watch-source"),
  ).toHaveAttribute("href", "https://discord.gg/hDpZq49wCU");
  const official = page.getByRole("main").locator(".fandom-official");
  await expect(
    official.getByRole("heading", { name: "Официально" }),
  ).toBeVisible();
  await expect(official.getByRole("link", { name: /Max/ })).toHaveAttribute(
    "href",
    "https://www.hbo.com/dune-prophecy",
  );
  await expect(official).toContainText("зависят от твоего региона");
  await expect(page.getByRole("main").locator(".fandom-watch")).toContainText(
    "Где посмотреть легально бесплатно",
  );
  await expect(
    page.locator('a[href*="kinogo"], a[href*="reanime"], a[href*="liveball"]'),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Комнаты этого фандома" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Создать комнату для этого фандома" }),
  ).toHaveAttribute("href", "/network/create?fandom=cinema-6");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "About this world" }),
  ).toBeVisible();
  await page.screenshot({
    path: ".local/fandom-detail-" + test.info().project.name + ".png",
    fullPage: true,
  });
});
test("Discord viewing message also appears on fandoms without a legacy watch entry", async ({
  page,
}) => {
  await page.goto("/fandoms/books-0");
  await expect(
    page.getByRole("main").locator(".fandom-watch a"),
  ).toHaveAttribute("href", "https://discord.gg/hDpZq49wCU");
  await expect(page.getByRole("main").locator(".fandom-watch")).toContainText(
    "Где посмотреть легально бесплатно",
  );
});
test("optional fandom keeps the selected association after reload", async ({
  page,
}) => {
  await page.goto("/rooms/create");
  await page.getByLabel("Название комнаты").fill("Вечер Дюны");
  await page
    .getByLabel("Найти фильм, аниме, игру…", { exact: true })
    .fill("Dune");
  await page.locator("#room-fandom").selectOption("cinema-6");
  await page.getByRole("button", { name: "Создать локальную комнату" }).click();
  await expect(page).toHaveURL(/\/room\/[a-f0-9-]{36}$/);
  await page.reload();
  expect(
    await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) =>
        k.includes("workspace"),
      );
      return key ? localStorage.getItem(key) : JSON.stringify(localStorage);
    }),
  ).toContain("cinema-6");
});
