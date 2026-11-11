# Roadmap

> English · [[docs/Roadmap|Russian original]]

## Update 2026-11-08

- [x] [[docs/en/Features/Music Player]] — Music navigation, 100 verified SoundCloud tracks, 60 curated trending tracks, persistent playback and unified search; one live SoundCloud track checked separately from SDK fixtures.

- [x] [[docs/en/Features/Profile Settings]] — organized sections, thumbnails and corrected avatar display.
- [x] Restored the previous logo at the user’s request.
- [x] [[docs/en/Features/Music Discovery]] — available source charts, most-played list and direct room listening.
- [ ] Apply migration 23, configure provider credentials and activate the published weekly workflow.
- [x] [[docs/en/Features/Music Activation]] — read-only readiness CLI, owner SQL acceptance and exact setup steps; current Spotify playlist OAuth remains unimplemented.
- [x] [[docs/en/Features/Page Loading Performance]] — smaller downloads and stable loading; the overall mobile Lighthouse 80 target remains open.

## 0.1 — first working phase

- [x] Next/TypeScript/Tailwind, Git and Obsidian documentation.
- [x] Responsive shell and original covers.
- [x] RU/EN with persisted preference.
- [x] Catalogue, search, format, local rooms and bookmarks.
- [x] 150 fandoms, search and local selection.
- [x] Safe source recognition in companion mode.

## 0.2 — visual update

- [x] Five themes and system appearance.
- [x] Manrope, soft gradients and editorial slideshow.
- [x] Real covers and image sources.
- [x] Responsive collections and preserved logo.

## 0.3 — backend foundation

- [x] Migrations, RLS and access-denial tests on a PostgreSQL engine.
- [x] Forms/Server Actions for email signup/verify/login/reset, profile and interests.
- [x] Shared-room code, roles/membership and limited invitations.
- [x] Chat code with polling and database access revocation.
- [x] Updated shared-room design, stickers and compressed images: [[docs/en/Features/Room Experience]], [[docs/en/Features/Chat Media]].
- [ ] Apply the media migration and accept actual Storage upload/view/revocation.
- [x] Create a Supabase project and apply migrations ([[docs/en/Backend Setup]]) — migrations 0100–1800 applied on 2026-11-05/06.
- [ ] Configure email/SMTP; accept signup, reset and two actual clients.
- [x] Connect Realtime — room signals verified live on 2026-11-05 (11 signals in 4 minutes, no content in payloads).
- [ ] Avatars, expanded profile settings and moderation auditing.

## 0.4 — branded design for every screen

- [x] Shared intros, cards, states, forms, settings and responsive navigation.
- [x] Separate landing page and home shortcuts.
- [x] Each fandom has a real-poster detail page and local follow action.
- [x] Profile, onboarding, friends, moderation and invitation designs.
- [x] Route/limitations map — [[docs/en/Page Catalogue]].
- [ ] Connect future friends/global-moderation services; complete live backend acceptance.

## Fandoms and shared rooms

- [x] Required public-room fandom, poster/search links, RU/EN descriptions and specific viewing URLs.
- [x] Relationship migration and open-public-room-only queries — [[docs/en/Features/Fandom Rooms]].
- [x] Apply the Supabase migration and accept with two real accounts (rooms, chat, roles, removal, privacy — 2026-11-05).

## Next phases

- [x] YouTube/MP4/WebM room player, validated Kinogo iframe discovery and capabilities — [[docs/en/Features/Room Player]].
- [x] Reviewed Re:ANIME/LiveBall recipes, public JSON and original-page fallback — [[docs/en/Features/Player Discovery]].
- [x] General public-HTTPS iframe/native discovery with DNS/IP protection — [[docs/en/Features/Generic Player Discovery]].
- [x] Apply the source migration in the cloud and accept source changes with two real accounts (playback, sync and queue — 2026-11-05).
- [x] Shared play/pause/seek timeline for YouTube, Vimeo and SoundCloud through their official player APIs — [[docs/en/Features/Shared Playback]].
- [x] Content-free Realtime room signals, now-playing details from oEmbed, and a room queue with auto-advance — [[docs/en/Features/Room Queue]].
- [x] Voice polish (per-participant volume, speaker choice, safe auto-rejoin) and a Hyperbeam shared browser with host-only control — [[docs/en/Features/Shared Browser]].
- [x] Profile media, friends, XP, levels and achievements — [[docs/en/Features/Progression]].
- [x] Apply migrations 0700–1500 in the cloud and add the LiveKit keys. Hyperbeam: no key yet.
- [x] Voice lounge, LiveKit Cloud token/access API and durable revocations — [[docs/en/Features/Voice Chat]].
- [x] SFU-independent microphone test with signal level and safe cleanup — [[docs/en/Features/Microphone Check]].
- [x] Configure LiveKit Cloud, voice migration and a local scheduler (`npm run voice:worker`); voice and link demos work between two accounts — [[docs/en/Voice Setup]].
- [ ] Friends, privacy, moderation/audit, export/delete.
- [ ] Staging, accessibility audit, SMTP, monitoring and backups.
- [x] Room website tab, link demos with host moderation (draw, click hints, pause) — [[docs/en/Features/Room Website]], [[docs/en/Features/Link Demo]].

## Remaining (as of 2026-11-06)

**Accept on the real setup** ([[docs/en/Acceptance Checklist]]):
- [ ] Profiles, friends, XP: avatar/banner upload, friend requests and blocks, daily XP and achievements.
- [ ] Chat images in Storage, voice reconnect and removal from a call, manual keyboard/screen-reader checks.

**Before going public:**
- [ ] Hosting with an HTTPS domain (also makes VK embeds work; locally they need `npm run dev:https`, which failed on the owner's machine).
- [ ] A production scheduler for the voice worker every 30 s (many hosting crons allow only one run per minute).
- [ ] Own SMTP for email (Supabase's built-in sender is heavily rate-limited), the token-hash email template.
- [ ] Rotate the keys that were shared in chat: LiveKit API secret, Supabase secret key, VK keys.
- [ ] Monitoring (`SENTRY_DSN`), backups, staging.
- [ ] Push the local commits to a Git remote.

**Features and polish:**
- [ ] The room follows the host's stage tab; a failed player link offers "Open as website".
- [ ] Hyperbeam shared browser key, if wanted.
- [ ] Moderation audit log, account export and deletion.
- [ ] Remove old CSS layers that newer styles override.
- [ ] Presenting a demo from phones needs a native app; mobile browsers cannot share the screen.

All visual routes/limitations are listed in [[docs/en/Page Catalogue]]. New /friends and /moderation screens present future services rather than completed backends. Without Supabase, auth forms/shared rooms explicitly show unavailability. Unknown routes return 404.

## Related notes

- [[docs/en/Specification]]
- [[docs/en/Verification]]
