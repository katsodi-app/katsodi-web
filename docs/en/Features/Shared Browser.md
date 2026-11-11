---
title: "Shared Browser"
type: feature
status: implemented-awaiting-hyperbeam-key-and-migration
created: 2026-11-04
updated: 2026-11-04
tags: [katsodi/feature, katsodi/player]
---

# Shared Browser

> English · [[docs/Features/Shared Browser|Russian original]]

## Purpose

Browse a website together. Most sites refuse to be framed by other sites, so the room shows a real Chromium running in [Hyperbeam](https://hyperbeam.com)'s cloud, streamed to every member. Complements [[docs/en/Features/Room Player]].

## Users and roles

Owners and moderators start, steer and close the session. Active members watch with no control. Kicked members, outsiders and closed rooms get nothing.

## User journeys

A host switches the stage to Browser, enters an address and presses "Open for everyone". The room follows the new session automatically. The host uses the page directly, plus back, forward, reload and the address field; members see the same picture and the host's current address read-only. Anyone can switch back to the player; both stay connected.

## Behavior

- Sessions start with **no default roles**: nobody can control the browser. The server grants `control` and `chrome_apis` only to the connection of a verified owner/moderator (Hyperbeam `addRoles`).
- Sessions end after 4 hours, or after 5 minutes with nobody connected, which bounds cost. Starting a new session ends the previous one.
- An embed URL is a bearer capability, so **revocation ends the session**: a kick, a host losing host rights (demoted or left) or closing the room flags it, and the next room refresh by a remaining member claims the flag once and deletes the session at Hyperbeam. An ordinary member leaving does not end it, so they could keep watching until it ends or a host restarts it.
- Content-protected services (Netflix and similar) show a black screen in a cloud browser; Katsodi does not try to work around that.

## Interface and states

Stage switch Player | Browser (live dot while a session runs), shown only when `HYPERBEAM_API_KEY` is set and the migration is applied. Empty state: start form for hosts, waiting text for members, DRM note. Running: host toolbar (back, forward, reload, address, close) or a read-only address bar, status line, connection error. RU/EN; desktop and mobile.

## Implementation

`src/lib/server/hyperbeam.ts` (REST client: create/delete session, `addRoles`; only `*.hyperbeam.com` HTTPS embed URLs accepted), `src/lib/server/browser-actions.ts` (start, end, claim control, report address), the room refresh field `browser` with opportunistic revocation (`network-data.ts`), `src/components/shared-browser.tsx` with the official `@hyperbeam/web` SDK (0.0.39, loaded only when a session exists). Its optional native `cbor-extract` build script was not approved; the library falls back to JavaScript.

## Data and access

Migration `20261104001200_room_browser.sql`: table `room_browser` (session id, embed URL, current address, revoked flag) with RLS and no direct grants; RPCs `can_host_room_browser`, `set_room_browser`, `end_room_browser`, `get_room_browser`, `set_room_browser_url` (hosts, at most once per second), `claim_room_browser_revocation`; revocation triggers on room_members and rooms. Not yet applied in the cloud — [[docs/en/Backend Setup]].

## Security and privacy

The API key lives only in server environment variables. The host role is checked before a paid session is created; a session that cannot be recorded is deleted. Members never receive control. Start and navigation addresses go through the source inspector (HTTPS, no credentials, no local hosts); reported addresses are HTTP(S) only. Everything in the cloud browser runs at Hyperbeam, not on Katsodi's server.

## Acceptance criteria

PGlite: host-only start/end, member viewing, outsider and table denial, throttled host address, revocation on kick, host demotion, host leaving and room closure, no revocation when a member leaves, exactly-once claim. Unit: no default roles and bounded timeouts, key only in the header, Hyperbeam-only embed URLs, `addRoles` without the viewer token, role check before creation, deleting unrecorded and previous sessions. Browser (SDK stand-in): host start, control claim, address reporting, toolbar, unsafe address ignored, close; member read-only without control; stage switch keeps the session.

## Limitations and next steps

Not tested against a live Hyperbeam account (needs `HYPERBEAM_API_KEY`): real control grants, latency and cost are unverified. Revocation waits for a remaining member's next refresh (about a second with Realtime, up to 15 s without). No per-member "request control" flow.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Features/Room Player]]
- [[docs/en/Features/Server Authorization]]
- [[docs/en/Backend Setup]]
