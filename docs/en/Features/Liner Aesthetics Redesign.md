---
title: "Liner Aesthetics Redesign"
type: feature
status: in-progress
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature, design, motion, ui]
---

# Liner Aesthetics Redesign

> English · [[docs/Features/Liner Aesthetics Redesign|Russian original]]

> This note describes a redesign direction. Verified implementation: [[docs/en/Features/Quick Search]], [[docs/en/Features/Companion Dock]] and [[docs/en/Features/Collapsible Navigation]]. Playback and synchronized lyrics are not implemented; the panel reports actual capabilities.

## Purpose

The user's video (`2026-11-01 14-24-01.mp4`) and reference repository [tryliner/desktop](https://github.com/tryliner/desktop) demonstrate a contemporary minimalist media-app reference:

1. **Deep atmosphere and dynamic color grading:** the background is not flat black, but a soft light aura (mesh aura / ambient glow) reflecting the active content/cover palette.
2. **Glass over boxes:** replace heavy opaque gray boxes with translucent layered glass (`backdrop-filter: blur`, thin `1px solid rgba(255,255,255,0.08)` borders).
3. **Compact, deliberate typography:** neutral Inter for UI with expressive geometric Montserrat/Manrope for headings/player, including full Cyrillic support.
4. **Responsive smooth microanimations:** quick spring easing (`cubic-bezier(0.16, 1, 0.3, 1)`), floating search with filter chips, compact bottom dock and expanded player/companion screen with synchronized text/notes.

The redesign brings this visual culture and motion to Katsodi while fully preserving Next.js 16 architecture, local state, security and RU/EN support.

---

## Analysis of the video reference and Liner repository

Frame-by-frame analysis of `2026-11-01 14-24-01.mp4` (1280x720, 72 seconds) and tryliner/desktop sources identified these components:

| Element                        | Liner / video approach                                                                                               | Katsodi implementation                                                                                          |
| :----------------------------- | :------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| **Background lighting**        | Dynamic cover-colored radial aura: red/burgundy for Clavar La Espada, smoky titanium for poster boy.                 | Semantic `--aura-color-1`, `--aura-color-2` with a soft radial gradient and `transition: background 0.6s ease`. |
| **Glass layers**               | Floating `backdrop-blur(24px)`, `bg-white/[0.04]` cards, 16–20px squircle corners.                                   | globals.css frosted-glass surface tokens and a top-edge highlight (`inset 0 1px 0 rgba(255,255,255,0.12)`).     |
| **Typography**                 | Inter for navigation/metadata/lists (`var(--font-inter)`), Montserrat for headings/player.                           | Local Latin/Cyrillic Inter/Manrope Variable + Montserrat, responsive sizes and `tracking-tight`.                |
| **Search**                     | Centered floating island with input, clear button, All/Songs/Artists/Albums chips and thumbnail results.             | Interactive QuickSearch with Cmd+K/Ctrl+K, room/fandom filters and active-item highlighting.                    |
| **Floating dock (player bar)** | Bottom glass bar, mini cover, track title, playback/volume controls and Open player.                                 | Interactive CompanionDock at the bottom showing the selected room/companion track with controls.                |
| **Expanded player**            | Two-column fullscreen view: large rounded cover and controls on the left, text/status over a deep aura on the right. | Fullscreen CompanionView modal with fandom cover, source link and companion status.                             |

---

## Users and roles

- **Guest/local prototype visitor:** comfortable unauthenticated UI, immediate click/hover feedback, theme/language switching.
- **Room creator:** convenient creation form with instant cover/style preview.

---

## User journeys

1. **Explore rooms/collections:**
   - Cards lift smoothly on hover (`translateY(-4px)`) with a soft glow and accent highlight.
   - All/Video/Music filters use a sliding selection or soft chip-state transition.
2. **Quick Search popover:**
   - Sidebar search or Ctrl+K smoothly opens a centered floating popover.
   - Queries instantly filter rooms/fandoms with cover previews and content-type labels.
3. **Companion Dock:**
   - Selecting a room creates/updates a floating glass dock with thumbnail, title and companion status.
   - Expand opens the player/room screen with a large poster and atmospheric background.
4. **Themes/language:**
   - Obsidian, Ember, Aurora, Violet and Paper smoothly adapt the aura and glass transparency.

