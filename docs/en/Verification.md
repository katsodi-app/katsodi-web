# Verification

> English · [[docs/Verification|Russian original]]

## Local microphone test, 2026-11-03

Scope: [[docs/en/Features/Microphone Check]]. LiveKit, Supabase and cloud settings were unchanged.

- npm run lint, npm run typecheck and production build passed.
- npm run unit -- --maxWorkers=2: **126/126**, 21 files. New checks cover audio-only constraints, RMS, timeout, late streams after cancellation, AudioContext release, device loss, permission errors and unsupported contexts.
- npm run e2e -- --config .local/voice-production.config.ts tests/e2e/chat-design.spec.ts tests/e2e/brand-states.spec.ts tests/e2e/fandom-connections.spec.ts --workers=1 --output=.local/microphone-e2e: **46/46**, desktop/mobile, 1.5 minutes. New cases: opening without capture, synthetic Web Audio levels, track release before joining, delayed-permission cancellation and RU/EN errors. The user's actual microphone was not used. Working-app Auth/RLS were unchanged; full regression of other routes was not repeated.
- npm run docs:check: **58 notes**, valid wikilinks. .local/microphone-check-mobile.png was visually reviewed.

A separate production build ran on port 3001; the user's dev server was not stopped. Local signal analysis does not prove actual audibility between two clients or SFU availability. Cloud voice setup remains in [[docs/en/Voice Setup]].

## Voice lounge and LiveKit preparation, 2026-11-03

Scope: [[docs/en/Features/Voice Chat]]; connection: [[docs/en/Voice Setup]]. The user confirmed there is no LiveKit yet: code, migration and instructions were prepared without creating a cloud project, sending email, capturing a real microphone or executing Supabase SQL.

- npm run lint and npm run typecheck passed. Production build passed, including new room-voice and internal-worker endpoints.
- npm run unit -- --maxWorkers=2: **122/122**, 20 files. Checked one-minute room-scoped microphone-only JWTs, server-derived identity, no tokens for outsider/kicked/closed/anonymous/unconfigured/stale-worker cases, Origin and scheduler credentials. PGlite checks private RLS tables, durable kick/close/email revocation and heartbeat. Worker mocks cover SFU removal, failed-job retention, not_found and health checks before readiness.
- npm run docs:check: **57 notes**, valid wikilinks.
- On existing dev server 127.0.0.1:3000 the affected suite produced **36/40**: voice/brand-state cases passed; four fandom navigation/form cases timed out. The user's server was not stopped; the cause of its state was not definitively established.
- On fresh production 127.0.0.1:3001, the same chat-design/brand-states/fandom-connections suite passed **40/40**, desktop/mobile, two minutes. Used ignored .local/voice-production.config.ts and a separate temporary next start, not the user's process. Results: .local/voice-production-e2e. Full regression of other routes was not repeated.
- After final fixes, four production voice cases were rerun: **4/4**, 42.9 seconds, .local/voice-verified-controls. Fixed the language-switch test selector, accessible device label and mobile horizontal shift caused by decorative orbits: overflow:clip prevents hidden scrolling. Checked system audioinput, deafen, speaking events, settings, access revocation and teardown; controls remain inside the card.
- The browser harness substitutes SDK, token/access API and remote tracks. It tests actual UI code, not real audibility. Working Auth/RLS were not weakened. .local/voice-lounge-desktop.png and .local/voice-lounge-mobile.png were visually reviewed.

Cloud, TURN, actual two-account audio, Cloud token revocation and the real scheduler require acceptance after setup. SFU revocation is asynchronous; delays/failures are described in [[docs/en/Voice Setup]]. Recheck the old dev server after restarting; production checks are not proof its timeouts were fixed. Secrets/research artifacts are not committed; no remote/push operations occurred.

## General public-player discovery, 2026-11-03

Scope: [[docs/en/Features/Generic Player Discovery]]. Added parse5 7.3.0 and updated pnpm-lock. Cloud migrations, accounts and RLS were unchanged.

