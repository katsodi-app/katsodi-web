---
title: "Native API Server"
type: feature
status: in-progress
created: 2026-11-13
updated: 2026-11-13
tags: [katsodi/feature, katsodi/desktop, katsodi/native, katsodi/api]
---

# Native API Server

> English · [[docs/Features/Native API Server|Russian original]]

## Purpose
Lets the [[docs/en/Features/Native Desktop Client]] run without starting the web project. The app used to need `npm run dev` (all of Next.js and the website); now the same `/api/native/v1` routes run as a small separate Node process.

## Users and roles
Developers run it locally for the app. User rights do not change: the same Supabase bearer tokens, RLS and roles as the website's routes.

## User scenarios
- `npm run native:api` builds and starts the server on `http://127.0.0.1:8787`; then `npm run native:run` connects the app to it by default.
- `GET /healthz` tells whether the server is alive.

## Behaviour rules
- Handlers are not copied: `native-api/build.mjs` finds every `src/app/api/native/v1/**/route.ts` and bundles them with esbuild together with `native-api/server.ts`. The website and the standalone server always serve the same routes.
- Next-only modules are replaced by shims: `next/headers` (empty cookies, i.e. a guest), `next/cache` (no page cache), `next/navigation` (a redirect is an error; native routes never call one), `server-only`.
- The request URL is built from the configured origin, never the Host header. Repeated headers are joined, so two `Authorization` headers become one malformed header and a 401.
- Bodies are capped at 1 MiB (handlers cap lower); an unknown path is 404, an unsupported method 405, all in the native error envelope.
- The log has only method, path, status and time; no headers or bodies.

## Interface and states
No interface. Startup prints the address and the route count, and warns when Supabase is not configured.

## Technical implementation
- `native-api/server.ts`: `node:http`, path matching (a static segment beats a parameter), conversion to Web `Request`/`Response`, 15 s header and 30 s request timeouts, shutdown on SIGINT/SIGTERM.
- Variables: `KATSODI_API_HOST` (default `127.0.0.1`), `KATSODI_API_PORT` (`8787`), `KATSODI_API_PUBLIC_ORIGIN`, `KATSODI_API_QUIET=1`. Supabase and LiveKit keys come from `.env.local` (`node --env-file-if-exists`).
- Build: `npm run native:api:build` → `native-api/dist/server.mjs` (not committed, ignored by lint); packages stay in `node_modules`.
- Link demos: `rooms/{id}/demo` (POST, DELETE), `demo/decision`, `demo/pause`, `demo/beat`, `demo/token`, `demo/annotations`, through the website's shared actions and `demoAccess`/`demoGrant`.
- `GET player`: the provider player page for the app's helper (see [[docs/en/Features/Native Desktop Client]]).
- New routes on 2026-11-13, shared by the website and the server: `POST rooms/{id}/playback` (`updatePlayback`), `DELETE rooms/{id}/queue/{item}` (`removeFromQueue`), `POST rooms/{id}/queue/{item}/play` (`playFromQueue`).

- Friends and profiles: `GET friends`, `POST friends/requests`, `POST|DELETE friends/requests/{id}`, `POST people/{user}`, `GET profiles/{username}`.
- Music: `GET music` (guests too), `POST music/listen` (`{ url, title?, room? }` → `{ roomId }`, the shared `openMusicRoom` operation).
- Invitations and moderation: `POST rooms/{id}/invites` (owner; `{ invite: { id, token, link } }`, `link` only when `NEXT_PUBLIC_APP_URL` is set), `DELETE rooms/{id}/invites/{invite}`, `POST invites/redeem` (`{ token }` → `{ roomId }`, the shared `redeemInviteToken` operation), `POST rooms/{id}/members/{user}` (`{ operation }`: kick, promote, demote, leave, close; the website's `moderateRoom` action).

## Data and access
The server stores nothing. It reads `.env.local` at startup; the service-role key is neither needed nor used by the native routes.

## Security and privacy
Listens on loopback only by default. No CORS headers. Tokens are never logged. Exposing it elsewhere (another host, TLS, a reverse proxy) is a separate owner decision and is not done.

## Acceptance criteria
Verified on 2026-11-13, Windows 11, Node 26, with Next.js not running:
- `curl` against `127.0.0.1:8787`: `/healthz` and `/meta` answer, `/rooms` returns real rooms from Supabase; `/me` without a token, a malformed token and two tokens get 401; an unknown path 404; `DELETE /meta` 405; `Cache-Control: private, no-store`, no CORS headers.
- `tests/unit/native-api-server.test.ts`: 3 tests (path matching and parameter decoding, origin instead of Host, joined repeated headers, 404/405/413).
- `tests/unit/native-api.test.ts`: 16 tests, including the new playback and queue routes.

Not verified: the new routes with a real account (needs the owner's sign-in), running behind a reverse proxy.

## Limitations and next steps
This separate server is for local development. In production the website serves the same routes: `https://katsodi.watch/api/native/v1` has worked since 2026-11-20 (Vercel, from katsodi-web); `/meta`, `/rooms`, `/music` and `/player` answer, and `/me` without sign-in returns 401.

## Related notes
- [[docs/en/Home]]
- [[docs/en/Features/Native Desktop Client]]
- [[docs/en/Features/Server Authorization]]
