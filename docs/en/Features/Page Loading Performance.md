---
title: "Page Loading Performance"
type: feature
status: implemented
created: 2026-11-08
updated: 2026-11-09
tags: [katsodi/feature, katsodi/performance]
---
# Page Loading Performance

> English · [[docs/Features/Page Loading Performance|Russian original]]

## Purpose
Reduce initial mobile loading work while preserving navigation, languages, saved preferences and room actions.
## Users and roles
All visitors. The changes do not grant access or change room authorization.
## User journeys
Open Home or Music, browse posters or songs, focus or hover a link, change language and return to the active room.
## Behavior
- Navigation, footer, fandom cards and song links prefetch on mouse hover or keyboard focus instead of entering the viewport. Touch navigation still works on click.
- Carousel poster sizes match their small frames. The four positions visible on phones have priority; hidden positions are lazy.
- Loading placeholders reserve at least one viewport and content margins stay inside the page container, keeping the footer out of the loading viewport.
- Read-only language consumers and the active-room target subscribe separately from workspace storage/search state. Music statistics reuse one formatter per language.
## Interface and states
The previous waveform logo, layout, localized labels, media consent, chart search and room actions remain available.
## Implementation
`IntentLink` wraps Next Link with intent-based prefetching. `useLocale` and `useCurrentRoom` expose narrow contexts. `EditorialImage` receives accurate carousel `sizes`. CSS uses `flow-root` and `min-height: 100svh` for loading stability.
## Data and access
No new database tables, provider keys, telemetry or external services. Local browser preferences retain their existing format.
## Security and privacy
No authentication shortcuts, media autoplay, consent changes or real-user data writes.
## Acceptance criteria
Production mobile audits compare the same routes, browser and Lighthouse version. Browser checks cover language restoration/switching, active-room target changes, chart filtering, navigation, carousel controls and accessibility. See [[docs/en/Verification]] for overall project checks.
## Limitations and next steps
Two sequential paired mobile Lighthouse runs (12.8.2, Chromium 156, production builds) measured Home at 53–68 before and 57–64 after; Music at 36–64 before and 61–63 after; Terms at 89–92 before and 50–88 after. CPU blocking varied substantially, including the Terms outlier. The 80 target is **not achieved**, and an overall score improvement is not claimed. Home transfer fell from 836–840 kB to 502–506 kB. Music's loading shift reached 0.789 before and was 0 in both final runs. A separate throttled browser check recorded Music background route requests falling from 20 to 2. Artifacts: `.local/performance/comparison.json` and the individual Lighthouse JSON files.

Lighthouse scores depend on device/network throttling and local CPU load. Saved reports are local audit artifacts rather than production field measurements. Further server/client separation and CSS cleanup remain possible improvements.
## Next independent step: music lists
Music cards now use `content-visibility: auto` with a reserved row height so browsers defer layout and painting of distant rows. All 150 entries remain in the DOM for search/accessibility and the playback queue keeps its full order. Desktop/mobile fixtures verify the CSS, full list, search and navigation. This is a targeted rendering optimization, not evidence of meeting Lighthouse 80; the earlier measurements remain the latest Lighthouse results. See [[docs/en/Features/Music Player]].

## Smaller Music payload — 2026-11-09
`musicLibraryView` projects validated snapshots into minimal RSC props: research evidence and unused track fields stay on the server, and legacy SoundCloud/TikTok chart records are omitted alongside the active curated collections. Full source data remains intact for provenance and detail pages. All 150 rows, search, artwork, counts, queues and room actions remain. Detail links use the row's slug instead of repeated linear searches.

Two production measurements at the same mobile viewport with CPU ×4: HTML 603,601 → 527,457 bytes (−12.6%), transferSize 81,502 → 73,920 bytes (−9.3%); both retain 3,872 DOM elements and 150 rows. Long-task totals were 1,073–1,871 → 275–399 ms, but concurrent local load varied, so no causal CPU speedup or new Lighthouse score is claimed. Artifacts: `.local/music-payload-baseline.json`, `.local/music-payload-optimized.json`.

The new unit test verifies immutable source snapshots and preserved queue data/order. Full unit run: 365 passed, one existing queue-mixing ordering failure; isolated rerun of that file passed 6/6. Mixing SQL uses a changing clock_timestamp() while updating rows; ordering instability needs a separate fix, and the test was not weakened. Other validation and final browser results are in [[TASKS]]. Lighthouse 80 remains open.

## Related notes
- [[docs/en/Home]]
- [[docs/en/Features/Music Discovery]]
- [[docs/en/Design System]]
