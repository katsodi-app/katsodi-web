import { expect, test } from "@playwright/test";
import { seedLocalRooms } from "./local-rooms";
test("switches language, persists it, and has no horizontal overflow", async ({
  page,
}, testInfo) => {
  await seedLocalRooms(page);
  await page.goto("/home");
  await expect(
    page.getByRole("heading", { name: "Что посмотрим сегодня?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "По ту сторону звёзд" }),
  ).toBeVisible();
  await page.screenshot({
    path: `.local/katsodi-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "What are we watching?" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("creates a private local room that survives reload and stays out of the catalogue", async ({
  page,
}) => {
  await page.goto("/rooms/create");
  await page.getByLabel("Название комнаты").fill("Наш закрытый вечер");
  await page.locator('input[name="visibility"][value="private"]').check();
  await page.getByRole("button", { name: "Создать локальную комнату" }).click();
  await expect(page).toHaveURL(/\/room\/[a-f0-9-]{36}$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Наш закрытый вечер" }),
  ).toBeVisible();
  await page.goto("/rooms");
  await expect(
    page.getByRole("heading", { name: "Наш закрытый вечер" }),
  ).toHaveCount(0);
  await page.goto("/saved");
  await expect(
    page.getByRole("heading", { name: "Наш закрытый вечер" }),
  ).toBeVisible();
});
test("rejects unsafe links and labels a valid source as companion", async ({
  page,
}) => {
  await page.goto("/home");
  await page
    .getByLabel("Ссылка на видео или музыку")
    .fill("javascript:alert(1)");
  await page.getByRole("button", { name: "Проверить" }).click();
  await expect(page.getByRole("status")).toContainText("HTTPS");
  await page
    .getByLabel("Ссылка на видео или музыку")
    .fill("https://www.youtube.com/watch?v=demo");
  await page.getByRole("button", { name: "Проверить" }).click();
  await expect(page.getByRole("status")).toContainText("Комната-компаньон");
});
test("saves a room and selects fandoms persistently", async ({ page }) => {
  await seedLocalRooms(page);
  await page.goto("/rooms");
  await page
    .getByRole("button", {
      name: "Сохранить: По ту сторону звёзд",
      exact: true,
    })
    .click();
  await page.goto("/saved");
  await expect(
    page.getByRole("heading", { name: "По ту сторону звёзд" }),
  ).toBeVisible();
  await page.goto("/fandoms");
  await page
    .getByRole("button", { name: "Выбрать: Minecraft", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Выбрано: Minecraft", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("keyboard can reach the skip link and unknown routes return 404", async ({
  page,
}) => {
  await page.goto("/home");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Перейти к содержимому" }),
  ).toBeFocused();
  const response = await page.goto("/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Такой страницы пока нет" }),
  ).toBeVisible();
});
