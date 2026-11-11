---
title: "Public Rooms"
type: feature
status: local-ready
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature]
---

# Public Rooms

> English · [[docs/Features/Public Rooms|Russian original]]

## Purpose

A room catalogue.

## Users and roles

Local prototype visitors. Server roles are not connected yet.

## User journeys

Search names/descriptions and filter video/music. Demo rooms are explicitly labeled. Private drafts are excluded.

## Behavior

Works locally without promising a shared session. Russian and English have equal support.

## Interface and states

Local-state loading, empty states, and validation/save errors. Visible focus and accessible labels.

## Implementation

/home and /rooms; RoomList and RoomCard. No API/realtime; dependencies are React/Next and the local WorkspaceProvider.

## Data and access

Four examples and local public drafts; no invented online metrics.

## Security and privacy

LocalStorage does not protect data from other users of the same browser profile. React escapes user-provided text.

## Acceptance criteria

Filters work; private rooms do not appear in the catalogue.

## Limitations and next steps

The current implementation does not synchronize across devices. The server phase is described in Roadmap.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Architecture]]
- [[docs/en/Roadmap]]
