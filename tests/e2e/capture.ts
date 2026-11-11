import type { Page, TestInfo } from "@playwright/test";
import { writeFileSync } from "node:fs";

/** Widths from the redesign acceptance criteria (Task 1, section 3). */
export const captureWidths = [360, 390, 768, 1280, 1920] as const;
export const captureDir = process.env.CAPTURE_DIR;
/** Capture runs only on demand, once (desktop project), never in CI. */
export const skipCapture = (info: TestInfo) =>
  !captureDir || info.project.name !== "desktop";

/**
 * Full-page screenshots of the current page at every width, plus a record of
 * horizontal overflow per width for the layout audit.
 */
export async function captureAll(
  page: Page,
  name: string,
  prepare?: () => Promise<void>,
) {
  const overflow: Record<number, number> = {};
  for (const width of captureWidths) {
    await page.setViewportSize({ width, height: width < 768 ? 800 : 900 });
    await page.waitForTimeout(250);
    if (prepare) await prepare();
    overflow[width] = await measure(page);
    await page.screenshot({
      path: `${captureDir}/${name}-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    if (process.env.CAPTURE_STYLES)
      writeFileSync(
        `${captureDir}/styles-${name}-${width}.json`,
        JSON.stringify(await computedStyles(page)),
      );
  }
  return overflow;
}

/**
 * Computed style of every element and its ::before/::after, keyed by DOM
 * path, for comparing two stylesheet versions (CAPTURE_STYLES=1). Animations
 * are rewound first so pulsing indicators compare equal.
 */
export async function computedStyles(page: Page) {
  return page.evaluate(() => {
    for (const a of document.getAnimations()) {
      a.pause();
      a.currentTime = 0;
    }
    const table: string[] = [];
    const ids = new Map<string, number>();
    const id = (s: string) => {
      if (!ids.has(s)) ids.set(s, table.push(s) - 1);
      return ids.get(s)!;
    };
    const serialise = (cs: CSSStyleDeclaration) => {
      const out: string[] = [];
      for (let i = 0; i < cs.length; i++)
        out.push(`${cs[i]}:${cs.getPropertyValue(cs[i])}`);
      return out.join("\n");
    };
    const elements: Record<string, number> = {};
    const path = (el: Element): string => {
      const parent = el.parentElement;
      if (!parent) return el.tagName.toLowerCase();
      const index = Array.prototype.indexOf.call(parent.children, el);
      return `${path(parent)}>${el.tagName.toLowerCase()}:${index}`;
    };
    for (const el of document.querySelectorAll("*")) {
      const p = path(el);
      elements[p] = id(serialise(getComputedStyle(el)));
      for (const pseudo of ["::before", "::after"]) {
        const cs = getComputedStyle(el, pseudo);
        if (cs.content !== "none") elements[p + pseudo] = id(serialise(cs));
      }
    }
    return { table, elements };
  });
}

/** Horizontal overflow in px; retried when a dev-server reload interrupts it. */
async function measure(page: Page): Promise<number> {
  for (let attempt = 0; ; attempt++) {
    try {
      await page.waitForLoadState("networkidle");
      return await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
    } catch (error) {
      if (attempt >= 3) throw error;
      await page.waitForTimeout(1000);
    }
  }
}
