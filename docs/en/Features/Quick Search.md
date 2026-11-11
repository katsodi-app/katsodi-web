---
title: "Quick Search"
type: feature
status: implemented-local
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature]
---

# Quick Search

> English · [[docs/Features/Quick Search|Russian original]]

## Purpose

Quickly open the rooms and fandoms people need.

## Users and roles

Local prototype visitors.

## User journeys

Sidebar/topbar button or Ctrl/Cmd+K; enter a query and filter All/Music/Rooms/Fandoms. A result opens a room or filtered catalogue.

## Behavior

Fandom searches do not change follows. Private rooms are visible only as local data in this browser profile. Do not show fabricated tracks or durations.

## Interface and states

Native dialog: focus trap, Escape, focus restoration and scroll locking. The button is available on mobile. RU/EN, empty state and query reset.

## Implementation

QuickSearch, ModalSurface and WorkspaceProvider. Static catalogue and local rooms, up to 30 results. The Shell loads QuickSearch through `next/dynamic` (`ssr: false`) when it is first opened (button or Ctrl+K), so the fandom catalogue and artwork data are not part of every page's code.

## Data and access

Queries are not sent to a server; results are local.

## Security and privacy

React escapes queries; no remote search or analytics.

## Acceptance criteria

Mouse/keyboard opening, room/fandom navigation and operation at 390px are covered by e2e.

## Limitations and next steps

Server search and a music catalogue are not connected.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Architecture]]
- [[docs/en/Verification]]
