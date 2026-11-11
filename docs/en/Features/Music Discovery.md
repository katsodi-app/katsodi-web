---
title: "Music Charts and Listen in Room"
type: feature
status: implemented-awaiting-cloud-migration
created: 2026-11-08
updated: 2026-11-08
tags: [katsodi/feature, katsodi/music]
---
# Music Charts and Listen in Room

> English · [[docs/Features/Music Discovery|Russian original]]

## Why
Interface update: [[docs/en/Features/Music Player]] replaces the former five public SoundCloud entries with 100 researched tracks and unavailable TikTok presentation with 60 curated trending tracks. The source-capability history below does not describe the current SoundCloud/Trending tabs. New collections are included in the weekly `spotify-all-time` payload; schedule activation remains pending.

Current source-specific rankings, the most-streamed list and a direct path from a song into a room.
## Users and roles
Charts are public. A verified member can open a track in an active music room they belong to or create a private music room.
## User scenarios
Choose a source, search tracks, inspect its region/date and open its original chart. Listen in Room redirects to the selected song in the current accessible music room or a new private one. It leaves video rooms unchanged.
## Behaviour rules
- Spotify and YouTube each have 150 global entries from Kworb's published weekly rankings. Published video titles are kept without guessing artist credits.
- Most played is the existing Spotify all-time stream ranking, not Katsodi listening telemetry.
- SoundCloud's official US chart contains 50 tracks; its public HTML exposes metadata for five. Configuring the official API can resolve the available playlist entries. The UI shows the actual region and count, without padding to 150.
- TikTok was checked in a public browser and exposes no readable song list. Its state links to the official page without bypassing protection.
- Failed refreshes preserve the last successful snapshot and its original checked date. Incomplete Spotify/YouTube parsing cannot overwrite a full chart. Snapshots over eight days old are marked stale.
## Interface and states
Source navigation, search, dates/period, region, available counts and room actions on chart rows and track pages. Existing player consent and autoplay restrictions remain.
## Technical implementation
`music-discovery.ts` validates chart data and URLs. `music-chart-sources.ts` reads public pages. `music-actions.ts` checks identity/membership before changing a source or creating a private music room. `musicLibraryData` uses Supabase snapshots with a bundled fallback; newly ranked all-time tracks have live detail routes.

`npm run music:refresh` writes a local snapshot; `--database --no-write` publishes it to Supabase. The existing `build-music-chart.mjs` verifies all 150 all-time tracks before replacing its output; `npm run music:refresh -- --database --no-write --all-time-only` then publishes that list. The workflow schedules both on Mondays at 06:00 UTC after it is pushed and secrets are configured. No remote push was performed in this session.
## Data and access
Migration `20261108002300_music_discovery.sql` adds public ranking snapshots with service-role-only writes. Workflow secrets: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optional `SOUNDCLOUD_CLIENT_ID` / `SOUNDCLOUD_CLIENT_SECRET`. Snapshots contain no personal data.
## Security and privacy
No media recording or protection bypass. Provider credentials stay server-side. Track/artwork/source URLs are validated. Anonymous users cannot mutate rankings or rooms; private playlists remain unsupported.
## Acceptance criteria
Unit coverage includes parsers, validation, failed-source retention, URL safety, official SoundCloud OAuth, table permissions and room redirects. E2E covers source tabs, searching, actual counts, unavailable/partial states, locales and room buttons.
## Limitations and next steps
Apply migration 23; publish the workflow and configure its secrets. Music rooms still require migration 22. Real imports require provider credentials. Two-account live acceptance remains in [[docs/en/Acceptance Checklist]].
## Related notes
- [[docs/en/Home]]
- [[docs/en/Features/Music Rooms]]
- [[docs/en/Features/Top 150 Music]]
- [[docs/en/Features/Legal Pages]]
