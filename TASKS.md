# TASKS — Platform Improvements, Redesign and Legal Pages

Primary implementation checklist, created 2026-11-06 from the owner's specification. Status values: **TODO**, **IN PROGRESS**, **PASS** (implemented and verified, with evidence), **FAIL**, **BLOCKED** (with the reason). A task is marked PASS only after verification.

## Music section improvements — 2026-11-08

Mobile performance follow-up (2026-11-09): minimal Music RSC data projection and direct detail-link slugs implemented and verified. Repeated production measurements: HTML −12.6% (603,601 → 527,457 bytes), compressed transfer −9.3% (81,502 → 73,920), all 150 rows retained. Lint, TypeScript, build and 28 desktop/mobile browser checks passed. Full unit run: 365 passed / one existing queue-mixing order failure; isolated rerun 6/6 passed. No assertion weakened. Lighthouse 80 remains open. See [[docs/Features/Page Loading Performance]].

Spotify readiness follow-up (2026-11-09) — PASS: wait for the embed's actual ready event; cancel pending controllers on close/switch; guard cleanup and late events. Regression covers closing/switching before ready and late ready callbacks with zero playback commands or console errors. Lint, TypeScript, docs, production build, 365 unit tests and 10 focused desktop/mobile playback checks passed; see [[docs/Features/Music Player]].

Follow-up fixes — PASS: Spotify official API play/pause and reported progress; isolated SDK-owned iframe containers prevent destructive YouTube switching from conflicting with React; all five tabs use identical card/search/source structure; artwork-led expandable player and site-waveform favicon implemented. Verified with lint, TypeScript, production build, 365 unit tests and 26 desktop/mobile browser checks (including destructive iframe removal, repeated switching, consent, navigation, accessibility and room compatibility). Screenshots reviewed. See [[docs/Features/Music Player]].

Live provider checks: unmocked Spotify positions 11 → 13 → 15 seconds; YouTube positions 12 → 14 → 16 seconds on the second chart entry; both remained intact on switching, with no page errors. The first YouTube entry stalled, so availability is not guaranteed for every video. Evidence: `.local/music-repair-live.json`, `.local/music-repair-youtube-live.json`. Native widgets remain available; Spotify preview/account restrictions are not bypassed.

Next independent task — completed scoped rendering improvement: off-screen Music cards use `content-visibility: auto` and intrinsic height, while all entries remain searchable and the playback queue stays complete. Desktop/mobile checks assert the deferred-rendering CSS and retained full list. This does not close the broader mobile Lighthouse 80 target. Details: [[docs/Features/Page Loading Performance]].

Requested in the attached Technical Specification — Music Section Improvements; screenshots 1–5 are visual references. See [[docs/Features/Music Discovery]].

- [x] M1 — Rename Top 150 navigation to Music in RU/EN, preserving routes. PASS — translated navigation and existing detail routes verified in desktop/mobile browser tests.
- [x] M2 — Research and verify at least 75 popular SoundCloud tracks. PASS — 100 unique tracks, each with at least one million observed SoundCloud plays, public/full-stream ALLOW metadata, canonical source, working official oEmbed and image response. Evidence and dates are stored per track in `src/data/music-collections.json`; [[docs/Features/Music Player]] explains the method and regional limits.
- [x] M3 — Replace the TikTok presentation with Trending Tracks. PASS — 60 verified songs from six underground/electronic/social artist popular lists, at least 100,000 plays each; includes FEVER and poster boy from the reference. Curated selection, not an official TikTok chart or measured viral-growth ranking.
- [x] M4 — Implement a persistent responsive music player. PASS — official SoundCloud/YouTube adapters support play/pause, seek, volume and ordered auto-advance; queue boundaries and duplicate ended events are tested. Spotify uses its visible native widget with explicit capability limits. Navigation retains the current iframe, current rows are highlighted, media consent remains enforced. Lyrics omitted without a licensed integration.
- [x] M5 — Repair music search styling and unify result spacing/alignment. PASS — one search outline, keyboard focus, consistent track actions and filtering verified on desktop/mobile; wide-screen trending uses two columns.
- [x] M6 — Verify functionality and responsive design. PASS — production build and 24 desktop/mobile browser checks passed, including six new player scenarios, 14 existing music checks and four room-dock checks. Final full unit run: 365 tests / 59 files passed. Lint, TypeScript and documentation validation passed. Desktop/mobile screenshots reviewed. Browser SDK fixtures validate app behavior, not delivery of every provider's audio. A separate real-widget check is recorded below.

Verification notes: the initial development-server batch had cold-compilation timeouts and two punctuation-sensitive expectations; the expectations were corrected, and the final production batch passed 24/24. No authorization or consent rules were weakened. Weekly cloud refresh remains inactive pending the setup in [[docs/Features/Music Activation]].

Live smoke check: the unmocked official SoundCloud widget for XO TOUR Llif3 reported playback positions 12 → 15 → 17 seconds and a playing state, with no failed requests. Evidence: `.local/music-player-live.json` and `.local/music-player-live-desktop.png`. The first attempt timed out in the diagnostic script while waiting for an already-replaced Play button; correcting that diagnostic allowed observation. This is one live track, not an audio guarantee for all 160 entries or all regions.

Contents:

