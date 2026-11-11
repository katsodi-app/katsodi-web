import { expect, test } from "@playwright/test";

test("closing Spotify before ready sends no playback commands, even after late ready", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("Spotify Embed"))
      errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://open.spotify.com/embed/iframe-api/v1", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `window.spotifyCommands=[];window.spotifyReady=[];window.onSpotifyIframeApiReady({createController:(mount,options,done)=>{const frame=document.createElement('iframe');frame.src='https://open.spotify.com/embed/track/test';mount.replaceWith(frame);done({addListener:(n,fn)=>{if(n==='ready')window.spotifyReady.push(fn)},play:()=>{window.spotifyCommands.push('play');console.error('Spotify Embed: command before ready')},pause:()=>{window.spotifyCommands.push('pause');console.error('Spotify Embed: command before ready')},destroy:()=>frame.remove()});}});`,
    }),
  );
  await page.route("https://open.spotify.com/embed/track/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "Loading Spotify" }),
  );
  await page.goto("/music");
  const dock = page.locator(".music-dock");
  await page
    .locator(".discovery-track-list > li")
    .first()
    .getByRole("button", { name: /^Слушать:/ })
    .click();
  await expect(dock.locator("iframe")).toHaveCount(1);
  await expect(
    dock.getByRole("button", { name: "Слушать", exact: true }),
  ).toBeDisabled();
  await dock.getByRole("button", { name: "Следующий трек" }).click();
  await expect(dock.locator("iframe")).toHaveCount(1);
  await dock.getByRole("button", { name: "Закрыть музыкальный плеер" }).click();
  await page.evaluate(() => {
    const w = window as unknown as { spotifyReady: (() => void)[] };
    w.spotifyReady.forEach((fn) => fn());
  });
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { spotifyCommands: string[] }).spotifyCommands,
    ),
  ).toEqual([]);
  expect(errors).toEqual([]);
});

test("Spotify controls and destructive YouTube switching remain usable across tabs", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://open.spotify.com/embed/iframe-api/v1", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `window.onSpotifyIframeApiReady({createController:(mount,options,done)=>{const frame=document.createElement('iframe');frame.title='Spotify fixture';frame.src='https://open.spotify.com/embed/track/test';mount.replaceWith(frame);let listeners={};done({addListener:(n,fn)=>{listeners[n]=fn;if(n===\"ready\")setTimeout(fn,200)},play:()=>listeners.playback_update?.({data:{position:10000,duration:180000,isPaused:false}}),pause:()=>listeners.playback_update?.({data:{position:10000,duration:180000,isPaused:true}}),destroy:()=>frame.remove()});}});`,
    }),
  );
  await page.route("https://open.spotify.com/embed/track/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "Spotify official embed fixture",
    }),
  );
  await page.route("https://www.youtube.com/embed/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "YouTube official embed fixture",
    }),
  );
  await page.route("https://www.youtube.com/iframe_api", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `window.YT={Player:function(frame,options){let state=-1;this.playVideo=()=>{state=1;options.events.onStateChange({data:1})};this.pauseVideo=()=>{state=2;options.events.onStateChange({data:2})};this.getPlayerState=()=>state;this.getCurrentTime=()=>12;this.getDuration=()=>180;this.seekTo=()=>{};this.setVolume=()=>{};this.destroy=()=>frame.remove();setTimeout(()=>options.events.onReady({target:this}),0);}};window.onYouTubeIframeAPIReady();`,
    }),
  );
  await page.goto("/music");
  const rows = page.locator(".discovery-track-list > li");
  await expect(rows).toHaveCount(150);
  expect(
    await rows.last().evaluate((el) => getComputedStyle(el).contentVisibility),
  ).toBe("auto");
  const originalColumns = await rows
    .first()
    .evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
    );
  const dock = page.locator(".music-dock");
  await page.getByRole("button", { name: /^Spotify\s*150$/ }).click();
  expect(
    await rows
      .first()
      .evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
      ),
  ).toBe(originalColumns);
  await rows
    .first()
    .getByRole("button", { name: /^Слушать:/ })
    .click();
  await expect(
    dock.getByRole("button", { name: "Пауза", exact: true }),
  ).toBeEnabled();
  await dock.getByRole("button", { name: "Пауза", exact: true }).click();
  await expect(
    dock.getByRole("button", { name: "Слушать", exact: true }),
  ).toBeEnabled();
  await dock.getByRole("button", { name: "Слушать", exact: true }).click();
  await expect(dock.getByLabel("Позиция трека")).toHaveValue("10");
  await page.getByRole("button", { name: /^YouTube\s*150$/ }).click();
  await rows
    .first()
    .getByRole("button", { name: /^Слушать:/ })
    .click();
  await expect(
    dock.getByRole("button", { name: "Пауза", exact: true }),
  ).toBeEnabled();
  for (let i = 0; i < 3; i++) {
    await dock.getByRole("button", { name: "Следующий трек" }).click();
    await expect(
      dock.getByRole("button", { name: "Пауза", exact: true }),
    ).toBeEnabled();
  }
  await dock.getByRole("button", { name: "Развернуть плеер" }).click();
  await expect(dock).toHaveClass(/music-dock-expanded/);
  await page.screenshot({
    path: `.local/music-repair-expanded-${info.project.name}.png`,
  });
  await dock.getByRole("button", { name: "Свернуть плеер" }).click();
  await dock.getByRole("button", { name: "Закрыть музыкальный плеер" }).click();
  await expect(dock).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(errors).toEqual([]);
});
