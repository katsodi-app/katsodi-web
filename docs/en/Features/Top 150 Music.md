---
title: "Top 150 Music"
type: feature
status: implemented
created: 2026-11-06
updated: 2026-11-06
tags: [katsodi/feature, katsodi/music]
---

# Top 150 Music

> English · [[docs/Features/Top 150 Music|Russian original]]

## Why
A section with the 150 most-streamed songs on Spotify of all time (the owner's answer to question 4 in TASKS.md), and a page per track where it can be played.

## Users and roles
Every visitor, no sign-in needed. The administrator sees the full list in the Music section of /admin; there is no editing, a script builds the data.

## User scenarios
- /music: rank, cover, title, artists, streams; search by title or artist.
- /music/[slug]: cover, facts (streams, release date, check date), description, Spotify and SoundCloud links, embedded players, previous and next track.
- Entry points: "Top 150" in the sidebar and a link in Home's music block (the phone bar is already full).

## Behaviour rules
- The description is built only from verified facts: artists, release date, streams on the check date and the rank. No invented stories or opinions.
- The Spotify player is the official embed; without a Spotify sign-in it plays a 30-second preview, and the page says so.
- The SoundCloud player is the official widget, only when the track was found on the artist's account. Otherwise the page shows "Search on SoundCloud" with a note; never a link to someone else's upload.
- An unknown slug is a real 404 (generateStaticParams + dynamicParams = false).

## Interface and states
The list uses the same surfaces as the fandom catalogue; on phones the streams column is hidden (it is on the track page). An empty search shows "Nothing found". An E badge marks explicit tracks. RU/EN.

## Technical implementation
`scripts/build-music-chart.mjs` writes `src/data/music-top150.json`:
1. ranking and streams: kworb.net/spotify/songs.html (Spotify data);
2. the Spotify track id: the lead artist's kworb page (same song, same stream count);
3. title, artists, release date, 300/640 covers: Spotify's official embed page for that id; the title must match;
4. SoundCloud: an account whose name equals the artist's (SoundCloud oEmbed), and a track URL on it with a matching title.

`src/lib/music-format.ts` holds types, player URLs, formatting and the description; `src/lib/music.ts` the chart data and the pager neighbours; `src/components/music-pages.tsx` the pages. Server pages pass the data to the client components as props (the list on `/music`, only the track and its two neighbours on a track page), so the chart JSON is not in the client bundle.

## Data and access
A static JSON file in the build; no database. Covers load from Spotify's CDN; the players are Spotify and SoundCloud iframes, which handle their own cookies and sign-in.

## Security and privacy
Only https URLs on open.spotify.com and soundcloud.com, with encoded parameters. Players load lazily. Embedded third-party players must be covered by /cookies and /privacy (the legal pages are a separate task).

## Acceptance criteria
- tests/unit/music.test.ts: ranks in order without gaps, unique slugs and ids, https, SoundCloud URLs, RU/EN descriptions.
- tests/e2e/music.spec.ts (desktop + mobile): list and filter, a track page with the Spotify player, next track, the SoundCloud player or search, 404, axe on both pages, no horizontal scroll.
- brand-states: the admin panel's Music section lists every entry.

## Limits and next steps
Check on 2026-11-06: 150 of 150 tracks confirmed on Spotify; 73 found on the artist's SoundCloud account, 77 offer a search only (for example, no SoundCloud account under that name was found for Drake or Taylor Swift). The ranking changes daily: rerun `node scripts/build-music-chart.mjs` before a release. The SoundCloud account is matched by name, not by its verified badge (oEmbed does not expose it). Rooms: [[docs/en/Features/Room Player]].

## Related notes
- [[docs/en/Home]]
- [[docs/en/Features/Admin and Fandom Requests]]
- [[docs/en/Features/Room Player]]
