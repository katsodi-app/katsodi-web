---
title: "Saved Rooms"
type: feature
status: local-ready
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature]
---

# Saved Rooms

> English · [[docs/Features/Saved Rooms|Russian original]]

## Purpose

Saved rooms.

## Users and roles

Local prototype visitors. Server roles are not connected yet.

## User journeys

A card bookmark adds/removes a room; the collection persists on the device. New local drafts are automatically saved so private rooms can be found again.

## Behavior

Works locally without promising a shared session. Russian and English have equal support.

## Interface and states

Local-state loading, empty states, and validation/save errors. Visible focus and accessible labels.

## Implementation

/saved; RoomCard and WorkspaceProvider. No API/realtime; dependencies are React/Next and the local WorkspaceProvider.

## Data and access

Local IDs. No cross-device synchronization.

## Security and privacy

LocalStorage does not protect data from other users of the same browser profile. React escapes user-provided text.

## Acceptance criteria

Saving survives reload; an empty state appears when nothing is bookmarked.

## Limitations and next steps

The current implementation does not synchronize across devices. The server phase is described in Roadmap.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Architecture]]
- [[docs/en/Roadmap]]
