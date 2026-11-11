# Katsodi detailed specification and coding-agent brief

> English · [[docs/Specification|Russian original]]

> Main project document for developing the browser MVP. Pass it in full to the coding agent. Maintain documentation as an Obsidian vault inside the repository: describe every new feature in a separate Markdown file and link notes with Obsidian wikilinks.

## Instructions for the agent

You are the lead product designer and full-stack engineer. Inspect the repository/local instructions, then design and implement **Katsodi**, a social platform for watching accessible video and listening to music together. Rooms are inspired by Rave; visual references are the attached music interface and minimalist Liner: <https://github.com/tryliner/desktop>. Create an original Katsodi style rather than copying the interface.

Prioritize a responsive browser version for desktop, tablet and phone. Prepare architecture for future Windows/macOS and iPhone/Android clients. Do not present native applications as implemented. Work autonomously and make routine product decisions. Do not describe demo placeholders as real features. Identify required infrastructure, keys or permissions.

## 1. Product and MVP scope

**Name:** Katsodi. **Description:** Gather with friends to watch and listen together.

A free application for public/private rooms, friend invitations, sharing accessible content, text and voice conversation. Free Katsodi does not grant free access to paid content. Do not remove external-service advertising.

### Include in the MVP

- Email signup/sign-in with confirmation.
- Profile, privacy settings and fandom-selection onboarding.
- Room catalogue, public/private creation, link/code invitations.
- Members, roles, text chat and basic moderation.
- Voice only with a real WebRTC/SFU backend; otherwise an explicitly labeled demo interface.
- Safe link recognition and explanations of source capabilities.
- Explicitly labeled test data when the backend is unconfigured.

### Exclude

Distribution of unlicensed video/music; bypassing DRM, subscriptions, geography, ads, authentication or embed restrictions; covert protected-player control; voice recording; payments or Katsodi advertising without a separate request.

## 2. Content and integrations

Support two honest modes:

1. **Embedded player:** only an officially permitted provider embed/API/SDK. Implement only actions it actually supports.
2. **Companion room:** users open sources themselves; Katsodi provides chat, members, invitations and manual signals. Do not call this synchronized viewing unless the source permits real synchronization.

For unsupported links show the domain, explanation, safe-open button and room link-sharing option. Validate URLs; block `javascript:`, `data:`, `file:` and similar schemes; external links use `noopener noreferrer`.

Create separate provider adapters and a capability registry with supported operations, limitations and denial reasons. Possible future sources: YouTube, VK Video, Rutube, Twitch, SoundCloud, X, Google Drive and Google Photos. Netflix, Prime Video, Disney+, HBO Max, Crunchyroll and other paid services require users' own subscriptions and compliance with platform rules. Do not present disconnected integrations as working.

## 3. Roles and permissions

- **Guest:** public page, signup/sign-in; no private data.
- **User:** profile, fandoms, friend requests, room creation/joining, chat and reports.
- **Room owner:** settings, invitations, removing members, appointing moderators, queue and closure.
- **Room moderator:** delete messages/remove members, temporarily restrict chat and report.
- **Global moderator:** reports/fandom submissions, sanctions and action log.

Enforce permissions server-side and in the database, not just by hiding UI elements.

## 4. Routes and screens

Routes: `/`, `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/onboarding`, `/home`, `/rooms`, `/rooms/create`, `/room/[roomId]`, `/fandoms`, `/fandoms/[slug]`, `/friends`, `/profile/[username]`, `/settings`, `/moderation`, `/invite/[token]`. Handle unknown routes, missing/closed rooms, expired invitations and access denial.

### Public page and account

The landing page includes brand, benefits, a room illustration, CTAs and external-content rights explanation; do not promise all films for free. Signup: email, password, confirmation, username, terms/privacy. Sign-in, password recovery and email confirmation. Every form needs validation and loading/success/error states. Do not disclose whether an email exists when it risks account enumeration.

