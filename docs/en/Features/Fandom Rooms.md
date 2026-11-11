---
title: "Fandom Rooms"
type: feature
status: implemented-awaiting-cloud-migration
created: 2026-11-02
updated: 2026-11-02
tags: [katsodi/feature, katsodi/backend]
---

# Fandom Rooms

> English · [[docs/Features/Fandom Rooms|Russian original]]

## Purpose

Bring descriptions, links to the work and real public rooms together on one page.

## Users and roles

Guests read descriptions and see open public rooms. Only email-verified users create shared rooms. Local drafts remain separate and do not become multiplayer rooms.

## User journeys

Click a poster in the catalogue, home page, slideshow, landing page or credits; quick search results also open /fandoms/ID. Read the description, open the specific work or let's-play, choose an existing room or create one with the fandom preselected.

Quick search results are links with actual href values; navigation is not replaced with fandom selection. Closing search is coordinated with the navigation transition; opening links in a new tab retains standard browser behavior.

## Behavior

Fandom is optional for public and private rooms; missing associations display Other. Search the 150-fandom catalogue. Zod and the database FK reject unknown IDs. Historical relationships are not invented. Apply migration 24 before creating server rooms without a fandom.

## Interface and states

Optional fandom search/select with Other as the default, and localized RU/EN labels. Detail pages show a poster, sourced description, external viewing card, rooms, empty/network/schema/unconfigured states and manual refresh with pending. At most the 50 latest open public rooms. No invented viewer counts or activity.

## Implementation

FandomPicker, FandomConnections and publicFandomRooms; the server page reads rooms without shared caching, respecting cookies/RLS. Explicit fandom_id, visibility=public and closed_at IS NULL filters apply even to private-room owners; requests time out after five seconds. SQL: supabase/migrations/20261102000400_room_fandom.sql. FK and partial index; existing 20-room limits and advisory locking remain. [[docs/en/Fandom Sources]] documents content.

## Data and access

rooms.fandom_id references existing fandoms.id. The migration does not change RLS, table grants or membership. RPC is authenticated-only and checks email verification itself. Anonymous users cannot create rooms. A private room's fandom does not make it public. Existing policies remain; unknown historical relationships stay null.

## Security and privacy

No service-role keys, login bypasses or public Storage buckets. External HTTPS links use noopener/noreferrer. The catalogue is static; source pages are not executed and their HTML is not inserted into the UI. Viewing and external-service terms are independent of Katsodi.

## Acceptance criteria

Unit: public/private validation, legacy-data compatibility and sources. PostgreSQL/PGlite: applying over the old schema, FK, anonymous denial and exclusion of unrelated/private/closed rooms. E2E: poster, RU/EN description, exact Dune link, optional selection and local ID persistence. Results: [[docs/en/Verification]].

## Limitations and next steps

No cloud migration was applied in this task: current URL/publishable key do not grant DDL permission; the user deferred cloud acceptance. Without the migration, the list shows a loading error rather than a false empty state. After applying, test two real accounts, new public/private rooms in one fandom, closure and refreshed results. Video remains external; shared embedded playback is unavailable.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Fandom Sources]]
- [[docs/en/Features/Fandom Detail]]
- [[docs/en/Features/Room Creation]]
- [[docs/en/Features/Server Rooms]]
- [[docs/en/Backend Setup]]
