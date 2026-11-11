---
title: "Room Player"
type: feature
status: implemented-awaiting-cloud-source-migration
created: 2026-11-02
updated: 2026-11-05
tags: [katsodi/feature, katsodi/player]
---

# Room Player

> English · [[docs/Features/Room Player|Russian original]]

## Purpose

Display video inside a room from a URL and discover supported public iframes on source pages. One source is stored in the shared room and delivered to its members.

## Users and roles

Members see the player. Owners/active moderators change or remove sources; ordinary members, guests, removed members and unverified accounts cannot. Closed rooms forbid changes/discovery.

## User journeys

Provide a URL during creation or paste into What are we watching? and click Show everyone. RPC stores the source; room updates replace members' players. Snapshots use the existing three-second polling. Supported video can start, enter fullscreen or open separately.

## Behavior

- YouTube watch, youtu.be, shorts, live and embed URLs with valid 11-character IDs become official embeds. Invalid IDs are not declared supported.
- Public HTTPS .mp4/.webm paths use native video; codecs/file availability depend on browser/service.
- Kinogo.is: fetch only a specific work page and accept only reviewed api.nextembed.ws/embed/movie/ID or /series/ID iframe addresses. Other frames are not displayed.
- Re:ANIME: public work metadata → JSON API → validated FlixCloud iframe, preserving episode number. LiveBall: specific match → validated iframe or original page/native player. Details: [[docs/en/Features/Player Discovery]]. Other public pages use general HTML discovery — [[docs/en/Features/Generic Player Discovery]]. Login/access restrictions are not bypassed.
- **Now playing:** for YouTube, Vimeo, SoundCloud, Dailymotion and Rutube links, the player header shows the title, author, provider, cover and (Vimeo) duration from the provider's official oEmbed endpoint (`src/lib/server/media-details.ts`, `/api/rooms/[id]/media`, active members only, cached 10 minutes). Fields are length-bounded, the cover must be a public HTTPS URL and loads with no referrer, and text is rendered as text.
- **VK Video:** VK plays its videos on other sites only through its official embed code (More → Export), which carries a per-video `hash`. The room accepts that `video_ext.php` link or the whole pasted `<iframe>` code and embeds VK’s own player (`vkEmbed` in `src/lib/providers.ts`). With `VK_ACCESS_TOKEN` set on the server, a plain VK video, live or clip link is resolved automatically through VK’s official API method `video.get`, whose `player` field is that same embed link (`src/lib/server/vk-video.ts`, cached like other discovery). Only a VK `video_ext.php` player with a hash is accepted, and only VK’s numeric error code is logged. Without the token, or when VK refuses (private video, embedding disabled, wrong token type), the room shows the export-code hint. Katsodi never guesses the hash or reads VK pages, which require sign-in. Which token types VK allows for `video.get` is not verified yet: try the app’s service key first; if the server log shows `VK video.get error 28` or `15`, use a user token with the `video` and `offline` scopes (a service key worked on 2026-11-05). **VK only plays its embed on HTTPS pages with a domain name:** on `http://127.0.0.1` and even `https://127.0.0.1` its player shows “Видео недоступно”, on `https://localhost` and real HTTPS domains it plays (tested 2026-11-05). For local VK testing run `npm run dev:https` (self-signed certificate; Next asks to install a local certificate authority on first run), open `https://localhost:3000`, set `NEXT_PUBLIC_APP_URL=https://localhost:3000` and add `https://localhost:3000/auth/callback**` to Supabase redirect URLs.
- **YouTube rooms have a shared timeline** after migration 0900: the host's play/pause/seek reach every member — [[docs/en/Features/Shared Playback]]. The rule below applies to every other source.
- **An embedded player does not mean synchronized viewing.** Everyone starts their own video. Play/pause/seek, voice and shared timeline are not synchronized in this phase; UI/capabilities report sync=false.

## Interface and states

Branded responsive 16:9 screening area, minimum height 200px, native provider controls, fullscreen, source link and retry. RU/EN. States: discovery, iframe, native video, unsupported source, no iframe, embedding restriction and network/video error. Cross-origin frames do not reliably reveal whether playback began; iframe loading is not proof that a film plays successfully.

