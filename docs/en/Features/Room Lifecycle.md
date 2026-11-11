---
title: "Room Lifecycle"
type: feature
status: implemented-awaiting-cloud-migration
created: 2026-11-06
updated: 2026-11-06
tags: [katsodi/feature, katsodi/rooms]
---

# Room Lifecycle

> English · [[docs/Features/Room Lifecycle|Russian original]]

## Purpose

Shared rooms clean themselves up: a room nobody is in is marked inactive after 10 minutes and deleted after 30 (task 3.1 in `TASKS.md`; owner decision 2026-11-06: delete fully). **This is the rule for video rooms.** Music rooms (migration 2200) are never marked inactive and are deleted only when nobody has opened them for 10 days — [[docs/en/Features/Music Rooms]]. Builds on [[docs/en/Features/Room Chat]].

## Users and roles

Nobody acts directly: occupancy comes from members' open room pages, and a trusted scheduler applies the rules. Local drafts (browser storage) are not affected.

## User journeys

1. Members leave a room. After 10 minutes of nobody present, the shared-room catalogue shows **Inactive · deleted in N min unless someone joins**.
2. Anyone opening the room again clears the mark and restarts the clock.
3. After 30 continuous empty minutes the room disappears with its chat, queue, invites, playback, website, demo and presence data; its chat images are removed from Storage and voice/demo access is revoked.

## Behavior

- **Occupied** = an active member has the room page open, in any tab state (a hidden tab counts): the page pings every 30 s, updating `rooms.last_occupied_at` (at most every 20 s in the database).
- **Inactive** = `last_occupied_at` older than 10 minutes → `inactive_at` set; cleared by the next ping.
- **Deleted** = `last_occupied_at` older than 30 minutes. Both timers measure continuous emptiness because any presence resets `last_occupied_at`.
- When migration 2000 is applied, existing rooms start counting from that moment.

## Interface and states

Catalogue card badge with the remaining minutes (amber). Inside the room the mark is never visible, because being there clears it.

## Implementation

- Migration `20261106002000_room_lifecycle.sql`: `rooms.last_occupied_at`, `rooms.inactive_at`, `room_occupancy_ping`, `run_room_lifecycle` (service role only), `room_storage_cleanup` queue.
- `src/lib/server/room-lifecycle.ts` (runs the SQL step, removes `chat-images/<room>/…`), `POST /api/internal/rooms-lifecycle` (Bearer `ROOMS_LIFECYCLE_SECRET`, or `VOICE_WORKER_SECRET` when unset).
- Ping: `pingRoomOccupancy` in `src/lib/server/room-actions.ts`, sent from `SharedRoom` in `src/components/network-rooms.tsx`. Locally `npm run voice:worker` also calls the lifecycle endpoint.

## Data and access

Members cannot change occupancy fields directly; only `room_occupancy_ping` for a room they are an active member of. `run_room_lifecycle` and the cleanup queue are available to the service role only.

## Security and privacy

Deletion is permanent and removes chat history and images. Pings carry only the room id; no viewing activity is recorded beyond the timestamp.

## Acceptance criteria

- 9 vs 11 minutes, return clears inactivity, outsiders' pings ignored, deletion cascades with image cleanup and voice revocation queued, scheduler-only access (SQL tests).
- Runner removes nested image files, keeps the queue on Storage errors; endpoint rejects missing/wrong secrets (unit).
- The room page pings in a hidden tab; the catalogue shows the countdown (e2e).

## Limitations and next steps

- Needs the scheduler (`npm run voice:worker` locally, a cron in production) and `SUPABASE_SERVICE_ROLE_KEY`; without them rooms are never marked or deleted.
- The scheduler runs every 30 s, so marks and deletions can lag by up to that.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Voice Setup]]
- [[docs/en/Acceptance Checklist]]
