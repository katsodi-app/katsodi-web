import type { Page } from "@playwright/test";

/** Ordinary local rooms, stored exactly as the app stores a user's own rooms. */
export const localVideoRoom = {
  id: "30000000-0000-4000-8000-000000000001",
  kind: "local",
  name: "По ту сторону звёзд",
  description: "Вечер космических историй",
  format: "video",
  visibility: "public",
  url: "",
  art: "orbit",
  createdAt: "2026-11-06T10:00:00.000Z",
} as const;
export const localMusicRoom = {
  id: "30000000-0000-4000-8000-000000000002",
  kind: "local",
  name: "Тихо, мы чиллим",
  description: "Плейлист для спокойного вечера",
  format: "music",
  visibility: "public",
  url: "",
  art: "wave",
  createdAt: "2026-11-06T10:05:00.000Z",
} as const;

/**
 * Seeds the two rooms once per browser context. Later changes the test makes
 * (saving, deleting) are kept, because the seed never overwrites them.
 */
export async function seedLocalRooms(page: Page) {
  await page.addInitScript(
    (rooms) => {
      try {
        if (!localStorage.getItem("katsodi.workspace.v1"))
          localStorage.setItem(
            "katsodi.workspace.v1",
            JSON.stringify({ rooms, saved: [], followed: [] }),
          );
      } catch {
        /* Storage-disabled tests start empty. */
      }
    },
    [localVideoRoom, localMusicRoom],
  );
}
