import { test, expect } from "@playwright/test";

// Task 2: the former hard-coded sample rooms appear nowhere.
const formerNames = [
  "По ту сторону звёзд",
  "Тихо, мы чиллим",
  "Somewhere beyond the stars",
];

test("no sample rooms in the catalogue, home, search or by address", async ({
  page,
}) => {
  await page.goto("/rooms");
  await expect(page.locator(".room-grid")).toHaveCount(0);
  for (const name of formerNames)
    await expect(page.getByText(name)).toHaveCount(0);
  await page.goto("/home");
  for (const name of formerNames)
    await expect(page.getByText(name)).toHaveCount(0);
  // Home invites the user to create their own music room instead.
  await expect(
    page.getByRole("link", { name: /Создай музыкальную комнату/ }),
  ).toBeVisible();
  await page.locator(".topbar-search-trigger").click();
  await page.getByRole("searchbox", { name: "Быстрый поиск" }).fill("Тихо");
  await expect(
    page.getByRole("dialog", { name: "Быстрый поиск" }).getByRole("link", {
      name: /Тихо, мы чиллим/,
    }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  for (const id of ["demo-night", "demo-lofi"]) {
    await page.goto(`/room/${id}`);
    for (const name of formerNames)
      await expect(page.getByRole("heading", { name })).toHaveCount(0);
  }
});
