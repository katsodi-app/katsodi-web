---
title: "Acceptance Checklist"
type: setup
status: ready-to-run
created: 2026-11-05
updated: 2026-11-05
tags: [katsodi/backend, katsodi/testing]
---

# Acceptance Checklist

> English · [[docs/Acceptance Checklist|Russian original]]

One place to prove Katsodi against your real services. Automated tests run on PGlite, mocks and stand-ins; nothing below has been checked with real accounts yet. Details per step: [[docs/en/Backend Setup]], [[docs/en/Voice Setup]].

## 1. Configure

- [ ] `.env.local` (never committed, never shared in chat): `NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- [ ] Optional voice: `VOICE_ENABLED=true`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `VOICE_WORKER_SECRET` and a scheduler.
- [ ] Optional shared browser: `HYPERBEAM_API_KEY`.
- [ ] Optional VK Video links: `VK_ACCESS_TOKEN` (see [[docs/en/Features/Room Player]]).
- [ ] Optional playlist import: `YOUTUBE_API_KEY` (Google Cloud → YouTube Data API v3) and `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` (developer.spotify.com → Create app). See [[docs/en/Features/Music Rooms]].
- [ ] Supabase Auth: email confirmation on, minimum password length 12, redirect `http://127.0.0.1:3000/auth/callback**`.
- [ ] Supabase Realtime: enabled, public channel access allowed.
- [ ] Restart the dev server and always use `http://127.0.0.1:3000` (not `localhost`), so email links and cookies match.

## 2. Apply migrations, in order (SQL Editor, each once)

| # | File | Adds |
|---|---|---|
| 1 | `20261101000100_foundation.sql` | Profiles, rooms, members, invites, chat, RLS |
| 2 | `20261101000200_fandom_seed.sql` | 150 fandoms |
| 3 | `20261101000300_chat_media.sql` | Stickers and chat images |
| 4 | `20261102000400_room_fandom.sql` | Room ↔ fandom |
| 5 | `20261102000500_room_player.sql` | Changing the room source |
| 6 | `20261103000600_voice.sql` | Voice access and revocation |
| 7 | `20261104000700_rejoin_role_reset.sql` | Rejoining resets moderator role |
| 8 | `20261104000800_message_sender_index.sql` | Fast chat rate limit |
| 9 | `20261104000900_room_playback.sql` | Shared play/pause/seek |
| 10 | `20261104001000_room_signals.sql` | Realtime room signals |
| 11 | `20261104001100_room_queue.sql` | Room queue |
| 12 | `20261104001200_room_browser.sql` | Shared browser sessions |
| 13 | `20261104001300_profile_media.sql` | Avatars, banners, visible fandoms |
| 14 | `20261104001400_friends.sql` | Friends and blocks |
| 15 | `20261104001500_progression.sql` | XP, levels, achievements |
| 16 | `20261105001600_room_site.sql` | Room website (general link) |
| 17 | `20261105001700_room_screen.sql` | Screen sharing (replaced by 18) |
| 18 | `20261106001800_room_demo.sql` | Link demos (needs 0600) |
| 19 | `20261106001900_admin_fandom_requests.sql` | Administrator and fandom requests |
| 20 | `20261106002000_room_lifecycle.sql` | Room inactivity and deletion |
| 21 | `20261106002100_demo_annotations.sql` | Annotations for everyone on demos |
| 22 | `20261108002200_music_rooms.sql` | Music rooms: anyone switches tracks, import, mixing, 10 days |

## 3. Scenarios (A = owner, B = second account, C = third account)

Use a normal window and a private window per account, all on `127.0.0.1`.

**Accounts**
- [ ] A and B sign up, confirm by email in the same browser, sign in. Opening the link in another browser shows the "sign in with your password" notice.
- [ ] Password recovery works in the browser that requested it.

**Rooms and chat**
- [ ] A creates a private room and an invite; B joins through the link; C cannot see the room.
- [ ] Messages, stickers and images appear in the other window in about a second (Realtime) or within 3 s (polling).
- [ ] A promotes B; B leaves and rejoins: B is an ordinary member again.
- [ ] A kicks B: B loses chat, player, voice and shared browser.

