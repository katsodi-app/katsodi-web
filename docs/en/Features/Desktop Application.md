---
title: "Desktop Application"
type: feature
status: local-build-unsigned
created: 2026-11-12
updated: 2026-11-12
tags: [katsodi/feature, katsodi/desktop]
---

# Desktop Application

> English · [[docs/Features/Desktop Application|Russian original]]

> Being replaced by the native application: [[docs/en/Features/Native Desktop Client]]. This note describes the earlier website-in-a-window shell.

## Purpose
A Windows desktop client for Katsodi: a small, locked-down Electron shell that opens the real Katsodi website in its own window. It is not a second interface. Pages, design, languages, themes, accounts and rooms are the website's own and change together with it. The lighter way to install Katsodi is [[docs/en/Features/Installable Web App]]; the shared resource setting is [[docs/en/Features/Low Resource Mode]]. The assignment this implements is the internal desktop brief.

## Users and roles
Anyone who can use the website. The shell grants nothing extra: guest, verified user, member, moderator, owner and administrator are decided by the server exactly as in a browser ([[docs/en/Features/Server Authorization]]). There is no administrator mode, test account or role switch in the client.

## User scenarios
- Start Katsodi from the Start menu; the window opens `/home` and remembers its size and position.
- Sign in inside the app. The app has its own profile: being signed in to the website in Chrome or Edge does not sign the app in, and the app never reads another browser's data.
- Confirm e-mail or reset a password from the letter: the link opens the system browser and finishes there (the link carries a one-time token hash checked by the server, so any browser can complete it). Then sign in inside the app.
- Join voice: the microphone is allowed for Katsodi's own page only.
- Present a Link Demo: a picker asks what to show. "This Katsodi window" is for a site opened inside the room (the page crops the stream to the site area before publishing); another window or screen is for the separate-window mode.
- Follow a `katsodi://room/<id>`, `katsodi://invite/<token>` or `katsodi://open/<section>` link; a second launch hands the link to the running window.
- Lose the connection: a local screen explains why and offers "Try again".

