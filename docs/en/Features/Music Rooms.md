---
title: "Music Rooms"
type: feature
status: implemented-awaiting-cloud-migration
created: 2026-11-08
updated: 2026-11-08
tags: [katsodi/feature, katsodi/rooms, katsodi/music]
---

# Music Rooms

> English · [[docs/Features/Music Rooms|Russian original]]

## Why
A room is created as video or music, and the two now behave differently. A music room is a shared track queue that every member listens to and switches, and it lasts a long time.

## Users and roles
- Any member of a music room: imports a playlist or track, switches tracks, pauses and seeks.
- Owner and moderators: additionally "Mix playlists".
- Video rooms are unchanged: only hosts change the source and playback.

## User scenarios
1. Paste a Spotify, YouTube or SoundCloud playlist or track link into "Playlist or track link" → Import: the tracks are queued in order ("Added to the queue: N of M").
2. Play next, or ▶ on a queued track — any member; when a track ends, the next one starts.
3. Mix playlists — members' tracks alternate, one from each person in turn, keeping each playlist's own order.
4. In a video room, a playlist or music-track link (in the queue or as the new source) shows "Create a music room" — the form opens with Music selected and, once created, the playlist is already queued — or "Add here anyway".

## Behaviour rules
- Synchronization depends on player capabilities. Spotify and a SoundCloud set added as one widget play independently; individually imported SoundCloud tracks support the shared timeline.
- Room responses include the full queue: up to 300 tracks for music and 50 for video. Before contacting an import API, the server checks active membership and an open music room; the database checks permissions again when inserting tracks.
- Creating a room from the suggestion resolves the playlist first: lookup errors appear on the creation form without creating a room. If the room exists but inserting its tracks fails, it shows a message asking the member to retry in Queue.
- Public links only, through official APIs. YouTube playlists require `YOUTUBE_API_KEY`. The Spotify adapter uses app credentials and the legacy playlist endpoint; current playlist access requires user OAuth plus ownership/collaboration and is not activated by keys alone. See [[docs/en/Features/Music Activation]]. Single tracks do not require import keys.
- Public SoundCloud sets import individual tracks through its official client-credentials API, using `SOUNDCLOUD_CLIENT_ID` and `SOUNDCLOUD_CLIENT_SECRET`. Without credentials, import explains that it is unavailable; the ordinary queue field can still add a set as one official widget. Single tracks need no API key.
- A music room's queue holds up to 300 tracks (video: 50); what does not fit is not added, and the message shows it.
- Spotify tracks play in Spotify's official player (a 30-second preview without a Spotify sign-in — Spotify's limit).
- Lifetime: never marked inactive; deleted only when nobody has opened it for 10 days (video rooms: 10/30 minutes, [[docs/en/Features/Room Lifecycle]]).

## Interface and states
Queue tab: the import field (music rooms only), "Video or music link", Mix playlists (hosts, with more than one queued track), Play next, and a hint about the music-room rules. Errors: missing API key, private or missing playlist, empty playlist, full queue, too fast.

## Technical implementation
- Migration `20261108002200_music_rooms.sql`: `private.can_switch_track` (hosts, or any member of a music room) in `set_room_source` and `set_room_playback`; `add_room_queue_many` (up to 300, in order, once per 10 s per person); `mix_room_queue` (round robin by who added); `run_room_lifecycle` with the 10-day rule for music.
- `src/lib/music-links.ts` — link recognition (shared by browser and server); `src/lib/server/playlist-import.ts` — reads playlists through the APIs; `importToQueue` / `mixQueue` in `room-actions.ts`; `spotifyEmbed` in `providers.ts`.
- `room-queue.tsx`, `room-source-form.tsx`, `music-suggestion.tsx`; the create form accepts `?format=music&import=`.

## Data and access
No new tables. The server sends YouTube/Spotify/SoundCloud only the playlist link, no user data ([[docs/en/Features/Legal Pages]] updated: music-room lifetime and import requests).

## Security and privacy
Permissions are checked in the database (security definer); https links only; the Spotify token stays on the server; keys never reach the browser.

## Acceptance criteria
- `tests/unit/music-room-actions.test.ts` and `room-snapshot-queue.test.ts`: reject before contacting providers, return all 300 tracks, retain the 50-item video limit, and report failures before and after creation without creating another room.
- e2e: select track 300 and show the failed-import message in Russian and English while keeping import available.
- `tests/unit/music-rooms-database.test.ts` (6): member switching and playback in music, refused in video; ordered import, music only, 300 limit, bad links; 50 limit for video; mixing and refusal for members; 10 days versus 30 minutes.
- `tests/unit/music-import.test.ts` (8): link recognition, Spotify embed, YouTube paging, Spotify token and paging, 300 cap, missing key, empty/private playlist.
- e2e `chat-design.spec.ts`: member import and switching, host mixing, the music-room suggestion in a video room.

## Limits and next steps
- Apply migration 22 and (optionally) add the API keys — steps in [[docs/en/Acceptance Checklist]].
- Private playlists (signing in to Spotify/YouTube) are not supported — the owner's decision.
- Current Spotify playlist support needs a permitted user OAuth flow and an updated adapter, beyond server app credentials. Existing mock tests are not live provider acceptance; the official references and activation steps are in [[docs/en/Features/Music Activation]].

## Related notes
- [[docs/en/Home]]
- [[docs/en/Features/Room Queue]]
- [[docs/en/Features/Room Lifecycle]]
