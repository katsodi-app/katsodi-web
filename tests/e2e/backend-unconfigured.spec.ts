import { test, expect } from "@playwright/test";

test.describe("without backend configuration", () => {
  let configured = false;
  test.beforeAll(async ({ request }) => {
    const response = await request.get("/signup");
    configured = !(await response.text()).includes(
      'class="notice backend-notice"',
    );
  });
  test.beforeEach(() => {
    test.skip(
      configured,
      "Requires a server started without Supabase configuration.",
    );
  });

  for (const path of [
    "/login",
    "/signup",
    "/forgot-password",
    "/verify-email",
    "/reset-password",
    "/account",
    "/network",
    "/network/create",
    "/join",
  ]) {
    test("unconfigured server at " + path, async ({ page }) => {
      await page.goto(path);
      await expect(
        page.getByText(
          "Сервер ещё не подключён. Регистрация и общие комнаты пока недоступны.",
          { exact: true },
        ),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }
  test("auth form is disabled before connection and supports both locales", async ({
    page,
  }, info) => {
    await page.goto("/signup");
    await expect(page.getByLabel("Email", { exact: true })).toBeDisabled();
    await expect(page.getByLabel("Пароль", { exact: true })).toBeDisabled();
    await page.screenshot({
      path: `.local/backend-signup-${info.project.name}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await expect(
      page.getByText(
        "The server is not connected yet. Accounts and shared rooms are unavailable.",
        { exact: true },
      ),
    ).toBeVisible();
  });
});

test("invalid auth tokens cannot redirect externally or leak rooms", async ({
  request,
}) => {
  const callback = await request.get(
    "/auth/callback?code=invalid&next=https://evil.test",
    { maxRedirects: 0 },
  );
  expect(callback.status()).toBe(307);
  expect(new URL(callback.headers().location).pathname).toBe("/login");
  expect(callback.headers()["cache-control"]).toContain("no-store");
  const confirm = await request.get(
    "/auth/confirm?token_hash=invalid&type=email",
    { maxRedirects: 0 },
  );
  expect(confirm.status()).toBe(307);
  expect(new URL(confirm.headers().location).pathname).toBe("/login");
  const room = await request.get(
    "/api/rooms/10000000-0000-4000-8000-000000000001",
  );
  expect(room.status()).toBe(404);
  expect(await room.json()).toEqual({ error: "unavailable" });
});
