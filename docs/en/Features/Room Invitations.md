---
title: "Room Invitations"
type: feature
status: code-ready-awaiting-infrastructure
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature, katsodi/backend]
---

# Room Invitations

> English · [[docs/Features/Room Invitations|Russian original]]

## Purpose

Safely admit friends to a private room.

## Users and roles

Only owners create/revoke invitations; verified users redeem them.

## User journeys

The owner receives /join#TOKEN. Recipients open the link, sign in if necessary and confirm joining. An active-invitations list supports revocation after reload.

## Behavior

256 random bits; SHA-256 in the database; 24-hour expiry and a UI limit of 10 new members. Redemption locks invitation/room rows, checks expiry/revocation/limit/ban and increments uses only for a new join.

## Interface and states

RU/EN, copy field, revoke and generic unavailable state. New tokens are shown only to their creator at issuance and cannot be recovered from the database.

## Implementation

Node crypto randomBytes; create_room_invite/redeem_room_invite/revoke_room_invite. Data API cannot read token_hash, even for the owner.

## Data and access

Fragments are not sent in HTTP URLs. For login transitions, tokens are kept in tab-scoped sessionStorage; next=/join contains no credential.

## Security and privacy

Do not publish invitation links publicly. The server returns no private-room metadata before redemption. Revoke a compromised link.

## Acceptance criteria

SQL checks exhaustion, expiry, revocation and inability to bypass removal. A server test compares the stored hash with the returned token.

## Limitations and next steps

PGlite checks SQL logic; concurrent requests against real Supabase and invitation-through-auth transitions require acceptance after connection.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Backend Setup]]
- [[docs/en/Architecture]]
- [[docs/en/Verification]]
