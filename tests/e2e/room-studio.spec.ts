import { test, expect } from "@playwright/test";

test("creation format cards update the preview and a public Other draft survives reload", async ({
  page,
}, info) => {
  await page.goto("/rooms/create?format=music");
  await expect(
    page.locator('input[name="format"][value="music"]'),
  ).toBeChecked();
  await page.locator('input[name="format"][value="video"]').check();
  await page
    .getByLabel("Название комнаты", { exact: true })
    .fill("Мой музыкальный вечер");
  await page.locator('input[name="format"][value="music"]').check();
  const aligned = await page
    .locator(".studio-format-card")
    .evaluateAll(
      (cards) =>
        Math.abs(
          cards[0].getBoundingClientRect().top -
            cards[1].getBoundingClientRect().top,
        ) < 1,
    );
  expect(aligned).toBe(true);
  await expect(page.locator(".studio-album-preview img")).toHaveCount(3);
  await expect(page.locator(".studio-preview-tags")).toContainText("Другое");
  await expect(page.locator("#room-fandom")).not.toHaveAttribute("required");
  await expect(page.locator(".music-room-guide")).toContainText("SoundCloud");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.local/ux-audit/room-studio-create-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Создать локальную комнату", exact: true })
    .click();
  await expect(page).toHaveURL(/\/room\/[a-f0-9-]{36}$/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Мой музыкальный вечер", exact: true }),
  ).toBeVisible();
  if ((page.viewportSize()?.width || 1280) <= 1000) {
    const fits = await page
      .locator(".pane-player .pane-content")
      .evaluate((pane) => {
        const bounds = pane.getBoundingClientRect();
        const stage = pane
          .querySelector(".cinema-stage")!
          .getBoundingClientRect();
        return stage.top >= bounds.top && stage.bottom <= bounds.bottom + 1;
      });
    expect(fits).toBe(true);
  }
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("katsodi.workspace.v1") || "{}"),
  );
  expect(
    saved.rooms.find(
      (room: { name: string }) => room.name === "Мой музыкальный вечер",
    ),
  ).toMatchObject({ format: "music", fandomId: "" });
});
