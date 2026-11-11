---
title: "Landing Page"
type: feature
status: implemented
created: 2026-11-02
updated: 2026-11-02
tags: [katsodi/feature, katsodi/design]
---

# Landing Page

> English · [[docs/Features/Landing Page|Russian original]]

## Purpose

Explain the product idea and provide a clear first step.

## Users and roles

Guests and returning users.

## User journeys

/ leads to signup or exploring /home. Quick cards lead to shared rooms, friends and profile setup. Fandoms have a separate CTA.

## Behavior

The site does not promise embedded or synchronized playback. Sources open separately; third-party content is not redistributed.

## Interface and states

Large Stories that bring us together copy, real covers from the existing manifest, orbits and the brand mark. Mobile moves the collage below the text. Contrast and accents follow the theme; all UI is RU/EN.

## Implementation

welcome-page.tsx; HomeQuickLinks is also used on /home. Local images through EditorialImage with srcset and alt. The decorative collage is hidden from the accessibility tree.

## Data and access

Uses the existing catalogue; no new user data.

## Security and privacy

CTAs use internal routes; no backend calls for illustrations.

## Acceptance criteria

Desktop/mobile screenshots, h1, no overflow and accessible internal links. [[docs/en/Verification]].

## Limitations and next steps

Marketing copy describes the current product concept, without declaring the MVP accepted. The visual room example starts no audio or video.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Features/Brand Pages]]
- [[docs/en/Page Catalogue]]
- [[docs/en/Features/Artwork Catalogue]]
