---
title: "Private Rooms and Invites"
type: feature
status: planned
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature]
---

# Private Rooms and Invites

> English · [[docs/Features/Private Rooms and Invites|Russian original]]

## Purpose

Private access and invitations.

## Users and roles

Future signed-in users; owner/moderator restrictions are enforced by the server.

## User journeys

Future short-lived random tokens, database hashes, atomic redemption and revocation. The current private flag only hides a local draft from the catalogue.

## Behavior

Do not present the feature as working until its backend is connected and access tests pass.

## Interface and states

Unavailable/planned; loading/success/error/offline after implementation.

## Implementation

/invite/[token] does not exist yet. API/realtime are planned, without implementation.

## Data and access

Future room_invites and room_members; usage limit, expiry and hash.

## Security and privacy

Do not store secrets in the client. Apply RLS and server-side checks before granting access.

## Acceptance criteria

Invalid/expired/revoked invitations must be rejected; not implemented yet.

## Limitations and next steps

Implementation is scheduled for a later phase; it has not been accepted or tested as a completed feature.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Architecture]]
- [[docs/en/Roadmap]]

Prepared server implementation: [[docs/en/Features/Room Invitations]] and [[docs/en/Features/Server Rooms]]. The cloud is not connected yet.
