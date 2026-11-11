---
title: "Room Chat"
type: feature
status: code-ready-awaiting-infrastructure
created: 2026-11-01
updated: 2026-11-04
tags: [katsodi/feature, katsodi/backend]
---

# Room Chat

> English · [[docs/Features/Room Chat|Russian original]]

## Purpose

Messaging between real participants.

## Users and roles

Active members read/write; authors delete their own messages, owners/moderators delete members' messages.

## User journeys

Join a shared room, send up to 2000 characters, see messages from another client and delete a message.

## Behavior

Sender identity comes only from auth.uid(). Messages are available exclusively to active members, including in public rooms. Closed rooms reject new messages. The basic send interval is one second.

## Interface and states

Last 100 messages in chronological order, plain text, composer, pending/error and hiding data when access is revoked. New messages scroll into view only while the reader is at the bottom of the list or just sent one; someone reading history is not pulled down. Time is UTC. New interface: [[docs/en/Features/Room Experience]]; stickers/compressed images after an additional migration: [[docs/en/Features/Chat Media]].

## Implementation

room_messages and send_room_message/delete_room_message SQL functions. **Realtime signals (migration 20261104001000_room_signals.sql):** database triggers broadcast an empty `changed` event on the public Realtime channel `room:<id>` when messages, members, playback or the source change. The browser (`src/lib/room-signal.ts`, no session) only reacts by refreshing through the protected API at once, so updates should arrive in about a second (not yet measured: live Realtime needs the cloud project); no message text, identity or state travels over Realtime. Anyone who knows a room's UUID could observe *when* it changes, not *what* changed. Without Realtime, clients poll a protected API every three seconds; while the subscription is live, polling slows to 15 seconds as a fallback. Each poll sends `?after=` with the newest message id on screen, and the server returns only the ordered id window plus full rows for newer messages, so an idle room costs one index scan instead of re-sending 100 messages. Deletions disappear because their ids leave the window; a delta that does not line up triggers a full resync. Polling stops while the tab is hidden and resumes immediately when it becomes visible. The polled endpoint verifies the session JWT locally (`getClaims`) instead of calling the Auth server each time; membership and email confirmation remain enforced by RLS. The send rate limit uses the `room_messages_sender_recent` index (migration 20261104000800_message_sender_index.sql).

## Data and access

The database checks current membership on every read and mutation. No fabricated local messages.

## Security and privacy

React escapes message bodies; clients do not supply sender_id. Database reads/writes are denied after a kick. Previously received data stops being displayed at the next check.

## Acceptance criteria

RLS tests: outsiders cannot read/write, owners can read, kicks revoke access, closure prevents writes and the rate limit works.

## Limitations and next steps

Two real clients, the full email flow, high volume and concurrent rate limiting have not been tested. Attachment code is prepared, but the media migration and cloud Storage are unverified. Realtime WebSocket and comprehensive anti-spam are future phases.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Backend Setup]]
- [[docs/en/Architecture]]
- [[docs/en/Verification]]
