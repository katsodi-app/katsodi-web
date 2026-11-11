---
title: "Shared Playback"
type: feature
status: implemented-awaiting-cloud-migration
created: 2026-11-04
updated: 2026-11-04
tags: [katsodi/feature, katsodi/player]
---

# Shared Playback

> English · [[docs/Features/Shared Playback|Russian original]]

## Purpose

Watch or listen together on **YouTube, Vimeo or SoundCloud**: when the host plays, pauses or seeks, everyone in the room follows. Other sources keep independent playback — [[docs/en/Features/Room Player]].

## Users and roles

The room owner and moderators control playback; they are the same people who may change the source. Active members follow. Outsiders, kicked members and closed rooms get no timeline.

## User journeys

The host pastes a YouTube, Vimeo or SoundCloud link and presses play with the provider's own controls. Members see the same video or track jump to the same moment and start. When the host pauses or drags the timeline, members follow within a couple of seconds. A member whose browser blocks autoplay sees a "Join playback" button over the player; one click joins.

## Behavior

- The server is authoritative. It stores state (`playing`/`paused`), position and an update time, and extrapolates the current position with the **database clock**, so device clocks never matter.
- Each provider is driven through its **official player API** behind one adapter interface (`src/lib/player-adapters.ts`): YouTube IFrame Player API, Vimeo Player SDK, SoundCloud Widget API (milliseconds). Hosts publish on the provider's play, pause and end events and on seeks: Vimeo and SoundCloud report seeks as events; for YouTube, which has none, the position is compared with the published timeline once a second and a difference above 1.5 s counts as a seek.
- A room syncs only when its source host (`syncSource`: youtube.com/youtu.be, vimeo.com, soundcloud.com) and the resolved player host (`adapterKind`: youtube.com, player.vimeo.com, w.soundcloud.com) name the same provider. **Dailymotion** is not synced: its current player API needs an account-specific player ID script.
- Members re-sync on every new state and whenever they drift more than 1.5 s. YouTube member players have controls hidden (Vimeo and SoundCloud offer no such option); a local pause is corrected at the next check.
- Programmatic changes are ignored as user actions for 1.2 s, and a host never re-applies a state it published itself, which prevents echo loops between several moderators.
- A source change invalidates the timeline: playback restarts from a stopped state for the new video.
- Autoplay that the browser refuses becomes an explicit join action; no autoplay with sound is forced.

## Interface and states

Host: "You control playback…". Member: "Playback follows the room's host", "Waiting for the host to start playback", or the autoplay-blocked overlay and hint. Publishing errors show an alert. RU/EN. Without the migration, or for sources that cannot sync, the previous independent-playback text is shown.

## Implementation

`src/lib/playback.ts` (state schema, extrapolation, drift tolerance, `syncSource`), `src/lib/player-adapters.ts` (YouTube/Vimeo/SoundCloud adapters, SDK loading, `adapterKind`), `src/lib/youtube-api.ts`, `src/components/synced-player.tsx` (timeline binding), `RoomPlayer` → `SyncedPlayer` when both hosts agree and the snapshot has a `playback` field. The SDKs attach to Katsodi's own sandboxed iframe (YouTube: `enablejsapi=1`, `origin`). Server action `updatePlayback`; the room refresh (`/api/rooms/[id]`) includes `playback` only for syncable sources. Realtime signals deliver host actions immediately — [[docs/en/Features/Room Chat]].

## Data and access

Migration `20261104000900_room_playback.sql`: table `room_playback` (one row per room: source URL, state, position, updated_at, updated_by) with RLS and no direct grants. `get_room_playback` requires active membership and returns null for another source or a closed room. `set_room_playback` requires a verified active owner/moderator, an open room and the room's current source, accepts positions from 0 to 48 hours (NaN/Infinity rejected) and allows one update per room every 200 ms. Not yet applied in the cloud — [[docs/en/Backend Setup]].

## Security and privacy

Identity and role come only from the session in SQL; the client sends room, source, state and position. Nothing about the video is proxied or downloaded; the provider's own player plays it, with its ads and restrictions. Only playback state is stored, never audio, video or viewing history beyond the room's current position.

## Acceptance criteria

PGlite SQL tests: roles, database-clock extrapolation, outsider and direct-table denial, invalid values and bursts, reset on source change, kick and close. Unit tests: timeline math, syncable-provider detection, action validation and error mapping. Browser tests with an API stand-in: the host's play/pause/seek are published, members seek and play, the autoplay-blocked overlay joins playback, a host pause reaches members, RU/EN, desktop/mobile.

## Limitations and next steps

With Realtime signals enabled, host actions should reach members in about a second; without them, on the next refresh (up to about 3 s). YouTube, Vimeo and SoundCloud only; Dailymotion needs a player ID, Twitch is not yet discovered. No playback queue, no per-member "watch separately" toggle. Actual audio between two real accounts has not been checked; the browser tests use stand-ins for the YouTube, Vimeo and SoundCloud APIs.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Features/Room Player]]
- [[docs/en/Features/Room Chat]]
- [[docs/en/Backend Setup]]
