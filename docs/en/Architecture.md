# Architecture

> English · [[docs/Architecture|Russian original]]

Next.js 16 App Router, React 19, strict TypeScript, Tailwind 4, Radix Tabs, Lucide, Zod and React Hook Form. Versions are pinned in pnpm-lock.yaml. Pages are routed on the server; the interactive workspace uses client components. CSS design tokens live in globals.css. Manrope and prepared WebP files are stored locally; there are no runtime requests to external image, font or analytics sources. ThemeProvider and a static bootstrap manage five palettes. Image manifests retain provenance and rights information.

src/lib contains independent domain models, the provider registry, fandom catalogue and dictionaries. WorkspaceProvider stores Zod-validated local state; SSR starts in RU and restores the locale after hydration. src/components contains the shell and screens. A Supabase SSR client, proxy, Server Actions, migrations/RLS, profiles and shared rooms are prepared. Without environment configuration there are no external auth/data requests; forms are explicitly unavailable.

Server data uses Supabase Auth/PostgreSQL with the user's cookie session and a publishable/anon key, without service-role bypass. The proxy refreshes claims; Server Actions check getUser; SQL checks email verification and current role. Chat is polled every three seconds with message deltas and a locally verified JWT (details in [[docs/en/Features/Room Chat]]); Realtime is not connected yet. Public APIs are connected, but the complete multi-account scenario has not passed acceptance — [[docs/en/Backend Setup]]. Prepared private chat Storage is documented in [[docs/en/Features/Chat Media]]: Sharp compresses and sanitizes rasters, and a server endpoint checks access on every read. The media migration has not been executed in the cloud. LiveKit remains a future phase; tokens must be issued only by the server after a membership check. LocalStorage must not be used as authorization. A local draft's public flag is a prototype setting, not server publication.

## Version 0.4 presentation layer

brand.css and PageIntro/StatePanel/BrandArt give routes a shared visual style. community-pages.tsx contains read-only/community UI; welcome-page.tsx contains the landing page. The new /onboarding reuses the existing ProfileForm; /profile/[username] reads only fields permitted by current RLS using the user's session. /friends and /moderation do not query future private tables. Full map: [[docs/en/Page Catalogue]].

## Related notes

- [[docs/en/Data Model]]
- [[docs/en/Security and Privacy]]
- [[docs/en/Features/Localization]]
