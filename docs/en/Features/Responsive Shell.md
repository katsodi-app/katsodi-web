---
title: "Responsive Shell"
type: feature
status: local-ready
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature]
---

# Responsive Shell

> English · [[docs/Features/Responsive Shell|Russian original]]

## Purpose

Navigation and a responsive interface.

## Users and roles

Local prototype visitors. Server roles are not connected yet.

## User journeys

Desktop sidebar and mobile bottom navigation, skip link, offline banner and restoration of local data.

## Behavior

Works locally without promising a shared session. Russian and English have equal support.

## Interface and states

Local-state loading, empty states, and validation/save errors. Visible focus and accessible labels.

## Implementation

src/components/shell.tsx and globals.css. No API/realtime; dependencies are React/Next and the local WorkspaceProvider.

## Data and access

No private server data.

## Security and privacy

LocalStorage does not protect data from other users of the same browser profile. React escapes user-provided text.

## Acceptance criteria

Check keyboard skip link, no overflow at 390px, empty and error states.

## Limitations and next steps

The current implementation does not synchronize across devices. The server phase is described in Roadmap.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Architecture]]
- [[docs/en/Roadmap]]
