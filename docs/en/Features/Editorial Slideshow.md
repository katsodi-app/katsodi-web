---
title: "Editorial Slideshow"
type: feature
status: implemented-local
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature]
---

# Editorial Slideshow

> English · [[docs/Features/Editorial Slideshow|Russian original]]

## Purpose

Six collections covering film, anime, games, music, books and sports.

## Users and roles

All home-page visitors.

## User journeys

Arrows, dots, keyboard and horizontal swipes change the story. CTAs open real catalogue filters.

## Behavior

No autorotation or interception of global keys. Vertical gestures do not switch slides.

## Interface and states

Central copy is surrounded by real posters for the current category. Text/covers fade in on collection changes; compact navigation uses an active capsule. Mobile places posters above the text. aria-live and reduced motion are supported.

## Implementation

src/data/editorial.ts and HeroCarousel. Local WebP posters from fandomAssets; six categories without autorotation.

## Data and access

Posters reuse existing fandom manifests and sources.

## Security and privacy

No external-site poster downloads while browsing.

## Acceptance criteria

Six distinct stories, working CTAs, keyboard controls and image fallbacks.

## Limitations and next steps

A collection editor and remote CMS are not implemented.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Design System]]
- [[docs/en/Verification]]
