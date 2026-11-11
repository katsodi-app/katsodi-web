---
title: "Room Experience"
type: feature
status: implemented
created: 2026-11-01
updated: 2026-11-04
tags: [katsodi/feature, katsodi/design]
---

# Room Experience

> English · [[docs/Features/Room Experience|Russian original]]

## Purpose

Make the room a comfortable place to talk alongside a film or music.

## Users and roles

Guests see permitted public-room information. Members read/write; owners/moderators retain existing access tools.

## User journeys

Open a supported source in the embedded player or navigate to an external site, chat, send stickers/images and view members. Owners/moderators can change the shared source after the corresponding migration. A back link leads to shared rooms.

## Behavior

No fabricated online statuses or synchronization. Supported links use real embed/native players — [[docs/en/Features/Room Player]]. The chat count means room membership and is hidden for guests. Access revocation hides the conversation; temporary network errors keep the last state.

## Interface and states

**v0.5 workspace:** the room is one surface instead of separate cards — a slim room bar (back, name, description, privacy and member chips), the player column as the focus, and one sidebar with **Chat · People · Voice** tabs (Radix, keyboard-accessible). People holds members, role actions, invitations and leave/close; Voice holds the lounge. All panels stay mounted, so switching tabs never ends a call or clears a draft. The voice lounge uses a container query, so it takes its compact layout inside the sidebar on any screen. Cinematic cover for an empty source, responsive player for supported links, compact header and external-source button. Chat has initial avatars, own messages on the right, UTC times and a small delete button. The empty state invites conversation. Enter sends; Shift+Enter inserts a line break. The persistent Changes saved message after every send was removed.

## Implementation

RoomStage, SharedRoom, ChatComposer and ChatSticker. Workspace styles live in src/app/room.css, which flattens the older card rules. Desktop: player column plus a 380px sidebar that stretches to the player's height. Up to 1000px: bar, player, then the tabbed sidebar. RU/EN and existing themes are retained; time uses locale formatting. Chat polls every three seconds and refreshes immediately after sending.

## Data and access

Existing RLS-protected RoomSnapshot. Delete/moderation permissions continue to be checked server-side.

## Security and privacy

Text is rendered as React text. Built-in stickers use a fixed allowlist. Images are served by a separate authorized endpoint — [[docs/en/Features/Chat Media]].

## Acceptance criteria

The isolated browser harness uses actual components/styles with mocked actions/APIs. It checks text, stickers, image limits, locales, no overflow and missing-migration mode on desktop/mobile. Product routes have no test login.

## Limitations and next steps

The user deferred real-account acceptance. The harness does not confirm cloud delivery. Voice, a shared timeline and per-message reactions are not implemented yet. Embedded sources and iframe discovery boundaries are documented in [[docs/en/Features/Room Player]].

## Related notes

- [[docs/en/Home]]
- [[docs/en/Features/Room Chat]]
- [[docs/en/Features/Chat Media]]
- [[docs/en/Verification]]
