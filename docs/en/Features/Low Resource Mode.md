---
title: "Low Resource Mode"
type: feature
status: local-ready
created: 2026-11-12
updated: 2026-11-12
tags: [katsodi/feature, katsodi/performance]
---

# Low Resource Mode

> English · [[docs/Features/Low Resource Mode|Russian original]]

## Purpose
One shared setting that makes Katsodi do less optional work on weak or busy computers, in the browser, the installed web app ([[docs/en/Features/Installable Web App]]) and the desktop app ([[docs/en/Features/Desktop Application]]). It reduces decoration and optional load; it does not remove features, change colours or shrink text.

## Users and roles
Every visitor; the choice is per browser profile. It has nothing to do with permissions: a weak computer may still be allowed to share its screen, and a strong one may lack the permission.

## User scenarios
Settings → Performance → Auto, Standard or Low resource. Under Auto the page says which of the two it is using now.

## Behaviour rules
- An explicit choice always wins. Auto picks Low only on a clear, coarse hint: the browser reports 2 GB of memory or less, 2 processor threads or fewer, or data saving. A missing hint means "unknown", never "weak". No benchmark runs at startup and nothing is measured or sent anywhere.
- Low resource mode currently:
  1. switches off CSS animations, transitions and backdrop blur on every page (colours, spacing, artwork and hierarchy stay);
  2. skips the scroll-driven effects of the overview page;
  3. stops prefetching a page when a link is hovered or focused: it loads when opened;
  4. asks the browser for a lighter Link Demo capture (at most 12 frames per second and 1280×720) before anything is encoded.
- Reduced motion (the system setting) is independent: either one switches motion off, and neither switches back on what the other disabled.
- Access checks, room refresh, presenter heartbeat and voice revocation are not slowed down by this mode.

## Interface and states
A select with three options and a short explanation, in the existing settings card; Russian and English. If storage is unavailable the choice still applies to the current page.

## Technical implementation
- `src/lib/platform/performance-policy.ts`: `resolveResources(mode, signals)`, `prefersLessMotion()`, `demoCaptureConstraints()`, and `resourceBootstrap`, a static inline script in the root layout that sets `data-resources="low|standard"` on `<html>` before paint (no flash of animation).
- `src/components/platform-settings.tsx`: the control. Storage key `katsodi.resourceMode` (`low` or `standard`; absent means Auto).
- `src/app/platform-ux.css`: the `:root[data-resources="low"]` rule, next to the existing reduced-motion rule it mirrors.
- Used by `overview-motion.tsx`, `intent-link.tsx` and `demo-stage.tsx`.

## Data and access
One local storage value. No server data, no account field, no telemetry.

## Security and privacy
The hints (`deviceMemory`, `hardwareConcurrency`, `saveData`) are read locally to choose a mode and are never stored or transmitted, so they add no fingerprinting surface on the server side.

## Acceptance criteria
- Unit tests (`tests/unit/platform.test.ts`): explicit choice beats hints; Auto thresholds; stored values are validated; the pre-paint script gives the same answer as the policy for every case, including blocked storage; demo constraints only in Low.
- Checked in Chromium on a production build (2026-11-12): choosing Low set `data-resources="low"`, stored the choice and computed transitions became `none`; Auto reported Standard on the 8-thread test machine.

## Limitations and next steps
- No before/after resource measurement was made, on any machine. That the listed changes reduce work is by design, not yet by evidence; measuring Standard against Low with `npm run desktop:perf` on a constrained computer is the next step.
- Not implemented from the wider plan: explicit-intent loading of provider widgets beyond what the site already does, lower video subscription layers in voice rooms, a quality selector for demos, reduced participant meters, and adaptation to sustained overload. Provider iframes expose no quality control to the page, so their quality stays under the provider's own controls.
- The mode cannot make Katsodi run where no maintained browser engine runs.

## Related notes
- [[docs/en/Home]]
- [[docs/en/Architecture]]
- [[docs/en/Features/Settings]]
- [[docs/en/Features/Page Loading Performance]]
- [[docs/en/Features/Link Demo]]
