---
title: "Link Demo"
type: feature
status: implemented-awaiting-cloud-migration
created: 2026-11-05
updated: 2026-11-09
tags: [katsodi/feature, katsodi/voice]
---

# Link Demo

> English · [[docs/Features/Link Demo|Russian original]]

## Purpose

A member shows a website to the room from a chat link. The site runs inside Katsodi for that member, everyone else watches it live, and hosts moderate it: accept it, draw on it, suggest where to click, pause it or end it. This replaces the plain screen share, which was no different from other chat apps. Compare [[docs/en/Features/Room Website]] (each member gets their own copy of a page) and [[docs/en/Features/Shared Browser]] (a paid cloud browser).

## Users and roles

- **Any active member** may launch a demo from a link; one demo or request per room at a time.
- **Owners and moderators** accept or decline requests (their own start at once), draw, suggest a click, pause, resume and end the demo.
- **The presenter** (whose link it is) is the only one who interacts with the site, and may end their own demo or withdraw a request.
- Everyone else in the room watches; outsiders, removed members and closed rooms get nothing.

## User journeys

1. A member pastes one `https://` link in the chat composer and presses **Launch demo** (the screen icon). The link is posted to the chat and a request is created.
2. Hosts see "X wants to run a demo" above the stage on any tab, open the Demo tab and press **Accept** (or **Decline**).
3. The presenter's Demo tab shows the site inside Katsodi. They press **Start broadcast**; the browser asks to share **this tab**; the capture is cropped to the site only, so the chat and the rest of Katsodi are never broadcast.
4. Everyone's room switches to the Demo tab and shows the live site, labelled "view only".
5. Hosts use **Draw**, **Suggest a click** and **Clear**; the marks appear for everyone, over the presenter's live site too, and fade after 8 seconds. **Pause** stops the broadcast for everyone with "Paused by X"; only hosts **Resume**.
6. The presenter or a host presses **End demo**, or the browser's own stop button is used.

## Behavior

- **In-app mode** (default): the site must allow embedding (same server check as [[docs/en/Features/Room Website]]) and the browser must support Region Capture (Chromium: Chrome, Edge, Opera, Yandex Browser). The capture has no audio, because it would also carry the room's voice call.
- **Window mode** (fallback): for sites that refuse embedding, or browsers without Region Capture. The site opens in a new tab and the presenter shares that tab or window, with its audio. Viewers and host tools work the same; the presenter sees the marks on the preview inside Katsodi.
- A request waits up to 10 minutes. A running demo stays live while the presenter's client confirms it every 20 seconds; after a minute without that confirmation it ends.
- Viewers connect to LiveKit only while a demo runs and the Demo tab is open. The presenter stays connected on any tab, so switching to the chat never stops the broadcast.

## Annotations (task 3.2, Zoom-style)

Researched against Zoom's annotation (2026-11-06): a toolbar with pen, highlighter, arrow and shapes, text, stamps, a spotlight pointer, eraser and undo; marks persist until cleared; the host can let participants annotate; annotator names can be shown; "clear my / all drawings". Katsodi now does the same, adapted to its own look:

