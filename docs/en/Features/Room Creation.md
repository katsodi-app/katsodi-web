---
title: "Room Creation"
type: feature
status: local-ready
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature]
---

# Room Creation

> English · [[docs/Features/Room Creation|Russian original]]

## Purpose

Create a local room.

## Users and roles

Local prototype visitors. Server roles are not connected yet.

## User journeys

Enter a name, description, format, visibility, fandom and optional URL. Zod validation and a random UUID; open the new draft. Drafts are automatically saved, including private drafts.

## Behavior

Fandom is optional for all drafts; missing associations display Other. Existing drafts without a link are retained. [[docs/en/Features/Room Studio]] describes format cards and the live preview; [[docs/en/Features/Fandom Rooms]] covers the shared picker and backend. Works locally without promising a shared session. RU and EN have equal support.

## Interface and states

Local-state loading, empty states, and validation/save errors. Visible focus and accessible labels.

## Implementation

/rooms/create; CreateRoom; src/lib/rooms.ts. No API/realtime; dependencies are React/Next and the local WorkspaceProvider.

## Data and access

LocalStorage, up to 100 rooms; no server publication.

## Security and privacy

LocalStorage does not protect data from other users of the same browser profile. React escapes user-provided text.

## Acceptance criteria

Invalid values are not saved; created drafts open after reload.

## Limitations and next steps

The current implementation does not synchronize across devices. The server phase is described in Roadmap.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Architecture]]
- [[docs/en/Roadmap]]