## Implementation

RoomStage → RoomPlayer; knownPlayer/readPlayerResolution validate client addresses. GET /api/rooms/[roomId]/player verifies account, RLS, active membership and open-room status before reading the database URL. Query URLs are ignored. player-resolver requests fixed reviewed recipe origins without redirects: eight seconds/request, 15 seconds/search, 2 MiB/512 KiB HTML and 256 KiB JSON. Source HTML is neither inserted into Katsodi's DOM nor executed server-side; original-page fallbacks stay on service origins in iframes. Metadata cache: five-minute successes, 30-second errors, 128 entries and four parallel searches with deduplication. Video is not proxied/downloaded.

## Data and access

supabase/migrations/20261102000500_room_player.sql adds nullable source_updated_at and set_room_source(room,url). Null means unknown prior-change time, not a fabricated event. RPC verifies verified_user, active owner/moderator role and open status, locks the room row and throttles changes to two-second intervals. Foundation schema is required; migration is independent of chat_media/fandom links. Old rooms load without the column, but source editing stays disabled until migration.

## Security and privacy

General discovery requests public HTTPS origins with DNS validation, pinned IPs and per-redirect checks — [[docs/en/Features/Generic Player Discovery]]. No server execution of third-party scripts, video proxying, cookie/credential forwarding, DRM/login/geography/embed bypass. Frames are checked for X-Frame-Options/restrictive frame-ancestors. Browser policies remain enforced. Sandbox permits scripts/same-origin/presentation, not top navigation/popups; fullscreen/encrypted-media/picture-in-picture support normal players. Service ads are not filtered. API responses are private/no-store; resolver cache is reached only after authorization. Cache stores source/player URLs, not room IDs, cookies or profiles.

## Acceptance criteria

Unit: URL parsing, lookalike origins, invalid iframes, scripts, CSP, redirects, oversized HTML, cache and API membership. PostgreSQL/PGlite: owner/moderator/member/outsider, throttle, kick, closure and one stored shared URL. Browser fixtures: iframe, RU/EN, independent role contexts and updated source through polling. Mocks do not bypass working-route authorization. Results: [[docs/en/Verification]].

## Limitations and next steps

No cloud migration was applied; publishable keys do not permit DDL. Before actual shared-source changes, apply the migration and accept with two verified accounts — [[docs/en/Backend Setup]]. Local drafts support YouTube/direct files; server discovery is shared-room-members-only. No custom HLS/DASH player, user video upload, private-API parsing or universal extraction from all sites. Next standalone phase: a shared timeline through supported provider APIs, starting with YouTube and server-authoritative state.

## Sources and actual verification

- [YouTube official embed format](https://developers.google.com/youtube/player_parameters).
- [YouTube IFrame API](https://developers.google.com/youtube/iframe_api_reference) — future timeline control foundation; API commands are not implemented yet.
- [MDN video](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/video).
- [MDN frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors).
- 2026-11-02: [Dune page](https://kinogo.is/240-diuna.html) returned HTTP 200 and a public [NextEmbed iframe](https://api.nextembed.ws/embed/movie/36036). The new resolver returned that exact address; embed HTML returned 200 without XFO/CSP prohibition. This verifies discovery/headers, not playback in all regions.
- An additional real-browser fixture showed YouTube/NextEmbed interfaces, including start controls, Russian dubbing and Dune duration. Video was not started; this checks interface rendering, not full playback.
- [Re:ANIME](https://reanime.to/watch/spirited-away-44grtu) itself has frame-ancestors 'self', but its public API exposes a separate FlixCloud iframe. The separate validated player is embedded without removing page restrictions. API/LiveBall research: [[docs/en/Features/Player Discovery]].

## Related notes

- [[docs/en/Home]]
- [[docs/en/Features/Room Experience]]
- [[docs/en/Features/Content Providers]]
- [[docs/en/Features/Server Rooms]]
- [[docs/en/Backend Setup]]
- [[docs/en/Roadmap]]
