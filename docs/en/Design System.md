---
title: "Katsodi Signal design system"
type: design
status: implemented
created: 2026-11-06
updated: 2026-11-07
tags: [katsodi/design]
---

# Katsodi Signal design system

> English · [[docs/Design System|Russian original]]

The redesign (Task 1 in TASKS.md). Code: `src/app/signal.css`, loaded last; it holds every token, the theme palettes and the shared component rules. How the stylesheets fit together is described under "Stylesheet structure" below.

## Idea
Katsodi is a shared broadcast: people watching the same thing "on one wavelength". Hence the **signal** motif: thin glowing lines where something is active, and a quiet dot field as the canvas. Everything else stays calm and dark, so colour comes from posters, covers and people.

## Research and what it changed
Sources are third-party analyses and user feedback; none of these services publish their design documentation openly.

| Platform | What was studied | What Katsodi took |
|---|---|---|
| Discord (voice) | Participant tiles with a green "speaking" ring driven by smoothed volume; muted badges; users complain that equal large tiles without video waste space on avatars | Kept the speaking ring and state badges, but as a compact roster of cards across the panel instead of large tiles; a person's colour matches their chat and demo-annotation colour |
| Twitch (chat) | A flat, dense list without bubbles; a coloured name (name only, not text); heavy image badges before the name; bright names that are hard to read on dark; optional timestamps | Flat lines without bubbles; coloured names from a checked palette (darkened to 4.5:1 on the light theme); roles as short text chips (Owner/Moderator) instead of images; time always visible but muted; **our own**: consecutive messages from one person within 5 minutes are grouped (Twitch repeats the name on every line) |
| Spotify (visuals) | An achromatic dark base #121212/#181818 with colour from artwork; one accent; round "pill" buttons and chips | Kept the dark base and colour-from-content, but moved the canvas to cool ink (#0c0e11), the accent is Katsodi's lime, and the **shape differs**: 10 px soft squares instead of pills; selection is shown with a signal line, not a white fill |