**Playback and queue**
- [ ] YouTube, Vimeo and SoundCloud links: A plays, pauses and seeks; B follows. If B's browser blocks autoplay, "Join playback" works.
- [ ] B adds a link to the queue; A presses Play next; when A's video ends, the next link starts.
- [ ] The player header shows the title, author and cover.
- [ ] With `VK_ACCESS_TOKEN`, on `https://localhost:3000` (`npm run dev:https`) or a real HTTPS domain: a plain `vkvideo.ru/video-…` link plays inside the room; without the key, the export-code hint appears. On `http://127.0.0.1` VK itself shows “Видео недоступно”.

**Room website**
- [ ] A opens the Website tab and shows an embeddable site (for example a Wikipedia article); B sees it and scrolls on their own.
- [ ] A site that refuses embedding (for example google.com) shows the refusal and “Open in a new tab”; with Hyperbeam, “Open in shared browser” prefills its address.
- [ ] B (member) has no website field or Close button; A’s Close website removes it for B.

**Administrator and fandom requests**
- [ ] A (the account the owner added to `public.admins`) sees **Admin panel** on the account page; `/admin` opens with Accounts, Fandoms, Requests, Music. B gets a 404 at `/admin`.
- [ ] B suggests a fandom at `/fandoms/request`; A sees it waiting and approves it with a comment; the fandom appears in the catalogue and can be followed; B sees "Approved".
- [ ] B suggests another; A rejects it with a comment; B sees the comment.

**Music rooms (migration 22)**
- [ ] A creates a shared Music room, B joins. B pastes a Spotify or YouTube playlist into "Playlist or track link" → Import: the tracks are queued in order and "Added …" shows.
- [ ] B (an ordinary member) presses Play next and pauses — A hears the same.
- [ ] A presses Mix playlists: A's and B's tracks alternate. B has no such button.
- [ ] In a video room, queue a Spotify track link: a music-room suggestion appears; Create opens the form with Music selected, and after creation the playlist is already queued.
- [ ] A music room is not marked inactive after 10 minutes and not deleted after 30.

**Room lifecycle (with `npm run voice:worker`)**
- [ ] Create a test room, leave it closed for 10 minutes: the shared-room catalogue shows "Inactive · deleted in … min". Opening it clears the mark.
- [ ] Leave a test room closed for 30 minutes: it is gone from the catalogue and its address; its chat images are gone from Storage.

**Voice (with LiveKit)**
- [ ] A and B join voice and hear each other; mute, deafen, a participant's volume and the speaker choice work.
- [ ] Turning Wi-Fi off and on reconnects automatically with the microphone off; a kick never reconnects.

**Link demo (with LiveKit and npm run voice:worker)**
- [ ] B (member) pastes a Wikipedia link in the chat and presses Launch demo: the link appears in the chat; A (owner) sees “B wants to run a demo” on any tab.
- [ ] A accepts. In Chrome/Edge, B’s Demo tab shows the site; B presses Start broadcast and picks This tab. A sees only the site, not B’s chat.
- [ ] A draws and suggests a click: the marks appear for B over the live site and fade.
- [ ] A pauses: B sees “Paused by A” and A’s picture stops; only A can resume.
- [ ] A link to a site that refuses embedding (for example google.com) offers B “Open the site and share”.
- [ ] Annotations: A draws an arrow, a box, a ✓ stamp and a text label; B sees them with A's name and colour, and they stay. B joins late (reload): the marks are there. A presses "Annotations for everyone": B can now draw too, A sees B's name. B's eraser cannot remove A's marks; A's "Clear all" removes everything.
- [ ] A presses End demo: the demo ends for both.

**Shared browser (with Hyperbeam)**
- [ ] A opens a site for everyone and steers it; B only watches and sees the address.
- [ ] Kicking B ends the session for everyone within a few seconds.

**Profiles, friends, XP**
- [ ] A uploads an avatar and a banner (cropped, no location metadata); B sees them; C does not.
- [ ] A adds B by @username, B accepts, both see each other's profile; A blocks C and C can no longer send a request.
- [ ] A's daily visit pays once; B joining A's room unlocks First Steps; 15 minutes in a room pays participation.

## 4. Accessibility (manual)

Automated axe checks pass on every page in both themes and sizes; they cannot judge everything.
- [ ] Keyboard only: reach every control, see the focus ring, open and close dialogs with Escape, use the room tabs with arrow keys.
- [ ] A screen reader (NVDA, VoiceOver or TalkBack) announces page titles, room tabs, the level bar and the voice controls.
- [ ] 200 % browser zoom: no lost content; reduced motion turns animations off.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Backend Setup]]
- [[docs/en/Voice Setup]]
- [[docs/en/Verification]]
