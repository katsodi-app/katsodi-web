import { expect, test } from "@playwright/test";
import { localMusicRoom, localVideoRoom, seedLocalRooms } from "./local-rooms";

test("sidebar collapse persists and returns keyboard navigation", async ({
  page,
}, info) => {
  test.skip(info.project.name === "mobile", "Mobile uses bottom navigation.");
  await page.goto("/home");
  await page.getByRole("button", { name: "Скрыть боковое меню" }).click();
  await expect(page.locator(".sidebar")).toHaveAttribute("inert", "");
  await expect(page.locator(".workspace")).toHaveCSS("margin-left", "0px");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Показать боковое меню" }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Показать боковое меню" }).click();
  await expect(page.locator(".sidebar")).not.toHaveAttribute("inert", "");
  await expect(page.locator(".sidebar .brand")).toBeVisible();
});

test("poster frames have equal sizes and logo follows theme", async ({
  page,
}) => {
  for (const path of ["/home", "/fandoms"]) {
    await page.goto(path);
    const cards = page.locator(
      path === "/home"
        ? ".fandom-discovery .fandom-art"
        : ".fandom-grid .fandom-art",
    );
    const measure = () =>
      cards.evaluateAll((elements) =>
        elements.map((el) => {
          const frame = el.getBoundingClientRect();
          const image = el
            .querySelector(".editorial-image")!
            .getBoundingClientRect();
          return {
            width: frame.width,
            height: frame.height,
            imageHeight: image.height,
          };
        }),
      );
    // Measure only after layout: right after navigation (often on mobile)
    // frames can still report 0×0, which made this test flaky.
    await expect(cards.first()).toBeVisible();
    await expect
      .poll(async () => {
        const all = await measure();
        return all.length > 0 && all.every((f) => f.width > 0 && f.height > 0);
      })
      .toBe(true);
    const frames = await measure();
    expect(frames.length).toBeGreaterThan(0);
    for (const frame of frames) {
      expect(Math.abs(frame.width / frame.height - 0.75)).toBeLessThan(0.01);
      expect(Math.abs(frame.height - frames[0].height)).toBeLessThan(1);
      expect(Math.abs(frame.imageHeight - frame.height)).toBeLessThan(1);
    }
  }
  await page.goto("/settings");
  for (const theme of ["Ember", "Aurora", "Violet", "Paper"]) {
    await page.getByRole("button", { name: new RegExp(theme) }).click();
    const colors = await page.locator(".brand-icon").evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        brand: style.getPropertyValue("--brand-accent").trim(),
        primary: style.getPropertyValue("--primary").trim(),
      };
    });
    expect(colors.brand).toBe(colors.primary);
  }
});

test("editorial carousel supports keyboard, dots and working destinations", async ({
  page,
}) => {
  await seedLocalRooms(page);
  await page.goto("/home");
  const hero = page.locator(".editorial-hero");
  await hero.focus();
  await page.keyboard.press("ArrowRight");
  await expect(hero.locator(".slide-number")).toContainText("02");
  await page.keyboard.press("ArrowLeft");
  await expect(hero.locator(".slide-number")).toContainText("01");
  await hero.locator(".slide-dots button").nth(3).click();
  await expect(hero.locator(".hero-copy a")).toHaveAttribute(
    "href",
    "/rooms?format=music",
  );
  await hero.locator(".hero-copy a").click();
  await expect(page).toHaveURL(/rooms\?format=music/);
  // Only the user's own music room is listed: no sample rooms.
  await expect(page.locator(".room-card")).toHaveCount(1);
  await expect(page.locator(".room-card")).toContainText(localMusicRoom.name);
});

test("themes persist and system preference updates live", async ({ page }) => {
  await page.goto("/settings");
  for (const theme of ["Ember", "Aurora", "Violet", "Paper", "Obsidian"]) {
    await page.getByRole("button", { name: new RegExp(theme) }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-theme",
      theme.toLowerCase(),
    );
  }
  await page.getByRole("button", { name: /Paper/ }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "paper");
  await page.emulateMedia({ colorScheme: "dark" });
  await page.locator(".theme-option").last().click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "obsidian");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "paper");
});

test("failed artwork keeps the card usable", async ({ page }) => {
  await page.route("**/images/fandoms/**", (route) => route.abort());
  await page.goto("/fandoms?q=Dune");
  await expect(page.locator(".image-fallback")).toBeVisible();
  await page
    .getByRole("button", { name: "Выбрать: Dune", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Выбрано: Dune", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

for (const width of [360, 390, 768, 1024, 1440, 1920]) {
  for (const path of [
    "/home",
    "/fandoms",
    "/rooms",
    `/room/${localVideoRoom.id}`,
    "/settings",
  ])
    test(`responsive ${path} at ${width}px`, async ({ page }, info) => {
      test.skip(
        info.project.name === "mobile" ? width > 390 : width <= 390,
        "Covered by the matching viewport project.",
      );
      await page.setViewportSize({ width, height: 1000 });
      await seedLocalRooms(page);
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        path + " at " + width + "px",
      ).toBe(true);
      await page.screenshot({
        path: ".local/qa/" + width + "-" + path.replaceAll("/", "-") + ".png",
        fullPage: true,
        animations: "disabled",
      });
    });
}
for (const theme of ["obsidian", "ember", "aurora", "violet", "paper"])
  test(`${theme} palette persists across navigation`, async ({
    page,
  }, info) => {
    await page.goto("/settings");
    await page.getByRole("button", { name: new RegExp(theme, "i") }).click();
    await page.goto("/home");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.screenshot({
      path: ".local/qa/" + info.project.name + "-" + theme + ".png",
      fullPage: true,
      animations: "disabled",
    });
  });

test("quick room search and companion report actual capabilities", async ({
  page,
}) => {
  await seedLocalRooms(page);
  await page.goto("/home");
  await expect(page.locator(".companion-dock")).toHaveCount(0);
  await page.locator(".topbar-search-trigger").click();
  const dialog = page.getByRole("dialog", { name: "Быстрый поиск" });
  await expect(dialog).toBeVisible();
  await page.getByRole("searchbox", { name: "Быстрый поиск" }).fill("Тихо");
  await dialog.getByRole("link", { name: /Тихо, мы чиллим/ }).click();
  await expect(page).toHaveURL(new RegExp(`room/${localMusicRoom.id}`));
  const dock = page.locator(".companion-dock");
  await expect(dock).toBeVisible();
  await expect(dock.locator(".dock-title")).toHaveText("Тихо, мы чиллим");
  await dock
    .getByRole("button", { name: "Открыть панель комнаты", exact: true })
    .click();
  const panel = page.getByRole("dialog", { name: "Открыть панель комнаты" });
  await expect(panel).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Воспроизвести" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(
    dock.getByRole("button", { name: "Открыть панель комнаты", exact: true }),
  ).toBeFocused();
});
test("quick fandom search opens its page without changing followed fandoms", async ({
  page,
}) => {
  await page.goto("/home");
  await page.locator(".topbar-search-trigger").click();
  await page.getByRole("searchbox", { name: "Быстрый поиск" }).fill("Dune");
  await page.getByRole("dialog").getByRole("link", { name: /Dune/ }).click();
  await expect(page).toHaveURL(/fandoms\/cinema-6/);
  await expect(
    page.getByRole("button", { name: "Выбрать", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
});
