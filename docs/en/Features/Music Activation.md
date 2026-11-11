---
title: "Music Activation"
type: feature
status: prepared-awaiting-owner-setup
created: 2026-11-08
updated: 2026-11-08
tags: [katsodi/feature, katsodi/music, katsodi/setup]
---
# Music Activation

> English · [[docs/Features/Music Activation|Russian original]]

## Purpose
Activate public chart storage and weekly refresh with a repeatable readiness check. Keep chart publishing, provider imports and live room acceptance distinct.

## Users and roles
The project owner applies database SQL and configures server/GitHub credentials. The trusted weekly job writes public chart snapshots. Visitors only read them.

## User journeys
Run the preflight, apply the outstanding chart migration, check privileges, seed the current charts, verify public reads, then publish and manually test the weekly workflow when separately authorized.

## Behavior
`npm run music:check` makes only GET requests to the configured chart table. It prints check names and safe explanations, never keys, track data or remote error bodies. Exit 0 means current validated public snapshots are readable; exit 1 means activation is incomplete. `--json` returns the same safe report.

`--for-publish` checks whether the publisher can read the table before initial seeding. It allows an empty table and does not require the public key in the scheduler environment. It **does not prove write privileges**, provider functionality or a running GitHub schedule. The owner SQL check verifies grants without writing snapshots.

## Interface and states
The application keeps its verified bundled fallback until cloud storage is ready. Global Spotify/YouTube charts require 150 valid current tracks each, and Most played requires 150. Partial US SoundCloud and unavailable TikTok remain labelled limitations, not artificial Top 150 lists.

## Implementation

### 1. Inspect readiness
From the project root:

```sh
npm run music:check
npm run music:check -- --json
```

Latest real read-only check on 2026-11-08: project/public/publisher configuration was present, but the chart table was missing. YouTube, Spotify and SoundCloud import credentials were absent. No database writes were performed.

