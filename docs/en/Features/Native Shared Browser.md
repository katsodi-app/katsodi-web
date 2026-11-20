---
title: "Native Shared Browser"
type: feature
status: in-progress
created: 2026-11-13
updated: 2026-11-13
tags: [katsodi/feature, katsodi/desktop, katsodi/native]
---

# Native Shared Browser

> English · [[docs/Features/Native Shared Browser|Russian original]]

## Purpose
Browse a site together in the [[docs/en/Features/Native Desktop Client]], for free and without a cloud browser: the browser runs on the room host's computer, everyone sees it, and the people the host gives access click and type in it themselves. The website's cloud option is [[docs/en/Features/Shared Browser]] (Hyperbeam, needs a paid key).

## Users and roles
- Only a room host (owner or moderator) opens it; the browser runs on their computer and they are the presenter.
- The presenter and the people they give access may control it: everyone, or chosen members. By default nobody but the presenter.
- Other members watch. Website viewers see it as an ordinary screen demo and, once given access, control it too: a layer over the picture (`src/components/cobrowse-layer.tsx`) sends clicks, wheel and keys as the same messages the app uses.

## User scenarios
1. In the Demo pane the host pastes an address and presses "Shared browser".
2. A warning (below) opens every time; "Open the shared browser" turns on only after ticking "I understand the risks and take responsibility".
3. The demo starts at once (a host's request) and the browser opens on the host's stage: Back, Forward, Reload, the address, Access.
4. Access: an "Everyone in the room" switch and a switch per member; the risk reminder stays in view.
5. A member with access sees "You are controlling the shared browser" and clicks, scrolls and types right on the picture; without access, "View only".

## Behaviour rules
The warning before starting (text in `src/lib/i18n.ts`, `browserDisclaimer1–5`):
- everything people with access do happens on the host's computer and through the host's connection; sites see the host's IP address and the actions look like the host's;
- give control only to people you know and trust: anyone with access can open any site, press buttons, submit forms, send messages and place orders on sites signed in within this browser;
- do not sign in to your accounts or enter passwords, codes or card details while others have access;
- responsibility for what happens in the shared browser, including under the law and the sites' rules, may fall on the host as the owner of the computer and the connection;
- there is no access to files or the rest of the computer, and control can be taken back at any moment.

Browser limits:
- a separate `katsodi-player --mode browser` process (WebView2), an ordinary (not InPrivate) profile in a temporary folder deleted after the demo;
- http/https only; addresses of the computer and the home network are blocked (localhost, `*.local`, `*.lan`, 10/8, 127/8, 169.254/16, 172.16/12, 192.168/16, 100.64/10, IPv6 literals and numeric address forms), for pages and for every request;
- downloads are cancelled, permissions (camera, microphone, location, notifications) denied, popups open in the same page, the context menu, developer tools and browser shortcuts are off, autofill and password saving are off;
- members' input: clicks, wheel, special keys and text; Alt and Win are never passed, Ctrl only for select all, undo, redo and word moves (no paste from the host's clipboard, no print, no save); at most 80 messages a second per member.

## Interface and states
The Shared browser button and its hint show only for hosts with WebView2 installed. While search, create room, the warning, Access or the source picker is open, the host's browser window steps off the edge, but the page keeps painting for the others. Likewise when the host leaves the stage for another part of the app. A process failure shows "The shared browser closed. Start the demo again.".

