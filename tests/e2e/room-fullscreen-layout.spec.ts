import { expect, test } from "@playwright/test";
import { localVideoRoom, seedLocalRooms } from "./local-rooms";

for (const width of [360, 390, 768, 1280, 1920]) {
  test(`fullscreen content stays in flow at ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await seedLocalRooms(page);
    await page.goto(`/room/${localVideoRoom.id}`);
    await page
      .getByRole("button", { name: "На весь экран", exact: true })
      .click();
    const room = page.locator(".room-fullscreen");
    await expect(room).toHaveClass(/is-fullscreen/);
    const geometry = await room.evaluate((root) => {
      const bounds = root.getBoundingClientRect();
      const layout = root
        .querySelector(".room-layout")!
        .getBoundingClientRect();
      const notice = root
        .querySelector(":scope > .notice")!
        .getBoundingClientRect();
      const source = root
        .querySelector(".cinema-no-source")!
        .getBoundingClientRect();
      const footer = root
        .querySelector(".cinema-stage-footer")!
        .getBoundingClientRect();
      const stage = root
        .querySelector(".cinema-stage")!
        .getBoundingClientRect();
      const pane = root
        .querySelector(".pane-player .pane-content")!
        .getBoundingClientRect();
      return {
        fillsViewport:
          Math.abs(bounds.left) <= 1 &&
          Math.abs(bounds.top) <= 1 &&
          Math.abs(bounds.width - window.innerWidth) <= 1 &&
          Math.abs(bounds.height - window.innerHeight) <= 1,
        noticeClear: notice.top >= layout.bottom - 1,
        sourceClear: source.bottom <= footer.top,
        stageFitsPane:
          innerWidth > 1000 ||
          (stage.top >= pane.top - 1 && stage.bottom <= pane.bottom + 1),
        noOverflow: root.scrollWidth <= root.clientWidth,
      };
    });
    expect(geometry).toEqual({
      fillsViewport: true,
      noticeClear: true,
      sourceClear: true,
      stageFitsPane: true,
      noOverflow: true,
    });
    await page.screenshot({
      path: `.local/ux-audit/fullscreen-layout-${width}-${info.project.name}.png`,
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "Выйти из полного экрана", exact: true })
      .click();
    await expect(room).not.toHaveClass(/is-fullscreen/);
  });
}
