import { test, expect, type Page } from "@playwright/test";
import { captureAll, skipCapture } from "./capture";
import { musicTracks } from "../../src/lib/music";
import { build } from "esbuild";
let bundle = "",
  styles: string[] = [];
test.beforeAll(async ({ request }) => {
  const output = await build({
    entryPoints: ["tests/fixtures/brand-preview.tsx"],
    bundle: true,
    write: false,
    format: "iife",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"development"' },
    plugins: [
      {
        name: "isolated-brand-states",
        setup(builder) {
          // The isolated HTML harness has no Next router context. Real navigation
          // is covered against app routes in fandom-connections/redesign tests.
          builder.onResolve({ filter: /^next\/navigation$/ }, () => ({
            path: "navigation",
            namespace: "test-navigation",
          }));
          builder.onLoad(
            { filter: /.*/, namespace: "test-navigation" },
            () => ({
              contents: "export function useRouter(){return {refresh(){}}}",
            }),
          );
          builder.onResolve({ filter: /^@hyperbeam\/web$/ }, () => ({
            path: process.cwd() + "/tests/fixtures/hyperbeam-sdk.ts",
          }));
          builder.onResolve(
            {
              filter:
                /^@\/lib\/server\/(auth|room|browser|friend|progression|fandom)-actions$/,
            },
            (args) => ({ path: args.path, namespace: "test-actions" }),
          );
          builder.onLoad({ filter: /.*/, namespace: "test-actions" }, () => ({
            contents: [
              "updateRoomSource",
              "updateRoomSite",
              "pingRoomOccupancy",
              "setDemoAnnotations",
              "requestDemo",
              "decideDemo",
              "pauseDemo",
              "stopDemo",
              "beatDemo",
              "createNetworkRoom",
              "joinNetworkRoom",
              "sendMessage",
              "sendSticker",
              "createInvite",
              "redeemInvite",
              "moderateRoom",
              "deleteMessage",
              "revokeInvite",
              "updatePlayback",
              "addToQueue",
              "removeFromQueue",
              "playFromQueue",
              "importToQueue",
              "mixQueue",
              "startSharedBrowser",
              "endSharedBrowser",
              "claimSharedBrowserControl",
              "reportSharedBrowserUrl",
              "pingRoomPresence",
              "signIn",
              "signUp",
              "recoverPassword",
              "resetPassword",
              "saveProfile",
              "signOut",
              "resendConfirmation",
              "sendFriendRequest",
              "respondFriendRequest",
              "cancelFriendRequest",
              "changeFriendship",
              "requestFandom",
              "decideFandomRequest",
            ]
              .map(
                // Each stub records its call so tests can check what was sent.
                (name) =>
                  `export async function ${name}(prev, form){(window.__actions ||= []).push([${JSON.stringify(name)}, form ? Object.fromEntries(form) : null]);return ${name === "sendFriendRequest" ? "{status:'success',code:'saved',friend:'sent'}" : "{status:'success',code:'saved'}"}}`,
              )
              .join("\n"),
          }));
          builder.onResolve({ filter: /^next\/link$/ }, () => ({
            path: "link",
            namespace: "test-link",
          }));
          builder.onLoad({ filter: /.*/, namespace: "test-link" }, () => ({
            contents:
              "import {createElement} from 'react'; export default function Link({children,...props}){return createElement('a',props,children)}",
            resolveDir: process.cwd(),
          }));
        },
      },
    ],
  });
  bundle = output.outputFiles[0].text;
  const html = await (await request.get("/home")).text();
  styles = [
    ...new Set(
      [...html.matchAll(/href="([^"]+\.css[^"]*)"/g)].map((m) =>
        m[1].replaceAll("&amp;", "&"),
      ),
    ),
  ];
});
async function open(page: Page, mode: string) {
  await page.route("**/brand-state-bundle.js", (r) =>
    r.fulfill({ contentType: "text/javascript", body: bundle }),
  );
  await page.route("**/brand-state-preview", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: `<!doctype html><html lang="ru" data-theme="violet"><head><meta name="viewport" content="width=device-width,initial-scale=1">${styles.map((href) => `<link rel="stylesheet" href="${href}">`).join("")}</head><body><div id="root"></div><script>window.__brandMode=${JSON.stringify(mode)}</script><script src="/brand-state-bundle.js"></script></body></html>`,
    }),
  );
  // Profile media endpoints: a small real image, and a recorder for uploads.
  await page.route("**/api/profile-media/**", (r) =>
    r.fulfill({ contentType: "image/png", body: tinyPng }),
  );
  await page.route("**/api/profile/media**", async (r) => {
    mediaUploads.push({
      method: r.request().method(),
      body: r.request().postDataBuffer()?.toString("latin1") || "",
    });
    await r.fulfill({ json: { status: "success", code: "saved" } });
  });
  await page.goto("/brand-state-preview");
}
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jz1EAAAAASUVORK5CYII=",
  "base64",
);
let mediaUploads: { method: string; body: string }[] = [];
test.beforeEach(() => {
  mediaUploads = [];
});
for (const mode of [
  "account-edit",
  "onboarding",
  "create",
  "profile",
  "error",
  "loading",
])
  test(`branded protected/state view ${mode}`, async ({ page }, info) => {
    await open(page, mode);
    if (mode === "loading")
      await expect(page.getByRole("status")).toHaveAttribute(
        "aria-busy",
        "true",
      );
    else await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.local/brand-pages/${mode}-fixture-${info.project.name}.png`,
      fullPage: true,
      animations: "disabled",
    });
  });
test("onboarding edits keep fields and interests on the real form", async ({
  page,
}) => {
  await open(page, "onboarding");
  await page
    .getByLabel("Как тебя называть", { exact: true })
    .fill("Луна и звёзды");
  await expect(page.locator(".profile-passport h2")).toHaveText(
    "Луна и звёзды",
  );
  await page
    .getByRole("searchbox", { name: "Поиск интересов", exact: true })
    .fill("Minecraft");
  await page.getByRole("checkbox", { name: "Minecraft", exact: true }).check();
  await page.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Изменения сохранены");
  await expect(
    page.getByRole("link", { name: "Общие комнаты", exact: true }),
  ).toBeVisible();
});
test("shared creation preview and error retry respond to actual controls", async ({
  page,
}) => {
  await open(page, "create");
  await page
    .getByLabel("Название комнаты", { exact: true })
    .fill("Наш маленький космос");
  await expect(page.locator(".preview-room-name")).toHaveText(
    "Наш маленький космос",
  );
  await page.locator('input[name="format"][value="music"]').check();
  await page.locator('input[name="visibility"][value="private"]').check();
  await expect(page.locator(".studio-preview-tags")).toContainText("Музыка");
  await open(page, "error");
  await page
    .getByRole("button", { name: "Попробовать снова", exact: true })
    .click();
  expect(await page.evaluate(() => window.__brandRetry)).toBe(1);
});

test("Russian network tags wrap inside palette cards at narrow widths", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await open(page, "catalog-lifecycle");
  await expect(page.locator(".network-room-card")).toHaveCount(2);
  const bounds = await page.locator(".network-room-card").evaluateAll((cards) =>
    cards.every((card) => {
      const box = card.getBoundingClientRect();
      return (
        card.scrollWidth <= card.clientWidth &&
        [...card.querySelectorAll(".network-room-tags span")].every((tag) => {
          const rect = tag.getBoundingClientRect();
          return rect.left >= box.left && rect.right <= box.right;
        })
      );
    }),
  );
  expect(bounds).toBe(true);
  await expect(page.locator(".network-room-tags").first()).toContainText(
    "Другое",
  );
  await page.screenshot({
    path: `.local/ux-audit/room-studio-cards-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
});

