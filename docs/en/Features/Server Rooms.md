---
title: "Server Rooms"
type: feature
status: code-ready-awaiting-infrastructure
created: 2026-11-01
updated: 2026-11-04
tags: [katsodi/feature, katsodi/backend]
---

# Server Rooms

> English · [[docs/Features/Server Rooms|Russian original]]

## Purpose

Rooms that can be joined from another browser.

## Users and roles

Guests view public rooms; verified users create/join; owners and moderators manage access.

## User journeys

/network lists accessible public rooms and the user's private rooms; /network/create creates rooms; /room/[UUID] displays a server room. Local /rooms and drafts remain available.

## Behavior

Room-plus-owner creation is atomic. Private rooms require invitations. Removed participants cannot return through public joining or new invitations. Owners cannot leave/remove themselves through ordinary moderation. Anyone who left returns as an ordinary member: a moderator role is not restored on rejoin (migration 20261104000700_rejoin_role_reset.sql).

## Interface and states

Explicit server badge, member/role list and confirmed join/leave/close/kick/promote/demote actions. Sources open separately; voice/playback are not simulated.

## Implementation

rooms and room_members, RLS and create_room/join_room/moderate_room. /api/rooms/[id] returns a validated snapshot with no-store.

## Data and access

SQL sets the owner using auth.uid(); clients cannot directly write owner or role fields.

## Security and privacy

Server and database checks. When access is revoked (404), previously loaded conversation data is hidden. A temporary network or server failure keeps the last snapshot, shows a reconnecting notice and does not interrupt an active voice call.

## Acceptance criteria

SQL tests confirm isolation, owner/role spoofing denial, closure and access revocation.

## Limitations and next steps

The interface is disabled until cloud migrations are applied. Room metadata editing, moderation auditing and global moderation are not implemented.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Backend Setup]]
- [[docs/en/Architecture]]
- [[docs/en/Verification]]
