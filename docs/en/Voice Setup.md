---
title: "Voice Setup"
type: setup
status: awaiting-infrastructure
created: 2026-11-03
updated: 2026-11-03
tags: [katsodi/backend, katsodi/voice]
---

# Voice Setup

> English · [[docs/Voice Setup|Russian original]]

Implementation: [[docs/en/Features/Voice Chat]]; database foundation: [[docs/en/Backend Setup]]. Cloud configuration was not performed in this phase.

## Preparation

Without LiveKit, the lounge already supports [[docs/en/Features/Microphone Check]]: a local test needing no server keys.

1. The owner creates a [LiveKit Cloud](https://cloud.livekit.io/) project and checks current limits/costs. Do not enable automatic recording/egress.
2. Apply supabase/migrations/20261103000600_voice.sql over the foundation schema, first in staging. Media/player/fandom migrations are independent.
3. Populate server .env.local/hosting secrets: LIVEKIT_URL=wss://PROJECT.livekit.cloud, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, SUPABASE_SERVICE_ROLE_KEY and a long random VOICE_WORKER_SECRET. Do not send these in chat, commit them or mark them NEXT_PUBLIC. Public Supabase URL/publishable key remain unchanged.
4. After setup, set VOICE_ENABLED=true and restart the server. Without complete configuration, migration and heartbeat, the UI remains unavailable.

## Scheduler

Every 30 seconds, POST https://YOUR-KATSODI/api/internal/voice-worker with Authorization: Bearer VOICE_WORKER_SECRET. The scheduler's secret manager supplies the secret; it must not appear in URLs/logs. Sequential runs, concurrency=1; retry after 503. The same scheduler also calls `POST /api/internal/rooms-lifecycle` (room inactivity and deletion, [[docs/en/Features/Room Lifecycle]]) with `ROOMS_LIFECYCLE_SECRET`, or `VOICE_WORKER_SECRET` when that is not set. Locally, run `npm run voice:worker` in a second terminal next to `npm run dev` (`scripts/voice-worker.mjs`: reads the secret from `.env.local`, calls only `127.0.0.1`/`localhost`, prints status codes, never the secret; `-- --once` for a single run). Production requires a continuously operating trusted scheduler. There is no UI button for this.

The worker publishes heartbeat after draining the queue and successful SFU listRooms. The first successful run enables readiness; clients check it every 10 seconds. Errors preserve jobs; monitor 503 responses and the queue. Partial processing continues on the next run. Do not run workers concurrently or manually extend heartbeat instead of fixing errors.

## Live acceptance testing

- Two different verified accounts join the same shared room. They connect without microphone permission, then explicitly enable microphones and hear each other.
- Check mute/deafen with microphone restoration, denied permission, busy/disconnected devices, autoplay and mobile browsers. The OS microphone indicator should turn off on leaving.
- Check speaking rings using actual audio, reconnect, leaving the page and absence of recordings in LiveKit.
- Kick/leave/close/email revocation deny new JWTs after the database commit; the worker removes SFU participants/rooms. Check reuse of old Cloud tokens and queue recovery after failure. Expected delay is about 30 seconds plus API time, not immediate.
- Stop the scheduler: after 90 seconds without heartbeat new connections are unavailable; ordinary clients leave at their next check. Resume and confirm durable jobs are processed.

## Sources

- [LiveKit client SDK](https://docs.livekit.io/reference/client-sdk-js/).
- [Tokens and grants](https://docs.livekit.io/frontends/reference/tokens-grants/).
- [Participant management and Cloud token revocation](https://docs.livekit.io/intro/basics/rooms-participants-tracks/participants/).

## Related notes

- [[docs/en/Home]]
- [[docs/en/Features/Voice Chat]]
- [[docs/en/Backend Setup]]
- [[docs/en/Verification]]