test("profile settings show fandom thumbnails and preserve choices across filters", async ({
  page,
}, info) => {
  await open(page, "account-edit");
  await expect(
    page.getByRole("navigation", { name: "Разделы настроек профиля" }),
  ).toBeVisible();
  const thumbnails = page.locator(".profile-fandom-tiles img");
  await expect(thumbnails.first()).toBeVisible();
  await expect
    .poll(() =>
      thumbnails
        .first()
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  const search = page.getByRole("searchbox", {
    name: "Поиск интересов",
    exact: true,
  });
  await search.fill("Minecraft");
  await page.getByRole("checkbox", { name: "Minecraft", exact: true }).check();
  await search.fill("Dune");
  await page
    .getByRole("combobox", { name: "Категория", exact: true })
    .selectOption("cinema");
  await search.fill("");
  await page
    .getByRole("combobox", { name: "Категория", exact: true })
    .selectOption("all");
  await expect(
    page.getByRole("checkbox", { name: "Minecraft", exact: true }),
  ).toBeChecked();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `.local/profile-settings-${info.project.name}.png`,
    fullPage: true,
  });
});

test("a banner upload appears immediately and removal clears it without a router refresh", async ({
  page,
}) => {
  await open(page, "account-edit");
  await expect(page.locator(".profile-banner img")).toHaveCount(0);
  await page
    .locator('.profile-media-actions input[type="file"]')
    .nth(1)
    .setInputFiles({
      name: "banner.png",
      mimeType: "image/png",
      buffer: tinyPng,
    });
  const dialog = page.getByRole("dialog", {
    name: "Обложка профиля",
    exact: true,
  });
  await dialog.getByRole("button", { name: "Сохранить", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator(".profile-banner img")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".profile-banner img")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await page
    .getByRole("button", { name: "Убрать обложку", exact: true })
    .click();
  await expect(page.locator(".profile-banner img")).toHaveCount(0);
  expect(mediaUploads.map((upload) => upload.method)).toEqual([
    "POST",
    "DELETE",
  ]);
});

test("failed profile images explain the problem and can be retried", async ({
  page,
}) => {
  await open(page, "profile");
  let fail = true;
  await page.route("**/api/profile-media/**", (route) =>
    fail
      ? route.fulfill({ status: 503, body: "unavailable" })
      : route.fulfill({ contentType: "image/png", body: tinyPng }),
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "Не удалось загрузить изображение профиля",
  );
  fail = false;
  await page
    .getByRole("button", { name: "Попробовать снова", exact: true })
    .click();
  await expect(page.locator(".profile-avatar img")).toBeVisible();
  await expect(page.locator(".profile-banner img")).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("profiles show access-checked media, join date and fandom links", async ({
  page,
}, info) => {
  await open(page, "profile");
  await expect(page.locator("main h1")).toHaveText("Луна");
  const id = "10000000-0000-4000-8000-000000000009";
  await expect(page.locator(".profile-banner img")).toHaveAttribute(
    "src",
    `/api/profile-media/${id}/banner?v=v1`,
  );
  await expect(page.locator(".profile-avatar img")).toHaveAttribute(
    "src",
    `/api/profile-media/${id}/avatar?v=v1`,
  );
  await page.locator(".profile-avatar").scrollIntoViewIfNeeded();
  expect(
    await page.locator(".profile-avatar").evaluate((avatar) => {
      const bounds = avatar.getBoundingClientRect();
      return !!document
        .elementFromPoint(bounds.x + bounds.width / 2, bounds.y + 10)
        ?.closest(".profile-avatar");
    }),
  ).toBe(true);
  await expect(page.locator(".profile-identity")).toContainText("@luna");
  await expect(page.locator(".profile-identity")).toContainText(
    "С нами с 1 ноября 2026",
  );
  // Task 6: each fandom shows its image and name and opens its page.
  const cards = page.locator(".profile-fandom-cards a");
  await expect(cards).toHaveCount(2);
  await expect(cards.first()).toHaveAttribute("href", "/fandoms/cinema-6");
  await expect(cards.first().locator("img")).toBeVisible();
  await expect(cards.first().locator("strong")).not.toBeEmpty();
  expect(
    await cards
      .first()
      .locator("img")
      .evaluate((img) => (img as HTMLImageElement).naturalWidth),
  ).toBeGreaterThan(0);
  await page
    .locator(".profile-fandom-section")
    .screenshot({ path: `.local/profile-fandoms-${info.project.name}.png` });
});
test("the avatar editor crops with keyboard and zoom, then uploads", async ({
  page,
}, info) => {
  await open(page, "account-edit");
  await expect(page.locator(".profile-avatar")).toContainText("Л");
  const picture = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 300;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#c0ff80";
    ctx.fillRect(0, 0, 600, 300);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page
    .locator('.profile-media-actions input[type="file"]')
    .first()
    .setInputFiles({
      name: "me.png",
      mimeType: "image/png",
      buffer: Buffer.from(picture, "base64"),
    });
  const dialog = page.getByRole("dialog", { name: "Аватар" });
  await expect(dialog).toBeVisible();
  const frame = dialog.getByRole("group", { name: "Кадр картинки" });
  await frame.focus();
  await frame.press("ArrowLeft");
  await dialog.getByRole("slider", { name: "Масштаб" }).fill("1.5");
  await page.screenshot({
    path: `.local/brand-pages/avatar-crop-${info.project.name}.png`,
  });
  await dialog.getByRole("button", { name: "Сохранить" }).click();
  await expect(dialog).toBeHidden();
  expect(mediaUploads).toHaveLength(1);
  const body = mediaUploads[0].body;
  expect(body).toContain('name="kind"');
  expect(body).toContain("avatar");
  const crop = JSON.parse(body.match(/{"x":[^}]*}/)![0]);
  // A square frame on a 600×300 picture: the height fraction is twice the
  // width fraction; at 1.5× zoom the square is 200 px of the 300 px height.
  expect(crop.height).toBeCloseTo(crop.width * 2, 2);
  expect(crop.height).toBeCloseTo(2 / 3, 2);
  for (const value of Object.values(crop) as number[]) {
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
  }
});
type Recorded = [string, Record<string, string> | null][];
const actions = (page: Page) =>
  page.evaluate(() => (Reflect.get(window, "__actions") || []) as Recorded);
test("friends: tabs, accepting a request, adding by username and a confirmed block", async ({
  page,
}, info) => {
  await open(page, "friends");
  // Pending incoming requests open the Requests tab first.
  await expect(page.getByRole("button", { name: /Заявки/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByRole("button", { name: /Заявки/ })).toContainText("2");
  await page.screenshot({
    path: `.local/brand-pages/friends-workspace-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Принять" }).click();
  await expect
    .poll(() => actions(page))
    .toContainEqual([
      "respondFriendRequest",
      { request: "40000000-0000-4000-8000-000000000001", accept: "true" },
    ]);
  await page.getByLabel("Добавить друга по @username").fill("@Mira_K");
  await page.getByRole("button", { name: "Добавить", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Заявка отправлена.");
  await page.getByRole("button", { name: /Друзья/ }).click();
  const row = page.locator(".friend-row", { hasText: "Тим" });
  await row.getByRole("button", { name: "Заблокировать: Тим" }).click();
  // Blocking needs a second, explicit click.
  expect((await actions(page)).map(([name]) => name)).not.toContain(
    "changeFriendship",
  );
  await row.getByRole("button", { name: "Точно заблокировать?" }).click();
  await expect
    .poll(() => actions(page))
    .toContainEqual([
      "changeFriendship",
      { user: "10000000-0000-4000-8000-000000000021", operation: "block" },
    ]);
  await expect(page.getByRole("link", { name: /Тим/ })).toHaveAttribute(
    "href",
    "/profile/tim",
  );
});
test("the editor refuses unsupported files before uploading", async ({
  page,
}) => {
  await open(page, "account-edit");
  await page
    .locator('.profile-media-actions input[type="file"]')
    .first()
    .setInputFiles({
      name: "art.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"),
    });
  await expect(page.getByRole("alert")).toContainText("JPG, PNG или WebP");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(mediaUploads).toEqual([]);
});

test("profiles show level progress and achievements with locked states", async ({
  page,
}) => {
  await open(page, "profile");
  const bar = page.getByRole("progressbar", { name: "Уровень 3" });
  await expect(bar).toHaveAttribute("aria-valuenow", "67");
  await expect(bar).toHaveAttribute("aria-valuemax", "520");
  await expect(page.locator(".level-track")).toContainText(
    "67 / 520 XP · до уровня 4",
  );
  const cards = page.locator(".achievement");
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText("Первые шаги");
  await expect(cards.nth(0)).toContainText(
    "Обычное · +25 XP · Открыто 2 ноября 2026",
  );
  await expect(cards.nth(2)).toHaveClass(/is-locked/);
  await expect(cards.nth(2)).toContainText("Легендарное");
  await expect(cards.nth(2)).toContainText("Ещё не открыто");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(cards.nth(1)).toContainText("Room Creator");
});
test("the catalogue marks inactive rooms with their deletion countdown", async ({
  page,
}) => {
  await open(page, "catalog-lifecycle");
  const empty = page.locator(".room-card", { hasText: "Пустая комната" });
  await expect(empty.locator(".room-inactive")).toHaveText(
    "Неактивна · удалится через 18 мин, если никто не зайдёт",
  );
  await expect(
    page
      .locator(".room-card", { hasText: "Живая комната" })
      .locator(".room-inactive"),
  ).toHaveCount(0);
});
test("members request a fandom and follow each decision", async ({ page }) => {
  await open(page, "fandom-request");
  await expect(
    page.getByRole("heading", { name: "Предложить фандом" }),
  ).toBeVisible();
  // Earlier requests: approved with a link, rejected with the comment.
  const list = page.locator(".request-history");
  await expect(list.getByText("Одобрен")).toBeVisible();
  await expect(
    list.getByRole("link", { name: "Открыть фандом" }),
  ).toHaveAttribute("href", "/fandoms/community-0123456789");
  await expect(list.getByText("Комментарий: Слишком узко")).toBeVisible();
  await page.getByLabel("Название фандома").fill("Frieren");
  await page.getByLabel("Категория").selectOption("anime");
  await page
    .getByLabel("Пара слов о фандоме (по желанию)")
    .fill("Сказка о времени");
  await page.getByRole("button", { name: "Отправить запрос" }).click();
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "__actions")))
    .toContainEqual([
      "requestFandom",
      { name: "Frieren", category: "anime", note: "Сказка о времени" },
    ]);
  await open(page, "fandom-request-signed-out");
  await expect(
    page.getByText("Войди, чтобы предложить фандом и следить за решением."),
  ).toBeVisible();
  await expect(page.getByLabel("Название фандома")).toHaveCount(0);
});
test("the admin panel shows accounts, fandoms, requests and decides them", async ({
  page,
}, info) => {
  await open(page, "admin");
  await expect(
    page.getByRole("heading", { name: "Панель администратора" }),
  ).toBeVisible();
  // A waiting request opens the Requests section first.
  const requests = page.getByRole("tabpanel");
  await expect(requests.getByText("Frieren")).toBeVisible();
  await expect(requests.getByText("Arcane")).toHaveCount(0);
  await page.getByLabel("Комментарий к решению").fill("Добро пожаловать");
  await page.getByRole("button", { name: "Одобрить" }).click();
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "__actions")))
    .toContainEqual([
      "decideFandomRequest",
      {
        request: "40000000-0000-4000-8000-000000000001",
        reason: "Добро пожаловать",
        approve: "1",
      },
    ]);
  await page.getByRole("button", { name: "Отклонить" }).click();
  await expect
    .poll(() => page.evaluate(() => Reflect.get(window, "__actions")))
    .toContainEqual([
      "decideFandomRequest",
      expect.objectContaining({ approve: "0" }),
    ]);
  await page.getByRole("button", { name: /^Все/ }).click();
  await expect(requests.getByText("Arcane")).toBeVisible();
  await page
    .locator(".admin-panel")
    .screenshot({ path: `.local/admin-requests-${info.project.name}.png` });

  await page.getByRole("tab", { name: /Аккаунты/ }).click();
  await expect(
    page.getByRole("cell", { name: "owner@example.org" }),
  ).toBeVisible();
  await expect(page.getByText("Администратор", { exact: true })).toBeVisible();

  await page.getByRole("tab", { name: /Фандомы/ }).click();
  const rows = page.locator(".admin-table tbody tr");
  await expect(rows).toHaveCount(151);
  await expect(
    page.getByRole("row", { name: /Arcane.*Сообщество.*1/ }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Музыка/ }).click();
  const music = page.getByRole("tabpanel");
  await expect(music.locator(".admin-table tbody tr")).toHaveCount(
    musicTracks.length,
  );
  await expect(
    music.getByRole("link", { name: musicTracks[0].title, exact: true }),
  ).toHaveAttribute("href", `/music/${musicTracks[0].slug}`);
  await expect(
    music.getByText("scripts/build-music-chart.mjs", { exact: false }),
  ).toBeVisible();
});
for (const mode of [
  "account-edit",
  "profile",
  "friends",
  "create",
  "fandom-request",
  "admin",
])
  test(`signed-in screen ${mode} passes automated WCAG 2.1 AA checks`, async ({
    page,
  }) => {
    const { default: AxeBuilder } = await import("@axe-core/playwright");
    await open(page, mode);
    await expect(page.locator("main h1")).toBeVisible();
    await page.waitForTimeout(600);
    const violations = (
      await new AxeBuilder({ page })
        .include("main")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze()
    ).violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      target: v.nodes.map((n) => n.target.join(" ")).slice(0, 3),
    }));
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

// Redesign before/after screenshots of signed-in screens (Task 1); skipped
// unless CAPTURE_DIR is set.
for (const mode of [
  "profile",
  "friends",
  "account-edit",
  "create",
  "admin",
  "fandom-request",
])
  test(`capture signed-in ${mode}`, async ({ page }, info) => {
    test.skip(skipCapture(info), "set CAPTURE_DIR to capture");
    test.setTimeout(180000);
    await open(page, mode);
    await expect(page.locator("main h1")).toBeVisible();
    await captureAll(page, `signed-in-${mode}`);
  });