## Tokens
- **Shape:** `--r-control` 10 px (buttons, inputs, chips, former pills via `--radius-pill`), `--r-card` 16, `--r-panel` 20, `--r-hero` 24. Counters and badges 6 px.
- **Type:** one family, Manrope. Scale: label 11 (uppercase, 0.14em tracking), meta 12, UI 14, body 15, lead 17, h3 18, h2 22–30, h1 30–56. Changing numbers use `tabular-nums`.
- **Colour (Obsidian theme):** canvas #0c0e11, surface #13161a, raised #1b1f24, hover #232930, muted text #b4bcc6, accent #d4ef8b. The other themes (Ember, Aurora, Violet, Paper) set their own colours for the same roles.
- **Signal:** `--signal` (accent), `--signal-soft` (14 % accent), `--signal-line` (gradient for a hero's top edge), `--hairline` (9 % of the text colour).
- **Motion:** 140/220 ms, `cubic-bezier(.2,.8,.2,1)`; reduced motion turns animations and shifts off.

## Stylesheet structure
`src/app/layout.tsx` loads five files in this order: `globals.css` → `brand.css` → `components.css` → `room.css` → `signal.css`. Since 2026-11-07 (the consolidation, item 1.4 in TASKS.md) each concern has one home:
- **Tokens live only in `signal.css`, in the Tokens section.** That covers every custom property: the Signal scales (`--r-*`, `--type-*`, `--t-*`, `--signal*`), the older scales that component rules still use (`--radius-*`, `--text-*`, `--space-*`, `--duration-*`, `--glass-*`, `--card-*`), the Obsidian, Ember, Aurora, Violet and Paper palettes, and the logo colours. `globals.css` keeps only Tailwind's `@theme inline`, which must sit in the same file as `@import "tailwindcss"`. System has no palette of its own: the script in `src/lib/themes.ts` picks Paper or Obsidian from the OS setting. `data-theme` is set both on `<html>` and on the previews in the theme picker, so palettes use `[data-theme="…"]` selectors, not only `:root`.
- **The look of shared components** (buttons, inputs, chips, search, navigation, tabs, notices, chat, voice, admin tabs and filters, the dock's return button) is set by `signal.css`. Older declarations that `signal.css` overrode have been removed: no selector sets the same property in two layers.
- **Layout and page rules** stay in the older files: `globals.css` (base elements and pages), `brand.css` (shared page layer), `components.css` (filled surfaces, profile, admin), `room.css` (room workspace).
- **Why not everything moved into `signal.css`.** Moving a declaration into a later rule changes the cascade when a rule of equal specificity for the same element sits between them: for example `.button` and `.button-small` (padding), `.notice` and `.error`, and the phone version of `.dock-return`. Those rules stay where they are. A rule was moved only when no selector in between could match the same element.
- **How to verify there is no visual change.** `CAPTURE_STYLES=1 CAPTURE_DIR=… npx playwright test … -g capture` saves every element's computed style next to the screenshots; `node scripts/redesign-compare.mjs <before> <after>` compares the two folders by pixels and by computed style.

## Components
- **Buttons:** primary is an accent fill with a thin ring and a soft glow on hover; secondary a raised surface with a border; small is 32 px. Disabled is 45 % with a not-allowed cursor; loading uses `aria-busy`.
- **Inputs:** canvas inside, `--border-strong` border, focus shows an accent border and a soft ring.
- **Focus:** one visible 2 px `--focus-ring` ring on every interactive element.
- **Navigation:** the current sidebar section gets a raised background and a glowing bar on the left; the phone's bottom bar a bar on top; room and admin tabs a bar underneath.
- **Page heroes:** 24 px radius and an accent line along the top edge.
- **Filter chips:** quiet by default; the active one a soft accent background and an underline.
- **Notices:** a coloured left edge by meaning (info/error).
- **Live indicator:** a dot with a slow pulse (off with reduced motion).
- **Chat** and **voice:** see the table above.

## Futuristic, in small doses
Only three devices: the dot field on the canvas, the glowing signal line on what is active, and the pulse of live indicators. No neon, glass or animated backgrounds.

## Previous version (v0.5, before Katsodi Signal)

**One font family: Manrope Variable** (OFL-1.1, local Latin/Cyrillic WOFF2) for UI and headings since v0.5. The files are in `public/fonts/manrope` and the rules in `src/app/fonts.css`; the root layout preloads Latin and Cyrillic, and the "Manrope Fallback" face (Arial with Manrope's metrics) keeps text from moving when the font swaps in; Inter and Montserrat were removed. The logo retains Arial. Type scale tokens: `--text-xs` 12 · `--text-sm` 13 · `--text-base` 14 · `--text-md` 16 · `--text-lg` 20 · `--text-xl` 28 · `--text-2xl` 40, with `--leading-*`, `--weight-*` and a 4/8/12/16/24/32 `--space-*` rhythm. New components use these tokens instead of raw sizes.

Semantic globals.css tokens: Obsidian, Ember, Aurora, Violet, Paper and System. Surface, text, border, focus and state colors change together. **Obsidian (default) follows a Spotify-like neutral scale** — background #121212, surface #181818, elevated #242424, hover #2a2a2a, text #ffffff / #b3b3b3, strong border #333333 — with **Katsodi's own lime accent (#d4ef8b)** rather than Spotify's brand green, and no decorative colour glows. The other themes keep their soft gradients. The logo accent follows the theme's primary color. The shared room uses one workspace surface — [[docs/en/Features/Room Experience]].

brand.css provides a common page layer above the tokens: PageIntro/StatePanel/BrandArt, thin borders, orbits, profile passport, room preview, settings index and skeletons. The desktop sidebar scrolls on short screens; mobile bottom navigation has five short items. Catalogue posters use equal 3:4 frames and object-fit cover; fandom detail pages retain a large cover. Forms, focus-visible, skip link, Radix keyboard tabs, aria-pressed, text statuses and prefers-reduced-motion are preserved. A complete accessibility audit is still pending. Screen map: [[docs/en/Page Catalogue]].

**Component layer (src/app/components.css, v0.5).** Loaded after globals.css and brand.css, it restyles shared building blocks with the tokens while leaving page layout alone: pill buttons (primary lime, outline secondary, 1.02 hover scale), pill filter chips with a white active state, filled search fields, 12px minimum for eyebrows, tags and captions, and filled surfaces instead of outlined boxes for page intros, banners, cards, panels and room cards (cards lighten on hover instead of lifting). Outlines are a token, `--card-outline`: none on dark themes, a thin border on Paper, where surfaces are close to the background. Selectors use `:is(.brand-app, body)` so they outrank the older `.brand-app …` rules. The sidebar and top bar separate by tone, not divider lines. Selectable options such as theme tiles keep their outlines.

## Related notes
- [[docs/en/Home]]
- [[docs/en/Features/Liner Aesthetics Redesign]]
- [[docs/en/Features/Room Chat]]
- [[docs/en/Features/Visual Redesign]]
- [[docs/en/Features/Themes]]
- [[docs/en/Features/Artwork Catalogue]]
- [[docs/en/Features/Editorial Slideshow]]