---

## Behavior

1. **Honest statuses (strict Katsodi rule):**
   - No fabricated online/network statuses or fake connections to other devices.
   - Room data is explicitly labeled Local or Demo.
   - Video/music sources open in companion mode without simulated unavailable DRM streaming.
2. **Bilingual UI:**
   - Add every new hover hint, tooltip, search button and player heading to both RU/EN sections of [`src/lib/i18n.ts`](../../../src/lib/i18n.ts).
3. **Accessibility and motion:**
   - Support `@media (prefers-reduced-motion: reduce)` by disabling complex transforms/sliding and using immediate opacity changes.
   - Interactive buttons need aria-label and a theme-contrast focus-visible ring.

---

## Interface and states

### 1. Palette and aura (color grading)

- Base: deep graphite titanium (`#0e1013` in Obsidian), avoiding harsh flat-black contrast.
- Aura: layered diffuse top-page lighting (`--ambient-aura`) using radial-gradient and blur up to 100px.
- Borders: rgba(255, 255, 255, 0.08), increasing to rgba(255, 255, 255, 0.16) on hover.
- Glass: `backdrop-filter: blur(20px) saturate(160%)`, `background: rgba(18, 20, 24, 0.65)`.

### 2. Typography

- **Section headings:** font-bold tracking-tight text-white with small icon badges on the left, like Your Mixes/Top Albums in Liner.
- **Cards:** title 14px/600; subtitle 13px/400, reduced contrast rgba(255, 255, 255, 0.55).
- **Fonts:** Inter for system UI and Manrope/Montserrat for accent headings, with mandatory Cyrillic support.

### 3. Animation and easing

- Standard timing/easing tokens:
  - `--ease-spring: cubic-bezier(0.16, 1, 0.3, 1)`
  - `--duration-fast: 150ms`
  - `--duration-normal: 250ms`
  - `--duration-smooth: 400ms`

---

## Implementation

1. **Styles/tokens (src/app/globals.css):**
   - Update palette tokens with aura gradients, glass blur and spring timings.
   - Soft-lift/card inner-highlight styles.
   - Floating search/dock styles.
2. **UI components:**
   - [`src/components/shell.tsx`](../../../src/components/shell.tsx): compact Liner-inspired icon sidebar and floating search.
   - [`src/components/quick-search.tsx`](../../../src/components/quick-search.tsx): room/fandom modal search with chip filters.
   - [`src/components/companion-dock.tsx`](../../../src/components/companion-dock.tsx): floating bottom player dock expandable to fullscreen.
   - [`src/components/room-card.tsx`](../../../src/components/room-card.tsx): 16px corners, hover effects and format badges.
   - [`src/components/hero-carousel.tsx`](../../../src/components/hero-carousel.tsx): integrate the editorial slideshow with the aura.
3. **Localization (src/lib/i18n.ts):**
   - Add search/filter/player-control/shortcut strings to ru and en.

---

## Data and access

- Store selected room/player settings in React Context (WorkspaceProvider), persisting to localStorage.
- No runtime requests to external font/tracking servers. Fonts/assets remain local.

---

## Security and privacy

- Animation/styling runs client-side with safe CSS and React.
- No unvalidated user styles (no `style={{ __html: ... }}` with user input).
- Respect CSP and reject unsafe protocols.

---

## Acceptance criteria

1. **Visual match:** communicate video-reference depth, ambient aura, translucent glass and hover details.
2. **Smoothness:** animations target 60fps without jitter or broken layout.
3. **Bilingual:** correct rendering in Russian and English.
4. **Tests/build:** all checks pass:
   - npm run lint: no findings
   - npm run typecheck: zero errors
   - npm run unit: all pass
   - npm run docs:check: valid documentation links
   - npm run build: successful Next.js build

---

## Limitations and next steps

- Real protected-media playback and network room synchronization belong to later server releases (0.3+).
- In this phase, the dock is an interactive room companion and demonstration of music-app aesthetics.

---

## Related notes

- [[docs/en/Home]]
- [[docs/en/Architecture]]
- [[docs/en/Design System]]
- [[docs/en/Features/Visual Redesign]]
- [[docs/en/Features/Themes]]
- [[docs/en/Verification]]
