import { expect, test } from "@playwright/test";
import { musicTracks } from "../../src/lib/music";

const first = musicTracks[0];
const second = musicTracks[1];
const withSoundcloud = musicTracks.find((t) => t.soundcloud);
const withoutSoundcloud = musicTracks.find((t) => !t.soundcloud);

test("music actions restore language and room context and react when the dock is hidden", async ({
  page,
}) => {
  const roomId = "edc24c32-82df-4a55-a4bd-b0d4d7079f11";
  await page.addInitScript((id) => {
    localStorage.setItem("katsodi.locale", "en");
    localStorage.setItem(
      "katsodi.currentRoom",
      JSON.stringify({
        id,
        title: "Stored music room",
        kind: "shared",
        art: "wave",
      }),
    );
  }, roomId);
  await page.goto("/music");
  const actions = page.locator(".chart-list .listen-room-action");
  await expect(
    actions.getByRole("button", { name: /^Listen in Room:/ }),
  ).toHaveCount(150);
  await expect(actions.locator('input[name="room"]')).toHaveCount(150);
  await expect(actions.first().locator('input[name="room"]')).toHaveValue(
    roomId,
  );
  await page.getByRole("button", { name: "RU", exact: true }).click();
  await expect(
    actions.getByRole("button", { name: /^Слушать в комнате:/ }),
  ).toHaveCount(150);
  await page.getByRole("button", { name: "Скрыть панель комнаты" }).click();
  await expect(actions.locator('input[name="room"]')).toHaveCount(0);
  await expect(
    actions.getByRole("button", { name: /^Слушать в комнате:/ }),
  ).toHaveCount(150);
});

test("music discovery distinguishes global charts, source limits and room actions", async ({
  page,
}, info) => {
  await page.goto("/music");
  await expect(
    page.getByRole("navigation", { name: "Музыкальные чарты" }),
  ).toBeVisible();
  await expect(
    page.locator(".chart-list .listen-room-action button"),
  ).toHaveCount(150);
  await page.getByRole("button", { name: /^Spotify\s*150$/ }).click();
  await expect(page.locator(".discovery-track-list > li")).toHaveCount(150);
  await expect(page.locator(".chart-source-panel")).toContainText("Весь мир");
  await page.getByRole("button", { name: /^YouTube\s*150$/ }).click();
  await expect(page.locator(".discovery-track-list > li")).toHaveCount(150);
  await expect(
    page
      .locator(".discovery-track-list > li")
      .first()
      .getByRole("button", { name: /Слушать в комнате/ }),
  ).toBeVisible();
  const source = await page
    .locator(".discovery-track-title")
    .first()
    .getAttribute("href");
  expect(source).toMatch(/^https:\/\/www.youtube.com\/watch\?v=/);
  await page.screenshot({
    path: `.local/music-discovery-youtube-${info.project.name}.png`,
  });
  await page.getByRole("button", { name: /^SoundCloud/ }).click();
  await expect(page.locator(".chart-source-panel")).toContainText(
    "Исследованная подборка",
  );
  await expect(page.locator(".discovery-track-list > li")).toHaveCount(100);
  await page.getByRole("button", { name: /Трендовые треки/ }).click();
  await expect(page.locator(".discovery-track-list > li")).toHaveCount(60);
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /^Trending Tracks/ }),
  ).toBeVisible();
  await page.getByPlaceholder("Find a track or artist").fill("poster boy");
  await expect(page.locator(".discovery-track-list > li")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.local/music-discovery-${info.project.name}.png`,
    fullPage: true,
  });
});

test("the Top 150 lists every track and filters by title or artist", async ({
  page,
}, info) => {
  await page.goto("/music");
  await expect(
    page.getByRole("heading", { level: 1, name: /Больше всего прослушиваний/ }),
  ).toBeVisible();
  const rows = page.locator(".chart-list > li");
  await expect(rows).toHaveCount(musicTracks.length);
  await expect(rows.first()).toContainText(first.title);
  await expect(rows.first().locator("img")).toHaveAttribute("src", first.thumb);
  await expect(
    page.getByRole("link", { name: "Открыть источник" }),
  ).toHaveAttribute("href", "https://kworb.net/spotify/songs.html");
  await page.screenshot({
    path: `.local/music-chart-${info.project.name}.png`,
  });

  await page.getByLabel("Найти трек или исполнителя").fill(second.artists[0]);
  await expect(rows.first()).toBeVisible();
  for (const text of await rows.allTextContents())
    expect(text).toContain(second.artists[0]);
  await page.getByLabel("Найти трек или исполнителя").fill("zzzz-no-track");
  await expect(rows).toHaveCount(0);
  await expect(page.getByText("Ничего не найдено")).toBeVisible();

  // No horizontal overflow at this project's viewport.
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("a track page shows its facts, links and the Spotify player", async ({
  page,
}, info) => {
  await page.goto("/music");
  await page.locator(".chart-list > li").first().getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`/music/${first.slug}$`));
  await expect(
    page.getByRole("heading", { level: 1, name: first.title }),
  ).toBeVisible();
  await expect(page.locator(".music-artists")).toHaveText(
    first.artists.join(", "),
  );
  await expect(page.locator(".music-cover")).toHaveAttribute(
    "src",
    first.cover,
  );
  await expect(page.locator(".music-about > p")).toContainText(
    "место среди самых прослушиваемых песен",
  );
  await expect(
    page.getByRole("link", { name: /Открыть в Spotify/ }),
  ).toHaveAttribute(
    "href",
    `https://open.spotify.com/track/${first.spotifyId}`,
  );
  await expect(
    page.locator(`iframe[title="Плеер Spotify: ${first.title}"]`),
  ).toHaveAttribute(
    "src",
    `https://open.spotify.com/embed/track/${first.spotifyId}`,
  );
  await expect(page.getByText(/30-секундный фрагмент/)).toBeVisible();
  await page.screenshot({
    path: `.local/music-track-${info.project.name}.png`,
    fullPage: true,
  });

  await page.getByRole("link", { name: new RegExp(`Следующий: #2`) }).click();
  await expect(page).toHaveURL(new RegExp(`/music/${second.slug}$`));

  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(
    page.getByRole("link", { name: /Open in Spotify/ }),
  ).toBeVisible();
  await expect(page.locator(".music-about > p")).toContainText(
    "among the most-streamed songs of all time",
  );
  await page.getByRole("button", { name: "RU", exact: true }).click();
});

