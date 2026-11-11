---
title: "Room Queue"
type: feature
status: implemented-awaiting-cloud-migration
created: 2026-11-04
updated: 2026-11-04
tags: [katsodi/feature, katsodi/player]
---

# Room Queue

> English · [[docs/Features/Room Queue|Russian original]]

## Purpose

A shared "up next" list, so an evening flows from one video or track to the next without anyone hunting for links. Works with [[docs/en/Features/Shared Playback]].

## Users and roles

Any active member may add links (a shared watch-list). The person who added a link, or the owner/moderators, may remove it. Only owners and moderators play an item.

## User journeys

Open the Queue tab in the room sidebar, paste a link and press Add. The host presses Play next (or Play now on a specific item): it becomes the room's source for everyone. When a synced YouTube, Vimeo or SoundCloud video ends on the host's player, the next link starts automatically.

## Behavior

- Order is first in, first out (created_at, id). At most 50 links per room; one add per person every 2 seconds.
- Playing an item goes through set_room_source, with the same URL rules, owner/moderator check and 2-second throttle, then removes the item, all in one transaction. The new source invalidates the shared timeline, so the new video starts from a stopped state.
- Auto-advance runs only on the host's player, only when the queue is non-empty, at most once per 5 seconds.
- Queue changes send the content-free Realtime room signal when migration 1000 is present.

## Interface and states

Fourth sidebar tab "Queue" with a count; it appears only when the migration is applied and the room is open. Add form, "Up next · N", Play next for hosts, rows with provider name and short link, Play now / Remove buttons by permission, empty state and a hint (auto-advance for hosts, "the host plays links" for members). Errors: invalid link, rate limit, queue full. RU/EN. In a 380px sidebar the tabs show text and counts only.

## Implementation

`src/components/room-queue.tsx`; actions `addToQueue`, `removeFromQueue`, `playFromQueue` in `src/lib/server/room-actions.ts`; the room refresh includes `queue` (`src/lib/server/network-data.ts`). Auto-advance: `SyncedPlayer` → `onEnded` → `playFromQueue`. Vimeo and Dailymotion were added to the provider name registry for labels (capabilities unchanged).

## Data and access

Migration `20261104001100_room_queue.sql` (after room_player 0500): table `room_queue` (id, room_id, url, added_by, created_at) with RLS read for active members and no direct writes; RPCs `add_room_queue`, `remove_room_queue`, `play_room_queue`. Not yet applied in the cloud — [[docs/en/Backend Setup]].

## Security and privacy

Identity and role come only from the session in SQL. Links must be HTTPS with no whitespace, at most 2048 characters; the client also checks them with the source inspector. Queued links are visible only to active members, and open externally with noopener/noreferrer.

## Acceptance criteria

PGlite: order, member adds and outsider denial, invalid links, rate limit, 50-item cap, host-only play that changes the source and resets the timeline, shared throttle, empty queue, removal by adder or host only. Browser: add and reset form, host Play next, member removes only own links, auto-advance after a host's video ends; desktop and mobile.

## Limitations and next steps

No drag-to-reorder and no per-item titles yet: rows show the provider and link, while the now-playing strip shows the current item's details. Two real accounts have not been tested against the cloud project.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Features/Shared Playback]]
- [[docs/en/Features/Room Player]]
- [[docs/en/Backend Setup]]
