---
title: "Fandoms"
type: feature
status: local-ready
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature]
---

# Fandoms

> English · [[docs/Features/Fandoms|Russian original]]

## Purpose

An interests catalogue.

## Users and roles

Local prototype visitors. Server roles are not connected yet.

## User journeys

150 named fandoms across six categories, search, category filter and local selection. Added 150 matching images, a followed filter and pagination. No fabricated popularity metrics. Posters are for the local prototype; rights information is in the manifests and [[docs/en/Features/Artwork Catalogue]].

## Behavior

Works locally without promising a shared session. Russian and English have equal support.

## Interface and states

Local-state loading, empty states, and validation/save errors. Visible focus and accessible labels.

## Implementation

/fandoms; FandomScreen; src/lib/fandoms.ts. No API/realtime; dependencies are React/Next and the local WorkspaceProvider.

## Data and access

A static TypeScript catalogue and locally selected IDs, not server subscriptions.

## Security and privacy

LocalStorage does not protect data from other users of the same browser profile. React escapes user-provided text.

## Acceptance criteria

150 unique IDs; selection survives reload. Community pages and submissions are planned.

## Limitations and next steps

The current implementation does not synchronize across devices. The server phase is described in Roadmap.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Architecture]]
- [[docs/en/Roadmap]]
