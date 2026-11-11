import { test, expect } from "@playwright/test";
import { localVideoRoom, seedLocalRooms } from "./local-rooms";

test("focused authentication keeps navigation, password visibility and locales clear", async ({
  page,
}, info) => {
  await page.goto("/login?next=/network");
  await expect(
    page.getByRole("heading", { name: "Войти", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".sidebar, .topbar, .mobile-nav, .companion-dock"),
  ).toHaveCount(0);
  const password = page.getByLabel("Пароль", { exact: true });
  if (await password.isEnabled()) await password.fill("example-password-only");
  await page.getByRole("button", { name: "Показать пароль" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Скрыть пароль" }).click();
  await expect(password).toHaveAttribute("type", "password");
  await page
    .locator(".auth-tabs")
    .getByRole("link", { name: "Создать аккаунт" })
    .click();
  await expect(page).toHaveURL(/\/signup\?next=%2Fnetwork/);
  await expect(
    page.getByText("От 12 до 128 символов.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Create account", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.local/auth-redesign-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
});

test("recovery and confirmation show one clear next step", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("link", { name: "Забыли пароль?", exact: true }).click();
  await page.waitForURL("**/forgot-password", { timeout: 45000 });
  await expect(
    page.getByRole("heading", { name: "Забыли пароль?" }),
  ).toBeVisible();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page.locator("input[name=password]")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Вернуться ко входу" }),
  ).toBeVisible();
  await page.goto("/verify-email");
  await expect(
    page
      .locator("#main .auth-heading p:visible")
      .filter({ hasText: /Открой письмо в том же браузере/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Отправить ещё раз" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("local room explains chat and offers shared rooms", async ({ page }) => {
  await seedLocalRooms(page);
  await page.goto(`/room/${localVideoRoom.id}`);
  await expect(
    page.getByText("Это локальный черновик. Чат доступен в общих комнатах.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .locator('[role="tabpanel"]')
    .getByRole("link", { name: "Общие комнаты", exact: true })
    .click();
  await expect(page).toHaveURL(/\/network$/);
});