test("SoundCloud: a matched track gets a player, the rest a search link", async ({
  page,
}) => {
  test.skip(!withSoundcloud || !withoutSoundcloud, "data has only one kind");
  await page.goto(`/music/${withSoundcloud!.slug}`);
  await expect(
    page.getByRole("link", { name: /Открыть в SoundCloud/ }),
  ).toHaveAttribute("href", withSoundcloud!.soundcloud!.url);
  const widget = page.locator(
    `iframe[title="Плеер SoundCloud: ${withSoundcloud!.title}"]`,
  );
  const src = new URL((await widget.getAttribute("src"))!);
  expect(src.host).toBe("w.soundcloud.com");
  expect(src.searchParams.get("url")).toBe(withSoundcloud!.soundcloud!.url);

  await page.goto(`/music/${withoutSoundcloud!.slug}`);
  const search = page.getByRole("link", { name: /Искать в SoundCloud/ });
  expect(new URL((await search.getAttribute("href"))!).pathname).toBe(
    "/search/sounds",
  );
  await expect(page.locator('iframe[title^="Плеер SoundCloud"]')).toHaveCount(
    0,
  );
  await expect(page.getByText(/трек не найден/)).toBeVisible();
});

test("an unknown track is a real 404", async ({ page }) => {
  const response = await page.goto("/music/not-a-real-track");
  expect(response?.status()).toBe(404);
});

test("music pages pass automated WCAG 2.1 AA checks", async ({ page }) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  for (const path of ["/music", `/music/${first.slug}`]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    const violations = (
      await new AxeBuilder({ page })
        .include("main")
        // Third-party player frames are outside our control.
        .exclude("iframe")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze()
    ).violations.map((v) => `${path}: ${v.id} ${v.nodes.length}`);
    expect(violations).toEqual([]);
  }
});
