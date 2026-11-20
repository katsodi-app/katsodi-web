---
title: "Native Discord Activity"
type: feature
status: in-progress
created: 2026-11-20
updated: 2026-11-20
tags: [katsodi/feature, katsodi/desktop, katsodi/native]
---
# Discord activity

> English · [[docs/Features/Native Discord Activity|Russian original]]

## Why
Friends on Discord see what someone is watching or listening to in Katsodi and can join the same room.

## Users and roles
Anyone using the Windows app with Discord running on the same computer. No Katsodi sign-in is needed.

## User scenarios
- Music plays in the app's player → "Listening": track title, artists, the cover (when https) and time.
- In a room with no music playing → "Watching": a public room shows its name and fandom (or the source's site); a private one shows only "Private room".
- Neither → the status is cleared.

## Behaviour rules
- On by default; turned off in settings ("Show activity in Discord"). Turning it off clears the status and closes the connection to Discord.
- Music wins over the room. A private room's name, fandom and source are never sent.
- At most one update every 4 s (Discord allows 5 per 20 s), debounced by 1.5 s; an unchanged state is not sent again.

## Interface and states
A "Discord" card in settings: the switch and a line with the actual state: this build has no Discord application / off / connected / waiting for Discord.

## Technical implementation
- `src/presentation/DiscordPresence.{h,cpp}`: Discord's local IPC (named pipe `discord-ipc-0…9` through `QLocalSocket`), handshake (`op 0`, `v: 1`, `client_id`), `SET_ACTIVITY` (`op 1`) with the app's `pid`; pings are answered. It retries every 20 s in case Discord starts later.
- Activity type 2 (Listening) for music, 3 (Watching) for a room.
- Pictures (2026-11-20) are https addresses Discord loads itself: the large one is the track's cover, the room fandom's art from the website (`https://katsodi.watch/images/fandoms/…`), or, without a fandom and for a private room, `public/images/discord/room-cover.png` (drawn by `node scripts/render-room-cover.mjs`); without a cover, the site icon `icons/icon-512.png`. The small circle is the person's own Discord avatar (from the READY reply, Discord's CDN): Katsodi avatars are private (only roommates see them), so Discord cannot load them.
- Buttons (two at most): "Open the room" (the room's page on the website; none for a private room) or "Listen on Spotify/YouTube/SoundCloud" for a track, then "Open Katsodi". Discord does not show the buttons to the person whose status it is; others see them.
- Discord application id: `1573116517133058139` (the Katsodi application; an id is public, every client sends it), the default in `CMakeLists.txt`. The environment variable `KATSODI_DISCORD_CLIENT_ID` replaces it at build time and, in development, at start-up; a value that is not digits turns the feature off, and settings say so.
- The pure `DiscordPresence::activity()` and the `frame()` encoding are covered by `tst_core discordActivity`.

## Data and access
Discord receives only the above: no tokens, user ids or room links. No network is used, only the local pipe to the Discord client.

## Security and privacy
A private room is not revealed (checked in the test). The setting is stored locally (`QSettings`).

## Acceptance criteria
- Pipe check (2026-11-20): the running Discord accepts the handshake in this format and answers `Invalid Client ID` (4000) for a test id, so the framing is right.
- With the Katsodi id (2026-11-20): Discord answers READY; the app's settings say "Connected to Discord", and the activity sent while music played was not refused (refusals are logged as `Discord activity refused`). How the status looks on the profile is checked by a person in Discord.

## Limitations and next steps
The cover of a room without a fandom appears in Discord once the website is published with `public/images/discord/room-cover.png`; until then that picture is empty. The second button opens the project overview, `https://katsodi.watch/overview`.

## Related notes
- [[docs/en/Home]]
- [[docs/en/Features/Native Desktop Client]]
- [[docs/en/Features/Native Music Player]]
