import { expect, test, type Page } from "@playwright/test";
import { musicTracks } from "../../src/lib/music";

const pages = [
  ["terms", "Условия использования", "Условия использования"],
  ["privacy", "Политика конфиденциальности", "Конфиденциальность"],
  ["cookies", "Политика cookie и хранилища браузера", "Cookie"],
  ["guidelines", "Правила сообщества", "Правила сообщества"],
  ["copyright", "Политика авторских прав", "Авторские права"],
  ["contact", "Контакты и поддержка", "Контакты"],
  ["about", "О Katsodi", "О Katsodi"],
] as const;

function consoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}
const noOverflow = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );

test("the footer links to every legal page, which renders without errors", async ({
  page,
}, info) => {
  test.slow(); // visits all seven pages
  const errors = consoleErrors(page);
  await page.goto("/home");
  const footer = page.getByRole("navigation", { name: "Правовая информация" });
  for (const [slug, title, label] of pages) {
    await footer.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${slug}$`));
    await expect(
      page.getByRole("heading", { level: 1, name: title }),
    ).toBeVisible();
    await expect(page.locator(".legal-meta")).toContainText("Обновлено");
    expect(await noOverflow(page), slug).toBe(true);
  }
  await page.goto("/privacy");
  await page.screenshot({
    path: `.local/legal-privacy-${info.project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("documents show only provided owner facts and working contents", async ({
  page,
}) => {
  await page.goto("/terms");
  await expect(page.locator(".legal-page")).toHaveAttribute("lang", "ru");
  await expect(page.locator(".legal-draft")).toHaveCount(0);
  await expect(page.locator(".legal-placeholder")).toHaveCount(0);
  await expect(page.locator(".legal-meta")).not.toContainText("вступ");
  await expect(page.locator(".legal-body")).not.toContainText(
    "Почтовый адрес",
  );
  await expect(
    page.locator('.legal-body a[href="mailto:info.katsodi@gmail.com"]').first(),
  ).toBeVisible();
  const toc = page.getByRole("navigation", { name: "Содержание" });
  await expect(toc.getByRole("link")).toHaveCount(15);
  await toc.getByRole("link", { name: "5. Комнаты" }).click();
  await expect(page).toHaveURL(/#rooms$/);
  await expect(page.locator("#rooms")).toBeInViewport();

  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator(".legal-meta")).toContainText("Last updated");
  await expect(page.locator(".legal-page")).toHaveAttribute("lang", "en");
  await expect(
    page.getByRole("heading", { level: 1, name: "Terms of Service" }),
  ).toBeVisible();
  await expect(page.locator("#rooms")).toContainText(
    "selecting a fandom is optional",
  );
  await page.getByRole("button", { name: "RU", exact: true }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Условия использования" }),
  ).toBeVisible();

  // Informational pages carry no version or effective date.
  await page.goto("/about");
  await expect(page.locator(".legal-meta")).not.toContainText("Версия");
});

test("contacts are shared across requests without inventing a company or data region", async ({
  page,
}) => {
  await page.goto("/contact");
  await expect(page.locator(".legal-body")).toContainText("Польша");
  await expect(page.locator(".legal-body")).not.toContainText(/Оператор:|Operator:/);
  await expect(page.locator(".legal-body")).toContainText(
    "незарегистрированный проект",
  );
  await expect(
    page.locator('.legal-body a[href="mailto:info.katsodi@gmail.com"]'),
  ).toHaveCount(3);
  await page.goto("/privacy");
  await expect(page.locator("#children")).toContainText("от 16 лет");
  await expect(page.locator(".legal-placeholder")).toHaveCount(0);
  await expect(page.locator(".legal-draft")).toHaveCount(0);
  await expect(page.locator(".legal-body")).not.toContainText(/Оператор:|Operator:/);
  await expect(page.locator("#controller")).toHaveCount(0);
  await expect(page.locator(".legal-toc a")).toHaveCount(17);
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("#children")).toContainText("aged 16 and over");
  await expect(page.locator(".legal-placeholder")).toHaveCount(0);
  await expect(page.locator(".legal-body")).not.toContainText(/Оператор:|Operator:/);
  await page.getByRole("button", { name: "RU", exact: true }).click();
  await page.goto("/copyright");
  await expect(page.locator("#embeds")).toContainText(
    "Подписка и доступ сами по себе не разрешают публичный показ",
  );
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("#embeds")).toContainText(
    "A subscription or access to a source does not itself permit a public screening",
  );
});

test("sign-up requires accepting the Terms and links both documents first", async ({
  page,
}) => {
  await page.goto("/signup");
  const consent = page.locator(".auth-consent");
  await expect(
    consent.getByRole("link", { name: "Условия использования" }),
  ).toHaveAttribute("href", "/terms");
  await expect(
    consent.getByRole("link", { name: "Политикой конфиденциальности" }),
  ).toHaveAttribute("href", "/privacy");
  const box = consent.getByRole("checkbox");
  await expect(box).not.toBeChecked();
  await expect(box).toHaveAttribute("required", "");
  await expect(box).toHaveAttribute("value", "accepted");
  // The legal pages are reachable from the sign-up screen without an account.
  await expect(
    page
      .getByRole("navigation", { name: "Правовая информация" })
      .getByRole("link", { name: "Условия использования" }),
  ).toBeVisible();
});

test.describe("first visit without a cookie choice", () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  const track = musicTracks[0];

  test("nothing third-party loads before a choice, and choices stick", async ({
    page,
  }, info) => {
    // Many navigations, some loading Spotify's embed: slow under a full run.
    test.slow();
    await page.goto(`/music/${track.slug}`);
    const banner = page.getByRole("region", { name: "Встроенные плееры" });
    await expect(banner).toBeVisible();
    await page.screenshot({
      path: `.local/consent-banner-${info.project.name}.png`,
    });
    await expect(page.locator('iframe[src*="spotify.com"]')).toHaveCount(0);
    await expect(
      page.getByRole("group", { name: "Внешний плеер" }).first(),
    ).toContainText("Spotify");
    expect(await noOverflow(page)).toBe(true);

    await banner.getByRole("button", { name: "Только необходимые" }).click();
    await expect(banner).toHaveCount(0);
    await page.reload();
    await expect(banner).toHaveCount(0);
    await expect(page.locator('iframe[src*="spotify.com"]')).toHaveCount(0);

    // Load once: this view only.
    await page
      .getByRole("group", { name: "Внешний плеер" })
      .first()
      .getByRole("button", { name: "Загрузить один раз" })
      .click();
    await expect(
      page.locator('iframe[src*="open.spotify.com/embed"]'),
    ).toHaveCount(1);
    await page.reload();
    await expect(page.locator('iframe[src*="spotify.com"]')).toHaveCount(0);

    // Change the choice on the cookie page.
    await page.goto("/cookies#preferences");
    await expect(
      page.getByRole("region", { name: "Встроенные плееры" }),
    ).toHaveCount(0);
    const media = page.getByRole("checkbox", {
      name: /Встроенные плееры и сайты/,
    });
    await expect(media).not.toBeChecked();
    await media.check();
    await expect(
      page.locator(".cookie-preferences [role=status]"),
    ).toContainText("плееры разрешены");
    await page.goto(`/music/${track.slug}`);
    await expect(
      page.locator('iframe[src*="open.spotify.com/embed"]'),
    ).toHaveCount(1);
    await page.goto("/cookies");
    await page
      .getByRole("checkbox", { name: /Встроенные плееры и сайты/ })
      .uncheck();
    await page.goto(`/music/${track.slug}`);
    await expect(page.locator('iframe[src*="spotify.com"]')).toHaveCount(0);
  });

  test("the banner's two choices are equal and the banner is accessible", async ({
    page,
  }) => {
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    await page.goto("/home");
    const banner = page.getByRole("region", { name: "Встроенные плееры" });
    const [a, b] = await Promise.all([
      banner
        .getByRole("button", { name: "Только необходимые" })
        .getAttribute("class"),
      banner
        .getByRole("button", { name: "Разрешить плееры" })
        .getAttribute("class"),
    ]);
    expect(a).toBe(b);
    const violations = (
      await new AxeBuilder({ page })
        .include(".consent-banner")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze()
    ).violations.map((v) => v.id);
    expect(violations).toEqual([]);
    await banner.getByRole("button", { name: "Разрешить плееры" }).click();
    await expect(banner).toHaveCount(0);
  });
});

test("legal pages pass automated WCAG 2.1 AA checks", async ({ page }) => {
  test.slow(); // five pages, each fully analysed
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  for (const path of [
    "/terms",
    "/privacy",
    "/cookies",
    "/contact",
    "/signup",
  ]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    const violations = (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze()
    ).violations.map((v) => `${path}: ${v.id} ${v.nodes.length}`);
    expect(violations).toEqual([]);
  }
});