## Technical implementation
- The session is a link demo ([[docs/en/Features/Native Desktop Client]]): a `demo` request with the address, the demo token, the 20-second confirmation, a host's pause and end. Instead of capturing a window, frames come from the browser: DevTools `Page.startScreencast` (JPEG, up to 1920×1080, 15 or 30 fps by the chosen quality); `BrowserController` decodes them and `ScreenController` publishes them on the demo track.
- Input: a viewer sends `{"t":"input",…}` on the LiveKit data channel (topic `katsodi-cobrowse`, at most 4 KiB; pointer moves lossy, clicks and keys reliable) to the presenter only. The presenter applies messages only from people on the access list, through DevTools `Input.dispatchMouseEvent`, `Input.dispatchKeyEvent`, `Input.insertText` (the key filter is repeated in the browser process).
- Website: `src/lib/cobrowse.ts` (topic, `control` parsing, coordinates inside the picture, mouse buttons, keys) and `cobrowse-layer.tsx`; `demo-stage.tsx` shows the layer only while the viewer watches, is not presenting and has a `control` message from the presenter. The "You control the shared browser" label is `cobrowseYouControl`.
- The presenter broadcasts the access list (`{"t":"control"}`, every 5 s and on change); a viewer trusts only the presenter's message.
- The right to send LiveKit data is in the server's demo token: always for hosts and the presenter, for others only while a host has opened the demo channel (`annotations_open`, the website's "everyone may draw" switch). The app opens the channel while any non-host has access and closes it after; viewers reconnect with a fresh token. New route `POST /api/native/v1/rooms/{id}/demo/annotations` (`{ "open": boolean }`, the website's shared `setDemoAnnotations`).

- Quality (2026-11-18): the page always renders off screen in a fixed 1920×1080 viewport (1280×720 in low-resource mode) at 1:1 pixels, not at the size of the host's stage; the host sees the same frames as everyone and drives them through the same input layer. JPEG frames (quality 75), up to 30 a second (15 in low-resource mode), decoded on a background thread; at most 30 frames a second to the encoder; published preferring frame rate (`MaintainFramerate`) with simulcast (1080p, 720p and 360p layers), 5 Mbps for the top layer: the server gives each viewer the layer their connection carries instead of skipping frames (one 8 Mbps layer froze website viewers for 1–2 s at a time). The browser's processes get above-normal CPU and GPU priority, so a game in the foreground does not take the whole GPU from them. The host's preview runs at up to 15 fps. A viewer's frame waiting for the screen is replaced by a newer one instead of the new one being dropped.

- Tabs and ads (2026-11-18): a window opened by a click becomes a new tab (up to eight; the host switches and closes them on a strip above the address), one opened without a click is dropped. Requests, frames and pages from a built-in list of advertising, pop-under, redirect and tracker networks are refused. The list is not exhaustive: it is not a full blocker like uBlock Origin.

- Blocker (2026-11-19): the shared browser carries uBlock Origin Lite 2026.1116.1650 (the official Edge build, GPL-3.0; licence in `licenses/`). It is added to the throwaway profile before the first page, which waits for it at most 8 s. Install with `node native-desktop/tools/install-ubolite.mjs` (pinned version and SHA-256); `native.ps1` passes the folder to the build. The built-in list applies with or without it. Keyboard input: the page counts as focused (`Emulation.setFocusEmulationEnabled`).
- Start options (2026-11-20): before starting, the host picks the quality (720p by default, or 1080p with a note on the load) and the rate (15 or 30 fps); the choice is kept locally (`Prefs.browserQuality`, `Prefs.browserFramesPerSecond`). The warning has "Don't show this warning again", which settings can turn back on. Each stage tab (player, screen share, shared browser) has a short line on what it is for.
- The blocker did nothing (fixed 2026-11-19): the profile was InPrivate, and extensions do not run in InPrivate pages even though adding one succeeds. So on animego.me the Yandex ads, Metrika and the player's ad requests all loaded. The shared browser now uses an ordinary profile in the same throwaway folder. Checked through DevTools (`KATSODI_PROBE_DEVTOOLS=9333`, `KATSODI_PROBE_URL` in `tst_player_live sharedBrowser`): `yandex.ru/ads`, `mc.yandex.ru` and the cdnvideohub player's ad addresses (`b.aspx?adid`, `a-teasers`, `ea/fl.js`) fail with `ERR_BLOCKED_BY_CLIENT`, `adsbygoogle.js` is swapped for uBO's stub, and the video playlist loads.
- Load, in-player ads and Google (2026-11-19): the shared browser always renders and sends 1280×720 at 30 fps, whatever share quality is chosen. Measured on a laptop (8 cores, moving page, viewer decoding included): 1080p took 55–66% of the whole CPU, 720p 35%, with little visible difference for viewers. The one change to uBlock Origin Lite: the RU AdList and RU AdList: Counters lists are on by default (it enables them itself only when the browser language is Russian); `install-ubolite.mjs` applies this. Video-ad networks (VAST pre-rolls in players) joined the built-in list. Ads a site's player serves from its own domain are blocked neither by that list nor by uBlock Origin Lite. An empty address opens Google, words without a dot search Google (`BrowserController::resolve`), and the toolbar has a Home (Google) button.

## Data and access
Nothing is stored: the browser profile is temporary; addresses and input are not recorded. The server knows only the demo itself (address, presenter, whether the channel is open).

## Security and privacy
The main risk is social: a person with access acts in the host's name. Hence access is off by default, a warning with confirmation before every start, a reminder in Access, revocation in one click. Technically members get no access to the host's files, clipboard, other programs or home network. Remaining: DNS rebinding (a public name pointing at a home-network address) is not caught by name-based blocking; sites the host signed in to within this browser are open to those in control.

## Acceptance criteria
Verified on 2026-11-13:
- `tst_player_live sharedBrowser`: a real site and a first 1280×720 frame after 1.05 s; a "member's" keys (Tab, Enter) followed a link; 127.0.0.1, 192.168.1.1, localhost, `file:///`, `http://2130706433/` did not open; frames continue while the window is off screen; exit 0.45 s after the pipe closed.
- `tst_screen_live sharedBrowserOverLiveKit` (LiveKit Cloud, three participants): the viewer saw the shared browser (first frame after 6.3 s including starting the browser and loading the page); keys from a viewer with the data grant reached the presenter's browser in 0.7 s; LiveKit did not let a message through from a viewer without it.
- `sharedBrowserControlComesOnlyFromThePresenter`: the access list is accepted only from the presenter, a member cannot open a shared browser; `tests/unit/native-demo-api.test.ts`: the `demo/annotations` route; `tests/unit/cobrowse.test.ts`: the website's messages match the app's format field by field.
- `tst_screen_live sharedBrowserMotion` (2026-11-18, the constantly moving testufo.com page, a loaded laptop): before the fixes the viewer got 0.1–0.3 frames a second (frames were lost on the way to the screen), after them 17–27 at 1920×1080 (sometimes 1280×720 when the encoder runs short of CPU); the browser produces 18–30.
- The user's recording (2026-11-18, a website viewer, TikTok in the shared browser; host, viewer, a game and OBS on one laptop): 9 fps on average in the video area with 0.2–0.8 s freezes. A website viewer in real Chrome (Playwright, `requestVideoFrameCallback`): 9.5 fps with one 8 Mbps layer, as in the recording; up to 25.7 fps at 1080p with simulcast. Results depend heavily on the network: with host and viewers on one busy Wi-Fi the server temporarily sends the lowest layer (about 1 fps at 960×540). Capturing the browser window with Windows Graphics Capture instead of the screencast was tried and dropped: no frames off screen, no faster on screen.

Not verified: the whole flow by clicking in the app (warning, Access, mouse input over the picture), two real members in a Katsodi room, a website viewer of the shared browser, the host's machine load over a long session.

## Limitations and next steps
Page sound is shared (only the browser processes' sound, see [[docs/en/Features/Native Desktop Client]]). The demo ends when the host closes the app or leaves the room. Protected video (Netflix and the like) will be black. A possible next step is our own cloud browser on a server, if demos without the host's computer are needed.

## Related notes
- [[docs/en/Home]]
- [[docs/en/Features/Native Desktop Client]]
- [[docs/en/Features/Shared Browser]]
- [[docs/en/Features/Native API Server]]
