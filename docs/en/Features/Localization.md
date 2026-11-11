---
title: "Localization"
type: feature
status: local-ready
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature]
---

# Localization

> English · [[docs/Features/Localization|Russian original]]

## Purpose

Russian and English UI.

## Users and roles

Local prototype visitors. Server roles are not connected yet.

## User journeys

Switch RU/EN in the header or settings; selection survives reload. All functional text and errors are in typed dictionaries. User-provided titles are not translated.

## Behavior

Works locally without promising a shared session. Russian and English have equal support.

## Interface and states

Local-state loading, empty states, and validation/save errors. Visible focus and accessible labels.

## Implementation

All routes; src/lib/i18n.ts and WorkspaceProvider. No API/realtime; dependencies are React/Next and the local WorkspaceProvider.

## Data and access

katsodi.locale and document.lang; RU by default. SSR currently serves Russian before hydration.

## Security and privacy

LocalStorage does not protect data from other users of the same browser profile. React escapes user-provided text.

## Acceptance criteria

Check both locales, matching keys and preference persistence.

## Limitations and next steps

The current implementation does not synchronize across devices. The server phase is described in Roadmap.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Architecture]]
- [[docs/en/Roadmap]]