- **Tools:** pen, highlighter, arrow, box, text, stamps (✓ ✕ ★ ?), spotlight pointer (live, with the name), click hint (8 s), eraser (own marks only), undo, clear mine; hosts also clear all.
- **Who:** hosts and the presenter always; everyone else only after a host presses **Annotations for everyone** (migration 2100, server-enforced: members' LiveKit tokens get data rights only then, and clients ignore their marks otherwise).
- **Visibility:** marks stay until cleared; each person has their own colour and a name tag; a legend lists who is annotating; strokes have a dark under-stroke and stamps/text a dark edge, so they read on light and dark pages.
- **Sync:** marks travel over the LiveKit data channel to everyone, the presenter included (over the live site in in-app mode). Someone who joins late receives a snapshot from the presenter. The author of a mark is the sender's LiveKit identity, never a message field, so nobody can erase, change or clear another person's marks (except a host clearing all).
- **Code:** `src/lib/annotations.ts` (schema and rules, unit-tested), `src/components/demo-overlay.tsx`, toolbar in `src/components/demo-stage.tsx`, `setDemoAnnotations` action.

## Interface and states

No demo (how to launch) · waiting (presenter: Withdraw; hosts: Accept/Decline; others: waiting) · presenter in-app (site + Start broadcast) · presenter window mode (Open the site and share) · connecting · live (view only) · paused (banner) · errors: unsupported browser, cancelled, busy, unavailable. The Launch demo button is disabled until the message is a single `https://` link, and on devices without screen capture (phones), where its hint and the Demo tab explain that phones can watch and moderate but not present (`canPresentDemo` in `src/lib/demo.ts`).

## Implementation

- Migration `20261106001800_room_demo.sql` drops 1700's `room_screens` and adds `room_demos` and the functions `request_room_demo` (also posts the link to the chat), `decide_room_demo`, `pause_room_demo`, `beat_room_demo` and `stop_room_demo`. A trigger ends a demo when its presenter leaves or is removed, and removes a demoted host from the SFU.
- `src/lib/demo.ts`: the record schema, the shared "is it current" rule, and the schema of drawing and click-hint messages.
- `GET/POST /api/rooms/[id]/demo`: the embedding check for the demo link, and 60-second LiveKit tokens (`demoToken` in `src/lib/server/voice.ts`).
- Actions in `src/lib/server/room-actions.ts`: `requestDemo`, `decideDemo`, `pauseDemo`, `stopDemo`, `beatDemo`.
- UI: `src/components/demo-stage.tsx`, `src/components/demo-overlay.tsx`; Launch demo in `src/components/chat-composer.tsx`; tab and request bar in `src/components/network-rooms.tsx`.

## Data and access

`room_demos(room_id, user_id, url, status, requested_at, decided_by, paused_by, seen_at)`, one row per room, readable by members through RLS, with no direct writes. LiveKit rights come from the server, per token:

| Who | Publish video | Send marks | Watch |
|---|---|---|---|
| Presenter of an accepted demo | yes (screen only) | no (unless also a host) | yes |
| Owner/moderator | no (unless presenter) | yes | yes |
| Other members | no | no | yes |

Clients also ignore marks from anyone who is not a host in the room's member list.

## Security and privacy

- Viewers receive video only; no viewer input ever reaches the presenter's computer. Marks are drawn on Katsodi's layer above the site, never inside it.
- The browser always asks the presenter what to share; in-app mode is cropped to the site, so private chat or other tabs are not broadcast.
- Removal, demotion, leaving and closing revoke SFU access through the voice queue; tokens are issued only while the revocation worker is healthy.
- The embedded site runs in a sandbox without top navigation. DRM video (Netflix etc.) shows black.

## Acceptance criteria

- Launch from the chat, waiting state and withdrawing; a host accepting from the request bar (e2e).
- The presenter's in-app broadcast is cropped and has no audio; a host's marks show over the live site; a host's pause stops frames (e2e).
- Hosts draw, suggest a click and pause; members have no tools and ignore marks from non-hosts (e2e).
- Token rights by role (unit); demo lifecycle, one at a time, expiry and member changes (SQL tests).

## Limitations and next steps

- Needs LiveKit and its worker ([[docs/en/Voice Setup]]). Region Capture is Chromium-only; other browsers use window mode. Phones can watch and draw but not present.
- Not yet verified with two real accounts on LiveKit.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Features/Voice Chat]]
- [[docs/en/Features/Room Website]]
- [[docs/en/Acceptance Checklist]]

## Active fullscreen and capture source selection

The active fullscreen demo fits the available width and height. The presenter site fills it; incoming video retains its source aspect ratio and matching annotation bounds. Drawing controls remain outside the capture area. Before starting, presenters can toggle between sharing a separate window and showing the site inside Katsodi. Separate-window mode uses the browser picker without cropTo on the current tab. In-app capture stops before publishing when cropping is unavailable.

The blue capture border and stop-sharing bar are browser-owned; Katsodi neither hides them nor promises their absence. See [Chrome Region Capture documentation](https://developer.chrome.com/docs/web-platform/region-capture/). The separate-window choice avoids cropping the current tab while preserving browser capture indicators. Verification and live-test limitations: [[TASKS]].

Gray side bands during captured-tab fullscreen are a separate case: Chromium applies [special fullscreen handling](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/chrome/browser/ui/exclusive_access/fullscreen_controller.h) to captured tabs. An active in-app presenter expands the room across the page viewport instead of requesting native fullscreen; playback, annotations and the crop target keep the same DOM elements. Shell behavior is documented in [[docs/en/Features/Platform UX]].
