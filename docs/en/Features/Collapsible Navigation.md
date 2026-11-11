---
title: "Collapsible Navigation"
type: feature
status: implemented-local
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature]
---

# Collapsible Navigation

> English · [[docs/Features/Collapsible Navigation|Russian original]]

## Purpose

Free up desktop space for content.

## Users and roles

All desktop visitors.

## User journeys

The button on the left of the topbar hides/restores the sidebar; the preference survives reload.

## Behavior

The hidden menu is inert and excluded from Tab navigation. Mobile uses bottom navigation.

## Interface and states

Smooth content movement, aria-expanded and RU/EN labels; prefers-reduced-motion disables the transition.

## Implementation

Shell, CSS transitions; localStorage katsodi.sidebar.

## Data and access

The browser stores only hidden/visible.

## Security and privacy

If localStorage fails, in-memory state still works.

## Acceptance criteria

Hiding, reload and navigation restoration are checked by e2e.

## Limitations and next steps

The preference does not synchronize across devices.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Architecture]]
- [[docs/en/Verification]]
