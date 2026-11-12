import { expect, test } from "@playwright/test";

// The glass preview floats and the progress bar loops; reduced motion keeps
// keyboard and layout assertions stable and exercises the supported setting.
test.use({ reducedMotion: "reduce" });

const github = "https://github.com/katsodi-app/katsodi-web";

test("overview motion leaves hydration clean", async ({ page }) => {
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
    await page.mouse.move(200, 300);
    await page.mouse.wheel(0, 600);
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await page.getByRole("button", { name: "RU", exact: true }).click();
    await page.goto("/home");
  }
  expect(errors).toEqual([]);
});

test("launch film plays locally and motion respects user preferences", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/overview");
  // With motion allowed, the glass preview floats.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document
            .getAnimations()
            .filter(
              (animation) =>
                animation.playState === "running" &&
                animation.effect?.getComputedTiming().iterations === Infinity,
            ).length,
      ),
    )
    .toBeGreaterThan(0);
  // The top bar turns solid once the page leaves the hero.
  const bar = page.locator(".ov-topbar");
  await expect(bar).toHaveAttribute("data-scrolled", "false");
  const video = page.locator(".overview-video-frame video");
  await expect(video).toHaveAttribute("preload", "none");
  await expect(video).toHaveAttribute("controls", "");
  await expect(video).not.toHaveAttribute("autoplay", "");
  await video.scrollIntoViewIfNeeded();
  await expect(bar).toHaveAttribute("data-scrolled", "true");
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
  // While playing, the toggle shows on hover (and on keyboard focus).
  await page.locator(".overview-video-frame").hover();
  await page.getByRole("button", { name: "Пауза ролика", exact: true }).click();
  expect(
    await video.evaluate((element: HTMLVideoElement) => element.paused),
  ).toBe(true);
  // With reduced motion nothing loops.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.locator("#how").scrollIntoViewIfNeeded();
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

test("standalone overview presents both languages, open source and working sections", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/overview");
  const title = page.getByRole("heading", { level: 1 });
  await expect(title).toContainText("Смотрим");
  await expect(title.locator(".ov-cursive")).toHaveText("вместе");
  await expect(page.locator(".overview-standalone")).toBeVisible();
  // No app chrome, but the shared site footer.
  await expect(page.locator(".sidebar, .topbar, .mobile-nav")).toHaveCount(0);
  await expect(page.locator("footer.site-footer")).toHaveCount(1);
  await expect(page.locator(".ov-badge")).toContainText("Open source");
  // Photographs load (hero sky, preview, open-source backdrop).
  for (const photo of await page.locator(".ov-sky img, .ov-glass-player img").all()) {
    await photo.scrollIntoViewIfNeeded();
    await expect
      .poll(() => photo.evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0);
  }
  await expect(page.locator(".ov-features > li")).toHaveCount(6);
  const tabs = page.getByRole("tablist");
  await tabs.getByRole("tab", { name: "Музыка", exact: true }).click();
  await expect(page.getByRole("tabpanel")).toContainText("На одной волне");
  await expect(page.getByRole("tabpanel").getByRole("link")).toHaveAttribute(
    "href",
    "/music",
  );
  await tabs.getByRole("tab", { name: "Музыка", exact: true }).press("ArrowRight");
  await expect(tabs.getByRole("tab", { name: "Фандомы", exact: true })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("Найдите своих людей");
  await tabs.getByRole("tab", { name: "Фандомы", exact: true }).press("Home");
  await expect(tabs.getByRole("tab", { name: "Видео", exact: true })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator(".ov-steps > li")).toHaveCount(3);
  const open = page.locator("#open-source");
  await expect(open.getByRole("link", { name: "Открыть на GitHub" })).toHaveAttribute(
    "href",
    github,
  );
  await expect(open).toContainText("MIT");
  const footer = page.locator("footer.site-footer");
  await expect(footer.getByRole("link", { name: "GitHub", exact: true })).toHaveAttribute(
    "href",
    github,
  );
  await expect(footer.getByRole("link", { name: "Discord", exact: true })).toHaveAttribute(
    "href",
    "https://discord.gg/hDpZq49wCU",
  );
  await expect(footer.getByRole("link", { name: "Telegram", exact: true })).toHaveAttribute(
    "href",
    "https://t.me/katsodi",
  );
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(title).toContainText("Watch it");
  await expect(page.locator(".ov-honest")).toContainText(
    "Local drafts stay only in your browser",
  );
  await expect(footer).toContainText("Katsodi is an open-source project.");
  await page.getByRole("button", { name: "RU", exact: true }).click();
  if (info.project.name === "mobile") {
    const menu = page.locator(".ov-menu");
    await menu.locator("summary").click();
    await menu.getByRole("link", { name: "Возможности", exact: true }).click();
    await expect(page).toHaveURL(/#features$/);
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
  await footer.getByRole("button", { name: "Найти фандом", exact: true }).click();
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
    if (theme === "paper")
      await page.getByRole("button", { name: "Оформление", exact: true }).click();
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

test("the shared footer adapts across public and authentication pages", async ({
  page,
}, info) => {
  if (info.project.name === "desktop")
    await page.setViewportSize({ width: 1024, height: 900 });
  for (const route of ["/home", "/music", "/network", "/signup"]) {
    await page.goto(route);
    const footer = page.locator("footer.site-footer");
    await expect(footer.locator(".kf-search")).toBeVisible();
    await expect(footer.getByRole("link", { name: "GitHub", exact: true })).toHaveAttribute(
      "href",
      github,
    );
    await expect(footer.getByRole("link", { name: "Telegram", exact: true })).toHaveAttribute(
      "href",
      "https://t.me/katsodi",
    );
    await expect(footer.getByRole("link", { name: "Discord", exact: true })).toHaveAttribute(
      "href",
      "https://discord.gg/hDpZq49wCU",
    );
    // A plain block with a hairline, not a card: no background of its own.
    const layout = await footer.evaluate((element) => ({
      display: getComputedStyle(element).display,
      background: getComputedStyle(element).backgroundColor,
      columns: getComputedStyle(element.querySelector(".kf-main")!)
        .gridTemplateColumns.split(" ").length,
    }));
    expect(layout.display).toBe("block");
    expect(layout.background).toBe("rgba(0, 0, 0, 0)");
    const width = page.viewportSize()!.width;
    expect(layout.columns).toBe(width <= 640 ? 2 : width <= 1100 ? 3 : 4);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
  }
});