## Behaviour rules
- One instance, one product window. Closing the window quits the app on Windows and Linux and ends any call or screen share; nothing keeps running in a tray.
- The product window shows only the approved origin. Other `https` links open in the system browser; everything else (`file:`, `javascript:`, other schemes, plain `http`) is refused. `window.open` never creates an app window.
- Downloads are accepted only for files the application itself serves, through the system save dialog. Nothing downloaded is opened or run.
- Screen sharing never starts without a choice in the picker; there is no default or remembered source, and no system audio is attached (it would retransmit the room's own call).
- After the computer wakes, the page re-reads identity and room state before trusting what it had.
- Local drafts stay local. The shell does not make browser data multiplayer and does not sync the browser profile with the app profile.

## Interface and states
The content area is the website, unchanged. Native parts: the normal system window frame; a menu (File, Edit, View, Go, Help) in the page's language with standard shortcuts, zoom, full screen, Back/Forward, Settings, About, "Hardware acceleration" (troubleshooting, needs a restart) and "Copy diagnostic details"; the capture picker; and the recovery screen with five reasons: offline, server unreachable, certificate not verified, load error, page crashed. Local screens follow the page's language and palette and use the same Manrope font. Minimum window size is 320×420, so the phone layout stays reachable.

## Technical implementation
- `desktop/` is a separate package (Electron 45.3.1, Electron Forge 8.0.1, `@electron/fuses` 2.1.3; its own `package-lock.json`). The website's packages are untouched. Sources are compiled by the root `esbuild` (`desktop/scripts/build.mjs`) into `desktop/dist`: `main.js`, two sandboxed preloads and `local/` (two pages). No Next.js server, database or secret is bundled, and there is no loopback service.
- Origin: a production build loads `https://katsodi.watch` only; the constant is compiled in and no file, argument or variable overrides it. A development build accepts a bare loopback origin from `KATSODI_DESKTOP_DEV_ORIGIN` and uses a separate profile ("Katsodi Dev").
- Renderer: `contextIsolation`, `sandbox`, no Node integration (also in workers and subframes), `webSecurity` on, no `<webview>`, background throttling on, DevTools off in production. Session partition `persist:katsodi`; cookies remain HttpOnly and are never read by the main process.
- Bridge (`src/lib/platform/bridge-contract.ts`, protocol 1): `window.katsodiDesktop` has exactly `getCapabilities()` and `onNativeEvent(listener)` (event `resume`). The preload also reports the page's language and palette (two enumerated values). Every IPC handler checks the real sender frame, its window and its document; channels are fixed. The website works without the bridge and treats an unknown protocol as no bridge (`src/lib/platform/desktop.ts`).
- Strings come from the `desktop` section of `src/lib/i18n.ts`, palettes from `src/app/signal.css`, both at build time: no second translation or colour source.
- Fuses in packaged builds: RunAsNode off, `NODE_OPTIONS` off, `--inspect` off, cookie encryption on, ASAR integrity on, load only from ASAR, no extra `file:` privileges.

Commands (from the repository root):

| Command | What it does |
| --- | --- |
| `npm run desktop:install` | Installs the desktop tooling and downloads the Electron runtime |
| `npm run desktop:dev` | Builds the development shell and opens it against an already running server (never starts one) |
| `npm run desktop:build` | Production compile into `desktop/dist` |
| `npm run desktop:typecheck` | Strict TypeScript check of the desktop sources |
| `npm run desktop:test` | Unit tests of the policies (31 tests) |
| `npm run desktop:test:integration` | Real Electron against a local fixture server (9 checks) |
| `npm run desktop:package` | Unpacked app in `desktop/out/Katsodi-win32-x64` |
| `npm run desktop:make` | Squirrel installer in `desktop/out/make` |
| `npm run desktop:verify` | Package allowlist, secret scan, production origin and fuse check |
| `npm run desktop:perf` | Process-tree memory and CPU samples, saved as JSON |

Build machine: Node.js 22.13 or newer (Forge 8 requires it; verified with 26.13.0) and npm. Users install nothing but the app. PowerShell: `$env:KATSODI_DESKTOP_DEV_ORIGIN = "http://localhost:3000"; npm run desktop:dev`.

## Data and access
- Profile: `%APPDATA%\Katsodi` (development: `%APPDATA%\Katsodi Dev`). It holds the Chromium session (cookies, local storage, HTTP cache) and `desktop-settings.json`.
- `desktop-settings.json` (version 1) contains only window bounds, the last language and palette of the page, and the hardware-acceleration switch. It is validated on read, written atomically and debounced. It never contains tokens, cookies, chat, captures or account data.
- Uninstalling through Windows "Installed apps" removes the program; delete `%APPDATA%\Katsodi` to remove the local profile as well.

## Security and privacy
Permission table (`desktop/src/main/permissions.ts`), default deny:

| Permission | Decision |
| --- | --- |
| Microphone | Katsodi's own top frame only |
| Camera | Denied: Katsodi publishes no webcam |
| Screen capture | Katsodi's own top frame; the source only through the picker |
| Speaker selection, clipboard write | Katsodi's own top frame |
| Full screen | Any frame (provider players use it) |
| Geolocation, notifications, clipboard read, MIDI, USB, serial, HID, Bluetooth, DRM key systems, file system, pointer lock, everything else | Denied |

Embedded provider frames are untrusted: they get no preload, no bridge and no device permission. TLS verification is never relaxed; a certificate error shows the recovery screen. Window titles and thumbnails listed by the picker stay on the device and are not logged. Deep links are parsed into a fixed action and bounded identifier; tokens are never logged, and the server checks access again. "Copy diagnostic details" is an explicit action and contains versions and process sizes only. Wider rules: [[docs/en/Security and Privacy]].

## Acceptance criteria
Verified on Windows 11 (build 26200) x64 with Electron 45.3.1 / Chromium of that release, on 2026-11-12:

- `npm run desktop:test`: 31 unit tests pass (origins, navigation, deep links, permissions, settings, window bounds, capture requests, bridge payloads).
- `npm run desktop:test:integration`: 9 checks pass in real Electron against a local fixture origin: hardened preferences and persistent session; the bridge has two functions and the page has no `require`/`process`; a cross-origin frame gets no bridge, microphone or camera; the top frame gets the microphone and never the camera, location or notifications; foreign links go to the (stubbed) system browser and no second window appears; the picker cancels cleanly, and a self-capture can be cropped with `CropTarget`/`cropTo` (Region Capture works in this Electron); a second launch delivers its deep link and exits; the recovery screen appears in the page's language and palette when the server is gone and "Try again" returns; only native preferences are stored.
- `npm run desktop:package` and `npm run desktop:verify` pass: 13 allowlisted files in the archive, production origin, no secret patterns or source maps, all seven fuses as configured.
- The packaged `katsodi.exe` started, loaded `https://katsodi.watch/home` (the page reported its language and palette to the shell) and left no process behind on quit.

Parity ledger. The shell renders the website's own routes, so interface parity is by construction; "verified" below means verified inside the shell.

| Surface | Status in the desktop shell |
| --- | --- |
| Landing, home, overview, legal and credits pages | Same pages. `/home` loaded from production in the packaged app; others not yet opened in the shell |
| Local rooms, saved, fandoms, music catalogue, search, settings | Same pages; not yet verified in the shell |
| Sign-in, sign-up, e-mail confirmation, password reset | Same server flow and cookies; not yet verified live in the shell |
| Shared rooms, chat, queue, moderation, friends, administration | Same server contracts; not yet verified live in the shell |
| Voice | Microphone permission path verified with a fake device; a real LiveKit call in the shell is not yet verified |
| Link Demo, in-app | Picker and cropping verified on a fixture; publishing to LiveKit in the shell is not yet verified |
| Link Demo, separate window | The site opens in the system browser and its window is offered by the picker; without audio in the desktop app (a difference from Chrome) |
| Provider players (YouTube, VK, Vimeo, SoundCloud, Spotify) | Same embeds; playback in the shell not yet verified. Electron has no Widevine by default, so DRM-protected playback is expected to be unavailable |
| Hyperbeam | Not configured in this project; unavailable state unchanged |
| Full screen | Permission allowed; behaviour in the shell not yet verified |
| Deep links | Verified by second launch in development; protocol registration by the installer not yet verified |

Measured resource use (packaged app, `/home` from production, foreground, 25 s warm-up, 41 samples at 1 s; Intel Core Ultra 5 226V, 8 logical cores, 16 GB RAM; standard resource mode):

| Metric | Result | Initial target |
| --- | --- | --- |
| Private working set, whole process tree (4 processes), median / peak | 208.6 / 216.8 MiB | ≤ 250 MiB: met |
| Sum of working sets (double-counts shared pages), median | 469.1 MiB | reported for reference |
| CPU, 100% = one logical core, mean | 6.22% | < 1%: not met |
| Unpacked application size | 357 MiB | reported |
| Processes left after quit | 0 | 0 |

The idle CPU figure misses its target. The cause was not profiled in this pass (the production site did not yet include low-resource mode, and `/home` has moving elements); it is an open item, not an accepted exception.

## Limitations and next steps
- Windows x64 only. No macOS or Linux build was made or tested; nothing is claimed for them.
- The installer and binaries are unsigned local builds: Windows SmartScreen will warn. Signing needs the owner's certificate (set `certificateFile`/`certificatePassword` or `signWithParams` for the Squirrel maker from secrets outside the repository). The installer itself was built but not run here.
- No auto-update: there is no update feed. Updating means installing a newer build. A feed, its signing and publication are owner decisions and were not set up.
- No tray mode, launch at login or native notifications (not needed by current features; the capability reports `nativeNotifications: false`).
- No physical low-end or legacy machine was tested. Electron 45 needs a 64-bit processor and a Windows version Chromium still supports; a 32-bit or roughly 25-year-old computer cannot run this app, and no reduced edition on an outdated engine is offered. Where a maintained browser runs, the website or the installable web app is the option.
- Not measured: startup time, background idle, rooms, voice, demo, soak and leak scenarios; comparison with the PWA; low-resource mode in the shell.
- Live acceptance inside the shell (two accounts, voice, demo, providers) is pending, as it is for the website: [[docs/en/Acceptance Checklist]].

## Related notes
- [[docs/en/Home]]
- [[docs/en/Architecture]]
- [[docs/en/Features/Installable Web App]]
- [[docs/en/Features/Low Resource Mode]]
- [[docs/en/Features/Link Demo]]
- [[docs/en/Features/Voice Chat]]
