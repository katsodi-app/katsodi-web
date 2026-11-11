---
title: "Brand Pages"
type: feature
status: implemented
created: 2026-11-02
updated: 2026-11-02
tags: [katsodi/feature, katsodi/design]
---

# Brand Pages

> English · [[docs/Features/Brand Pages|Russian original]]

## Purpose

A consistent Katsodi space on every screen, including forms, empty states and future specification sections.

## Users and roles

Guests, profile owners and room members. Styling does not grant additional permissions.

## User journeys

Landing, home, catalogues, fandom detail, room creation/viewing, profile/onboarding, settings, friends, invitations, moderation, credits, auth and 404/error/loading states. Full map: [[docs/en/Page Catalogue]].

## Behavior

Real controls retain their actions. Unavailable features are labeled In development. No fabricated friends, report queues or online statuses. Private data is not decorative content.

## Interface and states

PageIntro with a thematic orbit, an accent dot, compact typography, calm surfaces and consistent forms/cards. Distinct compositions for posters, profiles, settings and room creation. Five palettes and System are preserved. Sign-in remains a separate calm flow. On short desktops the sidebar scrolls and decorative content is hidden. Mobile has five short navigation items; the room warning does not occupy pages where it is unnecessary.

## Implementation

brand.css over existing semantic tokens; page-design.tsx contains PageIntro/StatePanel/BrandArt. SVG decoration and Lucide require no external media. RU/EN messages.design keys have parity checks. Loading is a reduced-motion-aware skeleton; error has a working reset; 404 links home.

## Data and access

Existing localStorage, Supabase SSR and RLS. Cloud, SMTP and migrations were not changed in this phase. Profile preview, error and loading are checked with an isolated test harness absent from app routes.

## Security and privacy

New profile pages use the user's cookie session and existing RLS. Moderation does not read private queues. /invite/[token] redirects to a /join fragment with private/no-store and no-referrer; original fragment links are recommended so credentials do not enter path access logs.

## Acceptance criteria

24 addresses are checked on desktop/mobile: HTTP status, visible h1, no horizontal overflow and a screenshot. Separate checks cover protected forms/service states using mocks, fandom selection, languages, the header alias and existing regression. Results: [[docs/en/Verification]].

## Limitations and next steps

Design preparation does not finish friends, global moderation, media Storage, voice or synchronization backends. New privacy/terms documents, native clients and a full accessibility audit are not implemented.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Page Catalogue]]
- [[docs/en/Design System]]
- [[docs/en/Features/Auth Experience]]
- [[docs/en/Features/Room Experience]]
- [[docs/en/Verification]]
