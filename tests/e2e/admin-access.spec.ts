import { test, expect } from "@playwright/test";

// Task 9: without the administrator's session the panel does not exist.
test("visitors get a 404 for the admin panel", async ({ page }) => {
  const response = await page.goto("/admin");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("Панель администратора")).toHaveCount(0);
  await expect(page.getByText("@example.org")).toHaveCount(0);
});

// Task 8: the catalogue links to the request page, which asks to sign in.
test("the fandom catalogue offers fandom requests", async ({ page }) => {
  await page.goto("/fandoms");
  await page.getByRole("link", { name: /Не нашёл фандом/ }).click();
  await expect(page).toHaveURL(/\/fandoms\/request$/);
  await expect(
    page.getByRole("heading", { name: "Предложить фандом" }),
  ).toBeVisible();
});