- npm run lint and npm run typecheck passed. A generated research bundle containing dependency code was initially scanned by lint; it was retained as text, and subsequent research builds use external packages. Application lint rules were not weakened.
- npm run unit -- --maxWorkers=2: **111/111**, 16 files. Transport checks IP/DNS pinning, mixed public/private DNS, redirects into LAN, loops, size, MIME and timeout. Parser/resolver checks AST, relative/lazy/entity URLs, JSON-LD, JS containers, declared fullscreen iframes, native fallback, CSP, cycles and missing players.
- npm run e2e -- tests/e2e/chat-design.spec.ts tests/e2e/brand-states.spec.ts tests/e2e/fandom-connections.spec.ts --workers=1 --output=.local/generic-player-e2e: **36/36**, desktop/mobile, 57.9 seconds. The new unknown-domain case checks iframe, sandbox, external URL and no overflow. Fixtures replace server responses/external iframes, not working-route authorization. Other-page full regression was not repeated.
- npm run docs:check: **56 notes**, valid wikilinks; production build passed.
- Actual general resolvePlayer found original player pages on https://videojs.com/ (public redirect to https://videojs.org/) and https://plyr.io/ without domain-specific adapters. HTML/headers were checked, not playback. mediaelementjs.com returned unavailable; W3C mediaevents blocked; MDN tabbed/video and example.com notFound. These results were not replaced with fake success.

No arbitrary third-party scripts ran on the server, sessions were not copied and video streams were not downloaded. Universal site support and synchronized play/pause are not claimed. Shared-source migration/two-real-account acceptance remain — [[docs/en/Backend Setup]].

## Re:ANIME and LiveBall discovery, 2026-11-03

Scope: [[docs/en/Features/Player Discovery]]. api-anything was reviewed at a pinned commit; its SDK was not installed. No cloud-schema changes were needed or performed.

- npm run lint and npm run typecheck passed. Initial lint found third-party research sources in ignored .local; saved copies were renamed as text. Application lint rules were unchanged.
- npm run unit -- --maxWorkers=2: **97/97**, 14 files, including five new recipe/JSON/CSP/LiveBall cases and existing authorization checks.
- npm run docs:check: **55 notes**, valid wikilinks.
- npm run e2e -- tests/e2e/chat-design.spec.ts tests/e2e/brand-states.spec.ts tests/e2e/fandom-connections.spec.ts --workers=1 --output=.local/discovery-e2e-results: **34/34**, desktop/mobile, 1.1 minutes. Actual components use mocked APIs/iframes; this is not full playback or two-real-Supabase-account acceptance. Other-route full regression was not repeated.
- Actual new resolvePlayer returned FlixCloud iframes for Spirited Away ep=1, Naruto ep=2 and One Piece ep=1, with autoPlay=false. Only public HTML/JSON metadata was requested.
- During the user-provided LiveBall /match/1493215 broadcast, an ordinary browser showed the original page/native player inside a localhost iframe. After the date changed, the resolver returned notFound because the response no longer had an active player. /match/1635723 returned notStarted. Broadcast state was not replaced with a viewing promise. Playback was not manually started.
- Production build passed. The temporary public research HTML was removed before building. Secrets, .local and .obsidian are excluded from changes; no remote/push.

Shared pause/seek, the cloud source-change migration and two-live-account acceptance remain separate tasks — [[docs/en/Features/Room Player]], [[docs/en/Backend Setup]].

## Room player, 2026-11-02

Scope: [[docs/en/Features/Room Player]]. No cloud SQL ran: source_updated_at/set_room_source migration is prepared for the project owner. No service-role key is required or used.

