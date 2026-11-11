import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * Automated WCAG 2.1 A/AA checks with axe-core on every public page, in the
 * default (Obsidian) and light (Paper) themes. Automated checks catch only
 * part of accessibility problems; keyboard and screen-reader passes still
 * matter (see the acceptance checklist).
 */
const pages = [
  ["landing", "/"],
  ["home", "/home"],
  ["rooms", "/rooms"],
  ["create-local", "/rooms/create"],
  ["network", "/network"],
  ["fandoms", "/fandoms"],
  ["fandom-detail", "/fandoms/cinema-6"],
  ["saved", "/saved"],
  ["settings", "/settings"],
  ["friends", "/friends"],
  ["login", "/login"],
  ["signup", "/signup"],
  ["forgot", "/forgot-password"],
  ["credits", "/credits"],
  ["moderation", "/moderation"],
  ["join", "/join"],
  ["missing", "/no-such-page"],
] as const;

async function audit(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    count: v.nodes.length,
    sample: v.nodes[0]?.target.join(" "),
  }));
}

for (const theme of ["obsidian", "paper"] as const)
  for (const [name, path] of pages)
    test(`a11y ${theme} ${name}`, async ({ page }) => {
      await page.addInitScript((value) => {
        try {
          localStorage.setItem("katsodi.theme", value);
        } catch {
          /* Theme falls back to the default. */
        }
      }, theme);
      await page.goto(path);
      await expect(page.locator("main h1, h1").first()).toBeVisible();
      // Let entrance animations finish so colours are measured at rest.
      await page.waitForTimeout(600);
      const violations = await audit(page);
      if (process.env.A11Y_REPORT)
        console.log(`A11Y ${theme} ${name} ${JSON.stringify(violations)}`);
      expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
    });
