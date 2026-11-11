# Deployment

> English · [[docs/Deployment|Russian original]]

Currently a local project only. No remote has been added and no code has been sent out. No public deployment has been performed. npm run dev is sufficient to preview the interface.

Before server staging: create Supabase dev/staging/prod environments, prepare migrations/RLS tests, email-confirmation/reset redirect allowlists and SMTP; keep secrets server-side. Configure HTTPS, CSP, rate limits, backups, deletion policy and monitoring. LiveKit is optional; keep VOICE_ENABLED=false until token implementation and checks are complete. Choose Next.js hosting before the first deployment.

## Behind a reverse proxy

- `NEXT_PUBLIC_APP_URL` is the public HTTPS address of the site, for example `https://katsodi.example`. It is used to build the redirects after email confirmation, password reset and invitations, and the API Origin check accepts it. Without it, Next uses the server's own address (`localhost:<port>`).
- `npm start` runs `next start` without `--hostname`. With `--hostname 127.0.0.1`, Next treats the internal rewrites in `src/proxy.ts` as external. Behind an HTTPS proxy, `/admin` and unknown songs then answer 500. Restrict access to the port with a firewall or the container network instead.
- The proxy must either pass the original `Host` or serve the site at the origin in `NEXT_PUBLIC_APP_URL`. The app deliberately does not trust `X-Forwarded-Host`.
- `Strict-Transport-Security` is always sent, but browsers honour it only over HTTPS. A static `Content-Security-Policy` (no nonces) is set in `next.config.ts`: scripts only from the own origin and the player SDKs (YouTube, Spotify, SoundCloud, Vimeo), `object-src 'none'`, `base-uri`/`form-action 'self'`, `frame-ancestors 'none'`; `connect-src` allows the own origin, Supabase from `NEXT_PUBLIC_SUPABASE_URL` (https and wss), `*.livekit.cloud` and Hyperbeam's client endpoints. Room players and the room website embed arbitrary https pages, so `frame-src`, `img-src` and `media-src` stay open to https. `NEXT_PUBLIC_SUPABASE_URL` must be set at build time, otherwise `*.supabase.co` is used. `tests/e2e/content-security-policy.spec.ts` fails on any CSP violation.
- Post-deploy check: `/admin` and `/music/unknown` answer 404, and `/auth/callback` redirects to the public domain.

## Related notes

- [[docs/en/Development Setup]]
- [[docs/en/Security and Privacy]]
- [[docs/en/Backend Setup]]