- npm run lint and npm run typecheck passed.
- npm run unit -- --maxWorkers=2: **92/92**, 13 files: URL/iframe allowlist, redirect/restrictive-CSP denial, HTML limits, cache, API membership and database-only source, owner/moderator/member/outsider roles, throttle, kick and close. Server Actions do not accept client actors.
- npm run e2e -- tests/e2e/chat-design.spec.ts tests/e2e/brand-states.spec.ts tests/e2e/fandom-connections.spec.ts --workers=1: **32/32**, 2.3 minutes, desktop/mobile. Four player/source cases repeated after the footer fix: **4/4**, 37.7 seconds. Reports: .local/player-e2e-results and .local/player-final-ui-results. Full other-route regression was not repeated.
- The harness uses actual components with substituted Server Actions, room API responses and iframe content. Two independent role contexts received one updated source through polling; this is not two-real-Supabase-account acceptance.
- Independently of mocks, the resolver made a real HTTP request to Dune: returned https://api.nextembed.ws/embed/movie/36036; source/embed HTML returned 200 without player XFO/CSP prohibition.
- Actual external iframes were additionally opened in a separate browser HTML harness with identical sandbox/referrer settings. YouTube showed the official Google for Developers test video; NextEmbed showed start, Russian dubbing and 02:35:25 duration. .local/live-iframe-check.png was reviewed. Play was not clicked: actual playback, regional stream availability and shared synchronization are unverified.
- npm run build passed, including /api/rooms/[roomId]/player and 24 static pages.
- npm run docs:check: 54 Markdown notes, valid internal links.

New room screenshots: .local/player-desktop.png and .local/player-mobile.png. Visual review found inherited global footer spacing; it was fixed/rechecked. Supported saved URLs can embed; changing the shared source requires the new migration, with controls disabled until then. Local drafts are not presented as shared rooms; automatic Kinogo discovery requires verified real-room membership. Shared pause, seek and timeline are **not implemented**. Re:ANIME/other disconnected sources remain external. Details/sources: [[docs/en/Features/Room Player]]; setup: [[docs/en/Backend Setup]].

## Fandoms and rooms, 2026-11-02

Implemented [[docs/en/Features/Fandom Rooms]] and [[docs/en/Fandom Sources]]: required public-room fandom, navigation from every card/search, 150 RU/EN descriptions, 80 specific external links and server filtering for open public rooms. No cloud migration applied — [[docs/en/Backend Setup]].

- npm run lint and npm run typecheck passed after the final search fix.
- npm run unit -- --maxWorkers=2: 82/82, 10 files. Checked new RPC, FK, legacy drafts, anonymous denial, private/closed filtering and safe next preservation through login.
- npm run docs:check: 53 Markdown notes, valid wikilinks.
- Full npm run e2e after splitting long cases: 204 checks, 148 passed, 51 skipped, 5 failed, 18.6 minutes. Skips covered other-project viewports and the deliberately inactive missing-Supabase branch. Failures: desktop password-recovery wait, three search transitions and a mobile private-draft scenario timeout.
- Search results were then changed to explicit-href links; dialog closing/companion state run in a transition. Password recovery separately waits for the cold-navigation URL. All auth cases, new fandom cases, both searches and private drafts were repeated on desktop/mobile: **16/16 passed**, one worker, 2.6 minutes; .local/fandom-focused-results.
- npm run build passed after the final search fix: TypeScript, 24 static pages and dynamic routes built.
- The complete 204-check suite was not rerun after the last search fix and is not declared entirely green. Repeated problematic cases passed.

Responsive cases were split by page/width, themes by theme and search by result type; existing size/color/navigation/capability assertions were retained. The isolated protected-screen fixture gets its own Next navigation adapter; working authorization/RLS were not weakened. Before splitting, the aggregate suite exposed cumulative timeouts in large mobile cases; these were not counted as successes.

The mobile fandom page was visually reviewed: poster, description, source, viewing link, room list/error and recommendations. Screenshots: .local/fandom-detail-desktop.png and .local/fandom-detail-mobile.png. Actual external video playback, cloud SQL migration and two-real-account collaboration were not checked. No mail or remote/push operations.

## Version 0.4 — all pages, 2026-11-02

Scope: [[docs/en/Page Catalogue]] and [[docs/en/Features/Brand Pages]]. All known specification routes and gate/empty/404/error/loading states are styled. No cloud changes; friends/global moderation remain explicitly labeled visual sections without backends.

