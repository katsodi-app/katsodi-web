---
title: "Friends"
type: feature
status: implemented-awaiting-cloud-migration
created: 2026-11-01
updated: 2026-11-04
tags: [katsodi/feature, katsodi/social]
---

# Friends

> English · [[docs/Features/Friends|Russian original]]

## Purpose

Keep track of the people you watch with: requests, a friends list, mutual friends and blocking, without exposing who exists or who blocked whom.

## Users and roles

Verified users. Each person sees only their own friends, requests and blocks; other people appear with name fields only.

## User journeys

On /friends, type a @username and press Add. The other person sees the request under Requests and accepts or declines; the sender can cancel. Friends can open each other's profiles. Remove ends a friendship; Block (with a second confirming click) also ends it, deletes pending requests both ways and stops new ones. Unblock lifts the block without restoring anything.

## Behavior

- A request to someone who already asked you becomes a friendship at once.
- An unknown username, yourself, or a block in either direction all return the same "could not send" outcome, so usernames and blocks cannot be probed; the attempt still counts.
- Limits: one request every 2 seconds and 20 per day per person, counted in a log so declined or cancelled requests still count.
- **Privacy change:** friends can see each other's profiles (in addition to yourself and roommates), which also covers avatars, banners and fandoms — [[docs/en/Features/Profile Media]].
- Mutual friends are returned only for profiles you may see.

## Interface and states

Add-by-username form with outcome messages (sent, now friends, already friends, could not send, rate limit). Tabs Friends · Requests · Blocked with counts; Requests opens first when something is pending and lists incoming and sent requests. Rows link to profiles. Signed out: a sign-in prompt that returns to /friends. Without a backend or the migration: the earlier design-only page. RU/EN.

## Implementation

`src/app/friends/page.tsx` (server: `friends_overview`), `src/components/friends-workspace.tsx`, `src/components/friends-sign-in.tsx`, actions in `src/lib/server/friend-actions.ts` (`sendFriendRequest`, `respondFriendRequest`, `cancelFriendRequest`, `changeFriendship` for remove/block/unblock). `/friends` was added to the safe post-login redirects.

## Data and access

Migration `20261104001400_friends.sql`: `friend_requests` (unique per direction), `friendships` (one row per pair, `user_a < user_b`), `user_blocks`, `friend_request_log`; RLS on all with no direct grants; RPCs `send_friend_request`, `respond_friend_request`, `cancel_friend_request`, `remove_friend`, `block_user`, `unblock_user`, `friends_overview`, `mutual_friends`; `private.can_read_profile` extended with friendships. Not yet applied in the cloud — [[docs/en/Backend Setup]].

## Security and privacy

Identity comes only from the session in SQL. Usernames are normalized and validated before the RPC. No online status is shown yet; it will need explicit privacy settings.

## Acceptance criteria

PGlite: send/accept/list for both people, crossing requests, sender-only cancel and recipient-only answers, declining, the identical answer for unknown names and blocks with the attempt logged, block and unblock effects both ways, both rate limits, friends seeing profiles, mutual friends and their privacy, no direct table access. Browser: Requests tab first with counts, accepting sends the right request, add-by-username outcome, a two-click block, profile links; signed-out prompt with a return link.

## Limitations and next steps

No online status, no notifications, no "invite a friend to this room" button yet (invite links still work), mutual friends are not yet shown on profiles. Not yet tested with real accounts.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Features/Profile Media]]
- [[docs/en/Features/Room Invitations]]
- [[docs/en/Backend Setup]]
