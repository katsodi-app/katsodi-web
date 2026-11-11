---
title: "Companion Dock"
type: feature
status: implemented-local
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature]
---

# Companion Dock

> English · [[docs/Features/Companion Dock|Russian original]]

## Purpose

Keep the selected room close at hand while navigating.

## Users and roles

A visitor who opened a local or demo room.

## User journeys

Opening through a card or quick search activates the dock. Save the room, expand details, open a validated source or close the panel.

## Behavior

The dock is absent until a room is selected. No autoplay, fake timer, volume or synchronized lyrics. Playback is explicitly unavailable.

## Interface and states

Responsive floating panel expanded into a native dialog with Escape and focus restoration. Light/dark themes, RU/EN.

## Implementation

CompanionDock and ModalSurface. CompanionTrack stores room context. The cover comes from the selected room card. The Shell mounts the dock through `next/dynamic` (`ssr: false`) only while a room or track is active, so pages without it do not load its code or the artwork data.

## Data and access

Room selection stays in memory until reload. Bookmarks use existing localStorage.

## Security and privacy

External links appear only after inspectSource validation, with noopener/noreferrer. No new network capabilities.

## Acceptance criteria

The panel appears on selection, displays the corresponding title and cover, closes and restores focus; unavailable playback is covered by e2e.

## Limitations and next steps

Real playback and synchronization will be separate integrations.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Architecture]]
- [[docs/en/Verification]]
