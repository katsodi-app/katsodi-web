---
title: "Room Website"
type: feature
status: implemented-awaiting-cloud-migration
created: 2026-11-05
updated: 2026-11-05
tags: [katsodi/feature, katsodi/player]
---

# Room Website

> English · [[docs/Features/Room Website|Russian original]]

## Purpose

A second field next to the player: a general link, so a room can open any public website together (an article, a map, a wiki page, a game's site), not only video and music. Complements [[docs/en/Features/Room Player]] and [[docs/en/Features/Shared Browser]].

## Users and roles

Owners and moderators set, replace or close the room website. Active members see it. Outsiders, removed members and closed rooms see nothing.

## User journeys

1. A host opens the **Website** tab above the stage, pastes `https://…` and presses **Show everyone**.
2. Katsodi checks whether the site allows being shown inside other sites. If it does, every member sees it in the room.
3. If the site refuses, or the check cannot confirm it, the room says so. Hosts get **Open in shared browser** (when Hyperbeam is configured), which prefills the shared browser's address. Everyone gets **Open in a new tab**.
4. A host presses **Close website** to clear it.

## Behavior

- Only the link is shared. Each member's browser loads the page in its own iframe, so scrolling, clicks and sign-ins are personal. For one screen everyone watches, use the shared browser.
- A site is embedded only after the server confirmed it: its own response has no `X-Frame-Options`, and its CSP `frame-ancestors` is absent or `*`. Bot protection, non-HTML responses, private addresses and timeouts count as "unchecked" and are never embedded.
- The stage shows **Player · Website · Browser** when those features are available. Until someone picks a tab, the room shows a running shared browser, otherwise the website when the room has no player source, otherwise the player. A dot marks a tab that has something running.

## Interface and states

No website (host: intro and field; member: "The host hasn't opened a website yet") · checking · embedded site with its host name, a note and links · refused (blocked) · not confirmed (unchecked). The field accepts any `https://` link; the error and throttle messages are the usual room messages.

## Implementation

- Migration `20261105001600_room_site.sql`: table `room_sites` and function `set_room_site(p_room, p_url)` (empty URL clears). It adds a Realtime signal trigger when the Realtime room signals from [[docs/en/Features/Room Chat]] (migration 1000) are applied.
- `src/lib/server/site-embed.ts`: the embedding check, reusing the guarded discovery fetcher `publicPlayerPage` and `embeddingBlocked`. Verdicts are cached in memory for 10 minutes (unchecked: 1 minute).
- `GET /api/rooms/[id]/site`: the check for the stored website, active members only, `private, no-store`.
- `updateRoomSite` in `src/lib/server/room-actions.ts`; snapshot field `site` in `src/lib/server/network-data.ts` (undefined when the migration is absent).
- UI: `src/components/room-website.tsx`; the stage switch in `src/components/network-rooms.tsx`; `initialUrl` on `SharedBrowser`.

## Data and access

`room_sites(room_id, url, updated_at, updated_by)`. Members read `room_id, url, updated_at` through RLS (`private.is_member`). There are no direct writes: only `set_room_site`, which checks owner/moderator of an open room, an `https://` URL of at most 2048 characters, and at most one change per 2 seconds.

## Security and privacy

- The iframe sandbox is `allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation`, with no top navigation, so a site can never take over the room page. Referrer: `strict-origin-when-cross-origin`.
- The server check sends no cookies, credentials or user data, refuses private and reserved addresses (DNS pinned), and limits redirects, size and time.
- Katsodi never passes anyone's sign-in to the site. Pages that need a login show the member's own state with that site, if any.
- "Open in a new tab" uses `noopener noreferrer`.

## Acceptance criteria

- A host shows an embeddable site and every member sees it; closing it removes it for everyone (e2e).
- A site with `X-Frame-Options` or restrictive `frame-ancestors` is not embedded; the host can hand it to the shared browser (e2e, unit).
- Unconfirmed sites are never embedded; members see no host controls (e2e).
- Members and outsiders cannot change the website; invalid URLs and fast changes are rejected (SQL tests).

## Limitations and next steps

- Many large sites (search engines, social networks, most news sites) refuse embedding: use the shared browser.
- No shared scrolling or navigation inside the iframe; cross-origin pages cannot be observed by design.
- Sites that break out of frames with JavaScript stay inside the sandbox, but may show an empty or broken page.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Features/Room Player]]
- [[docs/en/Features/Shared Browser]]
- [[docs/en/Acceptance Checklist]]
