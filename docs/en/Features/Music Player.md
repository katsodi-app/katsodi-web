---
title: "Music Player and Researched Collections"
type: feature
status: implemented
created: 2026-11-08
updated: 2026-11-08
tags: [katsodi/feature, katsodi/music]
---
# Music Player and Researched Collections

> English · [[docs/Features/Music Player|Russian original]]

## Purpose
Unify Music navigation, researched SoundCloud/Trending collections, search and persistent in-page listening. The owner's five tasks are tracked in [[TASKS]].
## Users and roles
All visitors can browse and listen through permitted provider widgets. Standalone listening is local to the visitor; shared rooms keep their existing authorization and queue rules.
## User journeys
Open Music, choose SoundCloud or Trending Tracks, search by title/artist and press the cover's Play button. Previous/next follow the selected collection, including when the list was filtered. The current row is highlighted. Navigating to another music page keeps the same player. Closing stops it; entering a room hands playback back to that room.
## Behavior
- Sidebar and related navigation use Music / Музыка; `/music` and existing detail links are retained. Most played still describes Spotify's all-time ranking.
- SoundCloud contains 100 verified full-play tracks, all with at least one million public SoundCloud plays. Trending contains 60 tracks, ten per selected underground/electronic artist index, interleaved for variety, with at least 100,000 plays each.
- These are researched selections, not an official global SoundCloud Top 150 or TikTok chart. Play counts are lifetime observations, not measured growth rates. Tracks may be older recordings that remain in current artist-popular lists.
- SoundCloud/YouTube provide play/pause, progress, seek and volume through official APIs. A confirmed FINISH/ENDED event advances exactly once, in order. The final track stops without wrapping.
- Spotify uses its visible official widget. Custom seeking/volume and reliable auto-next are not exposed here; the UI explains that limit. It does not replace limited Spotify tracks with blocked or preview-only SoundCloud uploads.
- External players/SDKs wait for existing media consent or Load once. No music starts on a fresh page visit. Browser autoplay restrictions offer manual playback, rather than a bypass.
## Interface and states
A responsive bottom player shows cover, title, artists, collection position, controls and the official visible widget/source link. Measured height reserves page space; the mobile bar sits above navigation and the room dock stacks separately. Music search has one field outline, visible keyboard focus, matching spacing and preserved filtering. Trending uses two columns on wide screens. Loading, blocked playback, failure/retry and end-of-collection states are localized. Lyrics are intentionally omitted: no licensed lyrics integration is configured.
## Implementation
`music-player-provider.tsx` preserves the queue across client navigation; `music-player-dock.tsx` owns provider state/polling and releases SDKs on source changes/closure. `music-queue.ts` validates sources and bounds queue movement. Existing official adapters gain duration/volume getters where supported. The separate room player remains intact.

`scripts/research-music-collections.mjs` reads public artist-popular indexes and candidate track HTML, extracting only public track metadata. It never extracts API client IDs, bypasses login or downloads audio. Of 342 candidates, 338 exposed metadata during research. Full-play eligibility required `public`, `streamable`, `embeddable_by=all` and `policy=ALLOW`; blocked/SNIP tracks were excluded. It verifies the official oEmbed response and image HEAD response for selected recordings, then preserves the existing file unless at least 75/50 survive. IDs and canonical URLs are unique within each collection; literal title/artist duplicates were also checked.

