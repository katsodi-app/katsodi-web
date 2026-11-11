---
title: "Settings"
type: feature
status: local-ready
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature]
---

# Settings

> English · [[docs/Features/Settings|Russian original]]

## Purpose

Local settings.

## Users and roles

Local prototype visitors. Server roles are not connected yet.

## User journeys

Choose language and appearance ([[docs/en/Features/Themes]]), clear local data after confirmation. Account settings are unavailable for now.

## Behavior

Works locally without promising a shared session. Russian and English have equal support.

## Interface and states

Local-state loading, empty states, and validation/save errors. Visible focus and accessible labels.

## Implementation

/settings; SettingsScreen. No API/realtime; dependencies are React/Next and the local WorkspaceProvider.

## Data and access

Only local rooms, bookmarks and followed fandoms are deleted; language is retained.

## Security and privacy

LocalStorage does not protect data from other users of the same browser profile. React escapes user-provided text.

## Acceptance criteria

Confirmation is required; cancellation does not delete data.

## Limitations and next steps

The current implementation does not synchronize across devices. The server phase is described in Roadmap.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Architecture]]
- [[docs/en/Roadmap]]
