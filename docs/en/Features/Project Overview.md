---
title: "Project overview and restored avatars"
type: feature
status: implemented-verified
created: 2026-11-11
updated: 2026-11-11
tags: [katsodi/feature, katsodi/design, katsodi/privacy]
---
# Project overview and restored avatars

> English · [[docs/Features/Project Overview|Russian original]]

## Purpose
Present Katsodi at `/overview`, restore the original fandom avatars requested by the owner and document remaining privacy decisions.

## Users and roles
Public presentation, without an account. Visitors can open shared-room creation, music, fandoms and communities. API and role permissions are unchanged.

## User scenarios
The presentation covers video, music, fandoms, text/voice, demos, moderation, three starting steps and current limitations. Both regular and compact footers link to `/overview`, Discord `https://discord.gg/hDpZq49wCU` and Telegram `https://t.me/katsodi`. Following the owner’s explicit correction, original avatars, thumbnails, manifests and palettes were restored from `bf3a46f`, before the 98 replacements. Temporary stock-photo and abstract replacements were removed.

## Behaviour
Restoration is not publication permission. Original fair-use and unestablished-permission metadata remain; R1 in the internal legal review is still unresolved. Unofficial viewing recommendations and Re:ANIME/LiveBall parsers are not restored.

## Interface and states
Follow-up: `OverviewFooter` is shared by every page through `SiteFooter`, including login/signup. Container queries adapt columns to the footer's own width. Presentation anchors use `/overview#…`; legal navigation includes all seven documents. Hero tiles rock between −5° and +5° while floating, disabled with reduced motion. `OverviewFilm` synchronizes a large central play/pause button with native playback, ending and error events, with keyboard support. The poster comes from Katsodi film time0.1s, after the baked-in cover frame; the video itself is not re-encoded.
The page embeds the local 20-second `/media/katsodi-launch.mp4` film with a poster, native controls, `playsInline`, `preload=none` and no autoplay. Adjacent credits provide music/image attribution. `OverviewMotion` adds scroll reveals, short sequential delays, pointer-following decorative tiles and hover responses. Content stays available without JavaScript; reduced motion disables effects and cancels active reveals when changed. Observers and animations are cleaned up on navigation. Motion reference: the supplied Claude page recording; the reference recording itself is not published.
2026-11-11 redesign: `/overview` uses a standalone `OverviewLayout` without the app sidebar: sticky header, centered hero with eight decorative tiles, three selectable scenarios, two feature panels, radial feature map and multi-column footer. Footer search submits a real GET request to the fandom catalogue. Mobile navigation expands; tabs support arrows/Home/End; decorative motion respects reduced-motion. The map becomes a grid on narrow screens. Layout references: [Liner](https://tryliner.fun/) and [Claude overview](https://claude.com/product/overview). Existing Katsodi photographs and original drawings are used; no third-party branding or copy is reproduced.

Responsive RU/EN presentation uses existing theme tokens, editorial photography and working links. It explains development status, provider-dependent playback and desktop-browser constraints for voice/demos. Local drafts are not described as shared rooms. No fabricated user figures or statistics. Credits retain authors, sources and original rights metadata.

## Technical implementation
`overview-chrome.tsx`, `overview-screen.tsx`, `app/overview/page.tsx`, `app/overview.css`, with new short copy in `i18n.ts`. Original `fandom-posters.json`, `curated-posters.json`, `editorial.ts`, `room-palettes.json` and public fandom files are restored from the baseline. Regression checks compare all 150 effective sources, authors and rights labels to the audit snapshot. Experimental stock-photo files, manifest and preparation script are removed, as are the abstract generator and its 294 public files. Git history is not rewritten.

## Data and access
Minimum age is 16; Terms and Privacy are version 0.4. At the owner’s request, the public privacy description covers implemented features without the operator’s name or unprovided-fact sections. Its `descriptionOnly` flag hides the fill-in notice and effective date for that document; it does not certify legal completeness. Since 2026-11-12 the operator name and unprovided facts are removed from every document (see [[docs/en/Features/Legal Pages]]).

## Security and privacy
Hydration fix: parallax and cleanup no longer write inline `style` attributes onto streamed page elements from a shell effect. Web Animations API leaves React-owned DOM attributes intact and cancels on pointer leave, reduced-motion changes and unmount. No `suppressHydrationWarning` is added. Regression coverage checks hydration console errors, untouched style attributes, repeated navigation and language changes, including dev/StrictMode.
Both languages use the 16+ rule; obsolete registration-from-12 explanations are removed. Birth-date verification is not implemented. Removing information from a public policy does not remove applicable disclosure obligations. Unresolved questions remain in the internal [[docs/en/Privacy Policy Checklist]].

## Acceptance criteria
Hydration regression: final two dev/StrictMode and ten production desktop/mobile e2e cases passed; all 377 unit tests, build, lint, typecheck and docs:check passed. The initial dev run exceeded the timeout during cold `/home` compilation; the unchanged test passed on the warmed server. Logs `.local/ux-audit/hydration-*`.
Shared footer/video controls: 22 desktop/mobile e2e cases passed, including rotating tile CSS matrices, large play/pause controls, actual playback and footer column geometry at `/home`, `/music`, `/network`, `/signup`; all seven legal links and axe checked. All 377 unit tests passed. Build, types and docs checked; lint excludes only generated `.local`/`brag-output`. Shared-footer and mobile film screenshots reviewed, with the new poster reviewed separately. Logs `.local/ux-audit/footer-*`.
Film/motion verification: final build, lint (excluding generated `.local`/`brag-output`), typecheck, docs:check and 377 unit tests passed. Final eight desktop/mobile e2e cases passed: local MP4 actually decodes and plays, 20s duration, 1920×1080, no autoplay, reduced motion, RU/EN, themes, axe and standard-shell navigation. Desktop/mobile film screenshots reviewed. Reveals use independent `translate`, preserving the map's positioning `transform`. Logs `.local/ux-audit/film-*`. No external hosting deployment performed.
Full RU/EN switching, correct links in both footers, loaded images and no mobile/desktop horizontal overflow. Accessibility checks cover dark and paper themes. Unit checks confirm 150 original effective avatars and available thumbnails; e2e checks actual loading of the restored Dune poster.

Standalone redesign verification on 2026-11-11: production build, lint, typecheck, docs:check and all 377 unit tests passed. Legal scenarios passed 14/14 on desktop/mobile; after the last CSS change the separate final overview run passed 6/6. Coverage includes keyboard tabs, mobile navigation, GET search, restoring the standard shell on navigation, RU/EN, saved themes and axe in dark/paper themes. No horizontal overflow at 320/390/768/1440/1920. Inherited footer flex layout and opacity applied to decorative captions were corrected. Hero, room preview, map, footer and mobile paper-theme screenshots were visually reviewed. Stable-geometry checks use the reduced-motion setting supported by the UI itself. Logs: `.local/ux-audit/overview-redesign-*`, `overview-contrast-check-final.log`, `overview-visual-review-final.log`.

Previous verification before the standalone redesign: production build, lint, types and docs:check passed; final 20 desktop/mobile e2e cases passed. Decorative orbit overflow was confined to the illustration; contrast checks wait for finite theme transitions, and the desktop screenshot was visually reviewed. The full unit suite is not reported green: first run 375/376 (music queue ordering), isolated file rerun 6/6; full rerun 368 executed, eight not executed because PGlite setup timed out in chat-media-access, isolated rerun 8/8. New artwork and legal checks passed in both complete runs. Database routines, authorisation, queue order and test timeouts were not changed. Logs: `.local/ux-audit/overview-restore-*`.

## Limits and next steps
Publication rights for the 98 previously flagged entries remain unestablished. Actual hosting, retention, sufficient controller identity and operational procedures, including child users, remain unresolved. No deployment or community messages performed.

## Related notes
- [[docs/en/Home]]
- [[docs/en/Privacy Policy Checklist]]
- [[docs/en/Features/Artwork Catalogue]]
- [[docs/en/Features/Publication Content Cleanup]]
