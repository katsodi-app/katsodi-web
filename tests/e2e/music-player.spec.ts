import { expect, test, type Page } from "@playwright/test";
import collections from "../../src/data/music-collections.json";

// Multi-step provider SDK lifecycle checks include several readiness handshakes.
test.setTimeout(120_000);

declare global {
  interface Window {
    __musicWidget: {
      emit: (name: string) => void;
      volume: number;
      position: number;
      playing: boolean;
    };
  }
}
async function widgetFixture(page: Page) {
  await page.route("https://w.soundcloud.com/player/**", async (route) => {
    if (new URL(route.request().url()).pathname.endsWith("/api.js"))
      await route.fulfill({
        contentType: "text/javascript",
        body: `
      window.SC={Widget:Object.assign(function(){const handlers={};const state={volume:70,position:42000,playing:false,emit:name=>handlers[name]?.()};window.__musicWidget=state;return {bind:(name,fn)=>{handlers[name]=fn;if(name==='READY')setTimeout(fn,0)},unbind:name=>delete handlers[name],play:()=>{state.playing=true;state.emit('PLAY')},pause:()=>{state.playing=false;state.emit('PAUSE')},seekTo:n=>state.position=n,getPosition:fn=>fn(state.position),getDuration:fn=>fn(180000),setVolume:n=>state.volume=n};},{Events:{READY:'READY',PLAY:'PLAY',PAUSE:'PAUSE',FINISH:'FINISH',SEEK:'SEEK'}})};
    `,
      });
    else
      await route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Official widget test fixture</title><p>SoundCloud fixture</p>",
      });
  });
}

test("SoundCloud player controls, ordered finish, previous/next and volume work", async ({
  page,
}, info) => {
  await widgetFixture(page);
  await page.goto("/music");
  await page.getByRole("button", { name: /^SoundCloud/ }).click();
  const rows = page.locator(".discovery-track-list > li");
  await expect(rows).toHaveCount(100);
  await rows.first().getByRole("button").first().click();
  const dock = page.getByRole("complementary", { name: "Музыкальный плеер" });
  await expect(dock).toContainText(collections.popular.tracks[0].title);
  await expect(rows.first()).toHaveAttribute("data-playing", "true");
  await expect(
    dock.getByRole("button", { name: "Пауза", exact: true }),
  ).toBeEnabled();
  await dock.getByRole("button", { name: "Пауза", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__musicWidget.playing))
    .toBe(false);
  await dock.getByRole("button", { name: "Слушать", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.__musicWidget.playing))
    .toBe(true);
  await dock.getByLabel("Позиция трека").fill("90");
  await expect
    .poll(() => page.evaluate(() => window.__musicWidget.position))
    .toBe(90000);
  await dock.getByLabel("Громкость музыки").fill("35");
  await expect
    .poll(() => page.evaluate(() => window.__musicWidget.volume))
    .toBe(35);
  await page.evaluate(() => {
    window.__musicWidget.emit("FINISH");
    window.__musicWidget.emit("FINISH");
  });
  await expect(dock).toContainText(collections.popular.tracks[1].title);
  await expect(rows.nth(1)).toHaveAttribute("data-playing", "true");
  await expect(dock.getByLabel("Громкость музыки")).toHaveValue("35");
  await dock.getByRole("button", { name: "Следующий трек" }).click();
  await expect(dock).toContainText(collections.popular.tracks[2].title);
  await dock.getByRole("button", { name: "Предыдущий трек" }).click();
  await expect(dock).toContainText(collections.popular.tracks[1].title);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const bar = await dock.boundingBox();
  if (info.project.name === "mobile") {
    const nav = await page.locator(".mobile-nav").boundingBox();
    expect(bar!.y + bar!.height).toBeLessThanOrEqual(nav!.y);
  }
  await page.screenshot({
    path: `.local/music-player-${info.project.name}.png`,
  });
  await dock.getByRole("button", { name: "Закрыть музыкальный плеер" }).click();
  await expect(dock).toHaveCount(0);
});

test("trending player persists through music navigation and search has one outline", async ({
  page,
}, info) => {
  await widgetFixture(page);
  await page.goto("/music");
  await page.getByRole("button", { name: /Трендовые треки/ }).click();
  const search = page.getByPlaceholder("Найти трек или исполнителя");
  await search.fill("poster boy");
  await expect(page.locator(".discovery-track-list > li")).toHaveCount(1);
  await expect(search).toHaveCSS("border-top-width", "0px");
  await page
    .locator(".discovery-track-list > li")
    .first()
    .getByRole("button")
    .first()
    .click();
  const dock = page.locator(".music-dock");
  await expect(dock).toContainText("poster boy");
  await expect(
    dock.getByRole("button", { name: "Пауза", exact: true }),
  ).toBeEnabled();
  await dock
    .locator("iframe")
    .evaluate((el) => el.setAttribute("data-persistence-check", "same-node"));
  await page
    .getByRole("button", { name: "Больше всего прослушиваний", exact: true })
    .click();
  await page
    .locator(".chart-list > li")
    .first()
    .getByRole("link")
    .dispatchEvent("click");
  await expect(page).toHaveURL(/\/music\/the-weeknd-blinding-lights$/);
  await expect(dock).toContainText("poster boy");
  await expect(dock.locator("iframe")).toHaveAttribute(
    "data-persistence-check",
    "same-node",
  );
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(dock.getByRole("button", { name: "Next track" })).toBeVisible();
  await page.screenshot({
    path: `.local/music-player-navigation-${info.project.name}.png`,
  });
});

test("music player respects media consent", async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem("katsodi.consent"));
  await widgetFixture(page);
  await page.goto("/music");
  await page.getByRole("button", { name: /^SoundCloud/ }).click();
  await page
    .locator(".discovery-track-list > li")
    .first()
    .getByRole("button")
    .first()
    .click();
  await expect(page.locator(".music-dock iframe")).toHaveCount(0);
  await page
    .locator(".music-dock")
    .getByRole("button", { name: "Загрузить один раз" })
    .click();
  await expect(page.locator(".music-dock iframe")).toHaveCount(1);
  await page
    .locator(".music-dock")
    .getByRole("button", { name: "Закрыть музыкальный плеер" })
    .click();
  await expect(page.locator(".music-dock")).toHaveCount(0);
});
