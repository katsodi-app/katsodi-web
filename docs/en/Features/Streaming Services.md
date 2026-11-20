---
title: "Subscription services in a room"
type: feature
status: implemented
created: 2026-11-21
updated: 2026-11-21
tags: [katsodi/feature, katsodi/desktop, katsodi/rooms]
---
# Subscription services in a room

> English · [[docs/Features/Streaming Services|Russian original]]

## Why
Watch Netflix, HBO Max, Prime Video, Disney+ and Crunchyroll together in a video room of the desktop app, the way Rave does: everyone through their own subscription, with pause, seeking and the position shared. Nobody's account is restreamed: DRM shows a black picture and the services' terms forbid it.

## Users and roles
- The host (owner or moderator) picks the service and the title.
- Members sign in to their own accounts and watch on their own computers; their player follows the shared timeline.

## User flows
1. The host opens the Services tab and picks a service: its start page becomes the room's source and opens in everyone's player.
2. Everyone signs in to their own account right in the player. The sign-in stays on this computer.
3. The host opens a title and presses Watch together: the title's address becomes the room's source and members get the same title.
4. The host's play, pause and seeks become shared (the same mechanism as YouTube: 1.5 s tolerance).

## Behaviour rules
- Only the host picks the service (the server checks the right to change the source).
- Links of these services are a synchronizable source, `service` (`syncSource` on the website and in the app; hosts: `streamingServices` in `src/lib/providers.ts`, `streamingService` in `native-desktop/src/domain/Text`).
- Back steps back through the service's pages.
- The website does not sync these sources: there each person opens the link on their own.

## Interface and states
- The Services tab in a video room: three steps, service tiles (Simple Icons logos, CC0; Prime Video and Disney+ as wordmarks), a note about subscriptions.
- In the player: the service page's title, Back and (for the host) Watch together.
- Home: a strip of logos, "Watch and listen together", and a Discord card; a Discord button in the rail.
- Settings → Services: Sign out of all services removes the saved sign-ins.

## Technical implementation
- `katsodi-player.exe --mode service`: the top document is the service's page (any public https page; this computer's network is refused). A document-created script finds the main `<video>` (in a child frame through postMessage, as on Crunchyroll) and answers the player page's `katsodi.poll()/play()/pause()/seek()/volume()`; Netflix seeks through its own player API (setting `currentTime` makes it fail).
- In service mode `load` navigates only when the view is not already there (the host's Watch together does not reload the film); poll answers carry the load's generation.
- `PlayerController`: the helper's mode (`""`, `music`, `service`) follows the source; a mode change restarts the helper. A service page shows as soon as it has loaded (sign-in, browsing), not only once a video is found.
- `RoomController::playNow(url)`: the link goes through the queue and becomes the source.
- Checks: live test `serviceMode` in `tst_player_live` (a page with a video: found, played, seeked to 3 s, paused; generation 7). WebView2 offers Widevine and PlayReady (EME probe, 2026-11-21).

## Data and access
No new tables: the room's source and timeline are the existing `rooms.url` and `set_room_playback`.

## Security and privacy
- Service mode's profile lives in `%LOCALAPPDATA%\Katsodi\accounts` (the person's own sign-ins to their own services) and is removed by the Settings button. The other modes keep a temporary profile.
- Passwords are not autosaved, downloads are cancelled, permissions denied, new windows open in the same view; the helper receives no Katsodi token.
- The script runs in the page's world: the page could read or fake its answers; that only affects the timeline the host sets anyway.

## Acceptance criteria
- The host opens a service and a title; members with a subscription see the same title, with shared pause and seeking.
- Without a subscription a member sees the service's page (sign-in or subscribe) and the room keeps working.

## Limits and next steps
- Not checked with real subscriptions (no test accounts): DRM playback, the services' player markup and Netflix's API may differ; check with real accounts.
- Services whose player is in another window or laid out differently may need the video search adjusted.
- Spotify plays a preview in Katsodi's player: there is no Spotify sign-in in music mode.

## Related notes
- [[docs/en/Home]]
- [[docs/en/Features/Native Desktop Client]]
- [[docs/en/Features/Native Shared Browser]]