- npm run lint passed without warnings.
- npm run typecheck passed.
- npm run unit: 76/76, eight files. Added RU/EN design-string parity and allowlisted internal next=/onboarding.
- npm run docs:check: 51 Markdown notes, valid wikilinks.
- npm run build passed, including new dynamic pages and /invite/[token].
- Full npm run e2e: 142 cases, 114 passed, 27 skipped and one visible-text selector error in mobile auth; 7.9 minutes. Twenty skips cover missing configuration; seven cover another project's viewport. All 70 new brand-pages/brand-states checks passed in this run.
- After the error, auth assertions were scoped to visible current-form text because the general locator found a hidden duplicate. All six desktop/mobile auth cases were rerun: 6/6, 11.9 seconds. The full suite was not rerun after this test-selector change and is not claimed as another entirely green run.

New checks cover 24 desktop/mobile addresses: HTTP status, h1, no horizontal overflow and screenshots. Also checked persisted fandom selection, RU/EN and Paper on five new pages, invitation alias no-referrer/no-store, profile/onboarding forms, creation preview, error-boundary retry and skeleton loading. Protected forms use actual components with mocked Server Actions in isolation; product Auth/RLS were not weakened.

Images: `.local/brand-pages`. Visually reviewed landing, rooms, creation, settings, fandom, friends, invitation, profile/onboarding, moderation and light English screens. Fixed vertical navigation overflow on short desktops, long mobile-navigation labels and a double period in a heading. Initial tests found an ambiguous heading name and searchbox/textbox mismatch in test search; selectors were refined without dropping scenarios.

Windows Application Control blocked the native Rollup DLL before Vitest, including outside the sandbox. Official portable @rollup/wasm-node 4.67.2 was used via pnpm override; system protection was unchanged — [[docs/en/Development Setup]].

No email, real profile/room mutations, friend requests, moderation queues or cloud media migration were performed in this phase. Safari, real phones, full accessibility contrast and production deployment were not checked. The user's dev server was not forcibly stopped. No secrets committed, remote/push or publication.

## Version 0.3 verification history

## Room window and media messages

New interface: [[docs/en/Features/Room Experience]]; limitations/setup: [[docs/en/Features/Chat Media]]. Supabase was unchanged; the media migration was only prepared. The user will check two real accounts later.

Final lint, typecheck, unit (75/75), docs:check (47 notes) and production build with current `.env.local` passed. Units include eight new PostgreSQL/Storage-policy tests with storage table shims, four actual Sharp-decoding checks, six mocked-Supabase HTTP API checks and an additional sticker-allowlist/sender-spoofing check. This is not cloud Storage gateway testing.

Full npm run e2e: 43 passed, 27 skipped (20 missing-configuration cases, seven other viewports), 1.4 minutes. After extending media checks, chat-design repeated separately: 8/8, 16.1 seconds. Checked Enter send, sticker selection/send, image size/MIME, preview/remove/send, no overflow, disabled attachments without migration, EN and hiding loaded chat after 404. The fixture bundles actual components/CSS with esbuild and replaces Server Actions/APIs only in tests; no app authorization bypasses. `.local/chat-room-desktop.png` and `.local/chat-room-mobile.png` were reviewed; mobile heading sizing was fixed afterward. Initial button/hidden-file-input ambiguity was removed by excluding the native input from the accessibility tree. Helper-test Buffer/SQL-result type errors were fixed before a successful build.

Migration `20261101000300_chat_media.sql`, actual upload/download, Storage gateway cleanup and network races remain acceptance tasks after migration. Browser images/messages are test data; the agent sent neither email nor cloud messages.

## Sign-in interface update

Separate auth layout, login/signup tabs, password reveal, recovery/verify and post-email instructions: [[docs/en/Features/Auth Experience]]. The user reported receiving email; the agent sent none. Local rooms explain draft mode and link to shared rooms.

After changes, lint, typecheck, production build with current `.env.local`, docs:check (45 notes) and 56 unit/SQL checks passed. Full connected-Supabase browser run: 35 passed, 27 skipped (20 specifically missing-configuration cases, seven incompatible viewports), 4.9 minutes. Missing-configuration checks remain and activate without Supabase. After adding draft navigation, auth-design repeated: 6/6 desktop/mobile, 20.4 seconds. Checked RU/EN, next, password reveal, recovery/verify, absence of general navigation and horizontal overflow. `.local/auth-redesign-desktop.png` and `.local/auth-redesign-mobile.png` were reviewed. Automated browser runs do not trigger successful email sending/new post-send screens, avoiding account creation/mail delivery.

