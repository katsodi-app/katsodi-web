import { test, expect } from "@playwright/test";
import { localMusicRoom, localVideoRoom, seedLocalRooms } from "./local-rooms";

// Task 4: the bottom room dock follows the room the user is in, on every
// page, across navigation and reloads, until they hide it.
test("the room dock appears after entering a room and follows the user", async ({
  page,
}, info) => {
  await seedLocalRooms(page);
  await page.goto("/home");
  const dock = page.getByRole("complementary", { name: "Твоя комната" });
  await expect(dock).toHaveCount(0);

  // Enter the room: the dock appears at once.
  await page.goto(`/room/${localVideoRoom.id}`);
  await expect(dock).toBeVisible();
  await expect(dock).toContainText(localVideoRoom.name);
  await expect(dock).toContainText("Ты в комнате");
  await expect(
    dock.getByRole("link", { name: /Вернуться в комнату/ }),
  ).toHaveCount(0);

  // Another page, via in-app navigation and via a full page load.
  await page.goto("/fandoms");
  await expect(dock).toBeVisible();
  await expect(dock).toContainText("Комната открыта");
  await page.reload();
  await expect(dock).toContainText(localVideoRoom.name);
  await page.screenshot({
    path: `.local/redesign/room-dock-after-${info.project.name}.png`,
  });

  // Back to the room from anywhere.
  await dock.getByRole("link", { name: /Вернуться в комнату/ }).click();
  await expect(page).toHaveURL(new RegExp(`/room/${localVideoRoom.id}$`));
  await expect(dock).toContainText("Ты в комнате");

  // Hiding sticks across pages until the user enters a room again.
  await page.goto("/home");
  await dock.getByRole("button", { name: "Скрыть панель комнаты" }).click();
  await expect(dock).toHaveCount(0);
  await page.reload();
  await expect(dock).toHaveCount(0);
});

test("the dock fits small screens without hiding its actions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await seedLocalRooms(page);
  await page.goto(`/room/${localVideoRoom.id}`);
  await page.goto("/home");
  const dock = page.getByRole("complementary", { name: "Твоя комната" });
  const back = dock.getByRole("link", { name: /Вернуться в комнату/ });
  await expect(back).toBeVisible();
  const box = (await back.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(360);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("entering another room replaces an older companion dock", async ({
  page,
}) => {
  await seedLocalRooms(page);
  await page.goto("/home");
  await page.locator(".topbar-search-trigger").click();
  const search = page.getByRole("dialog", { name: "Быстрый поиск" });
  await search.getByRole("searchbox").fill("Тихо");
  await search.getByRole("link", { name: /Тихо, мы чиллим/ }).click();
  const title = page.locator(".companion-dock .dock-title");
  await expect(title).toHaveText(localMusicRoom.name);
  await page.locator('.room-fullscreen > a[href="/rooms"]').click();
  await page
    .locator(".card-heading")
    .getByRole("link", { name: localVideoRoom.name })
    .click();
  await expect(title).toHaveText(localVideoRoom.name);
  await page.getByRole("button", { name: "Скрыть панель комнаты" }).click();
  await expect(page.locator(".companion-dock")).toHaveCount(0);
});
