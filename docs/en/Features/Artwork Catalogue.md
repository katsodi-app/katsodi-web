---
title: "Artwork Catalogue"
type: feature
status: implemented-local
created: 2026-11-01
updated: 2026-11-11
tags: [katsodi/feature]
---

# Artwork Catalogue

> English · [[docs/Features/Artwork Catalogue|Russian original]]

Owner decision 2026-11-11: original pre-replacement fandom avatars and provenance were restored from bf3a46f. The temporary abstract/thematic replacements were removed. Source-link and parser removals remain. This does not establish publication permission for the 98 previously flagged entries. See [[docs/en/Features/Project Overview]]. The earlier implementation below is historical.

Update 2026-11-11: the 98 questionable effective posters were replaced with original abstract vector compositions; 184 former public files were removed, including thumbnails and overridden copies. The remaining 52 retain CC/PD metadata; this is not an individual legal clearance. See [[docs/en/Features/Publication Content Cleanup]]. The description below records the earlier catalogue design.

## Purpose

Real posters and covers replace random thematic photographs on fandom cards.

## Users and roles

Catalogue visitors, developers and editors.

## User journeys

Search, categories, selection and pagination. Sources are available at /credits.

## Behavior

Match fandomId to the exact work; a franchise may be represented by a specific installment whose title is recorded in the manifest. Loading errors do not prevent selection.

## Interface and states

All posters on the home page and in the catalogue use equal 3:4 frames. Images fill them with absolute positioning and object-fit: cover plus a focal point; intrinsic file dimensions do not change card height. The catalogue uses a regular responsive 4/3/2-column grid with aligned titles. RU/EN alt text. Cards of different sizes retain visual rhythm.

## Implementation

fandom-posters.json (Wikipedia) and curated-posters.json (TVmaze, publisher pages, Steam, Apple and Open Library). Curated assets take priority. Preparation scripts save WebP files locally.

## Data and access

Each file records its source, original URL, rights holder/license, dimensions, review date and focal point.

## Security and privacy

Copyrighted posters are used in the local prototype at the user's request. Availability on Wikipedia/TVmaze does not grant publication rights. Check each file's rights before publication; the site is not published. Unsplash photographs have a separate license.

## Acceptance criteria

All 150 cards have matching images; local files and provenance are unit-tested, fallback is covered by e2e. Do not replace unavailable posters with random photographs.

## Limitations and next steps

Obtain public-use rights and continue editorial curation before release.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Design System]]
- [[docs/en/Verification]]