Date: 2026-11-01. Windows, Node 20.11, Chromium desktop/mobile. After initial unconfigured checks, the local app was connected to Supabase; the email scenario is still pending.

## Cloud project connection

URL/public key are stored in ignored `.env.local`. Read-only Auth settings, fandoms and rooms requests using the public key returned 200; Email/signup are enabled and confirmation required. These tables do not prove every migration was applied. The agent executed no cloud SQL, sent no mail and created no accounts.

Connected-state `/signup`, `/login` and `/network` were checked in Chromium at 1440/390px: all six navigations returned 200, without backend-notice/horizontal overflow, with enabled password fields. The existing dev server was used. The full regression below belongs to the earlier check without cloud keys; it was not entirely repeated after connection.

## Checks actually executed

- npm run lint: no errors/warnings.
- npm run typecheck passed.
- npm run unit: 56/56, including 12 PostgreSQL/RLS PGlite tests, nine mocked-Supabase Server Action tests, 13 contract/configuration checks and 22 existing checks.
- npm run docs:check: 44 Markdown notes, valid wikilinks.
- npm run build: successful Next.js production build without cloud keys; new pages, APIs, callback/confirm and proxy compiled.
- npm run e2e: 51 passed, seven intentionally skipped for incompatible project viewports, 5.0 minutes.
- After signup-form alignment, both desktop/mobile form cases were repeated: 2/2 passed, 8.5 seconds.

## Permissions and SQL

The actual migration/seed execute on isolated PGlite PostgreSQL. Test auth.users/auth.uid and anon/authenticated roles model verified identity only; tests do not verify real Supabase JWT issuance. Product code contains no test bypasses.

Checked: anonymous public catalogue; private-room isolation; owner/sender/role spoofing denial; unverified-email denial; hash-only invitations and hiding token_hash even from owners through Data API; usage limit, revocation and separate expiry; active-member-only chat; read/write denial after kicks; access-checked deletion with room locks; atomic profile/interests with rollback; departed moderator role revocation; post-close write denial; private-read denial after email-confirmation withdrawal.

## Interface

Without configuration, /login, /signup, /forgot-password, /verify-email, /reset-password, /account, /network, /network/create and /join explicitly report server unavailability. Auth fields are disabled; RU/EN checked. Invalid auth codes are not confirmed, external next is rejected and /api/rooms/[id] does not disclose a room.

Existing local rooms, URL security, bookmarks, fandoms, skip link, 404, themes and navigation passed regression. Equal posters on /home and /fandoms were checked on desktop/mobile. Five main screens were checked at 360, 390, 768, 1024, 1440 and 1920px; snapshots: .local/qa. Auth previews .local/backend-signup-desktop.png and .local/backend-signup-mobile.png were reviewed.

Initial runs found password labels including hints and cold transitions exceeding the default five seconds. Hints moved to aria-describedby; independent page/viewport cases were separated; assertions wait 15 seconds. All checks were retained and authorization was not weakened. The final complete run passed. The user's dev server was not stopped.

## Still unverified

Completeness of cloud migrations, authorized Supabase Auth/PostgREST, email confirmation/recovery, cookie refresh across real clients, concurrent redemption/rate limits, Auth-session revocation and production permissions remain acceptance tasks. Chat polls every three seconds; Supabase Realtime, voice, embed, Storage/avatars and global moderation auditing are not implemented. Safari, real devices and full accessibility/security audits have not been completed.

Neither site nor SQL was published; emails were not sent and no remote/push occurred. The local CI file uses updated tests, but remote CI was not run.

## Related notes

- [[docs/en/Backend Setup]]
- [[docs/en/Features/Authentication]]
- [[docs/en/Features/Server Authorization]]
- [[docs/en/Features/Server Rooms]]
- [[docs/en/Features/Room Invitations]]
- [[docs/en/Features/Room Chat]]
- [[docs/en/Roadmap]]
