---
title: "Voice Chat"
type: feature
status: implemented-awaiting-livekit-cloud
created: 2026-11-01
updated: 2026-11-04
tags: [katsodi/feature]
---

# Voice Chat

> English · [[docs/Features/Voice Chat|Russian original]]

## Purpose

Conversation alongside video. Composition is inspired by the Discord example; gradients, typography, themes and styling remain Katsodi.

## Users and roles

Verified accounts with active membership in an open shared room. Guests/local drafts do not connect to the SFU. Owners/moderators use existing moderation to remove members.

## User journeys

Before server connection, local [[docs/en/Features/Microphone Check]] provides signal level/device selection. This is separate explicit consent; voice calls still begin with the microphone off.

Join with the microphone off, explicitly enable it, mute/deafen, select audioinput and leave. Connected avatars/speaking rings follow SFU events. Before a call, room members are labeled accordingly, without invented voice presence. Setup: [[docs/en/Voice Setup]].

## Behavior

No automatic microphone capture, recording, camera, screen share or auto-duck. Deafen disables incoming audio and microphone; undo restores the previous microphone state. Leaving, access revocation and unmount disconnect the SFU and stop tracks.

## Interface and states

**v0.5:** the lounge lives in the room sidebar's Voice tab and stays mounted when other tabs are open, so the call continues. Sound settings add a **speaker** choice where the browser supports output selection (`setSinkId`; otherwise a note says the system device is used) and a **volume slider per remote participant** (0–100 %, via LiveKit `setVolume`, kept across rejoins). **Automatic rejoin:** when LiveKit's own reconnect fails with no reason (a network drop), the lounge rejoins up to three times, after 2, 5 and 10 s, each time with a fresh server token (membership re-checked) and the microphone off. A kick, room closure, duplicate login or deliberate leave is never retried; a refused token stops at once. Voice Lounge: orbital gradient, avatars, speaking indicator, mic/deafen/device controls and red leave button. Checking/unconfigured/ready/connecting/connected/reconnecting/error, autoplay recovery, RU/EN, desktop/mobile and the active theme. Unavailable infrastructure disables joining.

## Implementation

livekit-client 2.23.0 loads on joining; livekit-server-sdk 2.19.2 issues JWTs. GET /api/rooms/[roomId]/voice checks access/readiness; POST also checks Origin and issues a token with identity from the verified session, room=katsodi-UUID, TTL=60 seconds, microphone-only publishing, subscribe=true and no data/admin/camera/screen grants. Responses are private/no-store. Clients check access every 10 seconds. Readiness requires a fresh worker heartbeat and no pending revocation for the current member/room.

## Data and access

Migration 20261103000600_voice.sql adds private RLS tables voice_revocations/voice_worker_state and a readiness RPC. Triggers persist jobs on kick/leave/membership deletion, room closure/deletion and email-confirmation withdrawal. POST /api/internal/voice-worker uses a server Bearer secret to remove SFU participants/rooms and then delete jobs; errors retain jobs for retry. Heartbeat updates after queue drain and SFU health checks. A sequential scheduler is required every 30 seconds, without overlapping runs.

## Security and privacy

LiveKit secrets, service-role key and scheduler secret stay server-side; a publishable key does not replace them. Current configuration accepts LiveKit Cloud, where RemoveParticipant revokes tokens; arbitrary self-hosted URLs are disabled. Queue revocation is asynchronous and depends on scheduler/SFU availability. Heartbeats older than 90 seconds disable new connections; ordinary clients end calls at the next check. Network failures may delay forced SFU removal until recovery. TTL alone does not terminate established sessions. E2EE mode is not enabled: WebRTC transport is encrypted to the SFU, whose operator remains trusted. Permissions-Policy permits microphone only for self and denies camera/geolocation. Katsodi code does not start recording; project recording/egress must also be disabled.

## Acceptance criteria

Unit: JWT grants, membership/closed/unverified/unconfigured/stale-worker, CSRF and worker secret; PGlite: queue privacy, triggers and readiness; worker mocks: removal/retry/heartbeat. Browser tests replace the SDK and check controls, deafen, speaking, RU/EN and teardown, not actual audio transmission. Two-real-account acceptance is mandatory after connection — [[docs/en/Verification]].

## Limitations and next steps

Code/design are prepared; cloud credentials, the voice migration and scheduler are not configured. The panel remains unavailable and does not request microphone access. Speaker selection depends on browser support; device names appear after permission. No push-to-talk, server mute or screen share. One identity per account/room: a second connection can replace the first. Actual audibility, TURN, mobile permissions and Cloud token revocation remain unaccepted.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Architecture]]
- [[docs/en/Roadmap]]
- [[docs/en/Voice Setup]]
- [[docs/en/Features/Room Experience]]
- [[docs/en/Verification]]
