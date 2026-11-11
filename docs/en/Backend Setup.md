---
title: "Backend Setup"
type: setup
status: connected-awaiting-acceptance
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/backend, katsodi/setup]
---

# Backend Setup

> English · [[docs/Backend Setup|Russian original]]

On 2026-11-01 the user provided a project URL and public publishable key. They are stored only in Git-ignored `.env.local`; the existing dev server picked up the settings. Read-only Auth settings and fandoms/rooms requests returned 200; Email is enabled, signup allowed and email confirmation required. This confirms public API availability, not every migration or real-user permissions. The agent did not execute cloud SQL. supabase/docker/psql were previously absent from PATH.

`/signup`, `/login` and `/network` were checked in Chromium at 1440px and 390px: HTTP 200, no missing-configuration warning or horizontal overflow; password fields are enabled. Email delivery, actual signup, recovery and multiple clients have not yet been tested. Standard Supabase emails are used.

## Cloud project

1. Create a separate development Supabase project, choose a region and store the database password outside the repository.
2. In SQL Editor, execute `supabase/migrations/20261101000100_foundation.sql` then `supabase/migrations/20261101000200_fandom_seed.sql` in full. Back up an existing database and test migrations in a separate project first. Initial migrations are not intended to be reapplied to an existing schema.
3. Enable Email and mandatory confirmation in Auth. Keep anonymous sign-in disabled and set minimum password length to 12. Current local Site URL: `http://127.0.0.1:3000`. Allow redirects to `http://127.0.0.1:3000/auth/callback` and its `next` variants for `/account`, `/join`, `/reset-password`. Development may use `http://127.0.0.1:3000/auth/callback**`; do not use wildcard domains in production. The application still rejects arbitrary external `next` destinations.
4. Current decision: standard Supabase emails; leave Email Templates and SMTP unchanged. Code already supports PKCE `/auth/callback`; open confirmation/recovery in the same browser/device where the request began, retaining `127.0.0.1`. New passwords require a verified recovery session. Custom HTML in `supabase/templates/confirmation.html` and `recovery.html` remains for future integration and is not needed by the cloud project now.
5. Built-in Supabase sending is for testing: without custom SMTP, delivery is restricted to project-team addresses and rate limits apply. Use the Supabase owner's email for the current test; connect SMTP later for other users, optionally retaining standard email styling. The agent sent no emails in this task. Enter SMTP passwords only in Supabase settings, never public Next variables.
6. Copy `.env.example` to `.env.local` and fill three values:

```dotenv
NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` may replace the publishable key. **The application does not need service-role / sb_secret\_ keys, and they are forbidden in NEXT_PUBLIC fields.** `DATABASE_URL`, SMTP and LiveKit are unnecessary for this phase. Do not commit secrets or send them in chat.

7. Restart the dev server. Production uses Secure/HttpOnly/SameSite=Lax cookies and requires HTTPS; local HTTP is allowed in development. Set public environment variables **before** production build; rebuild after configuration changes. Check `/network`, `/signup` and `/account`.

## Addendum: stickers and images

At the user's request, cloud changes are deferred until the next review. After the two initial migrations, execute **only** `supabase/migrations/20261101000300_chat_media.sql` in SQL Editor. It adds media fields, RPCs and a private chat-images bucket (WebP, 384 KiB) with RLS. Do not rerun the initial schema or make the bucket public. Back up an installed database before migration; the new migration also runs once. Server code supports old text messages; attachment buttons remain disabled until migration.

After applying, use two verified accounts to check stickers, JPG/PNG/WebP up to 2 MB, preview, another member viewing, message/object deletion, denial of new image requests after a kick and uploads to closed rooms. Direct Storage requests must also obey RLS. Local tests use a storage-schema shim, Sharp and SDK mocks; actual cloud Storage is unverified. Details: [[docs/en/Features/Chat Media]].

## Local Supabase with Docker

Configuration is prepared in `supabase/config.toml`. After installing the official Supabase CLI and Docker, run from the project root:

```sh
supabase start
supabase migration up --local
supabase status
```

Copy local URLs/public key from status output into `.env.local`, using the same `127.0.0.1` for app/auth redirects. Inspect local mail through Mailpit/Inbucket on port 54324. `db reset` deletes local data, so it is not a routine setup step here. Only the owner of the shared dev-server process should stop it.

These commands were not executed in this session: Docker/CLI are absent. PGlite is only for isolated SQL tests and does not replace Supabase Auth/PostgREST.

## Checks before backend acceptance

- [ ] Register two test accounts, confirm email, check denial before confirmation and successful login afterward.
- [ ] Check expired/reused links, recovery, password changes, sign-out and session refresh.
- [ ] Save profile/interests, sign out and sign in on another device.
- [ ] Create public/private rooms; the second account must not see private rooms without admission.
- [ ] Redeem a fragment invitation through login and send from another client; messages refresh every three seconds.
- [ ] Exhaust/revoke/expire invitations. Store only hashes; do not expose token_hash through Data API.
- [ ] Remove a member; check read/write/rejoin denial, including direct REST/RPC. Check moderator/owner boundaries, leaving and closure.
- [ ] Test parallel redemption of the last slot and concurrent chat rate limiting on real PostgreSQL.
- [ ] Check RLS advisors, authorized-page caching, credential-free logs, Auth rate limits and SMTP.

Realtime, voice, avatars and global moderation are not ready capabilities. Player capabilities depend on the source — [[docs/en/Features/Room Player]]. The site has not been published.

## Official resources

- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs)
- [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Built-in sending and SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [PKCE and the same-browser requirement](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [CLI config](https://supabase.com/docs/guides/local-development/cli/config)

## Related notes

- [[docs/en/Home]]
- [[docs/en/Architecture]]
- [[docs/en/Features/Authentication]]
- [[docs/en/Features/Server Authorization]]
- [[docs/en/Features/Server Rooms]]
- [[docs/en/Features/Room Invitations]]
- [[docs/en/Features/Room Chat]]
- [[docs/en/Verification]]

## Addendum: fandom rooms

After foundation and fandom_seed, apply supabase/migrations/20261102000400_room_fandom.sql once. Independent of chat_media, it adds rooms.fandom_id and changes create_room to seven arguments. New shared-room creation code is incompatible with the old RPC until migration. Existing rooms are neither deleted nor automatically linked. Acceptance requires two accounts; the agent did not execute the cloud SQL. See [[docs/en/Features/Fandom Rooms]] and [[docs/en/Fandom Sources]].

## Addendum: player and shared source

Voice is connected separately: LiveKit Cloud, voice migration and scheduler are described in [[docs/en/Voice Setup]]. A public Supabase key is insufficient for these server operations; do not send secrets in chat.

Apply supabase/migrations/20261102000500_room_player.sql once over foundation. It adds source_updated_at and set_room_source RPC without changing RLS or requiring media/fandom fields. Unapplied room_fandom/chat_media remain separate steps. Before this migration, members can view existing supported URLs, but source editing is disabled. The agent did not apply the cloud migration. Accept owner/moderator/member behavior and player replacement with two real accounts. Shared pause/seek remain unavailable. See [[docs/en/Features/Room Player]].

## Addendum: role reset on rejoin

Apply supabase/migrations/20261104000700_rejoin_role_reset.sql once over foundation; it is independent of the media/fandom/player/voice migrations. It adds a trigger so that a member who left or was removed always returns as an ordinary member, and a former moderator does not silently regain moderation rights. Existing data is not changed. Not yet applied in the cloud — [[docs/en/Features/Server Rooms]].

## Addendum: message rate-limit index

Apply supabase/migrations/20261104000800_message_sender_index.sql once over foundation. It only adds the `room_messages_sender_recent` index so the one-second send limit stays fast as chat history grows; no schema or permission changes. While a test database is small this is instant; on a large production table, run the statement as `CREATE INDEX CONCURRENTLY` outside a transaction to avoid briefly blocking chat writes — [[docs/en/Features/Room Chat]].

## Addendum: shared YouTube playback

Apply supabase/migrations/20261104000900_room_playback.sql once, after foundation and room_player (it compares against rooms.url and uses the same roles). It adds the room_playback table with RLS and no direct grants, plus get_room_playback/set_room_playback. Without it, rooms keep independent playback and nothing breaks. Accept with two verified accounts: owner plays, pauses and seeks; the member follows, including in a browser that blocks autoplay — [[docs/en/Features/Shared Playback]].

## Addendum: Realtime room signals

Apply supabase/migrations/20261104001000_room_signals.sql once, after foundation (after 0900 too if you use shared playback; its trigger is added only when room_playback exists). In the Supabase dashboard, keep Realtime enabled and allow public channel access (Realtime settings), because the signal channel is public and content-free. Without either, nothing breaks: writes succeed and clients fall back to polling. Accept with two browsers: a message or a host's pause should appear in the other window in about a second — [[docs/en/Features/Room Chat]].

## Addendum: room queue

Apply supabase/migrations/20261104001100_room_queue.sql once, after foundation and room_player (0500). If room signals (1000) are applied first, queue changes also send the Realtime signal. Without this migration the Queue tab stays hidden. Accept with two accounts: the member adds a link, the owner plays it next, and a synced video's end starts the next link — [[docs/en/Features/Room Queue]].

## Addendum: shared browser (Hyperbeam)

Create a Hyperbeam account and API key (check current pricing; sessions are capped at 4 hours and end after 5 idle minutes). Put the key in the server environment as `HYPERBEAM_API_KEY` (never NEXT_PUBLIC, never in chat or Git) and restart. Apply supabase/migrations/20261104001200_room_browser.sql once after foundation (after 1000 too, if you want Realtime signals for it). Without the key or the migration, the Player | Browser switch stays hidden. Accept with two accounts: the owner opens a site and steers it, the member only watches; kicking the member ends the session for everyone — [[docs/en/Features/Shared Browser]].

## Addendum: profile media

Apply supabase/migrations/20261104001300_profile_media.sql once after foundation. It adds the private profile-media bucket and its policies, media columns on profiles, and widens favourite-fandom visibility to the owner and their roommates (the same rule as the profile). Without it the account page simply has no media editor. Accept with two accounts in one room: each sees the other's avatar, banner and fandoms; a third account outside the room sees none — [[docs/en/Features/Profile Media]].

## Addendum: friends

Apply supabase/migrations/20261104001400_friends.sql once after foundation. It adds friend requests, friendships, blocks and a request log with RLS, and extends profile visibility to friends. Without it, /friends keeps the design-only page. Accept with three accounts: request, accept, see each other's profile; block from one side and confirm the other can no longer send a request; a third account cannot see either list — [[docs/en/Features/Friends]].

## Addendum: XP, levels and achievements

Apply supabase/migrations/20261104001500_progression.sql once after foundation and room_player (0500); apply it after 0900 and 1400 if you use shared playback and friends, so their rewards are wired. Rebalance later by editing the `xp_rules` table. Accept with two accounts: a daily visit pays once, joining a room unlocks First Steps, and 15 minutes in a room pays participation — [[docs/en/Features/Progression]].