### Onboarding

Steps: username/avatar; fandom search/selection; optional friend discovery; room creation or catalogue. Show progress, allow skipping optional steps and returning later.

### Home page

Desktop sidebar: Home, Rooms, Fandoms, Friends, Saved, Settings and profile. Topbar: search, notifications, create room and account. Main area: greeting, room CTA, URL input, friends' rooms, popular rooms and fandom activity. Demo cards must not claim content is actually playing.

Mobile: compact header, bottom navigation/drawer, one-handed room creation and vertical layout without horizontal scrolling.

### Room catalogue

Show title, cover/color, fandom, owner, member count, access, format, provider, voice and join action. Filters: activity, friends, fandom, video/music, voice and search. Private rooms are absent from public listings.

### Room creation

Fields: title, description, format, access, fandom, URL, detected provider, playback mode, voice, capacity and queue permissions. Validate URLs/provider capabilities. Private rooms receive random codes/links, expiry, usage limits, revocation and reissue. Sequential IDs are not secrets.

### Room

Desktop: title, content area, supported-function controls only, Chat/Members/Queue tabs, invitation, leave, source/connection statuses. Mobile: content above panels, large touch targets. Do not autoplay audio.

Chat: author, avatar, time, composer, system events, own-message deletion, moderation, reports and sending/error/reconnect states. Escape user text; do not duplicate messages after reconnect.

### Voice

Separate WebRTC/SFU module. Users join explicitly and grant microphone permission. Implement mute/unmute, incoming-audio deafen, device selection where supported, volume, speaking indicator, leave, errors and reconnect. Do not duck content without consent; optional ducking is off by default. Do not record audio. If voice is unconfigured, do not simulate user-to-user communication.

### Friends, profiles, fandoms and settings

Friends: username search, incoming/outgoing requests, accept/reject/cancel, remove, block, report and invite. Online status respects privacy.

Profile: avatar, username, display name, bio, fandoms, public rooms and visibility. Users edit only their own profile.

Create a seed catalogue of about 150 popular fandoms across film/TV, anime/manga, games, music, books/comics, sports and other categories. Do not invent popularity metrics or use unlicensed posters/logos. Implement search, follow and community pages. New submissions include name, category, description and rationale; states pending/needs info/approved/rejected. Moderation includes submissions, reports, reasons, decisions, filters and audit.

Settings: account, password/sessions, profile/privacy, notifications, microphone/audio, theme/language, blocks, export/deletion and terms/privacy. Do not show decorative switches.

## 5. Design system and accessibility

Dark, comfortable music-inspired style, soft gradients, expressive covers, clear typography, moderate rounding and generous space. Borrow composition ideas from the screenshot (sidebar, large covers, content list, bottom player only during actual playback); do not copy pixel for pixel.

Define design tokens for background, surfaces, text, borders, accent, statuses, radii, shadows, spacing, typography and z-index. Components: buttons, inputs, modals, drawer, tooltip, toast, avatar/presence/role, room/fandom cards, tabs, dropdown, chat, player controls, skeleton, empty/error/offline and action confirmation.

Provide keyboard support, visible focus, semantics, aria-label, contrast and `prefers-reduced-motion`; do not communicate status through color alone.

## 6. Technical stack and tools

Inspect the repository/local instructions first. If empty, select current stable compatible versions. Preserve an existing suitable stack.

### Frontend

- Next.js App Router, React, strict TypeScript;
- Tailwind CSS;
- shadcn/ui or accessible Radix components;
- Lucide icons;
- Zod and React Hook Form;
- TanStack Query when server caching is needed;
- Zustand only with a justified need.

