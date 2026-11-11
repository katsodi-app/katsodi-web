---
title: "Room Preview"
type: feature
status: local-ready
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature]
---

# Room Preview

> English · [[docs/Features/Room Preview|Russian original]]

## Purpose

View a room draft.

## Users and roles

Local prototype visitors. Server roles are not connected yet.

## User journeys

Display settings and the source with safe external opening; chat/members/queue tabs explicitly explain their unavailability.

## Behavior

Works locally without promising a shared session. Russian and English have equal support.

## Interface and states

Local-state loading, empty states, and validation/save errors. Visible focus and accessible labels.

## Implementation

/room/[id]; RoomScreen; Radix Tabs. No API/realtime; dependencies are React/Next and the local WorkspaceProvider.

## Data and access

Local draft UUID or demo ID; local availability does not grant server access.

## Security and privacy

LocalStorage does not protect data from other users of the same browser profile. React escapes user-provided text.

## Acceptance criteria

No autoplay, fabricated participants or messages; missing IDs show an explanation.

## Limitations and next steps

The current implementation does not synchronize across devices. The server phase is described in Roadmap.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Architecture]]
- [[docs/en/Roadmap]]