1. [Codebase analysis](#codebase-analysis-2026-11-06)
2. [Questions for the owner](#questions-for-the-owner)
3. [Implementation breakdown and status](#implementation-breakdown-and-status)
4. [Specification as received](#specification-as-received) (verbatim; three parts)

---

## Codebase analysis (2026-11-06)

What exists today, per task, so the work builds on it rather than duplicating it:

| Task | Current state in the code |
|---|---|
| 1 Redesign | Design system v0.5 (Obsidian palette, Manrope only, tokens in `src/app/globals.css`), CSS split into `globals.css` → `brand.css` → `components.css` → `room.css`, with older overridden layers still present. axe WCAG 2.1 AA checks pass on 17 public pages in two themes (`tests/e2e/accessibility.spec.ts`). Spotify-inspired visuals were Phase 1 of the previous redesign. |
| 2 Demo rooms | Hard-coded sample rooms: `sampleRooms()` in `src/lib/rooms.ts`, used by `/rooms` (`src/components/screens.tsx`), Home collections, quick search and `/rooms/[id]`. They are not database rows. Shared rooms created by users live in Supabase. |
| 3.1 Room lifecycle | `rooms.closed_at` exists (manual close). Presence heartbeat `room_presence` (migration 1500) records who is in a room, every ~60 s while the tab is visible. A trusted scheduler already calls `/api/internal/voice-worker` every 30 s; there is no occupancy-based close or delete. |
| 3.2 Annotations | Link Demo (migration 1800, `src/components/demo-stage.tsx`, `demo-overlay.tsx`): hosts draw and place click hints over a live demo via the LiveKit data channel. Marks fade after 8 s, carry no author name, and only hosts can annotate. |
| 4 Bottom menu | `src/components/companion-dock.tsx` shows only when `activeCompanion` is set by pressing Play on a room card or in quick search. Joining a shared room (`/room/[id]`) never sets it, so the dock does not reflect the room the user is in. |
| 5 Fandom links | 150 fandoms; `src/data/fandom-watch-links.json` has 100 entries (Re:ANIME, Kinogo, LiveBall, YouTube). No official streaming services yet. |
| 6 Profile fandoms | `/profile/[username]` loads `user_fandoms` ids and lists favourite fandoms; images and links to fandom pages need checking against the requirement. |
| 7 Top 150 music | Nothing yet. SoundCloud playback via the official Widget API already exists in the room player. |
| 8 Fandom requests | Nothing yet. |
| 9 Admin panel | No admin role. Global moderation page `/moderation` is a design without a backend. |
| 10 Review | Test suites: unit + SQL (251), Playwright desktop and mobile (about 310). |
| Legal pages | None. The footer in `src/components/shell.tsx` has a tagline, image credits and a privacy note. Sign-up has no links to terms or privacy. |

Data the platform actually collects (input for the legal pages): email and password (Supabase Auth), display name, @username, interests/fandoms, avatar and banner images (Supabase Storage, re-encoded, metadata stripped), rooms and memberships and roles, chat messages, stickers and chat images, invites, playback state, queue links, room website links, link-demo state, friend requests and friendships and blocks, XP events and achievements, room presence heartbeats; voice and demo media pass through LiveKit Cloud (not recorded by Katsodi); optional Hyperbeam sessions; browser `localStorage` for theme, language, sidebar, local drafts, saved rooms and followed fandoms; Supabase auth cookies. Third-party embeds: YouTube, Vimeo, SoundCloud, Dailymotion, Rutube, VK and others load their own players and may set their own cookies.

## Questions for the owner

Answers recorded 2026-11-06 (questions 2–5); question 1 is still open.

1. **The third part of the specification is cut off** at "Final Acceptance Criteria … 2. Every p". Please send the rest.
2. **Administrator:** the first registered account with your email. — **Answer:** the owner's email (since 2026-11-12 granted manually in SQL Editor, not stored in the code).
3. **Legal details:** who operates Katsodi (person or company), country/jurisdiction, contact email for support, privacy and copyright requests, minimum user age, data retention periods. — **Answer:** write the documents now with clearly marked placeholders for these facts, listed under *Owner-provided legal details* below for the owner to fill in.
4. **Music Top 150:** which chart defines "most popular". — **Answer:** Spotify's most-streamed songs of all time.
5. **Room deletion after 30 minutes:** deleting a room also deletes its chat history, queue and invites for everyone. — **Answer:** delete fully, as specified.

---

### Owner-provided legal details

To be filled in by the owner before the legal pages are published (placeholders are shown on the pages until then):

- [ ] Operator: name of the person or company running Katsodi.
- [ ] Country / jurisdiction and governing law.
- [ ] Postal address, if required in that jurisdiction.
- [ ] Contact emails: support, privacy requests, copyright notices.
- [ ] Minimum user age.
- [ ] Data retention periods (accounts, messages, images, logs).
- [ ] Effective date of the first published version.
- [ ] Professional legal review before publication.

## Implementation breakdown and status

### Task 1 — Complete UI/UX redesign — PARTIAL: design system applied and verified; mobile performance FAIL (pre-existing); CSS layers consolidated (2026-11-07)
Design system "Katsodi Signal": `src/app/signal.css` (loaded last), documented in [[docs/Design System]] (RU/EN, with the research table and the previous v0.5 notes kept as history). Before/after review page: `.local/redesign/index.html` (`node scripts/redesign-compare.mjs`).

**Research findings (1.1).** Sources are third-party analyses and user feedback; none of the three services publishes its design documentation.
- *Discord voice:* per-person tiles with a green speaking ring driven by smoothed volume; mute/deafen badges; users criticise equal large tiles that waste space on avatars when video is off. → Katsodi keeps the speaking ring (success colour, soft glow) and state badges, as a compact roster of cards across the panel; each person's colour is the same in voice, chat and demo annotations.
- *Twitch chat:* a flat, dense list without bubbles; a coloured name only; heavy image badges; bright names that lose contrast on dark; optional timestamps; the name repeats on every line. → Katsodi chat: flat lines, author colours from the annotation palette (mixed toward the text colour on the light theme to keep 4.5:1), short text role chips (Owner/Moderator), muted but always readable times (11 px instead of 8 px), and its own grouping of consecutive messages from one person within 5 minutes. Own messages get an accent edge instead of right-aligned bubbles.
- *Spotify visuals:* an achromatic dark base (#121212/#181818), colour from artwork, one accent, pill buttons and chips. → Katsodi keeps colour-from-content but moves the canvas to cool ink (#0c0e11) with a faint dot field, keeps its own lime accent, and replaces pills with 10 px soft squares; selection is a glowing "signal" line, not a white fill.
- *Originality:* no reference platform's colours, shapes or layouts are copied; the shared motif is the signal line. Final judgement on originality needs the owner's review (spec section 6).

- [x] 1.1 Research documented above and in [[docs/Design System]]. PASS
- [x] 1.2 Before screenshots: 39 screens × 360/390/768/1280/1920 = 195 images in `.local/redesign/before` (`CAPTURE_DIR=… npx playwright test -g capture --project=desktop`; public pages, local room, shared room chat and voice, and signed-in fixture screens: profile, friends, account edit, create, admin, fandom request). PASS
- [x] 1.3 Tokens (shape, type scale, signal colours, motion), component rules and states documented. PASS
- [x] 1.4 Applied to every page through the root layout (one stylesheet, all routes); overridden CSS layers removed and tokens in one place. PASS (2026-11-07) — details: [[docs/Design System]], "Stylesheet structure".
  - *Removed:* 236 declarations that a later rule with the exact same selector, at-rule context and property (or a covering shorthand) always overrode — globals 144, components 39, brand 28, room 24, signal 1 — including every one `signal.css` overrode (buttons, chips and `--radius-pill`, search box, sidebar active state, room tabs, chat lines, voice roster, admin tabs and filters, dock return button, eyebrow/section labels, notices, page heroes). No selector now sets the same property twice in one context (re-checked after the change: 0).
  - *Tokens in one place:* all 14 token blocks (`globals.css` ×9, `components.css` ×2, `signal.css` ×3) moved into the Tokens section of `signal.css`; the Signal Obsidian palette merged into the one Obsidian block; dead token values dropped (`--radius-pill: 9999px`, `--aura-color-*` rgba, Obsidian `--brand-accent/--brand-ink`). Only Tailwind's `@theme inline` stays in `globals.css` (it must follow `@import "tailwindcss"`). Five whole rules (`body`, `.button-primary:hover`, `.chip:hover`, `.room-dock .dock-return`, the duplicate `.voice-people`) were merged into their `signal.css` rule; the remaining older component rules keep layout only, because moving them would pass equal-specificity rules on the same element (`.button-small`, `.notice.error`, the phone `.dock-return`).
  - *Line counts:* `globals.css` 5,310 → 4,929; `brand.css` 2,296 → 2,251; `components.css` 1,063 → 987; `room.css` 1,073 → 1,041; `signal.css` 639 → 796; total 10,381 → 10,004.
  - *No visual change:* captured before and after (`CAPTURE_STYLES=1 CAPTURE_DIR=.local/redesign/consolidate-{before,after} … -g capture --project=desktop --workers=1`), now also writing every element's computed style (incl. `::before/::after`); compared with `node scripts/redesign-compare.mjs <before> <after>`. 38 screens × 5 widths: **0 computed-property differences** on all elements present in both runs (80 elements exist in only one run: the `/verify-email` form, which also differs between two runs of unchanged code). A per-theme pass (Obsidian, Ember, Aurora, Violet, Paper, System light and dark × settings, home, rooms, fandoms, login at 1280 px): **0 differences**. Pixels: 152/190 screenshots identical; the 38 that differ were inspected and are run-to-run noise with identical computed styles — lazy images not yet loaded (credits, fandoms, fandom detail, home slideshow), the Next.js dev indicator, 1–90 px antialiasing on the sidebar toggle. Two runs of the *unchanged* code differ in 21 of 35 theme screenshots the same way. `music-track` could not be captured either before or after (pre-existing: the embedded player keeps the network busy past the 180 s timeout).
  - *Checks:* lint, typecheck, unit (291/291), docs:check; full e2e `npx playwright test` against this worktree's dev server: 362 passed, 127 skipped (capture and opt-in), 3 timing failures on the cold server (a11y obsidian home timeout; two link clicks that did not navigate within 15 s) — the three spec files rerun on the warm server: 86/86 passed, including axe in Obsidian and Paper on desktop and mobile.
- [x] 1.5 Room: Twitch-style chat with grouping and role chips; Discord-style voice roster with speaking ring and states; shared soft-square controls. PASS — chat and voice e2e (`chat-design.spec.ts`) pass; screenshots `room-chat-*`, `room-voice-*`.
- [x] 1.6 After screenshots (195 in `.local/redesign/after`), side-by-side page, personal inspection, fixes, re-inspection. Issues found and fixed: the Obsidian palette overriding the Paper theme (17 axe contrast failures → 0); heading labels rendered as large uppercase headings on the profile; the admin tabs still selected with a solid fill; the dock's icon-only return button showing an empty box on phones. PASS
- [ ] 1.7 Measurable criteria — see the table below. PARTIAL

| Criterion | Status | Evidence |
|---|---|---|
| 1 Research | PASS | Findings and influence above; originality needs owner review |
| 2 Visual consistency | PASS | One layer for buttons, inputs, chips, tabs, navigation, surfaces, notices, chat and voice; every former pill (`--radius-pill`) is the 10 px control shape; personally inspected Home, rooms, network, settings, sign-up, music, profile, admin, dock and room at ≥1 width each — the remaining 195 screenshots were measured, not all viewed individually |
| 3 Layout (360/390/768/1280/1920) | PASS | 0 horizontal overflow on all 31 public screens × 5 widths (`overflow-*.json`); fixture screens (chat, voice, profile, admin…) checked visually; room chat/voice usable at 390 px |
| 4 Typography and contrast | PASS | One family (Manrope); defined scale; axe `color-contrast` 0 violations on 17 pages in Obsidian and Paper (desktop + mobile), legal and music pages, room and signed-in screens; Lighthouse accessibility 96–100; 200 % zoom (640 CSS px): 0 overflow on 29 pages, 0 console errors |
| 5 Interactions | PASS | Full e2e suite: 363 passed, 0 functional failures (2 legal tests timed out under load and passed 12/12 on rerun; now marked slow); focus ring on every control; states for hover/focus/active/disabled/busy |
| 6 Identity and originality | PASS (pending owner review) | Decisions in [[docs/Design System]]; before/after page for review |
| 7 Performance — accessibility ≥ 90 | PASS | Lighthouse mobile, production build: home 96; fandoms, music, track, terms, signup, rooms 100 (re-checked 2026-11-07 after the performance changes, 3 runs each) |
| 7 Performance — performance ≥ 80 on mobile | **FAIL — documented exception (2026-11-07)** | Work done: per-screen client modules (the root `not-found` had pulled the whole `screens.tsx` into every route), quick search and the companion dock loaded on demand, the consent banner server-rendered, Top 150 data passed as props, Manrope self-hosted and preloaded with a metric-matched fallback. JavaScript executed per page (gzip, excluding the `noModule` polyfill): /terms 254 → 196 KB, /home 254 → 222 KB, /music and track pages 273 → 199 KB. CLS from the late banner and font swap is gone (/music 0.141, track 0.160, /signup 0.186, /terms 0.124 → 0–0.035). Lighthouse 12 mobile, production build, 3 runs each, median (range): home 50 (36–52), fandoms 53 (48–60), music 67 (51–77), track 53 (42–61), terms 64 (58–64), signup 67 (65–71), rooms 61 (58–67); the baseline build in the same session scored home 38, fandoms 51, music 30, track 46, terms 46, signup 46, rooms 64. Remaining gap is total blocking time (0.7–9.5 s) and an LCP that waits for script evaluation; during the runs the machine was at 59–93 % CPU from other processes (benchmark index 886–2995), and Lighthouse multiplies that by its simulated 4× slowdown. A Playwright probe at 4× CPU throttling measured about 1.0 s of total main-thread work on /home and 0.6 s on /terms. Next levers: load the English messages only when chosen (~14 KB gzip), keep zod out of the WorkspaceProvider (~14 KB), a cookie-based locale so static content can be server components; re-measure on an idle machine. External embeds were not part of the measured pages |
| 7 Reduced motion, no new console errors | PASS | All new transitions and the live pulse are off with `prefers-reduced-motion`; 0 console errors across 29 pages |
| 8 Functionality preservation | PASS | 363 e2e + 291 unit pass; room creation, chat, player, voice, demos, profile, admin permissions covered by existing specs |
| 9 Final visual audit | PASS | Before/after captured, inspected, defects fixed, re-captured and re-inspected |

### Task 2 — Remove irrelevant demo rooms — PASS (2026-11-06)
- [x] 2.1 Removed `sampleRooms()` (two video and two music sample rooms) from `/rooms`, Home, quick search and the local room page; users' local rooms and shared rooms untouched. PASS
- [x] 2.2 Home's music section lists the user's own music rooms, or a "Create a music room" link; `/rooms` shows its existing empty state. PASS
- [x] 2.3 Database: no migration seeds rooms (the only inserts are inside `create_room`), so every database room was created by a user; nothing deleted. PASS
- [x] 2.4 `tests/e2e/no-demo-rooms.spec.ts` checks the catalogue, Home, quick search and the old addresses (2/2 pass); six older tests now seed real local rooms via `tests/e2e/local-rooms.ts` (all pass; two link-click tests were flaky under load and passed 6/6 on repeat). Unit 251/251. PASS

### Task 3 — Room lifecycle and annotation visibility — PASS in tests; live checks pending (2026-11-06)
- [x] 3.1.1 Occupancy: the room page pings every 30 s in any tab state (the XP heartbeat skips hidden tabs, so a separate signal); `rooms.last_occupied_at` (migration 2000). PASS
- [x] 3.1.2 `inactive_at` after 10 empty minutes; cleared by the next ping; catalogue shows "Inactive · deleted in N min". PASS
- [x] 3.1.3 Deleted after 30 empty minutes with all room data (cascade), chat images queued and removed from Storage, voice/demo access revoked. PASS
- [x] 3.1.4 `POST /api/internal/rooms-lifecycle` from the trusted scheduler (`npm run voice:worker` locally). Tests: 5 SQL (simulated clocks), 5 unit (runner, endpoint), e2e (hidden-tab pings with a fake clock, countdown badge). Live check after migration 2000: TODO. PASS (tests)
- [x] 3.2.1 Zoom research: toolbar (pen, highlighter, arrow/shapes, text, stamps, spotlight, eraser, undo), persistent until cleared, host permission for participants, annotator names, clear mine/all. Findings and mapping in [[docs/en/Features/Link Demo]]. PASS
- [x] 3.2.2 All those tools; persistent marks; colour and name per person, legend; undo, eraser (own only), clear mine, clear all (hosts). PASS
- [x] 3.2.3 "Annotations for everyone" (migration 2100, `set_demo_annotations`); members' LiveKit tokens get data rights only while open; clients ignore marks from others otherwise. PASS
- [x] 3.2.4 Dark under-stroke and edges; snapshot from the presenter to late joiners; authorship from LiveKit identity. PASS
- [x] 3.2.5 Unit (`annotations.test.ts`: rules, ownership, trusted clear/snapshot, validation), SQL (host-only switch, reset on new demo), unit (token rights), e2e (24 demo tests: tools, persistence with fake clock, names, eraser ownership, open-to-everyone, member annotating, late-join snapshot). Live two-account check: TODO. PASS (tests)

### Task 4 — Bottom room menu — PASS (2026-11-07)
- [x] 4.1 Root cause: the dock was driven only by pressing Play on a room card or search result (in-memory state); joining a shared room never set it, and any full page load (invite link, address bar, reload) lost it. PASS
- [x] 4.2 New persisted `currentRoom` in `workspace-provider.tsx` (`localStorage` key `katsodi.currentRoom`), set when a joined shared room or a local room opens; the dock (`companion-dock.tsx`) shows the room on every page with "You're in this room" / "Back to room" and Hide. Voice state is not shown: voice disconnects when leaving the room page (see suggested improvements in Task 10). PASS
- [x] 4.3 Survives navigation and reloads; cleared when the user leaves, is removed or the room closes; Hide sticks until the next room is entered. PASS
- [x] 4.4 e2e: `tests/e2e/room-dock.spec.ts` (enter, other pages, reload, back, hide, 360 px) and "joining a shared room sets the room dock; removal clears it" in `chat-design.spec.ts` — 8/8 pass with the older Play-dock test. Restyled with Task 1 (soft-square controls, centred icon-only return button on phones; `.local/redesign/room-dock-after-*.png`), dock spec 12/12 on repeat. PASS

### Task 5 — Official streaming links for fandoms — PASS (131 of 150 fandoms)
- [x] 5.1 Researched official services for all 150 fandoms (`scripts/official-links-candidates.json`). PASS — 19 fandoms have no verifiable official link and show none: cinema-11, 20–24; games-4, 5, 6, 10; books-8, 15, 18, 23; sport-3, 6, 10, 17, 21 (geo-blocks, 404s, Cloudflare or Nintendo refusing automated checks; FIFA+ moved to DAZN).
- [x] 5.2 Stored in `src/data/fandom-official-links.json`; `fandom-watch-links.json` untouched; shown as the "Official / Официально" block with a region note. PASS — e2e `fandom-connections.spec.ts` (desktop + mobile) sees the block and the old link on Dune; axe passes on fandom-detail in both themes.
- [x] 5.3 `node scripts/check-official-links.mjs --write` on 2026-11-06: 133/133 links verified (HTTP 200 + matching title/og:title/channel name), check date stored per link. Crunchyroll series pages are behind Cloudflare, which we do not bypass, so anime use the official `crunchyroll.com/search?q=` page (address shape checked only). PASS — `tests/unit/official-links.test.ts` (4 tests).

### Task 6 — Fandoms on user profiles — PASS (2026-11-07)
- [x] 6.1 The profile page shows the user's fandoms as poster cards (image, name, category, count) in a full-width section; each opens `/fandoms/[id]`. Posters reuse the 480 px thumbnails. PASS
- [x] 6.2 Tested in `brand-states.spec.ts` (links, visible loaded images, names, axe WCAG AA on the profile): 8/8 pass, screenshots `.local/profile-fandoms-*.png`. Final look follows Task 1 (label-size section heading, signal hairlines; `.local/redesign/after/signed-in-profile-*.png`). PASS

### Task 7 — Top 150 music tracks — PASS (SoundCloud partial: 73 of 150)
- [x] 7.1 Ranking from kworb.net/spotify/songs.html (Spotify stream counts), checked 2026-11-06; `scripts/build-music-chart.mjs` rebuilds it. PASS — 150/150 rows.
- [x] 7.2 `src/data/music-top150.json`: Spotify track id matched on the lead artist's kworb page by title and identical stream count; title, artists, release date and 300/640 covers from Spotify's official embed page (title must match). The description is generated from those verified facts in RU/EN, with no invented text. PASS for Spotify (150/150). SoundCloud PARTIAL: 73 tracks found on the artist's own account (oEmbed: account name = artist, title matches; all 73 reviewed by hand, e.g. theweeknd, eminemofficial, oasisofficial); the other 77 (e.g. Drake, Taylor Swift) get a labelled "Search on SoundCloud" link instead of an unverified upload.
- [x] 7.3 `/music` (search by title/artist) and `/music/[slug]` (cover, facts, description, Spotify + SoundCloud links, official Spotify embed, SoundCloud widget when matched, previous/next). Unknown slug is a real 404. Sidebar "Top 150" + Home music link. PASS — both players seen loading live at 360 px with no horizontal scroll; Spotify plays a 30-second preview without sign-in, which the page states.
- [x] 7.4 `tests/unit/music.test.ts` (7) and `tests/e2e/music.spec.ts` (5 × desktop/mobile: list, filter, track page, next, SoundCloud player vs search, 404, axe on both pages, no overflow). PASS.

### Task 8 — Fandom request system — PASS (2026-11-06)
- [x] 8.1 Migration 1900: `fandom_requests`, `request_fandom` (duplicate checks, 5 waiting, 1 per 30 s), RLS own rows. PASS
- [x] 8.2 `/fandoms/request` form and "My requests" with Waiting / Approved (link) / Rejected (comment); catalogue link "Can't find a fandom?". PASS
- [x] 8.3 Approval creates a `community-…` fandom in `public.fandoms` (catalogue, fandom page, follows, rooms, profiles); rejection keeps the comment; no double decisions. PASS
- [x] 8.4 `admin-database.test.ts` (5 SQL tests), `brand-states.spec.ts` (form, statuses, axe), `admin-access.spec.ts` (catalogue link): all pass. Live: migration 1900 applied on the owner's Supabase on 2026-11-06. PASS

### Task 9 — Administrator panel — PASS (2026-11-06)
- [x] 9.1 `admins` table granted once by the owner in SQL Editor (migration 1900 grants nobody automatically since 2026-11-12); `is_admin()`; no client access to the table; `/admin` answers 404 in the proxy for everyone else, and the page and functions re-check. PASS
- [x] 9.2 Accounts: name, @username, email (admin only), confirmed, registered, admin badge (`admin_accounts()`). PASS
- [x] 9.3 Fandoms: all 150 + community, source, followers; Requests: waiting/all with approve and reject plus comment. PASS
- [x] 9.4 Music section lists all 150 entries (rank, cover, title link, Spotify id, SoundCloud verified/search only, check date); read-only because the data is script-built. PASS — brand-states admin test (desktop + mobile) and its axe check.
- [x] 9.6 Live: the owner applied migration 1900 and confirmed `/admin` works with their account (2026-11-06). PASS
- [x] 9.5 `/admin` with four tabbed sections and counts; tests: SQL (admin selection, forbidden calls), e2e (tabs, approve/reject calls, axe WCAG AA, visitors get 404). Final look follows Task 1. PASS

### Task 10 — Full platform review — PASS; live owner checks BLOCKED (2026-11-07)
- [x] 10.1 31 routes requested (all 200; `/admin` for a visitor and an unknown address are real 404s); 211 unique internal links on them, 0 broken; 39 screens at five widths before/after (`.local/redesign/index.html`); 29 pages at 200 % zoom with 0 overflow and 0 console errors; browser-pane walkthrough. PASS
- [x] 10.2 Lifecycle (SQL with simulated clocks, endpoint, badge e2e), annotations (24 demo e2e), dock (12/12 on repeat), official links, profile fandoms, Top 150 and playback, fandom requests with approval/rejection, admin permissions — all covered by passing tests. PASS (tests). Live checks with real accounts (lifecycle at 10/30 min, annotations between two accounts, VK over HTTPS): BLOCKED — need the owner's accounts and services; steps in [[docs/Acceptance Checklist]].
- [x] 10.3 Fixed: the shared browser loaded Hyperbeam without the embedded-media consent (now gated, Cookie Policy corrected, new e2e test); the consent banner's buttons ran off very narrow screens (now wrap); docs check, ESLint and TypeScript scanned agent worktrees under `.claude/` (now excluded). Remaining issues and suggestions documented in [[docs/Final Report]]. No regressions: lint, typecheck, docs check and production build pass; unit 291/291; e2e 328 passed in a run that overlapped another session's full suite on the same machine, and all 16 timed-out tests passed on rerun (39/39 with `--last-failed`). PASS
- [x] 10.4 Final report: [[docs/Final Report]] (RU/EN). PASS

### Legal pages (third part) — PASS as a draft; publication BLOCKED on owner details and legal review
- [x] L1 Data inventory (above) checked against the code: cookies (Supabase `sb-…-auth-token`, 400-day default), local/session storage keys, embeds, LiveKit identity (account id only), no analytics, no account deletion or report button. Owner-provided details listed above and wired to `src/content/legal/owner.ts`. PASS
- [x] L2–L8 `/terms` (15 sections) · `/privacy` (19) · `/cookies` (storage table + preferences) · `/guidelines` (13) · `/copyright` (7) · `/contact` · `/about`, English text, owner facts as visible placeholders, no invented contacts or compliance claims. PASS — `tests/unit/legal.test.ts`.
- [x] L4 consent: third-party players and room websites are non-essential (they set their own cookies), so a banner with equal "Necessary only / Allow players" buttons, per-player "Load once / Always allow", and preferences on `/cookies#preferences`. PASS — `tests/e2e/legal.spec.ts` (desktop + mobile).
- [x] L9 Global footer with all seven links on every page (compact on sign-in pages); sign-up has a required unticked Terms checkbox with links, enforced on the server, accepted versions stored in the account metadata. PASS — e2e + `server-actions.test.ts`.
- [x] L10 Layout: hero with version, effective and updated dates, draft notice, sticky contents, anchors, related documents; underlined links; responsive. PASS — axe on /terms, /privacy, /cookies, /contact, /signup; no horizontal scroll; screenshot `.local/legal-privacy-*.png`.
- [x] L11 One file per document with stable section ids and routes; `versions.ts` for accepted versions; no historical versions or approval dates invented. Renewed acceptance after a material change is NOT built yet (documented). PASS
- [ ] L12 BLOCKED (owner): fill in `owner.ts`, professional legal review, then the Russian translation and the effective date. Verification itself (checks above) PASS.

---

## Specification as received

The owner's specification, copied exactly as received in three parts. The third part ended mid-sentence; the cut is marked.

### Part 1

Technical Specification — Platform Improvements and New Features
Initial Instructions for the AI Agent
Before starting any implementation, create a Markdown file named `TASKS.md` in the project directory.
Write the entire technical specification into this file, including every task, requirement, and subtask listed below.
Requirements:

1. Analyze the existing project structure and functionality.
2. Create `TASKS.md` containing the complete technical specification.
3. Break down every task into clear, actionable implementation steps.
4. Do not omit, simplify, or change any of the original requirements.
5. Use the Markdown file as the primary implementation checklist.
6. Mark tasks as completed only after they have been fully implemented and verified.
7. Keep the file updated throughout development.
8. Complete all tasks listed below, not just the documentation.

Task 1 — Complete UI/UX Redesign
The current design looks generic and lacks a distinctive visual identity.
Completely redesign the platform to achieve an original, minimalist, modern appearance with subtle futuristic elements where appropriate.
Requirements

1. Conduct comprehensive design research on the following platforms:
   * Discord: Focus on voice calls and communication interfaces.
   * Twitch: Focus on team chat and chat interactions.
   * Spotify: Focus on the overall visual design and interface aesthetics.
2. Analyze the existing design across all pages and components.
3. Identify and replace generic, outdated, or visually inconsistent elements.
4. Establish a consistent visual identity throughout the entire platform.
5. Ensure the new design is minimalist, recognizable, and visually cohesive.
6. Introduce subtle futuristic design elements where they improve the overall appearance.
7. Ensure that all redesigned components work correctly with the existing functionality.

Expected result: A complete visual redesign with a unique identity, rather than a generic interface or a direct copy of existing platforms.
Task 2 — Remove Irrelevant Demo Rooms
Remove all irrelevant demo rooms currently present on the platform.
Requirements

1. Review the existing rooms.
2. Identify rooms created exclusively for demonstration or testing purposes that are no longer relevant.
3. Remove those demo rooms.
4. Ensure that legitimate user-created rooms are not affected.
5. Verify that removed demo rooms no longer appear anywhere on the platform.

Task 3 — Room Lifecycle Management and Screen Annotation Visibility
3.1. Automatic Room Inactivity and Deletion
Implement automatic room lifecycle management based on occupancy.
Requirements:

1. When a room has no participants for 10 minutes, automatically mark it as inactive.
2. When a room has no participants for 30 minutes, automatically delete it.
3. Both timers must be based on the room being continuously unoccupied.
4. Ensure that occupancy detection functions correctly.
5. Apply these rules to the existing room system.

3.2. Screen Sharing Annotation Visibility
Improve the screen-sharing experience.
When a user writes, draws, or makes annotations on a shared screen, those annotations must be visible and highlighted for other participants.
Requirements:

1. Research how screen annotations and highlighting work in Zoom.
2. Implement similar functionality within the existing screen-sharing system.
3. Ensure that annotations made by one participant are visible to other participants.
4. Synchronize annotation visibility between users.
5. Make annotations clearly distinguishable from the shared screen content.
6. Ensure that the functionality works during active screen-sharing sessions.

Expected result: Users can see synchronized, clearly highlighted annotations on shared screens, similar to Zoom.
Task 4 — Fix and Update the Bottom Room Menu
The bottom menu that should appear when a user enters a room currently has a visibility issue.
Specifically, when a user joins a room while viewing another page, the menu does not appear correctly.
Requirements

1. Examine the existing bottom room menu implementation.
2. Identify why the menu is not displayed when a room is entered from another page.
3. Fix this behavior.
4. Ensure that the menu becomes visible whenever a user enters a room, regardless of their current page.
5. Verify that the menu behaves consistently during navigation between pages.
6. Update the menu's appearance to match the redesigned platform.

Expected result: The bottom room menu appears correctly when entering a room from any page and remains consistent with the new design.
Task 5 — Add Official Streaming Links to Fandoms
Update the existing fandom system by adding links to official platforms where users can watch the corresponding content.
These links must be added in addition to the links that already exist, without removing or replacing them.
Requirements

1. Review all existing fandoms.
2. Find official streaming or viewing platforms associated with each relevant fandom.
3. Add links to those official resources.
4. Preserve all existing fandom links.
5. Ensure that the links lead to the appropriate content whenever possible.
6. Verify that the links are valid and relevant.

Examples

* Game of Thrones: HBO
* One Piece: Crunchyroll

Apply this approach to all relevant fandoms.
Expected result: Fandom pages provide users with additional links to official platforms where the related content can be watched.
Task 6 — Display Fandoms on User Profiles
Update the existing user profile interface to display fandoms associated with the user.
Requirements

1. Add a dedicated fandom display to user profiles.
2. Display an image for each fandom.
3. Display the fandom name.
4. Make each fandom item clickable.
5. Clicking a fandom must navigate to its corresponding fandom page.
6. Integrate the fandom display naturally into the existing profile layout.
7. Ensure that the design matches the platform's updated visual identity.

Expected result: User profiles visually display their fandoms, including images and direct links to the corresponding fandom pages.
Task 7 — Create a Top 150 Music Tracks Page
Create a separate page featuring the 150 most popular music tracks.
Requirements

1. Create a dedicated page for the Top 150 tracks.
2. Research and identify the 150 most popular tracks.
3. Display each track with:
   * Track title
   * Artist
   * Cover image
   * Description
   * SoundCloud link
   * Spotify link
4. Create an individual page for each track.
5. Allow users to play the track directly from its individual page.
6. Integrate playback using supported media embedding methods.
7. Ensure that links to SoundCloud and Spotify correspond to the correct tracks.
8. Make the design consistent with the redesigned platform.

Track Page
Each individual track page must contain:

* Track information
* Cover image
* Description
* SoundCloud link
* Spotify link
* Embedded playback functionality

Expected result: A dedicated Top 150 music section with individual track pages, relevant information, external streaming links, and playable media.
Task 8 — Fandom Request System
Allow users to request the addition of new fandoms to the platform.
Requirements

1. Implement an interface through which users can submit fandom requests.
2. Allow users to specify the fandom they want added.
3. Store submitted requests.
4. Make requests accessible to administrators.
5. Support approval and rejection of requests.
6. Ensure that approved fandoms can be added to the existing fandom system.
7. Ensure that rejected requests are handled correctly.

Expected result: Users can request new fandoms, and administrators can review and approve or reject those requests.
Task 9 — Administrator Panel
Create a separate administrator panel for the very first registered user account, associated with my email address.
9.1. Administrator Access

1. Identify the first registered user account.
2. Assign administrator access to that account.
3. Ensure that administrator functionality is accessible only to authorized accounts.
4. Protect the administrator panel from unauthorized access.

9.2. Account Management
Provide administrators with the ability to view all registered accounts.
9.3. Fandom Management
Provide administrators with the ability to:

* View all fandoms.
* View submitted fandom requests.
* Approve fandom requests.
* Reject fandom requests.

9.4. Music Management
Provide administrators with the ability to view all music entries available on the platform.
9.5. Administrator Panel Design

1. Create a dedicated administrator interface.
2. Organize accounts, fandoms, fandom requests, and music into clearly defined sections.
3. Ensure that the panel is easy to navigate.
4. Make its visual appearance consistent with the redesigned platform.

Expected result: The first registered account has access to a functional administrator panel containing account, fandom, request approval, and music management sections.
Task 10 — Full Platform Testing and Bug Review
After implementing the tasks above, conduct a complete review of the platform.
Requirements

1. Personally inspect every available page of the platform.
2. Test the functionality of each page.
3. Look for potential bugs, broken interactions, and visual inconsistencies.
4. Verify navigation between pages.
5. Test the updated room lifecycle system.
6. Test screen annotation synchronization.
7. Verify the bottom room menu visibility.
8. Check fandom links and profile fandom displays.
9. Test the Top 150 music page and individual track playback.
10. Test fandom request submissions and administrator approval/rejection.
11. Verify administrator access permissions.
12. Check that the redesign has been consistently applied throughout the platform.
13. Identify any additional improvements that could enhance usability, performance, or overall experience.

Final Review
After completing the review:

* Fix any bugs directly related to the implemented tasks.
* Document any additional issues discovered.
* Suggest improvements where appropriate.
* Verify that existing functionality has not been broken.

Final Instructions for the AI Agent

1. First, create `TASKS.md` and write this entire specification into it.
2. Analyze the existing codebase before making changes.
3. Break each task into actionable subtasks inside the Markdown file.
4. Implement all ten tasks.
5. Do not skip any requirements.
6. Preserve existing functionality unless a task explicitly requires modifying or removing it.
7. Keep the implementation consistent with the new overall design.
8. Verify each completed task before marking it as finished in `TASKS.md`.
9. Perform a complete platform review after implementation.
10. Provide a final report describing completed tasks, discovered bugs, fixes, and suggested improvements.

The goal is to fully implement the requested changes, not merely create a plan or documentation.

### Part 2

# Task 1 — Measurable UI/UX Redesign Acceptance Criteria

The redesign must not be considered complete simply because the interface looks different from the previous version.

The AI agent must verify the implementation against the following measurable criteria before marking the task as completed.

## 1. Design Research

- [ ] Complete a visual and functional analysis of Discord's voice communication interface.
- [ ] Complete a visual and functional analysis of Twitch's chat interface.
- [ ] Complete a visual analysis of Spotify's overall interface.
- [ ] Document the relevant findings from all three platforms in `TASKS.md`.
- [ ] Explain how the research influenced the final design.
- [ ] Ensure that the final design does not directly copy any of these platforms.

**Acceptance:** All three platforms have been researched, findings are documented, and the final design demonstrates a consistent, original visual direction.

## 2. Visual Consistency

- [ ] 100% of existing pages use the updated design system.
- [ ] 100% of navigation components use consistent styling.
- [ ] All buttons, inputs, dropdowns, menus, and modals follow the same visual rules.
- [ ] Typography uses a consistent font family and hierarchy.
- [ ] Backgrounds, borders, spacing, and corner radii are consistent.
- [ ] No outdated interface elements remain.
- [ ] No page appears visually disconnected from the rest of the platform.

**Acceptance:** A complete visual audit finds zero unexplained inconsistencies between equivalent components.

## 3. Layout and Responsiveness

Test the redesigned interface at the following viewport widths:

| Device | Viewport width |
|---|---|
| Small mobile | 360px |
| Mobile | 390px |
| Tablet | 768px |
| Laptop | 1280px |
| Desktop | 1920px |

**Requirements:**

- [ ] All primary pages display correctly at every tested width.
- [ ] No unintended horizontal scrolling occurs.
- [ ] No text overlaps other interface elements.
- [ ] No buttons or interactive elements become inaccessible.
- [ ] Navigation remains functional on all tested screen sizes.
- [ ] Room interfaces adapt correctly to different viewport sizes.
- [ ] Chat and voice controls remain usable on mobile devices.

**Acceptance:** Zero critical layout defects across all tested viewport sizes.

## 4. Typography and Readability

- [ ] One consistent primary font family is used throughout the platform.
- [ ] Headings, descriptions, navigation, and UI labels follow a defined typography hierarchy.
- [ ] Normal text meets a minimum contrast ratio of 4.5:1.
- [ ] Large text meets a minimum contrast ratio of 3:1.
- [ ] Text remains readable at 200% browser zoom.
- [ ] Text truncation does not hide information necessary to operate the interface.

**Acceptance:** Typography is consistent across every page, and text meets the specified readability requirements.

## 5. Usability and Interactions

- [ ] Every visible interactive element performs its intended action.
- [ ] Every navigation link leads to the correct destination.
- [ ] All modal windows open and close correctly.
- [ ] Dropdowns and contextual menus function correctly.
- [ ] Hover, focus, active, disabled, and loading states are visually distinguishable.
- [ ] Keyboard navigation works for essential interactions.
- [ ] No invisible or overlapping elements block user interaction.
- [ ] Important controls remain discoverable and accessible.

**Acceptance:** 100% of tested critical user interactions function correctly, with zero broken navigation elements.

## 6. Visual Identity and Originality

The platform must feel original, minimalist, modern, and subtly futuristic rather than like a generic template.

- [ ] The interface uses one clearly defined visual identity.
- [ ] Discord-inspired communication components are adapted to the platform's design.
- [ ] Twitch-inspired chat components follow the same visual identity.
- [ ] Spotify-inspired styling is consistently integrated throughout the platform.
- [ ] Futuristic elements are applied selectively rather than excessively.
- [ ] No unrelated visual styles are mixed within the same interface.
- [ ] The final result does not visually replicate any reference platform.

**Acceptance:** The agent documents the design decisions and provides before-and-after screenshots of all redesigned pages for review.

Originality and visual quality require final human review; automated testing alone cannot establish these qualities.

## 7. Performance

The redesign must not introduce significant performance regressions.

**Proposed targets:**

- [ ] Lighthouse Accessibility score: 90 or higher on representative pages.
- [ ] Lighthouse Performance score: 80 or higher on representative mobile pages.
- [ ] No noticeable interface freezing during normal navigation.
- [ ] No unnecessary animations that significantly affect performance.
- [ ] No new persistent console errors caused by redesigned components.
- [ ] Reduced-motion preferences are respected.

Any exceptions caused by external media embeds must be documented separately.

**Acceptance:** Performance targets are met or documented exceptions are reported for review.

## 8. Functionality Preservation

- [ ] All previously working features remain operational.
- [ ] Room creation and navigation work correctly.
- [ ] Chat functionality remains operational.
- [ ] Media player functionality remains operational.
- [ ] Profile functionality remains operational.
- [ ] Existing permissions continue to work correctly.
- [ ] No critical functionality is removed unintentionally during redesign.

**Acceptance:** Zero critical or high-severity functional regressions caused by the redesign.

## 9. Final Visual Audit

The AI agent must personally inspect the implemented interface rather than relying only on code analysis.

### Required Verification

1. Open every available page in a browser.
2. Capture screenshots at desktop and mobile sizes.
3. Compare the screenshots with the previous design.
4. Identify inconsistent or broken visual elements.
5. Test interactive components.
6. Fix all identified critical and high-severity issues.
7. Repeat the visual inspection after applying fixes.
8. Record verification results in `TASKS.md`.

### Completion Requirements

The redesign may only be marked as completed when:

- 100% of existing pages have been reviewed.
- 100% of existing pages use the updated design system.
- All specified viewport sizes have been tested.
- Zero critical visual defects remain.
- Zero high-severity functional regressions remain.
- All critical navigation and interaction tests pass.
- Required design research has been documented.
- Before-and-after screenshots have been produced.
- The implementation checklist has been updated.

## Final Instruction for the AI Agent

**Do not mark Task 1 as complete based solely on code changes or visual impressions.**

The redesign must pass the measurable criteria listed above.

For each criterion, record its status in `TASKS.md` as:

- **PASS** — Implemented and verified.
- **FAIL** — Requirement not satisfied.
- **BLOCKED** — Verification could not be completed; explain why.

Include supporting evidence for completed checks.

If any required acceptance criterion fails, leave the corresponding task incomplete until the issue is resolved.

### Part 3

Technical Specification — Legal Pages, User Agreements & Platform Policies
Initial Instructions for the AI Agent
Before implementing anything, add this entire technical specification to the existing `TASKS.md` file.
Break down the requirements into actionable subtasks and track their implementation status.
Important: You are responsible for researching, writing, designing, implementing, and testing all the legal and informational pages described below.
Do not simply create empty pages or insert generic placeholder text.
Analyze the actual platform functionality first so that every document accurately reflects how the website operates.
Task 1 — Research and Analyze Legal Requirements
Before writing any legal documents:

1. Analyze the existing platform, its functionality, and user interactions.
2. Identify what information users provide during registration and platform usage.
3. Review how user accounts, profiles, rooms, messages, media integrations, voice communication, and other existing features operate.
4. Identify the personal information collected, processed, and stored by the platform.
5. Research the legal documentation typically required for a platform of this type.
6. Consider applicable data protection, consumer protection, copyright, and online platform regulations, including GDPR where applicable.
7. Identify missing business or legal details that cannot be verified from the project.

Important: Do not invent company information, legal addresses, contact details, data retention periods, or claims about regulatory compliance.
Clearly document information requiring confirmation from the website owner.
The generated legal texts must be prepared for owner and, where necessary, professional legal review before publication.
Task 2 — Create Terms of Service / User Agreement
Create a complete Terms of Service page.
Suggested route: `/terms`
The document should clearly explain the rules governing use of the platform.
Required Content

1. Introduction and scope of the agreement.
2. Eligibility and account registration requirements.
3. User account responsibilities.
4. Acceptable and prohibited behavior.
5. Rules for creating and participating in rooms.
6. Rules for text and voice communication.
7. Rules regarding uploaded or shared content.
8. Third-party media services and external links.
9. Intellectual property and copyright.
10. User-generated content responsibilities.
11. Account restrictions, suspension, and termination.
12. Service availability and limitations.
13. Applicable liability provisions.
14. Changes to the Terms of Service.
15. Contact information and legal notices.

Requirements

* Write the entire document in professional, understandable English.
* Use appropriate section headings.
* Ensure the text reflects the actual functionality of the platform.
* Avoid generic statements that do not apply to this project.
* Do not promise features, guarantees, or protections that have not been implemented.

Task 3 — Create Privacy Policy
Create a complete Privacy Policy page.
Suggested route: `/privacy`
Required Content

1. Introduction.
2. Identity and contact details of the data controller.
3. Categories of personal information collected.
4. Purposes and legal bases for data processing.
5. Account and profile information.
6. Chat messages and room-related information.
7. Voice communication and associated data processing.
8. Uploaded images and other user content.
9. Third-party media integrations.
10. Cookies and similar technologies.
11. Data storage and retention.
12. Data sharing and third-party processors.
13. International data transfers, where applicable.
14. Data security.
15. User privacy rights.
16. Account and personal data deletion.
17. Information relating to underage users, where applicable.
18. Changes to the Privacy Policy.
19. Privacy-related contact information.

The policy must accurately describe the project's real data-processing practices.
Do not claim that information is encrypted, automatically deleted, never stored, or never shared unless this is verified in the implementation.
Task 4 — Create Cookie Policy
Create a separate Cookie Policy page.
Suggested route: `/cookies`
Requirements
Explain:

* What cookies and similar technologies are.
* Which cookies or storage technologies the website actually uses.
* Their purposes.
* Which are strictly necessary.
* Whether analytics or third-party cookies are used.
* How long cookies or stored identifiers remain active.
* How users can manage their preferences.
* How third-party services may use cookies.

If consent is required for non-essential cookies, implement an appropriate cookie consent mechanism.
Users must be able to access their cookie preferences again after making an initial choice.
Cookie consent controls must reflect the actual technologies used by the platform.
Task 5 — Create Community Guidelines
Create a dedicated Community Guidelines page.
Suggested route: `/guidelines`
The purpose of this page is to explain how users are expected to behave on the platform.
Required Topics

1. Respectful communication.
2. Harassment and abusive behavior.
3. Hate speech and discrimination.
4. Spam and malicious activities.
5. Inappropriate or prohibited content.
6. Rules for public and private rooms.
7. Voice and text chat conduct.
8. Respect for other users' privacy.
9. Impersonation and account misuse.
10. Copyright and content sharing.
11. Reporting violations.
12. Possible moderation actions.
13. Account restrictions and appeals, where supported.

The rules must be clearly written, logically organized, and consistent with the Terms of Service.
Task 6 — Create Copyright & Intellectual Property Policy
Create a separate Copyright Policy page.
Suggested route: `/copyright`
Because the platform integrates external music, videos, fandom content, and other media, copyright information must be clearly documented.
Requirements

1. Explain ownership of platform content.
2. Explain the responsibilities of users who submit or share content.
3. Describe how third-party content and embedded media are handled.
4. Explain that external media remains subject to its respective rights holders and service terms.
5. Provide a procedure for submitting copyright complaints.
6. Explain how copyright-related reports are reviewed.
7. Describe applicable content removal and dispute procedures.

Research and account for applicable copyright requirements.
Do not claim that the platform possesses licenses or distribution rights without evidence.
Task 7 — Create Contact & Support Page
Create a Contact / Support page.
Suggested route: `/contact`
Requirements

1. Provide a clearly organized contact page.
2. Include verified available contact methods.
3. Explain how users can report technical issues.
4. Explain how users can submit privacy-related requests.
5. Explain how users can report violations or copyright concerns.
6. Ensure the page matches the platform's overall design.

Do not invent email addresses or business contact information.
If required contact information is unavailable, record it as an outstanding requirement for the website owner.
Task 8 — Create About Page
Create an About page.
Suggested route: `/about`
Requirements

1. Explain what the platform is.
2. Describe its core purpose.
3. Explain its main existing functionality.
4. Present the information in a professional but approachable style.
5. Keep the content accurate and avoid inventing the platform's history, achievements, or business identity.
6. Apply the same design system used throughout the website.

Task 9 — Integrate Legal Pages Throughout the Platform
All legal and informational pages must be accessible through consistent navigation.
9.1. Global Footer
Create or update the global footer to include links to:

* Terms of Service
* Privacy Policy
* Cookie Policy
* Community Guidelines
* Copyright Policy
* Contact / Support
* About

9.2. Footer Requirements

1. The footer must appear consistently on all relevant pages.
2. Every link must navigate to the correct page.
3. The footer must match the platform's redesigned visual identity.
4. The footer must work correctly on desktop and mobile devices.
5. It must not overlap existing content or navigation.
6. The footer must remain accessible without interfering with room functionality, media playback, or communication interfaces.

9.3. Registration and Authentication
Update registration and authentication pages where necessary.

* Provide visible links to the Terms of Service and Privacy Policy.
* Implement appropriate agreement or acknowledgment mechanisms where legally required.
* Do not use misleading consent interfaces.
* Ensure users can access legal documents before registration.

Task 10 — Legal Page Design
All legal pages must follow the platform's updated design system.
Design Requirements

1. Use minimalist, modern typography.
2. Maintain consistent colors and spacing.
3. Organize documents into clearly separated sections.
4. Ensure long texts remain comfortable to read.
5. Provide a clear page title.
6. Provide navigable headings.
7. Add a table of contents for lengthy documents where useful.
8. Make legal pages fully responsive.
9. Ensure readability and accessibility.
10. Display the effective date and last updated date where appropriate, using verified dates.

The pages must feel like a natural part of the platform rather than unrelated external documents.
Task 11 — Document Updates and Version Management
Implement a maintainable structure for updating legal documents.
Requirements

1. Keep legal document content organized and easy to modify.
2. Maintain document version information.
3. Display appropriate update dates.
4. Ensure future modifications do not require redesigning the pages.
5. Keep links stable when document content changes.
6. Determine whether user notification or renewed agreement is required for material changes.

Do not fabricate historical versions or approval dates.
Task 12 — Testing and Verification
After implementation, review every legal and informational page.
Required Checks

* All required pages have been created.
* Each page contains complete, relevant content.
* Text reflects the platform's real functionality.
* No unsupported factual claims remain.
* No invented business or legal details are presented as facts.
* All footer links work correctly.
* Legal pages are accessible from the appropriate registration screens.
* Pages display correctly on desktop and mobile devices.
* Typography matches the main design system.
* Navigation works correctly.
* No console errors occur because of the implementation.
* Existing platform features remain operational.
* Items requiring owner confirmation or legal review are documented.

Final Acceptance Criteria
The implementation is technically complete when:

1. All specified pages are implemented.
2. Every p

> **[The specification was cut off here when received. The remaining final acceptance criteria are missing; see question 1.]**

---

Related notes: [[docs/Home]] · [[docs/Roadmap]] · [[docs/Acceptance Checklist]]


## Platform UX audit — 2026-11-09

See [[docs/Home]].

### Implementation checklist

- [x] P1: Diagnose and repair search across music, fandoms, rooms and quick search.
- [x] P2: Audit and unify user avatar rendering and fallback.
- [x] P3: Add shared animated vinyl room artwork, including dock and reduced motion.
- [x] P4: Improve fullscreen, chat, voice and room controls.
- [x] P5: Add responsive home music section after studying references.
- [x] P6: Review routes, components, responsive states and interactions; fix and verify findings.
- [x] Run lint, typecheck, unit, docs:check, build and e2e; actual results and conditional skips are recorded below.

### Audit findings and verification log

| Component | Severity | Problem and correction | Status / evidence |
|---|---|---|---|
| Quick search | High | Music filter searched local rooms only; add current music snapshots, real detail/collection links and public server rooms. | PASS — current track, query changes, empty results and collection links passed desktop/mobile regression. |
| Catalogue filters | Medium | Case-only matching missed accents, е/ё, whitespace and multi-field terms; share literal token matching across music, fandoms, rooms and onboarding. | Normalization unit tests PASS (3). |
| Music search | Medium | The same recording appeared under multiple chart ids; deduplicate normalized title/artist, preserving detail links. | API unit test PASS. |
| Async search | High | No remote loading/error/race handling; debounce, abort old work, bound input, timeout and retry. | PASS — API contracts and delayed-response/retry browser regressions in both projects. |
| User identity | Medium | Chat, people, voice and friends used initials despite uploaded media; add common protected UserAvatar and retain initial fallback. | PASS — protected upload/read/404 fallback fixtures, chat and voice in both projects; live Storage remains unverified. |
| Profile changes | Medium | Navigation kept the old image after upload/removal; invalidate identity on media changes. Settings sidebar now also has a broken-image fallback. | PASS — crop/upload/remove profile fixtures and two navigation refresh scenarios without leaving the page. |
| Room identity | Medium | Unrelated thumbnails across cards, preview and dock; introduce shared vinyl with fixed fandom center/logo, off-screen pause and reduced-motion. Persist fandom with dock metadata. | PASS — artwork/dock screenshots, persistent metadata and reduced-motion checks at all five widths. |
| Full room view | Medium | No immersive view containing chat and participants; use browser fullscreen on the room wrapper without remounting players. | PASS — native enter/exit, retained chat/voice panels, ten geometry regressions and five independent viewport checks. |
| Chat and voice layout | Medium | Long labels and message text can crowd controls; wrap text/metadata, separate avatar, input and 44px voice control groups. | PASS — whole production suite and post-audit focused regressions; 40 protected-state screenshots reviewed. |
| Navigation | Medium | Detail routes did not mark their parent section active; match nested routes. | PASS — search opens the track and its parent Music navigation remains active. |
| Account link | High | New decorative initial did not match the link accessible name; use the existing person icon as topbar fallback. Legacy span-hiding CSS also hid the tablet avatar; explicitly show its wrapper. | PASS — final whole-suite axe checks in both themes and desktop/mobile; avatar refresh/fallback regressions passed. |
| Home / landing | Medium | Music was represented only by an empty local-room list; add an editorial music introduction, image and clear music/create-room destinations in both locales. | PASS — RU/EN navigation, current collection query links and 175 route/viewport audit checks. |

Additional independent visual finding: **High — local room fullscreen flow**. At tablet width, the flex container shrank the room grid below its content height, so the local-data notice overlapped the panel and clipped the stage's source status. Changed only the local fullscreen grid to retain its intrinsic height, kept the notice in normal flow, and aligned room artwork beside its title. Browser CSS-preview measurements passed at 360/390/768/1280/1920 (no notice overlap, no horizontal overflow, enter/exit and reduced-motion all passed). Added a permanent geometry regression; final bundled-production verification PASS: ten layout regressions and five independent viewport measurements.

Latest verified audit evidence: 373 unit tests / 62 files PASS; TypeScript, lint, docs and production build PASS. Public visual audit: 35 route states × 5 widths = 175 checks, zero overflow, loading placeholders or page errors. Signed-in fixtures: seven capture scenarios PASS, covering eight UI states at five widths (40 screenshots). Reviewed public and protected mobile/desktop contact sheets, full home/voice and fullscreen screenshots. Evidence stays under ignored directory .local/ux-audit, including audit.json, fullscreen.json, unit-final.log, e2e-final.log, capture.log and before/after PNGs. Protected fixtures do not substitute for live authenticated acceptance.

Exploratory verification: first complete unit batch 366/366; after normalization tests, 369/369 plus four new search API cases passed. TypeScript and production build passed. Documentation validation passed (160 notes, 79 RU/EN pairs). The first lint failure was in temporary CommonJS screenshot scripts; these were replaced by an ES module and lint passed. Final lint passed after the accessibility, fullscreen and dock corrections.

Exploratory browser runs are **not final acceptance**: hot-reloading changed provider contexts during active tests; two concurrent Playwright batches also collided in their common artifact directory. Room/chat batch: 103 passed, 7 failed, 2 intentionally skipped. Initial new UX batch: 6 passed, 4 failed (cold compilation, plus a real duplicate-result defect now covered by a unit test). The first whole production run was stopped when axe found the account link regression above. No test assertion or authorization rule was weakened. The whole-suite acceptance ran as one process against a separate production server; configurable base URL remaps the existing consent fixture to that origin.

Review scope: inspected route/component architecture, domain/data/provider boundaries, frontend state and cleanup, server access paths, profile media, friend/admin/settings/auth UI, page styles, manifests, dependencies and existing test coverage. Retained legacy CSS layers because removing them wholesale lacks a safe functional justification; targeted room/layout fixes use the existing design tokens. No dependency was added.

Protected live states remain separate from fixture verification: no authenticated owner/admin or second real voice session was supplied in this chat. Public access-denied/sign-in states are inspected in the real browser; account/profile/admin/shared-room layouts and interactions are additionally checked through the existing isolated fixture harness. This does not prove a live Storage upload, real two-party audio, real screen capture or email delivery.

### Final acceptance — 2026-11-09

**Implementation and accessible-interface audit: PASS. Live authenticated acceptance: still unverified.**

| Check | Actual result |
|---|---|
| npm run lint | PASS, zero errors/warnings. |
| npm run typecheck | PASS; repeated after final test additions. |
| npm run unit | PASS — 373 tests / 62 files. |
| npm run docs:check | PASS — 160 notes, 79 RU/EN pairs. |
| npm run build | PASS — final production bundle, 189 generated pages. |
| Whole npm run e2e | PASS — 409 passed, 127 intentionally/conditionally skipped, zero failed (18.7 minutes). This run preceded the final narrowly scoped fullscreen/dock corrections. |
| Post-audit production regressions | PASS — 79 passed, 31 optional responsive cases skipped, zero failed. Covers the final fullscreen and dock changes plus search, themes, navigation and home music. |
| Navigation avatar refresh | PASS — two additional desktop/mobile scenarios, same-page update/removal/fallback. |
| Protected-state captures | PASS — seven scenarios, eight UI states × five widths = 40 screenshots, manually reviewed. |
| Public responsive audit | PASS — 35 representative route states (one content item per dynamic template) × five widths = 175 checks; no horizontal overflow, loading placeholders or page errors. Full screenshots and six contact sheets reviewed. |
| Final native fullscreen measurements | PASS — 360/390/768/1280/1920: entry, exit, three tabs, no normal/fullscreen horizontal overflow, no notice overlap, reduced-motion disables animation. Final screenshots were taken from the bundled CSS without injecting preview styles. |

Skipped whole-suite scenarios: 20 require a separate **unconfigured** backend environment; 12 signed-in captures, two shared-room captures and 62 public captures are opt-in; 31 redesign responsive/capture scenarios are conditional. The requested five-width visual review was performed through the explicit 175-check public audit and 40 protected screenshots instead. A skip is not reported as a successful functional test.

One additional existing defect was reproduced before correction: **Medium — stale room dock**. Opening a local music room through quick search and then entering a different room through its title kept the first room's name in the dock. The regression failed with expected “По ту сторону звёзд”, received “Тихо, мы чиллим” (dock-regression-before.log). The current room now takes priority when ids differ; hiding it also clears the older companion. Desktop/mobile transition tests and the original same-room expandable companion test passed after the correction.

Final issue status: all Critical/High findings discovered within the inspected UI/code scope are corrected and verified; all Medium findings in the table are corrected. The final local-room flow fix also keeps the source status visible above its footer and places artwork next to the title. No dependency was added and no authorization rule was weakened. Legacy CSS consolidation remains an existing low-priority maintenance item, not a reason to rewrite working pages during this audit.

- [x] Available public route templates and access-denied states inspected in a real browser.
- [x] Protected account/profile/friends/admin/create/chat/voice layouts inspected through isolated fixtures.
- [x] Major search, navigation, modal, form, player, queue, voice, screen-demo and room interactions exercised by the full suite; RLS/permissions exercised by PostgreSQL unit tests.
- [x] High/critical discovered layout/functionality defects corrected and rechecked.
- [x] Five requested widths, native fullscreen, reduced motion, text wrapping, avatars and bottom controls verified.
- [x] At least one independent re-evaluation after initial implementation; additional findings fixed through multiple inspect/fix/verify cycles.
- [x] Final modified components checked after the last source changes.
- [ ] Real authenticated live acceptance: no owner/admin or second voice account was supplied for this chat. Actual cloud avatar/chat Storage upload, two-party voice/screen delivery, email delivery and privileged administrator operations remain unverified. Existing launch/setup limitations elsewhere in TASKS.md are preserved.

Evidence: .local/ux-audit/e2e-final.log, post-audit-e2e.log, avatar-navigation.log, unit-final.log, capture.log, audit.json, fullscreen.json, dock-regression-before.log and PNGs. Before snapshots cover home, room catalogue and music; after snapshots cover all audited route/state templates. These generated artifacts are ignored by Git. Feature behavior, limits and references: [[docs/Features/Platform UX]], [[docs/en/Features/Platform UX]].

### Specification received (verbatim)

# Technical Specification — Catsodi Platform Improvements, UI/UX Optimization & Comprehensive Quality Audit

## Initial Instructions for the AI Agent

Before starting implementation:

1. Open the existing `TASKS.md` file.
2. Add this entire specification, including every task and subtask.
3. Analyze the current project structure and existing functionality.
4. Create an implementation checklist.
5. Complete each task and verify its functionality.
6. Update `TASKS.md` as work progresses.

**Important:** Do not simply implement the requested changes and immediately consider the work complete. After implementation, perform a comprehensive independent review of the entire platform, critically evaluate your own work, identify problems, and fix them.

---

## Task 1 — Fix and Optimize the Search System

The current search functionality is not working correctly and requires a complete review.

### Requirements

1. Investigate why the current search is failing.
2. Examine both frontend and backend search logic.
3. Fix existing bugs affecting search results.
4. Ensure that users can find relevant content correctly.
5. Check search functionality across all sections where it is currently available, including music, fandoms, and other searchable content.
6. Improve search responsiveness and loading behavior.
7. Ensure that search results update correctly when the query changes.
8. Handle empty results, invalid queries, and loading states properly.
9. Make sure the search interface follows the platform's design system.

### Expected Result

A fully functional, responsive search system that consistently returns relevant results without errors.

---

## Task 2 — Fix Missing User Avatars

User avatars are currently missing from several parts of the platform.

### Requirements

1. Review the entire platform and identify every location where a user avatar should be displayed.
2. Add missing avatars to the appropriate components.
3. Verify avatar visibility in areas such as:
   - Navigation and user menus
   - User profiles
   - Room participant lists
   - Text chats
   - Voice communication interfaces
   - Other user-related interface elements
4. Ensure that uploaded avatars are displayed correctly.
5. Use the existing default avatar when a user has not uploaded one.
6. Keep avatar sizes, shapes, and positioning consistent with the surrounding interface.

### Expected Result

User avatars are displayed consistently throughout the platform, without missing images or incorrectly positioned elements.

---

## Task 3 — Redesign Room Avatars as Animated Vinyl Records

The current room avatars look too simple and visually uninteresting.

Replace them with a more distinctive design inspired by a **spinning vinyl record**.

### 3.1. Visual Design

Each room avatar should resemble a vinyl disc with:

- A circular vinyl record appearance.
- A fandom icon or image positioned in the center.
- A subtle rotating animation.
- A shimmering or softly animated background.
- A modern visual style consistent with Catsodi's overall design.

The animation should feel smooth and polished rather than distracting.

### 3.2. Fandom Integration

1. If a room has a selected fandom, display that fandom's icon or image in the center of the record.
2. If no fandom is selected, display the **Catsodi logo** as the default center image.
3. Ensure that the image remains clearly visible during rotation.
4. Preserve the circular record appearance regardless of the selected image.

### 3.3. Footer and Room Interface Integration

Apply the same visual style to room avatars displayed in:

- Room lists
- Room cards
- Room previews
- The bottom room menu / footer
- Other components where room avatars appear

Ensure that the design remains recognizable at smaller sizes.

### 3.4. Animation Optimization

- Keep animations smooth and lightweight.
- Avoid unnecessary GPU and CPU usage.
- Ensure animations do not interfere with interface interactions.
- Respect reduced-motion preferences.
- Check performance when multiple animated avatars are displayed simultaneously.

### Expected Result

Room avatars should become a distinctive part of Catsodi's visual identity, featuring rotating vinyl records, fandom artwork, and subtle shimmering effects.

---

## Task 4 — Improve Room Interface, Full-Screen Mode, Text Chat & Voice Chat

The room interface requires additional improvements to functionality, layout, and visual consistency.

### 4.1. Full-Screen Room Mode

Implement a full-screen mode for rooms.

**Requirements:**

1. Add a clearly visible full-screen control.
2. Allow users to expand the room interface into an immersive full-screen view.
3. Ensure that the media player, chat, participant information, and room controls are displayed correctly.
4. Allow users to exit full-screen mode easily.
5. Ensure the layout adapts correctly when switching between normal and full-screen modes.
6. Prevent controls or interface elements from overlapping.

### 4.2. Text Chat Improvements — Twitch Reference

Research Twitch's chat interface and use its strongest design and usability characteristics as inspiration.

Focus on:

- Compact and readable message layout.
- Clear usernames and avatars.
- Consistent message spacing.
- Comfortable text readability.
- Well-positioned chat input.
- Smooth scrolling.
- Proper handling of long messages.
- A visually organized chat panel.

The result should feel modern and efficient while maintaining Catsodi's own visual identity.

### 4.3. Voice Chat Improvements — Discord Reference

Research Discord's voice communication interface.

Pay particular attention to:

- Participant avatar placement.
- Microphone and headphone controls.
- Speaking indicators.
- User status indicators.
- Participant alignment and spacing.
- Voice channel organization.
- Connection and disconnection controls.

Reorganize existing voice chat elements where necessary.

Avoid crowded layouts, inconsistent icon sizes, and poorly positioned controls.

### 4.4. General Room Layout Improvements

Review and improve other room interface elements, including:

- Media player controls
- Screen-sharing controls
- Participant lists
- Room information
- Navigation elements
- Bottom room menu
- Chat and voice panels

Ensure that the entire room feels like one unified, carefully designed interface rather than several unrelated components.

### Expected Result

A cleaner, more functional room interface with full-screen support, Twitch-inspired text chat, Discord-inspired voice communication, and properly organized controls.

---

## Task 5 — Add a Music Section to the Home Page

Create a dedicated music section on the main home page.

### Design Reference

https://claude.com/product/overview

Study this page and analyze how its content sections are organized and presented.

Use its approach to visual hierarchy, spacing, typography, composition, and presentation as design inspiration.

**Do not copy the reference website directly.** Adapt the design principles to Catsodi's visual identity.

### Requirements

1. Add a new music section to the existing home page.
2. Ensure that the section integrates naturally into the page layout.
3. Present the platform's music functionality in a visually attractive way.
4. Provide clear navigation to the existing music section.
5. Use appropriate images, typography, and visual elements.
6. Ensure that the design is consistent with the overall website.
7. Make the section fully responsive.
8. Avoid unnecessary visual clutter or generic template-style layouts.

### Expected Result

A modern, elegant music section that improves the home page and encourages users to explore Catsodi's music functionality.

---

# Task 6 — Comprehensive Self-Criticism, Code Review, UI/UX Audit & Automatic Improvements

<escape>**CRITICAL TASK — HIGHEST PRIORITY FOR FINAL QUALITY ASSURANCE**</escape>

This is not a simple testing task.

After implementing the requested features, the AI agent must independently and critically evaluate the entire project, including its own implementation.

The objective is to identify and correct issues that might not have been explicitly mentioned in the original requirements.

**Do not assume that your work is good simply because the code compiles, the website loads, or the requested features technically exist.**

Act as a senior frontend developer, UI/UX designer, software architect, QA engineer, and critical design reviewer.

Your responsibility is to make the entire platform feel polished, consistent, well-structured, and professionally developed.

## 6.1. Full Project and Codebase Review

Review the entire project, not just the files modified during these tasks.

### Required Actions

1. Examine the overall project structure.
2. Review frontend components, styles, layouts, and related logic.
3. Identify duplicated or unnecessary code.
4. Identify outdated components that are no longer needed.
5. Look for unnecessarily complex implementations.
6. Review how components interact with one another.
7. Check whether existing styles conflict with newly introduced styles.
8. Identify unnecessary dependencies and inefficient rendering behavior.
9. Verify that reused UI elements are implemented consistently.
10. Refactor problematic code where doing so clearly improves maintainability or performance.

Do not rewrite working systems without a concrete reason.

Preserve existing functionality and avoid introducing regressions.

### Important

When you discover a code-quality issue, do not merely mention it in the final report.

Fix it when it is within the project's scope and can be safely corrected.

---

## 6.2. Complete Visual Inspection of Every Page

Open and inspect **every available page** of the platform in a real browser environment.

Do not rely exclusively on reading HTML, CSS, or component code.

Examine how the interface actually looks after rendering.

### Inspect the Following

- Home page
- Music pages
- Fandom pages
- User profiles
- Room lists
- Active room interfaces
- Text and voice chat components
- Media players
- Navigation menus
- Authentication pages
- Settings
- Admin panel
- Other existing pages and interface states

For every page, evaluate:

1. Overall visual composition.
2. Element positioning.
3. Alignment.
4. Spacing.
5. Typography.
6. Colors and contrast.
7. Component dimensions.
8. Icon sizes.
9. Visual hierarchy.
10. Responsive behavior.

### Questions You Must Ask Yourself

- Does this page look professionally designed?
- Are the elements positioned logically?
- Is there enough space between components?
- Are there unnecessary empty areas?
- Are some elements too large or too small?
- Are the fonts appropriate and consistent?
- Does anything look visually outdated?
- Does the interface contain generic-looking components?
- Is there an unnecessary number of containers or borders?
- Could the layout be simpler and more elegant?
- Is the page visually consistent with the rest of Catsodi?

If something looks awkward, unbalanced, or poorly designed, investigate and improve it.

---

## 6.3. Detailed Element Positioning Audit

Pay particular attention to the placement of controls, icons, buttons, and text.

This is one of the most important parts of the review.

### Example 1 — Voice Chat Icons

Examine the voice communication interface.

Check:

- Whether microphone and headphone icons are aligned correctly.
- Whether participant avatars have consistent dimensions.
- Whether usernames are positioned properly.
- Whether controls are too close together.
- Whether speaking indicators are placed logically.
- Whether icons have enough space around them.
- Whether the entire voice interface feels organized and balanced.

If the placement looks awkward, redesign it.

Do not preserve a bad layout simply because it already works.

### Example 2 — Screen-Sharing Controls

Inspect the controls used when displaying or sharing a screen inside a room.

Check:

- Whether controls appear in logical locations.
- Whether buttons overlap video or important content.
- Whether control groups are consistently aligned.
- Whether icons are easy to understand.
- Whether the controls take up unnecessary screen space.
- Whether users can easily find the most important actions.
- Whether the layout works correctly in full-screen mode.

Improve the arrangement if necessary.

### Example 3 — Text Chat

Check:

- Avatar and username alignment.
- Message spacing.
- Message text positioning.
- Chat input placement.
- Send button placement.
- Chat panel dimensions.
- Scrolling behavior.
- Long-message rendering.

Avoid any situation where the chat looks crowded, uneven, or visually disconnected from the rest of the room.

### Example 4 — Navigation and Footer

Check:

- Icon alignment.
- Label positioning.
- Consistent spacing between navigation items.
- Active-state styling.
- Room avatar dimensions.
- Menu positioning.
- Footer height.
- Behavior when navigating between pages.

Correct any inconsistencies.

### General Rule

**Every element must appear intentionally positioned.**

There should be no buttons, icons, labels, or containers that look randomly placed.

---

## 6.4. Typography and Text Audit

Review all text displayed throughout the platform.

### Requirements

1. Ensure consistent font usage.
2. Check heading sizes and hierarchy.
3. Identify inconsistent font weights.
4. Fix incorrect text alignment.
5. Review line heights and letter spacing.
6. Fix text that overflows containers.
7. Review button labels and interface descriptions.
8. Correct grammatical mistakes and inconsistent terminology.
9. Ensure text is readable against its background.
10. Remove unnecessary or repetitive interface text where appropriate.

Pay special attention to:

- Room titles
- Usernames
- Chat messages
- Music metadata
- Fandom descriptions
- Navigation labels
- Tooltips
- Modal windows
- Empty states
- Error messages

Text should look carefully integrated into the design rather than added afterward.

---

## 6.5. Spacing, Alignment, and Component Consistency

Analyze the platform's spacing and component sizing.

### Identify and Fix

- Inconsistent margins.
- Uneven padding.
- Misaligned buttons.
- Different corner radii on equivalent components.
- Incorrect icon-to-text spacing.
- Unnecessarily large gaps.
- Elements positioned too close to one another.
- Inconsistent card dimensions.
- Unbalanced layouts.
- Excessive container nesting.
- Unnecessary decorative elements.

Use a consistent spacing system throughout the platform.

Do not make arbitrary styling changes without considering neighboring components.

The goal is visual harmony across the entire application.

---

## 6.6. Responsive Design Audit

Test the platform at multiple screen sizes.

### Required Viewports

| Device | Width |
|---|---|
| Small mobile | 360px |
| Mobile | 390px |
| Tablet | 768px |
| Laptop | 1280px |
| Desktop | 1920px |

### Check

1. Whether elements overlap.
2. Whether text becomes unreadable.
3. Whether buttons become too small.
4. Whether navigation remains accessible.
5. Whether room controls fit correctly.
6. Whether chat interfaces remain usable.
7. Whether full-screen mode works properly.
8. Whether the bottom room menu is correctly positioned.
9. Whether unwanted horizontal scrolling appears.
10. Whether layouts adapt naturally rather than simply shrinking desktop components.

Fix every critical responsive layout issue found.

---

## 6.7. Functional Testing of Every Interactive Element

Do not evaluate only the appearance of the platform.

Test the actual functionality of all major interactive elements.

### Required Checks

- Navigation links
- Buttons
- Dropdown menus
- Modal windows
- Search fields
- Room joining and leaving
- Full-screen mode
- Music playback controls
- Chat input
- Voice communication controls
- Screen-sharing controls
- User profile navigation
- Fandom navigation
- Footer interactions
- Settings

### Test Different States

Where applicable, inspect components while:

- Idle
- Loading
- Active
- Disabled
- Empty
- Displaying errors
- Processing user input

Do not assume a component works simply because it renders correctly.

Verify that it actually performs its intended action.

---

## 6.8. Code Optimization and Performance Review

After identifying visual and functional problems, inspect the underlying implementation for opportunities to improve efficiency.

### Focus On

1. Reducing unnecessary component rerenders.
2. Removing duplicated logic.
3. Optimizing image loading.
4. Improving animation performance.
5. Preventing memory leaks.
6. Removing unused code.
7. Simplifying unnecessarily complicated styling.
8. Optimizing search behavior.
9. Improving performance when multiple rooms or users are displayed.
10. Ensuring that voice, chat, and media features do not unnecessarily interfere with one another.

Avoid introducing additional complexity without a meaningful benefit.

Prioritize readable, maintainable, and efficient implementations.

---

## 6.9. Independent Critical Design Evaluation

This step is mandatory.

After completing the initial improvements, review the platform again **as if you were evaluating somebody else's work**.

Do not defend earlier design decisions simply because you implemented them.

### Ask Yourself

- What parts of this design still look unfinished?
- Which components look noticeably worse than others?
- Are there areas that look like generic AI-generated interfaces?
- Does the website have a recognizable identity?
- Are the room controls truly convenient?
- Is the interface comfortable during long sessions?
- Does the voice chat feel organized?
- Does the music section feel integrated?
- Are animations improving the experience or distracting from it?
- Are there visual inconsistencies that a user would immediately notice?
- Would a professional UI/UX designer consider this layout polished?
- What would I improve if I had to review this project for production readiness?

Identify specific issues rather than writing vague comments such as "the design could be improved."

For each issue, determine:

1. What is wrong?
2. Where does it occur?
3. Why does it negatively affect usability or appearance?
4. What change would improve it?
5. How can the result be verified?

Then implement the improvement.

---

## 6.10. Iterative Improvement Process

Do not perform only one review.

Use the following workflow:

**Step 1 — Inspect**

Open the relevant page or component and evaluate its current appearance and behavior.

**Step 2 — Identify Problems**

Create a list of specific issues.

**Step 3 — Prioritize**

Fix broken functionality, serious layout defects, and usability problems first.

**Step 4 — Implement Improvements**

Modify the necessary components, styling, or logic.

**Step 5 — Verify**

Reopen the affected page and test the changes.

**Step 6 — Compare**

Check whether the implementation genuinely improved the result.

**Step 7 — Repeat**

Continue until the identified issues are resolved and the relevant acceptance criteria pass.

Do not stop immediately after the first successful build.

Do not repeatedly modify components without verifying the actual visual result.

---

## 6.11. Screenshot-Based Review

Use screenshots to evaluate visual changes whenever possible.

### Requirements

1. Capture screenshots of important pages before making major visual changes.
2. Capture updated screenshots after implementation.
3. Compare the results.
4. Look for unexpected layout shifts.
5. Inspect small visual details, not just the overall page.
6. Pay special attention to room interfaces, chat layouts, and bottom navigation.

Evaluate both desktop and mobile versions.

Screenshots should help identify visual issues that may not be obvious from the code.

---

## 6.12. Issue Tracking and Documentation

Document all significant issues discovered during the audit in `TASKS.md`.

For each issue, record:

- Affected page or component.
- Description of the problem.
- Severity.
- Planned correction.
- Implementation status.
- Verification result.

Use the following severity levels:

| Severity | Description |
|---|---|
| Critical | Broken core functionality or unusable interface |
| High | Serious visual, functional, or usability problem |
| Medium | Noticeable inconsistency or inconvenient interaction |
| Low | Minor visual imperfection or polish issue |

Do not mark an issue as fixed until the correction has been verified.

---

## 6.13. Final Quality Acceptance Criteria

The comprehensive audit is considered complete only when:

- [ ] All available pages have been inspected.
- [ ] All major components have been reviewed.
- [ ] All critical functionality has been tested.
- [ ] All critical and high-severity issues discovered during the audit have been resolved.
- [ ] Text, buttons, and icons are consistently aligned.
- [ ] Voice chat controls are logically positioned.
- [ ] Screen-sharing controls are correctly organized.
- [ ] Music and room interfaces follow the same design system.
- [ ] No unintended overlapping elements remain.
- [ ] No major responsive layout issues remain.
- [ ] No newly introduced critical console errors remain.
- [ ] The application builds successfully.
- [ ] Existing functionality remains operational.
- [ ] All modified components have been verified after changes.
- [ ] The final design has undergone at least one independent re-evaluation after the initial fixes.
- [ ] Remaining limitations or unresolved issues have been documented.

**Do not report untested features as successfully verified.**

If a feature cannot be tested, clearly state why and record it as unverified.

---

# Final Instructions for the AI Agent

Your responsibilities are divided into two stages.

## Stage 1 — Implementation

Complete Tasks 1–5:

1. Fix and optimize search.
2. Correct missing user avatars.
3. Introduce animated vinyl-style room avatars.
4. Improve room layouts, full-screen mode, text chat, and voice chat.
5. Add the new music section to the home page.

## Stage 2 — Independent Quality Review

Complete Task 6 with the same level of attention as the implementation itself.

You must:

1. Review the entire codebase.
2. Open and inspect every page.
3. Critically evaluate the design.
4. Identify poorly positioned elements.
5. Fix inconsistent typography and spacing.
6. Improve problematic interface components.
7. Optimize code where necessary.
8. Test important functionality.
9. Inspect mobile and desktop layouts.
10. Verify the results of your improvements.
11. Repeat the review if significant issues remain.
12. Document the final results in `TASKS.md`.

## Important Final Requirement

**Do not behave like an agent that merely completes a checklist. Behave like a developer who is personally responsible for the quality of the final product.**

If an element looks ugly, misplaced, inconsistent, unnecessarily complicated, or unfinished, investigate why and improve it.

If an interface technically works but is inconvenient or poorly organized, improve its usability.

If the code works but contains unnecessary complexity, simplify it when safe.

If a change introduces a new issue, fix that issue before considering the work complete.

Do not make superficial design changes merely to demonstrate activity. Every change should have a clear reason and a verifiable improvement.

**The final objective is not just a functional website. It is a cohesive, carefully designed, optimized, and professionally polished Catsodi platform.**


## Participant layout repair — 2026-11-09

See [[docs/Features/Platform UX]]. User screenshots show the three-role participant list and voice roster at a narrow sidebar width.

- High: moderation buttons squeezed participant name/role into vertical letter columns. Separate full-width identity (avatar plus stacked name/role) from wrapping action forms. PASS — implemented and verified in the browser.
- Medium: legacy voice grid cells (110px minimum) and cards (85px maximum) produced uneven spacing and a left-aligned last row. Use equal flexible cards in a centered wrapping roster, preserving actual speaking/mute/connection state. PASS — implemented and verified in the browser.
- Regression: owner, moderator and member; English labels at 360/390/768/1280/1920; name geometry, action separation, overflow and row centering, with screenshots.

Verification: lint, TypeScript, docs check and final production build PASS; 373 unit tests PASS. Initial focused browser batch: 16/16 PASS. After refining voice-control spacing: 6/6 PASS, including geometry at all five widths, Russian/English controls, actual SDK fixture call states and WCAG checks on desktop/mobile. Screenshots .local/ux-audit/people-fixed-*-*.png and voice-fixed-*-*.png inspected; logs roster-unit.log, roster-e2e.log, roster-final-e2e.log. Voice service readiness and authorization rules remain unchanged; real media transport was not retested.


## Shared fullscreen sizing — 2026-11-09

See [[docs/Features/Platform UX]]. The supplied screenshot shows a fixed-height website panel and voice lounge leaving a large unused area inside fullscreen. Scope: fill the active Website/Player/Demo/Browser stage and voice panel on desktop, adapt sidebar width, preserve normal and stacked mobile layouts. PASS — implemented; native fullscreen geometry and screenshots verified. Existing iframe instances, consent gates, permissions and stream aspect ratios remain unchanged.

Verification for shared fullscreen sizing: final production build, lint, TypeScript and docs validation PASS; 373 unit tests PASS. Browser regression batch 24/24 PASS (stages and voice at 1920×1080, 1280×900, 1280×540, 768×900 and 360×800; normal website/shared-browser behavior, voice, WCAG and prior local-fullscreen regression). Two additional desktop/mobile checks PASS for fullscreen Browser sizing and loaded website iframe height/DOM retention after exit. Screenshots fullscreen-adapt-*.png reviewed, including wide, short and mobile states. Initial screenshot harness attempted to resize a native-fullscreen Chromium window; corrected it to exit fullscreen before resizing, without weakening app assertions. Media transport and live account/service configuration were not changed or revalidated. Logs: .local/ux-audit/fullscreen-adapt-unit.log, fullscreen-adapt-regression.log and fullscreen-frame-retained.log.


## Active demo fullscreen and capture border — 2026-11-09

See [[docs/Features/Link Demo]]. The active presenter iframe retained a 16:10 aspect ratio and exceeded the height left for drawing controls. Fullscreen now bounds the presenter frame to its canvas; received video is fitted to both dimensions with its original aspect and matching overlay. The blue border outside the app is consistent with Chrome’s documented capture indicator; it cannot be removed by app CSS. Added an explicit separate-window choice before capture, preserving native indicators and the browser picker. In-app capture now fails closed if cropTo is missing, rather than publishing an uncropped tab. PASS — implementation and final geometry/security regressions verified.

Verification: final production build, lint, typecheck and docs check PASS; 373 unit tests PASS. Final browser batch: 14/14 PASS on desktop/mobile projects, including active presenter layouts at 1920×1080, 1280×720, 1280×540 and 390×844; crop/annotation behavior; explicit window selection; incoming 4:3 video and subsequent resize to 2:1 with matching overlay; stopped tracks and no publication when cropTo is unavailable. Screenshots active-demo-fit-*.png reviewed. Evidence: .local/ux-audit/demo-fit-final.log and demo-fit-unit.log. Browser capture-picker/system-border behavior was researched in Chrome documentation but not live-automated; no claim is made that the browser-owned blue indicator is removed. Separate-window mode avoids cropping the current app tab while preserving the native chooser and indicators.

## Captured-tab fullscreen side bands — 2026-11-09

The new annotated screenshot identifies broad gray bands outside the room, distinct from the blue capture indicator. Chromium documents special native fullscreen behavior for captured tabs. See [[docs/Features/Link Demo]] and [[docs/Features/Platform UX]]. An active current-tab presenter now expands the room with a fixed viewport overlay instead of requesting captured-tab native fullscreen. Starting capture from native fullscreen also transitions to the overlay. The iframe and crop target stay mounted; unrelated shell navigation is inert until exit, body scrolling is restored, and the exit button regains focus. Native fullscreen remains available for viewers, local rooms and separate-window presenters.

Regression coverage includes the actual Shell, viewport bounds at five widths, both capture/fullscreen entry orders, live iframe identity, one publication across transitions, resizing, Escape/button exits and background navigation restoration. A real Region Capture case uses a dedicated test-owned Chromium with the documented current-tab auto-accept test flag, never the user's browser or account; LiveKit transport remains an SDK fixture.

Verification: 373 unit tests and the 26-case desktop/mobile UI regression batch PASS. Real Chromium tab capture and cropTo PASS with a live browser-surface track, native fullscreen exited before the picker, viewport-filling geometry after resize, and the same live track after exit. Screenshot real-tab-capture-fullscreen.png reviewed. The default Playwright headless shell rejected capture; the full Chromium channel initially timed out, and the final run passed after preparing page mode before capture. This does not verify two-account LiveKit delivery. Evidence: .local/ux-audit/captured-fullscreen-unit.log, captured-fullscreen-e2e.log and captured-fullscreen-real.log. Lint excludes only generated .local artifacts using --ignore-pattern; application/test sources remain checked. Final production build, typecheck, docs check and lint PASS; six focused desktop/mobile transition regressions against the final build PASS (captured-fullscreen-transitions-final.log).

## Room Studio and adjustable room panels — 2026-11-09

See [[docs/Features/Room Studio]]. Scope: movable/resizable stage and sidebar in normal/fullscreen mode, minimize/expand/reset, edge drawer for demo tools, Demo-first stage order, music-specific sources and tips without Website/Browser, redesigned local/server creation with fandom/album format cards, optional fandom with Other display, wrapped Russian network tags and local artwork palettes.

Implementation: stable RoomLayout panes preserve media DOM and capture targets; floating panels are constrained to the room and have keyboard controls. Narrow screens stack panes. Minimized stage keeps a small visible preview so its capture target is rendered; conversation can collapse to a strip. Tools become inert while tucked against the fullscreen edge. Creation uses existing attributed fandom thumbnails and top-track artwork; 148 palettes are extracted from local images with a reusable Sharp script. No generated identity or fake multi-user data is added.

Migration 24 updates create_room to accept null fandom for public rooms, preserving verified account checks, advisory locking, the 20-room cap, owner membership, foreign keys and grants. It is unit-tested against PGlite; remote application is not performed, with cloud DDL previously deferred. UI failures remain explicit until the migration is applied. Tests replace the obsolete mandatory-public-fandom expectation with optional-null forwarding plus invalid-ID rejection.

Verification: all 374 unit tests PASS (room-studio-unit-final.log); the broad desktop/mobile UI regression batch is 38/38 PASS (room-studio-e2e-final.log). Initial checks exposed an obsolete 400px iframe threshold after adding pane handles and a narrow empty-stage footer overlap; assertions now check available frame bounds and natural content flow instead. Visual review also caught format-card margins inherited from form labels and nested scrolling that clipped narrow stages. Format/visibility cards are aligned, and narrow room panels now stack with outer scrolling. Latest focused geometry checks and real Region Capture results follow below. Palette-card, creation and movable-pane screenshots were inspected.

Final verification: latest production build, lint, typecheck and docs check PASS. Fourteen focused desktop/mobile checks PASS on the final build, including explicit stage-within-pane bounds at 360/390/768px, shared fullscreen stages/voice and public Other draft creation/reload (room-studio-layout-verified.log). Real Chromium Region Capture/cropTo PASS separately, including a live browser track through minimizing to visible preview, restoring, viewport resize and fullscreen exit; LiveKit transport remains a fixture, not a two-account delivery claim (room-studio-real-capture.log). A prior real-capture run timed out in the busy full batch; the separate final run passed. Inspected final room-studio-create-*.png, room-studio-cards-*.png, room-studio-panels-*.png, fullscreen-layout-360-desktop.png and real-tab-capture-fullscreen.png. Lint ignores only generated .local artifacts. Remote migration 24 remains unapplied.

## Fit short demo viewports and resize docked display — 2026-11-09

See [[docs/Features/Room Studio]]. The new screenshot shows excessive room/pane chrome and a very short captured viewport while the chat panel is collapsed. Scope: fit the entire shared fullscreen shell to short desktop/zoomed viewports, give the live canvas most of the height, and expose docked two-axis resizing without undocking. Added a corner grip, numeric width/height editor, bounds clamping and Fit to window. Docked resize keeps its layout slot and iframe; moving a manually sized pane starts from its visible bounds. Fullscreen controls share the compact room bar and the empty reset row is removed. The captured site retains normal iframe scrolling.

Verification: production build, lint, typecheck and docs check PASS; all 374 unit tests PASS. Ten desktop/mobile fullscreen, presenter, viewer, browser and movable-pane regressions PASS (demo-sizing-regression.log). The final four-case DPR 1.5/sizing batch PASS (demo-sizing-e2e-final.log): normal-mode numeric/corner sizing, readable canvas and tool drawer at 600×340, fullscreen at 1920×900, 1280×580, 1280×480 and 960×540 with chat collapsed, no outer/pane scrolling, canvas height over 52% and width over 85%, oversized input clamping, iframe identity and one publication. Manually sized normal panes now use the edge drawer too. Inspected demo-sized-normal-desktop.png and demo-fit-window-1280-580-desktop.png. Lint excludes only generated .local artifacts. Real Region Capture verification follows below.

Real Chromium Region Capture/cropTo PASS (demo-sizing-real-final.log): live browser-surface track through 900×600 numeric sizing, automatic fit, minimizing/restoring, viewport resize and exit; iframe identity retained. The initial run timed out because the reset icon intercepted the size button at that width. Reset now shares the pane action row instead of floating over it; the final real-capture run passed in 27.5s. Inspected real-tab-capture-fullscreen.png. LiveKit delivery remains an SDK fixture; this does not establish two-account delivery.

Final verification after moving reset: 12/12 desktop/mobile layout regressions PASS (demo-sizing-layout-final.log), alongside the separate real-capture PASS above. Latest production build, lint, typecheck and docs check PASS. No further product changes followed these checks.

## Demo fullscreen with chat and opposite-edge tools — 2026-11-10

See [[docs/Features/Room Studio]] and [[docs/Features/Link Demo]]. Scope: an owned Expand with chat control in the demo header uses RoomFullscreen, preserving the sidebar and stable iframe/crop target. Demo iframes explicitly deny native fullscreen, including nested players, so an external video's fullscreen cannot cover the conversation. Cross-origin player buttons are not intercepted or remapped; this expands the entire demo page. The drawer defaults to the left and mirrors to the right when conversation is docked left, with matching handle direction.

Verification: all 374 unit tests PASS (demo-chat-unit.log). Production build, lint, typecheck and docs check PASS. The 12-case desktop/mobile UI batch PASS (demo-chat-e2e.log), including browser-enforced rejection of nested fullscreen, restoring a hidden chat, owned fullscreen before capture, page mode during capture, entering theater mode in an already fullscreen room without closing it on restore, non-overlapping tools on both sides, one publication and iframe identity. Reviewed demo-chat-edge-left/right-desktop.png.

The final focused desktop/mobile pair PASS after retaining corner resizing in expanded mode (demo-chat-sizing-final.log): both dimensions change without hiding chat or remounting the iframe. The final build/static checks PASS. Real Chromium Region Capture/cropTo PASS through expanding/restoring the demo, numeric resizing, minimizing/restoring, viewport resizing and fullscreen exit with a live browser-surface track (demo-chat-real-final.log). LiveKit transport remains an SDK fixture, not a two-account delivery check. No external player button is claimed to be intercepted or remapped. Lint excludes generated .local artifacts only.

## Restore native demo fullscreen — 2026-11-10

See [[docs/Features/Room Studio]]. User requested restoring the external player's original fullscreen while keeping the side editing drawer and the owned Expand with chat / Normal view with chat button. Removed the iframe fullscreen denial and restored delegation (including allowFullScreen). No room expansion, sidebar, tool drawer, sizing or capture implementation is reverted.

Verification: production build, lint, typecheck and docs check PASS; 374 unit tests PASS (fullscreen-restore-unit.log). The focused desktop/mobile browser pair PASS (fullscreen-restore-e2e.log): a real nested cross-origin request enters native fullscreen before capture and from the owned expanded view with capture/transport fixtures, exits cleanly, and retains the working Normal view with chat button. Chat visibility, opposite-edge tools, corner sizing and iframe/publication identity checks also PASS. The separate real Chromium Region Capture/cropTo test PASS with a live browser track through the retained owned expansion, numeric resize, minimize/restore and exit (fullscreen-restore-real.log); LiveKit transport remains a fixture. Lint excludes generated .local artifacts only.

## Poland pre-publication rights review — 2026-11-10

See the internal legal review. Reviewed source/catalogue/rendering paths, source-specific and generic players, LiveKit/Hyperbeam media, uploads, legal/consent/moderation flows and local package licence metadata. Owner supplied Poland. Primary Polish/EU legislation, CJEU cases, Wikimedia/CC, Spotify/SoundCloud and EUIPO materials were checked. The application was not modified, published or restricted.

Evidence snapshot: docs/audits/legal-evidence-2026-11-10.json. Effective catalogue: 150 artworks, 98 needing rights review (50 Fair use, 48 explicit unestablished-permission records); 55 verified-availability legacy watch links without rights evidence; 324 public files; 15 direct runtime packages, 88 in the local runtime graph, 454 including tools. Main launch blockers concern content permissions/curated sources, rebroadcast scenarios, inconsistent legal claims, null operator facts, unavailable notice process and music aggregation/artwork terms. Package metadata is not a complete release SBOM or legal clearance. No foreign-source catalogue was declared categorically unlawful solely from its domain.

Verification: static inventory and JSON parsing succeeded; npm run docs:check PASS (164 notes, 81 RU/EN pairs). Application tests/build were not rerun for this documentation-only audit. Rights clearance, owner details, provider agreements, live data-flow verification and trademark searches remain unresolved; report completion does not mark those items complete.

## 2026-11-11 — Publication content cleanup

Implemented [[docs/Features/Publication Content Cleanup]]: removed 80 legacy editorial watch links and Re:ANIME/LiveBall parsing; replaced 98 effective images and deleted 184 superseded public files; added bilingual demo-rights warning, seven Russian legal documents, shared owner-provided email and operating country. Operator identity, hosting and other unconfirmed facts remain placeholders. Discord request bodies are drafts only; no messages sent. Remaining legal audit points are not cleared.

## 2026-11-11 — Overview, photography and privacy facts

Subsequent owner request implemented: standalone `/overview` without the app sidebar, floating editorial tiles, interactive scenario previews, radial feature navigation, mobile menu and large multi-column footer. Public privacy description removes the operator and unprovided-fact blocks; minimum age is 16 and Terms/Privacy versions are 0.4. Other legal documents retain their existing identity/placeholders. This is not legal clearance. See [[docs/Features/Project Overview]] and [[docs/Features/Legal Pages]]. All 377 unit tests passed; build/lint/types/docs passed. Fourteen legal e2e cases passed; final overview-only run after CSS fixes passed 6/6, including paper-theme mobile contrast. Five-width geometry and visual screenshots reviewed. No deployment or external messages. Original avatars remain restored.

Implemented [[docs/Features/Project Overview]]: public bilingual presentation, overview/Discord/Telegram links in regular and compact footers, original fandom avatars restored from bf3a46f at the owner’s explicit request; experimental abstract and stock-photo replacements removed. Source and parser removals stay intact. Prior artwork rights concerns are not cleared. Minimum age (later set to 16) is recorded; Terms/Privacy draft version 0.3 states that parental consent verification is not implemented. Remaining preparation is listed in [[docs/Privacy Policy Checklist]]. No deployment, bot, webhook send or external account changes.

Validation: final production build and lint PASS; types/docs check PASS; final 20 desktop/mobile browser cases PASS, including overview RU/EN, dark/paper contrast, overflow, restored Dune poster and both footer variants. Full unit run: 375/376, existing music queue ordering instability; isolated six-test file PASS. Whole-suite rerun: 368 executed, eight skipped by a PGlite setup timeout; isolated eight-test media suite PASS. Changed artwork/legal tests PASS in both full runs. These unrelated instabilities were not hidden by changing authorisation or test timeouts. Logs: `.local/ux-audit/overview-restore-*`.