Reproduce with `node scripts/research-music-collections.mjs`. Output: `src/data/music-collections.json`; each track carries its checked date, play count, source, index URL, likes and embed evidence. The weekly workflow regenerates it before publishing. Validated collections are co-published inside the existing `spotify-all-time` snapshot payload and loaded with a bundled fallback, requiring no new migration beyond chart migration 23. The GitHub workflow is still not published/activated; see [[docs/en/Features/Music Activation]].
## Data and access
Primary artist-popular indexes: [2hollis](https://soundcloud.com/2hollis/popular-tracks), [BUCKSHOT](https://soundcloud.com/buckshottt/popular-tracks), [fakemink](https://soundcloud.com/fakemink/popular-tracks), [Odetari](https://soundcloud.com/odetari/popular-tracks), [Lumi Athena](https://soundcloud.com/lumiathena/popular-tracks), [Nettspend](https://soundcloud.com/nettspend/popular-tracks), [Lil Uzi Vert](https://soundcloud.com/liluzivert/popular-tracks), [Post Malone](https://soundcloud.com/postmalone/popular-tracks), [$uicideboy$](https://soundcloud.com/g59/popular-tracks) and [Travis Scott](https://soundcloud.com/travisscott-2/popular-tracks). Additional candidates came from the already verified Spotify all-time list's SoundCloud links; inclusion was based on actual SoundCloud plays and full-play eligibility.

The screenshot's FEVER and poster boy were checked against their [original BUCKSHOT recording](https://soundcloud.com/buckshottt/buckshot-fakemink-fever) and [2hollis index](https://soundcloud.com/2hollis/popular-tracks). Supplementary context: [2hollis streaming observations](https://www.kworb.net/spotify/artist/72NhFAGG5Pt91VbheJeEPG_songs.html), [the artist's September 2026 label announcement](https://www.universalmusic.ca/2026/09/22/2hollis-announces-new-album-pirouette-releasing-november-11th/) and [fakemink's artist press release](https://kj.de/download.php?artist=fakemink-Presseinfo+2026&file=%2Fimages%2Fmedia%2F7459_25806.pdf). These do not establish a ranked viral-growth chart for all 60 songs.
## Security and privacy
No account tokens, stream URLs or lyrics are copied. Cover URLs and playable links are validated. Only the volume preference is persisted on the device; a queue is not restored with autoplay. The public chart publisher retains service-role-only writes. Official API references: [SoundCloud Widget](https://developers.soundcloud.com/docs/api/html5-widget), [YouTube iframe API](https://developers.google.com/youtube/iframe_api_reference), [Spotify embed capabilities](https://developer.spotify.com/documentation/embeds/references/iframe-api).
## Acceptance criteria
Unit coverage checks evidence, thresholds, unique sources, artwork hosts and safe ordered queues. Browser fixtures exercise real app controls against mocked official SDK events: pause/resume, seek, volume persistence, duplicate FINISH handling, previous/next, navigation retaining the same iframe, locales, media consent, search and mobile layout. Existing music accessibility and room-action tests remain required. Mock SDK results do not prove live audio delivery for every provider or region.
## Limitations and next steps
Provider/region restrictions, advertisements and browser autoplay policy still apply. HTTP/oEmbed/metadata checks do not prove that every recording audibly plays in every country. Live playback evidence and final check counts are recorded in [[TASKS]]. Weekly cloud activation remains an owner setup step; source/date evidence is included in the bundled data. Lyrics are omitted rather than represented by placeholders.
## Owner review fixes
2026-11-09: Spotify connection now resolves only on the embed's `ready` event, rather than the controller-creation callback. AbortSignal cancels loading on track changes/close. Disposed events are ignored, destroy is idempotent, and pause cannot be sent before readiness. The regression delays ready, switches/closes the player, fires late callbacks and checks for zero commands or console errors. See [[TASKS]].

Spotify now uses its official iframe API: the main play/pause button is enabled after connection, and progress comes from `playback_update`. Music seeking and volume remain in the native widget; Spotify auto-next is not guaranteed and preview restrictions remain provider-controlled. This supersedes the earlier description of entirely disabled external Spotify controls above.

Provider SDKs now create their iframe inside an isolated container. React owns only that container, so an SDK removing its iframe during destruction cannot conflict with React track switching. YouTube source errors expose retry; canonical URLs support shortened YouTube links.

All five tabs share track cards, search and source panels; the former two-column trending layout is replaced by the common grid. The player expands into an artwork-led view with a cover-derived backdrop, larger controls and progress. The favicon uses the site's waveform logo and music heroes use that motif. Desktop/mobile screenshots were reviewed.

Validation: 365 unit tests, lint, TypeScript, production build and 26 desktop/mobile browser checks passed. Spotify fixtures exercise play/pause and progress. The YouTube fixture deliberately removes the iframe on destroy and verifies three switches without page errors. Live-provider evidence is recorded separately in [[TASKS]].

## Related notes
- [[docs/en/Home]]
- [[docs/en/Features/Music Discovery]]
- [[docs/en/Features/Music Activation]]
- [[docs/en/Features/Shared Playback]]
