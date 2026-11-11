---
title: "Themes"
type: feature
status: implemented-local
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature]
---

# Themes

> English · [[docs/Features/Themes|Russian original]]

## Purpose

Five palettes and a system mode provide a comfortable interface.

## Users and roles

All users.

## User journeys

Settings → Obsidian, Ember, Aurora, Violet, Paper or System. The preference persists after reload.

## Behavior

System responds to OS theme changes. Unknown values fall back to Obsidian. Storage failures are shown to the user.

## Interface and states

Theme preview cards, aria-pressed and visible focus. The logo icon and dot accents follow the selected theme's primary color; logo geometry is preserved.

## Implementation

ThemeProvider and a static allowlisted head bootstrap apply the theme before first paint.

## Data and access

localStorage: katsodi.theme; no account needed.

## Security and privacy

The bootstrap does not interpolate user strings.

## Acceptance criteria

Switching, reload, live system preference and all five palettes are covered by e2e.

## Limitations and next steps

A full contrast audit and Safari testing remain separate tasks.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Design System]]
- [[docs/en/Verification]]