Consult [Next.js App Router docs](https://nextjs.org/docs/app).

### Backend/data — MVP preference

- Supabase Auth: email/password, confirmation and reset;
- PostgreSQL, Supabase Realtime, Storage for avatars;
- RLS on all user-data tables;
- SQL migrations/seed in Git;
- Server routes/actions for critical operations;
- Edge Functions/backend endpoints for secrets and integrations.

Official documentation: [Supabase Auth](https://supabase.com/docs/guides/auth), [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization). If unsuitable, choose one backend (for example Node.js/NestJS + PostgreSQL + WebSocket), rather than mixing stacks without reason.

### Voice

WebRTC through an SFU such as LiveKit or equivalent; do not build an SFU from scratch. The backend issues short-lived tokens after checking membership/role. Add `VOICE_ENABLED`; secrets are unavailable to the browser.

### Tools

pnpm, compatible Node.js, Git, ESLint, Prettier, TypeScript, `.env.example`, Supabase CLI if using Supabase, and Docker Compose only when needed. CI: GitHub Actions or equivalent. Monitoring: Sentry or equivalent. Analytics require consent/data minimization. Unit: Vitest; components: React Testing Library; e2e: Playwright. Consult [Playwright docs](https://playwright.dev/docs/intro).

### Deployment

Prepare compatible Next.js hosting (for example Vercel), backend project, dev/staging/prod separation, domain/HTTPS, SMTP, backups, error monitoring, rate limits and a data-deletion policy. Do not call the product production-ready without configured services.

Example variables; never commit real values:

```env
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
VOICE_ENABLED=false
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
SENTRY_DSN=
EMAIL_FROM=
SMTP_HOST=
SMTP_USER=
SMTP_PASSWORD=
```

Service-role, SMTP and LiveKit secrets are server-only.

## 7. Git — required

1. Check for an existing Git repository; do not create nested `.git`.
2. If absent, run `git init` at the project root.
3. Add `.gitignore` for Node/Next, builds, logs, temporary files, local databases and `.env*`, retaining the `.env.example` exception.
4. Never commit secrets, personal data, node_modules, build output or local credentials.
5. Include migrations, safe seed, code, documentation and configuration.
6. Make small logical commits with clear messages (`feat: add room creation`, `docs: document room invitations`).
7. Do not rewrite history or force-push.
8. Do not add remotes or send code externally without a separate request.
9. Report Git status, commits and uncommitted changes.

## 8. Obsidian/Markdown — required

All project Markdown documents must form an Obsidian vault. Link them with wikilinks `[[Note name]]` or `[[path/Note name|label]]`. Use normal Markdown links for web URLs, GitHub, external documentation and anchors.

Create this structure (names may be extended while preserving meaning):

```text
README.md
AGENTS.md
docs/
  Home.md
  Product Overview.md
  Architecture.md
  Data Model.md
  Security and Privacy.md
  Design System.md
  Development Setup.md
  Deployment.md
  Roadmap.md
  Features/
    Feature Template.md
    Authentication.md
    Onboarding.md
    Fandoms.md
    Friends.md
    Room Creation.md
    Public Rooms.md
    Private Rooms and Invites.md
    Room Chat.md
    Voice Chat.md
    Content Providers.md
    Moderation.md
```

### One feature — one file

Every new standalone code feature gets its own `docs/Features/` file. Do not combine independent features in one document. Significant subfeatures may receive separate notes. Update notes alongside code changes.

Every feature note includes YAML frontmatter (`title`, `type: feature`, `status`, `created`, `updated`, `tags`), purpose, audience/roles, journeys, rules, UI states/errors, dependencies, routes/components, API/realtime, data/permissions, security, acceptance criteria, limitations, next steps and related Obsidian notes.

`README.md` links to `[[docs/en/Home]]`, `[[docs/en/Development Setup]]`, `[[docs/en/Architecture]]`, `[[docs/en/Roadmap]]`. `docs/Home.md` indexes important documents and all features. Each docs/ document has Related notes with at least two relevant wikilinks where files exist. All feature notes are reachable from Home. AGENTS.md explains Git/documentation rules. Check broken wikilinks. Every new Markdown file includes an internal wikilink, except a template explicitly documenting this instruction.

Feature note template:

```markdown
---
title: "Feature name"
type: feature
status: planned
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags:
  - katsodi/feature
---

# Feature name

## Purpose

## Users and roles

## User journeys

## Behavior

## Interface and states

## Implementation

## Data and access

## Security and privacy

## Acceptance criteria

## Limitations and next steps

## Related notes

- [[docs/en/Home]]
- [[docs/en/Architecture]]
```

## 9. Data and realtime

Prepare migrations, foreign keys, UUIDs, UTC timestamps, constraints, indexes and an ER diagram in `[[docs/en/Data Model]]`.

Entities: profiles (auth ID, unique username, display name, bio, avatar, privacy); fandoms; user_fandoms; fandom_submissions; friend_requests; friendships (unique normalized pair); user_blocks; rooms (owner, visibility, status, fandom, format, provider, safe URL/resource ID, playback mode, voice, capacity, permissions); room_members; room_invites (token/code hash, expiry, usage limit, revocation); room_messages (safe text, soft deletion); room_events; reports; moderation_actions. Do not store plaintext provider secrets, invitation tokens or voice recordings.

Version realtime events and include event_id, room_id, type, actor_id, created_at and a validated payload. Examples: room.member_joined, room.message_created, room.settings_updated, room.playback_signal, room.queue_updated, room.voice_state_changed. Check membership before private-channel subscription and revoke removed members. Distinguish manual signals from real player synchronization.

## 10. Security, privacy and quality

RLS/server authorization; rate limits; validation; XSS/CSRF/injection protection; CSP/security headers; CORS/redirect validation; brute-force code protection; avatar size/type validation; short-lived voice tokens; no secrets in client/logs/Git. Do not send chat text to analytics or record audio. Add account export/deletion if infrastructure permits.

Optimize images, paginate long datasets, handle poor networks/browser autoplay/microphone policies and avoid unnecessary WebSockets. Support keyboard, reduced motion and mobile widths.

Analytics require consent and minimal data. Aggregated signup, room-creation, invitation-use, voice-connection result and source-check outcome-class events are allowed. Do not transmit text, audio, invitation secrets or URL tokens.

## 11. Tests and acceptance

Cover email verification; private-room denial without access; fandom selection; public/private room creation; valid/expired/revoked invitations; realtime chat; access revocation after removal; owner-action denial for users; dangerous URL blocking; no fake player for unsupported sources; understandable microphone errors; responsive UI without horizontal scrolling; loading/error/offline; no secrets/chat text in logs; feature notes and valid wikilinks.

Add lint, typecheck, build, unit and e2e commands and run checks; distinguish executed from unexecuted checks in reports. Verify keyboard navigation and mobile/desktop viewports.

## 12. Implementation phases

1. Inspection, Git, .gitignore, structure, tokens, README/AGENTS and Obsidian Home.
2. Responsive shell, main screens and labeled demo data.
3. Auth, migrations, RLS, profile, fandoms and seed.
4. Rooms, invitations, membership, roles and realtime chat.
5. Provider registry, safe links and the first genuinely permitted source.
6. Actual voice provider, tokens and multi-user checks.
7. Moderation, accessibility, tests, staging, monitoring and operational instructions.

For every new feature, add code, a separate docs/Features/ note, Obsidian links and updated index together. Do not present inactive features as working.

## 13. Final report

Report what is implemented; routes; stack; real integrations versus demo-only functions; required keys/accounts; startup, migrations and seed; checks actually run; Git initialization/commits/uncommitted changes; created notes/wikilink checks; limitations and next phase. Do not call the app production-ready without backend, access control, infrastructure, monitoring and permitted integrations.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Architecture]]
- [[docs/en/Data Model]]
- [[docs/en/Security and Privacy]]
- [[docs/en/Development Setup]]
- [[docs/en/Roadmap]]