### 2. Apply migration 23 once
Open the existing project in the [Supabase Dashboard](https://supabase.com/dashboard), select SQL Editor and run exactly `supabase/migrations/20261108002300_music_discovery.sql` from this repository. Then run `supabase/tests/music_activation.sql` as the database owner. It checks RLS, public read privileges, absence of client write privileges and publisher privileges inside a read-only transaction, and returns public chart counts.

The existing cloud capability catalogue already includes music-room migration 22. Do not rerun older migrations as part of this step. If the table already exists, inspect it with the acceptance SQL instead of rerunning CREATE TABLE. SQL Editor changes and CLI migration history are separate: reconcile the history before a later CLI deployment, following [Supabase migration tracking](https://supabase.com/docs/guides/deployment/database-migrations#diagnosing-and-fixing-sync-errors). This preparation does not mark migrations applied remotely.

### 3. Seed and verify charts
These commands **write public ranking snapshots** using the server publisher key; run them after the owner has applied migration 23:

```sh
npm run music:check -- --for-publish
npm run music:refresh -- --database --no-write
npm run music:refresh -- --database --no-write --all-time-only
npm run music:check
```

`--no-write` prevents changes to bundled JSON; `--database` still writes Supabase. The all-time command publishes the verified bundled list. If its checked date is older than eight days, first run `node scripts/build-music-chart.mjs` to rebuild and verify all 150 entries. Do not continue past a failed command.

The final check validates all five stored provider records and actual anonymous visibility. The three main charts must contain 150 tracks checked within eight days. Open `/music` and a song page afterward. Environment changes require a server restart; chart-table reads use the current database snapshot on each request.

### 4. Prepare provider imports
Set secrets only in `.env.local` or the production server environment, then restart:

| Capability | Configuration | Acceptance still required |
| --- | --- | --- |
| Public chart publishing | `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Migration 23, privilege check, seed, anonymous read |
| Public chart display | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same project; public reads after seeding |
| YouTube public playlists | `YOUTUBE_API_KEY` | Enable YouTube Data API v3; test a public playlist |
| SoundCloud public sets | `SOUNDCLOUD_CLIENT_ID`, `SOUNDCLOUD_CLIENT_SECRET` | Test a permitted public set through the official API |
| Spotify album/legacy adapter | `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | Provider access and a real allowed album lookup remain unverified |
| Spotify current playlist items | User authorization and owner/collaborator access | User OAuth is not implemented; app credentials alone do not activate this path |

[YouTube setup](https://developers.google.com/youtube/v3/getting-started) explains API enablement and credentials. Follow the provider's server-side key restrictions. [SoundCloud app registration](https://developers.soundcloud.com/docs/api/register-app) currently requires Artist Pro for new app credentials; registering or purchasing an account is not part of this preparation. Existing credentials use the official [client-credentials exchange](https://developers.soundcloud.com/docs/api/guide#authentication).

Spotify changed playlist endpoints from `/tracks` to `/items` and restricts current playlist-item access to an authorized owner or collaborator. The existing adapter uses the legacy endpoint and app credentials. Its mock tests are not live activation evidence. Implement a permitted user OAuth flow and update the adapter before claiming current playlist support; arbitrary public playlists are not guaranteed. See the [Spotify migration guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide) and [current playlist endpoint](https://developer.spotify.com/documentation/web-api/reference/get-playlists-items). Single-track widgets and published charts do not depend on these import keys.

### 5. Prepare the weekly job
Publication remains separately authorized. After the workflow is on the repository's default branch, enable Actions and configure repository Actions secrets:

- Required: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Optional: `SOUNDCLOUD_CLIENT_ID`, `SOUNDCLOUD_CLIENT_SECRET`.

YouTube/Spotify import credentials are server settings, not requirements for the public Kworb chart job. The workflow runs `music:check --for-publish` before refreshing, publishes the source snapshots, rebuilds all 150 Most played entries and publishes that list. It does not push Git commits.

Use **Actions → Weekly music charts → Run workflow** once, inspect all steps, then run local `npm run music:check` and inspect `/music`. The schedule is Mondays at 06:00 UTC (07:00 in Warsaw in November). GitHub schedules run from the default branch and can be delayed; a local preflight cannot verify remote secrets or a successful scheduled run. See [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) and [Actions secrets](https://docs.github.com/en/actions/how-tos/security-for-github-actions/security-guides/using-secrets-in-github-actions).

## Data and access
`src/lib/server/music-readiness.ts` checks configuration, table access, validated snapshots and public visibility. `scripts/check-music-setup.mjs` uses Next's environment loader and bundles the checker with esbuild. No new application tables or dependencies are introduced. Server secret keys must never be placed in `NEXT_PUBLIC_` variables; see [Supabase key types](https://supabase.com/docs/guides/getting-started/api-keys).

## Security and privacy
The preflight and acceptance SQL do not mutate data, request OAuth tokens or contact music providers. The seed commands and weekly job are explicitly separate writes. Permissions remain enforced by migration 23 and existing room authorization.

## Acceptance criteria
Unit checks cover missing configuration, unsafe public keys, missing storage, empty storage, current/stale/malformed snapshots, anonymous rows hidden by permissions and redacted remote failures. SQL acceptance detects client write grants and leaves snapshots unchanged. Provider tokens, real imports, two accounts and scheduled execution need live acceptance in [[docs/en/Acceptance Checklist]].

Local verification: lint, typecheck, 361 unit tests in 58 files, documentation validation (156 notes / 77 language pairs) and production build passed. The new tooling adds no UI; the preceding loading changes passed 27 affected desktop/mobile checks with one intentional mobile skip. The live preflight's nonzero status is the expected missing-migration diagnosis, not a successful activation.

## Limitations and next steps
The [[docs/en/Features/Music Player]] update adds repeatable SoundCloud/trending research before weekly publication. Both collections use the existing `spotify-all-time` payload; no migration beyond 23 is required. Bundled collections work before cloud activation.

Preparation is complete locally; migration 23, provider credentials, Spotify user OAuth and a published successful GitHub workflow are not completed or implied by it. No remote push or SQL application was performed.

## Related notes
- [[docs/en/Home]]
- [[docs/en/Features/Music Discovery]]
- [[docs/en/Features/Music Rooms]]
- [[docs/en/Backend Setup]]
