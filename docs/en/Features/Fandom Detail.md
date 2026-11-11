---
title: "Fandom Detail"
type: feature
status: implemented-awaiting-cloud-migration
created: 2026-11-02
updated: 2026-11-02
tags: [katsodi/feature, katsodi/design]
---

# Fandom Detail

> English · [[docs/Features/Fandom Detail|Russian original]]

## Purpose

Give each catalogue world a recognizable page of its own.

## Users and roles

Guests and signed-in users; catalogue selection is currently local.

## User journeys

Click a poster or card title, view a large poster, follow/unfollow and proceed to shared-room creation. Four other fandoms from the same category appear below.

## Behavior

/fandoms/[slug] accepts existing stable catalogue IDs (for example cinema-6). Unknown IDs return 404. No fabricated followers, activity or rooms supposedly linked automatically to a fandom.

## Interface and states

3:4 cover, title, category, selection button, in-this-browser explanation and thematic cards. Mobile stacks the composition vertically. RU/EN; work titles are not arbitrarily translated.

## Implementation

FandomDetail uses fandoms/fandomAssets and the existing WorkspaceProvider.toggleFandom. FandomCard gets a regular detail link. Selection persistence is checked after reload.

## Data and access

Local selections do not replace server profile interests. A separate migration adds rooms.fandom_id without changing private-room access.

## Security and privacy

URLs contain only known catalogue IDs; covers do not accept arbitrary external links.

## Acceptance criteria

Dune detail, persisted selection, 404 for unknown IDs and no desktop/mobile overflow.

## Limitations and next steps

Public-room selection is implemented; the cloud database needs the new migration. Short RU/EN descriptions, sources and specific external links have been added. Details: [[docs/en/Features/Fandom Rooms]] and [[docs/en/Fandom Sources]].

## Related notes

- [[docs/en/Home]]
- [[docs/en/Features/Fandoms]]
- [[docs/en/Features/Brand Pages]]
- [[docs/en/Features/Account Profile]]
