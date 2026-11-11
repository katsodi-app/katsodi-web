---
title: "Official Fandom Links"
type: feature
status: implemented
created: 2026-11-06
updated: 2026-11-06
tags: [katsodi/feature, katsodi/fandoms]
---

# Official Fandom Links

> English · [[docs/Features/Official Fandom Links|Russian original]]

## Why
Show on a fandom page where to watch, listen to or read it officially, in addition to the existing "Where to watch" link.

## Users and roles
Everyone who opens a fandom page. Neither the administrator nor users edit these links; a script builds the list.

## User scenarios
Open /fandoms/cinema-15 and see the Official block: Max for House of the Dragon. Anime get a Crunchyroll search, bands their official YouTube channel, sports the league's or federation's broadcasts.

## Behaviour rules
Existing links (fandom-watch-links.json) are untouched. Only verified links are shown: a 200 response and a page title matching the expected name. Links that could not be verified (geo-blocks, 404s, bot checks) are left out; a fandom without a verified link gets no block. We never bypass bot checks.

## Interface and states
Cards with the service, the kind (Streaming, Official site, Channel, Broadcasts, Search on the service) and the check date, plus a note that availability and subscriptions depend on the region. They open in a new tab with rel="noopener noreferrer". RU/EN.

## Technical implementation
- scripts/official-links-candidates.json: candidates {provider, url, kind, expect}.
- scripts/check-official-links.mjs: fetches each page and compares title/og:title/the YouTube channel name with expect; with --write it saves src/data/fandom-official-links.json with a checked date.
- Crunchyroll series pages sit behind a Cloudflare check, so those fandoms use the official crunchyroll.com/search?q=… page; for that kind (kind: search) only the address shape is checked.
- FandomConnections renders the .fandom-official block.

## Data and access
A static JSON file in the build; no database and no requests from the browser.

## Security and privacy
Only https links to official domains; no user data in addresses.

## Acceptance criteria
- Check on 2026-11-06: 133 of 133 links, 131 fandoms.
- tests/unit/official-links.test.ts: catalogue ids, https, known kind, date, official search only, no duplicates.
- e2e fandom-connections: the Official block on the Dune page with the old link still in place; axe on the fandom page in both themes.

## Limits and next steps
19 fandoms have no verified link (for example Supernatural, The X-Files, Nintendo titles, Peacock). Links go stale: rerun `node scripts/check-official-links.mjs --write` before a release. Catalogue and sources: [[docs/en/Features/Fandom Detail]], [[docs/en/Fandom Sources]].

## Related notes
- [[docs/en/Home]]
- [[docs/en/Features/Fandom Detail]]
- [[docs/en/Features/Fandoms]]
