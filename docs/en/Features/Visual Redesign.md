---
title: "Visual Redesign"
type: feature
status: implemented-local
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature]
---

# Visual Redesign

> English · [[docs/Features/Visual Redesign|Russian original]]

## Purpose

The home page combines six editorial slides, fandom collections, rooms and music lists. Obsidian reproduces the reference's soft warm glow. The logo is preserved.

## Users and roles

Guests and local-room owners.

## User journeys

Open home, navigate to a collection or room, select a fandom. RU/EN is available on every screen.

## Behavior

Do not simulate shared playback, chat or an online friends list. All capabilities remain local.

## Interface and states

Responsive navigation, grids, hover/focus/disabled/empty/error states. Local Inter/Montserrat Variable with Manrope fallback, including Cyrillic; the logo retains its previous Arial.

## Implementation

globals.css, shell.tsx, home-collections.tsx, room-card.tsx and screens.tsx. Semantic CSS tokens.

## Data and access

Version 0.1 local rooms and preferences are preserved.

## Security and privacy

No new external runtime requests for fonts or images.

## Acceptance criteria

RU/EN, navigation and forms work; no horizontal overflow from 360 to 1920px.

## Limitations and next steps

Server features remain the next phase.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Design System]]
- [[docs/en/Verification]]
