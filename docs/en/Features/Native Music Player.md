---
title: "Native Music Player"
type: feature
status: in-progress
created: 2026-11-18
updated: 2026-11-18
tags: [katsodi/feature, katsodi/desktop, katsodi/native, katsodi/music]
---
# Native Music Player

> English · [[docs/Features/Native Music Player|Russian original]]

## Purpose
Listen to Katsodi's collections inside the [[docs/en/Features/Native Desktop Client]] without a room: collections look like playlists, with the app's own player, a queue, a bar at the bottom and a full view.

## Users and roles
Everyone, guests included: the collections are public and the player runs on this computer only. "Listen in a room" needs an account, as on the website.

## User scenarios
- Pick a collection: All-time top, Spotify: this week, YouTube: all-time top (150 music videos by total views), Popular, Trending.
- Play all, Shuffle, search in the playlist, Add to queue (the whole collection to the end of the queue), sort: chart order → by title → by artist.
- Clicking a track plays the collection from it; the ⋮ menu has Play next, Add to queue, Listen in a room, Open at the provider.
- The bar: track, previous / play / next, time, shuffle, repeat (off → queue → track), volume, full view, stop.
- Full view: the cover over its blurred copy, seeking, controls, volume, Up next.

## Behaviour rules
- YouTube and SoundCloud play in full; Spotify plays through its embed, which is a preview (about 30 s) and has no volume control; the app says so. Apple Music and TikTok have no player in the app: their rows are inactive with a hint.
- A track that is not ready in 25 s is marked as failed and skipped.
- The queue lasts until the app closes; the player helper stops after a minute of pause.

## Interface and states
Compared with the reference (a Liner playlist and its player), element by element:

| Element | Reference | Before | Now |
|---|---|---|---|
| Background | neutral dark, a soft glow of the cover | the theme's green backdrop | the blurred, darkened cover behind the header, fading out through a mask (no edge) |
| Cover | ~250 px, radius 12, art only | 330 px with the title over it | 240 px, radius 14, art only, 640 px source |
| Title | sans, bold, ~44 px | condensed Oswald 64 px | Manrope ExtraBold 44 px |
| Artists | 24 px, muted | 17 px | 21 px |
| Meta pill | "8 tracks · 26 min 38 sec" | plus the updated date inside | count and length; the date as quiet text beside it |
| Buttons | light Play all, square shuffle, radius ~8 | white pill, round button | rectangles with radius 10 |
| Right side | search, Add to queue, sort | search on the left | search, Add to queue, sort on the right |
| List | in one lighter panel | loose rows | one panel with radius 18, no seams |
| Rows | 72 px art, regular title, plain ⋮ | 52, bold, ⋮ in a circle | 64 (192 px source), Medium 18 px, flat ⋮ |
| Duration | on every track | SoundCloud only | unchanged: the Spotify and YouTube charts carry no durations |
| Bar | white play disc, plain previous/next, a group on the right | green button, ringed buttons | white disc, flat buttons, a framed group |
| Progress | the bar's background fills from the left | a thin line on top | a background fill with a clean edge; pressing or dragging on the bar seeks, hovering shows where and when (2026-11-20) |
| Full view | cover, lyrics on the right | — | cover and Up next on the right: Katsodi has no lyrics |

Cover quality: Spotify 640 px instead of 300, SoundCloud 500 px instead of 100, YouTube 1280 px where the video has that frame (140 of 150), otherwise 480 px (those show black bars).

## Technical implementation
- `MusicPlayerController` (`Tune` in QML): queue, shuffle, repeat, seeking and volume over `katsodi-player --mode music`, the same helper, its window outside the app window's visible area, with flags that keep background windows from being paused.
- The player page `/api/native/v1/player` gained Spotify (the official iFrame API): a script from `embed-cdn.spotifycdn.com` and `'unsafe-eval'`, allowed only on this page, which holds no Katsodi data.
- Data: YouTube comes from `kworb.net/youtube/topvideos.html` (`parseKworbTopVideos`); a refresh's `enrichCovers` takes YouTube's `maxresdefault` frame and Spotify covers from its public oEmbed; `sharpMusicCover` upgrades covers in the shared view for the website and the app. A fresh data file is used until the database has a newer snapshot.

## Data and access
The player stores nothing. A chart refresh (`npm run music:refresh`) reads kworb's public pages and Spotify's oEmbed without keys.

## Security and privacy
The provider player is a separate process with a temporary profile; the player page holds no account data.

## Acceptance criteria
Verified on 2026-11-18:
- `tst_player_live musicMode`: in music mode outside the visible area YouTube is ready in 2.1 s and plays, SoundCloud in 3.1 s, Spotify in 2.0 s (a 29.7 s preview).
- Unit tests: the player page's script parses (a broken script was the cause of the endless Loading), the YouTube top parser, cover upgrades, covers at refresh; `musicPlayerQueueRules` in Qt.
- Captures of the app's window: the Spotify and YouTube collections, the bar with a playing track, the full view.

## Limitations and next steps
No lyrics and no durations for the Spotify/YouTube charts; the queue is not saved; Spotify plays previews only. The website's production policy does not allow Spotify's scripts (`embed-cdn.spotifycdn.com`, eval), so the website's Spotify embed should be checked separately.

## Related notes
- [[docs/en/Home]]
- [[docs/en/Features/Native Desktop Client]]
- [[docs/en/Features/Native API Server]]
