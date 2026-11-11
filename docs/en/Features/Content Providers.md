---
title: "Content Providers"
type: feature
status: implemented-adapters
created: 2026-11-01
updated: 2026-11-02
tags: [katsodi/feature]
---

# Content Providers

> English · [[docs/Features/Content Providers|Russian original]]

## Purpose

Validate links, identify source capabilities and select a player adapter.

## Users and roles

Local-app visitors and shared-room members. Server iframe discovery requires active membership; changing the shared source requires owner/moderator privileges.

## User journeys

HTTPS only; exact recognition of YouTube, VK, Rutube, Twitch, SoundCloud and Netflix. inspectSource returns embed=true for a valid YouTube ID or public MP4/WebM link. Sync/voice remain false. Known recipes and other public HTTPS sites advertise server discovery, not a guaranteed working embed. General discovery: [[docs/en/Features/Generic Player Discovery]]; specific recipes: [[docs/en/Features/Player Discovery]]. Missing/blocked sources open externally.

## Behavior

Works locally without promising a shared session. Russian and English have equal support.

## Interface and states

Local-state loading, empty states, and validation/save errors. Visible focus and accessible labels.

## Implementation

SourceChecker and src/lib/providers.ts identify links locally. RoomPlayer and a protected room-player API perform bounded iframe discovery — [[docs/en/Features/Room Player]]. No Realtime; shared rooms update through polling.

## Data and access

Specific recipes use reviewed origins; general discovery accepts public HTTPS pages after DNS/IP checks — [[docs/en/Features/Generic Player Discovery]]. Both modes require active room membership — [[docs/en/Features/Room Player]]. URLs may contain queries; do not send them to analytics.

## Security and privacy

LocalStorage does not protect data from other users of the same browser profile. React escapes user-provided text.

## Acceptance criteria

Dangerous schemes/IPs are blocked; lookalike domains are not recognized as providers; capabilities reflect implemented adapters.

## Limitations and next steps

The current implementation does not synchronize across devices. The server phase is described in Roadmap.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Architecture]]
- [[docs/en/Roadmap]]
