import { expect, test } from "@playwright/test";

// Decorative tiles drift continuously; reduced motion lets keyboard and image
// assertions use stable geometry, and exercises the supported motion setting.
test.use({ reducedMotion: "reduce" });

test("overview hydration and parallax leave React-owned attributes intact", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /hydrat|didn.t match/i.test(message.text())
    )
      errors.push(message.text());
  });
  for (let visit = 0; visit < 2; visit++) {
    await page.goto("/overview");
    await expect(page.locator(".overview-constellation")).not.toHaveAttribute(
      "style",
    );
    await page.mouse.move(100, 220);
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await page.getByRole("button", { name: "RU", exact: true }).click();
    await expect(page.locator(".overview-constellation")).not.toHaveAttribute(
      "style",
    );
    await page.goto("/home");
  }
  expect(errors).toEqual([]);
});

test("launch film plays locally and motion respects user preferences", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/overview");
  await expect
    .poll(() =>
      page
        .locator(".overview-floating-tile.tile-1")
        .evaluate((element) =>
          Math.abs(new DOMMatrix(getComputedStyle(element).transform).b),
        ),
    )
    .toBeGreaterThan(0.001);
  const video = page.locator(".overview-video-frame video");
  await expect(video).toHaveAttribute("preload", "none");
  await expect(video).toHaveAttribute("controls", "");
  await expect(video).not.toHaveAttribute("autoplay", "");
  await video.scrollIntoViewIfNeeded();
  const result = await video.evaluate(async (element: HTMLVideoElement) => {
    element.muted = true;
    await element.play();
    return {
      duration: element.duration,
      width: element.videoWidth,
      height: element.videoHeight,
    };
  });
  expect(result).toEqual({ duration: 20, width: 1920, height: 1080 });
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => element.currentTime),
    )
    .toBeGreaterThan(0);
  await video.evaluate((element: HTMLVideoElement) => element.pause());
  await page
    .getByRole("button", { name: "Смотреть ролик", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Пауза ролика", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Пауза ролика", exact: true }).click();
  expect(
    await video.evaluate((element: HTMLVideoElement) => element.paused),
  ).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("#possibilities").scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation.playState === "running" &&
              animation.effect?.getComputedTiming().iterations === Infinity,
          ).length,
    ),
  ).toBe(0);
});

test("standalone overview presents both languages, working previews and community links", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/overview");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Разные города.",
  );
  await expect(page.locator(".overview-standalone")).toBeVisible();
  await expect(
    page.locator(".sidebar, .topbar, .mobile-nav, footer.site-footer"),
  ).toHaveCount(0);
  await expect(page.locator(".overview-floating-tile")).toHaveCount(8);
  await expect(page.locator(".overview-status")).toContainText(
    "в активной разработке",
  );
  const photos = page.locator(".overview-tile-photo img");
  await expect(photos).toHaveCount(4);
  for (const photo of await photos.all()) {
    await photo.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        photo.evaluate((image: HTMLImageElement) => image.naturalWidth),
      )
      .toBeGreaterThan(0);
  }
  const tabs = page.getByRole("tablist");
  await tabs.getByRole("tab", { name: "Музыка", exact: true }).click();
  await expect(page.getByRole("tabpanel")).toContainText("На одной волне");
  await expect(page.getByRole("tabpanel").getByRole("link")).toHaveAttribute(
    "href",
    "/music",
  );
  await tabs
    .getByRole("tab", { name: "Музыка", exact: true })
    .press("ArrowRight");
  await expect(
    tabs.getByRole("tab", { name: "Фандомы", exact: true }),
  ).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("Найдите своих людей");
  await tabs.getByRole("tab", { name: "Фандомы", exact: true }).press("Home");
  await expect(
    tabs.getByRole("tab", { name: "Видео", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".overview-map-branch h3 a")).toHaveCount(6);
  await expect(page.locator(".overview-steps > li")).toHaveCount(3);
  const footer = page.locator(".overview-footer");
  await expect(
    footer.getByRole("link", { name: "Discord", exact: true }),
  ).toHaveAttribute("href", "https://discord.gg/hDpZq49wCU");
  await expect(
    footer.getByRole("link", { name: "Telegram", exact: true }),
  ).toHaveAttribute("href", "https://t.me/katsodi");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Different cities.",
  );
  await expect(page.locator(".overview-honest")).toContainText(
    "Local drafts stay only in your browser",
  );
  await page.getByRole("button", { name: "RU", exact: true }).click();
  if (info.project.name === "mobile") {
    const menu = page.locator(".overview-mobile-menu");
    await menu.locator("summary").click();
    await menu.getByRole("link", { name: "Возможности", exact: true }).click();
    await expect(page).toHaveURL(/#possibilities$/);
    await expect(menu).not.toHaveAttribute("open", "");
  }
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `.local/ux-audit/overview-redesign-${info.project.name}.png`,
    fullPage: true,
  });
  await footer.getByRole("searchbox").fill("Dune");
  await footer
    .getByRole("button", { name: "Найти фандом", exact: true })
    .click();
  await expect(page).toHaveURL(/\/fandoms\?q=Dune$/);
  await expect(page.locator(".app-shell")).toHaveCount(1);
  await page.goBack();
  await expect(page.locator(".overview-standalone")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("overview preserves theme choices, stays within narrow screens and passes accessibility checks", async ({
  page,
}, info) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.goto("/overview");
  for (const theme of ["obsidian", "paper"] as const) {
    if (theme === "paper") await page.locator(".overview-theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.evaluate(async () => {
      await Promise.all(
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation.effect?.getComputedTiming().iterations !== Infinity,
          )
          .map((animation) => animation.finished.catch(() => {})),
      );
    });
    const violations = (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations.map((v) => `${theme}: ${v.id} ${v.nodes.length}`);
    expect(violations).toEqual([]);
  }
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "paper");
  if (info.project.name === "mobile")
    await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.screenshot({
    path: `.local/ux-audit/overview-redesign-paper-${info.project.name}.png`,
    fullPage: true,
  });
});

test("full footer adapts across public and authentication pages", async ({
  page,
}, info) => {
  if (info.project.name === "desktop")
    await page.setViewportSize({ width: 1024, height: 900 });
  for (const route of ["/home", "/music", "/network", "/signup"]) {
    await page.goto(route);
    const footer = page.locator("footer.site-footer");
    await expect(footer.locator(".overview-footer-search")).toBeVisible();
    await expect(
      footer.getByRole("link", { name: "Telegram", exact: true }),
    ).toHaveAttribute("href", "https://t.me/katsodi");
    await expect(
      footer.getByRole("link", { name: "Discord", exact: true }),
    ).toHaveAttribute("href", "https://discord.gg/hDpZq49wCU");
    const dimensions = await footer.evaluate((element) => ({
      width: element.getBoundingClientRect().width,
      columns: getComputedStyle(
        element.querySelector(".overview-footer-inner")!,
      ).gridTemplateColumns.split(" ").length,
    }));
    expect(dimensions.columns).toBe(
      dimensions.width <= 620 ? 2 : dimensions.width <= 900 ? 3 : 4,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
});
