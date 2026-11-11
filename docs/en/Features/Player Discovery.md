---
title: "Player Discovery"
type: feature
status: implemented-reviewed-recipes
created: 2026-11-03
updated: 2026-11-11
tags: [katsodi/feature, katsodi/player]
---

# Player Discovery

> English · [[docs/Features/Player Discovery|Russian original]]

Update 2026-11-11: Re:ANIME, LiveBall and FlixCloud integrations are removed; these hosts and subdomains are also rejected by generic discovery, including redirects. Only the Kinogo recipe and generic discovery of other sources remain. See [[docs/en/Features/Publication Content Cleanup]]. The text below preserves implementation history, not current capabilities of retired integrations.

## Purpose

Find an available player from a work/match URL. Extends [[docs/en/Features/Room Player]] with reviewed site recipes.

## Users and roles

Active members of an open shared room. Source changes remain owner/moderator-only. API permissions and RLS are unchanged.

## User journeys

Paste Re:ANIME /anime/slug or /watch/slug?ep=N: the server reads IDs for that exact work, requests public JSON and validates a separate FlixCloud iframe. LiveBall /match/ID: find a reviewed iframe or show the original match page anchored to #player_block. If the broadcast is not yet published, show an explanation and external link.

## Behavior

- Versioned recipes: kinogo-html-v1, reanime-flix-v1 and liveball-match-v1. Other sites use separate bounded discovery with DNS/IP checks — [[docs/en/Features/Generic Player Discovery]].
- Preserve Re:ANIME episodes, range 1–5000; reject repeated/nonnumeric ep values. Cache distinguishes episodes.
- Read IDs only from primitive metadata for the requested slug, without executing JavaScript. Construct the API URL on a fixed origin.
- Accept only NextEmbed movie/series and FlixCloud /e/ID with validated v=1/2 and autoPlay=false. Arbitrary URLs, tokens and redirects are rejected.
- Check each iframe's own CSP/XFO. Catalogue-page restrictions do not automatically apply to a different public iframe.
- LiveBall native players remain on the original page. Navigation/ads and service login/geographic restrictions remain intact.
- Retry repeats discovery; negative cache may last 30 seconds. Player discovery is not a shared timeline.

## Interface and states

RU/EN: searching, ready iframe, Original site page, match not started, specific match required, embedding restriction, network error and external opening. LiveBall is explicitly labeled an original page with navigation, not a clean extracted player.

## Implementation

src/lib/player-recipes.ts selects canonical URLs and safely reads known response structures. src/lib/server/player-resolver.ts runs HTML → public JSON → validated iframe or source-page fallback. Total budget 15 seconds, per-request eight seconds; page HTML up to 2 MiB, JSON 256 KiB, player HTML 512 KiB. Three candidates, four concurrent searches, request deduplication and a 128-entry cache (five-minute success, 30-second error). New origins require separately reviewed recipes/tests.

## Data and access

No new tables/migrations. The source comes only from a room accessible to the user. Source-change migration remains separate — [[docs/en/Backend Setup]]. Cache contains public metadata without room IDs, accounts or cookies.

## Security and privacy

No arbitrary server browser, eval, session replay, cookie/authorization forwarding, protection bypass or HLS proxying. Source HTML is not inserted into Katsodi's DOM; original-page iframes execute on the service origin with sandbox. Specific recipes do not follow redirects; general discovery checks each hop — [[docs/en/Features/Generic Player Discovery]]. Browser policies/site availability may restrict individual participants.

## Acceptance criteria

Unit checks episodes, lookalike domains, primitive IDs, player URLs, missing secret parameters, player/page CSP and scheduled/live fallbacks. E2E uses actual components with isolated API/iframe responses on desktop/mobile and in both locales. Results: [[docs/en/Verification]].

## Limitations and next steps

This is extensible, not a guarantee for every site. Public-structure changes may require recipe updates. Player/source are shared, but play/pause/seek are independent. Loading an interface does not prove full playback in all regions.

## api-anything review

Reviewed [goodnight000/api-anything](https://github.com/goodnight000/api-anything/tree/e22c3dab9410ca2b24f0dde5731c7834a546581d) at commit e22c3dab9410ca2b24f0dde5731c7834a546581d. It is a general web-API learning/replay tool, not a ready-made video extractor. Observing public requests is useful when developing recipes. The SDK was not installed, its setup was not run and no code was copied. [package.json](https://github.com/goodnight000/api-anything/blob/e22c3dab9410ca2b24f0dde5731c7834a546581d/package.json) requires Node >=22.13; this project runs Node 20; [MIT license](https://github.com/goodnight000/api-anything/blob/e22c3dab9410ca2b24f0dde5731c7834a546581d/LICENSE). Katsodi needs neither global installation nor published network recipes.

## Sources and observations

- [Re:ANIME: Spirited Away](https://reanime.to/watch/spirited-away-44grtu?ep=1), [public JSON](https://reanime.to/api/flix/199/1?mal=199): a separate FlixCloud iframe was found. Naruto ep=2 and One Piece ep=1 were also checked. Metadata/responses were checked, not full video playback.
- [User-provided LiveBall match](https://liveball.sx/match/1493215): an ordinary browser showed the native player; the original page loaded in a localhost iframe with #player_block at the top. Headless Chromium received 403, which was not presented as a universal service block. Playback was not manually started and cookies were not exported.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Features/Room Player]]
- [[docs/en/Features/Content Providers]]
- [[docs/en/Verification]]
