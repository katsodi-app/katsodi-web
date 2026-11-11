---
title: "Progression"
type: feature
status: implemented-awaiting-cloud-migration
created: 2026-11-04
updated: 2026-11-04
tags: [katsodi/feature, katsodi/profile]
---

# Progression

> English · [[docs/Features/Progression|Russian original]]

## Purpose

Reward genuine time together with experience, levels and achievements shown on profiles, without making it worth farming. Complements [[docs/en/Features/Profile Media]].

## Users and roles

Verified users earn; the server decides every award. A profile's level and unlocked achievements are visible to whoever may see the profile; locked achievements appear only on your own profile.

## User journeys

Visit Katsodi (account, profile or friends page) once a day, create or join rooms, make friends, stay in rooms and watch together. Your profile shows the level, progress to the next level, total XP and achievements with rarity, reward and unlock date.

## Behavior

| Action | XP | Limit |
|---|---:|---|
| Daily visit | 10 | once per UTC day |
| Create a room | 20 | 3 per day |
| Join someone else's room | 5 | once per room ever, 10 per day |
| New friend (both people) | 10 | once per pair ever, 5 per day |
| 15 minutes active in a room | 15 | once per room and day, 4 per day |
| 30 minutes watching together | 20 | once per room and day, 3 per day |
| Achievement | 25–200 | once each |

- Every award is a ledger row with a unique key, so the same action never pays twice; unfriending and re-friending, or leaving and rejoining, pays nothing new.
- Presence: an open room sends a heartbeat every minute while the tab is visible; the server counts at most one minute per 50 seconds, only for active members of open rooms. A "watching together" minute also needs shared playback to be playing and another active member present in the last 90 seconds.
- Levels: reaching level L+1 from L costs round(100 × L^1.5) XP (100, 283, 520, …), computed in SQL (`level_progress`) and mirrored in `src/lib/progression.ts`.
- Achievements: First Steps, Room Creator (10 rooms), Social Butterfly (10 friends), Movie Marathon (20 video watch sessions), Music Enthusiast (50 listening sessions), Community Veteran (level 25), Legendary Member (level 100). **Night Owl is not included**: "evening" depends on a time zone Katsodi does not store.
- Amounts and daily caps live in the `xp_rules` table for balancing without code changes.

## Interface and states

Profile section with a level badge, an accessible progress bar, total XP, achievement cards (icon, name, description, rarity in words plus a colour accent, XP, unlock date or locked) and a short explanation of how XP is earned. Hidden when the migration is absent. RU/EN.

## Implementation

`src/lib/progression.ts` (schema, curve), `src/lib/server/progression.ts` (`claimDailyXp`, `profileProgress`), `src/lib/server/progression-actions.ts` (`pingRoomPresence`), heartbeat in `SharedRoom`, `src/components/profile-progress.tsx`. Daily claims run on the account, profile and friends pages.

## Data and access

Migration `20261104001500_progression.sql`: `xp_rules`, `xp_events` (unique user/kind/ref), `profiles.xp_total` (server-maintained, not client-updatable), `achievements`, `user_achievements`, `room_presence`; RPCs `claim_daily_xp`, `room_presence_ping`, `profile_progress`, `level_progress`; triggers on rooms, room_members and (when present) friendships. Works without the playback or friends migrations. Not yet applied in the cloud — [[docs/en/Backend Setup]].

## Security and privacy

No table is directly readable or writable by clients; `award` is not callable by clients. Presence rows store only per-day minute counts. Progress follows profile visibility.

## Acceptance criteria

PGlite: the curve, daily login once, room creation cap, join once per room across leave/rejoin, friendship once per pair for both, the 50-second pace and 15-minute reward, watching together only with playback and another present member, outsiders and closed rooms ignored, ledger and total protected, progress visibility and own-only locked achievements. Browser: one heartbeat from an open room and none from a closed room; level bar values, rarity text, unlock date and locked states, RU/EN.

## Limitations and next steps

No Night Owl yet (needs a time-zone setting), no notification when something unlocks, no leaderboard. Daily visit is claimed on the account, profile and friends pages, not on every page. Not yet tested with real accounts.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Features/Profile Media]]
- [[docs/en/Features/Friends]]
- [[docs/en/Backend Setup]]
