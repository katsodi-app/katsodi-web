---
title: "Profile Settings"
type: feature
status: implemented
created: 2026-11-08
updated: 2026-11-08
tags: [katsodi/feature, katsodi/profile]
---
# Profile Settings

> English · [[docs/Features/Profile Settings|Russian original]]

## Why
Profile settings separate identity, photos, fandoms and the session, with navigation and saving available on small screens.
## Users and roles
A verified member edits their own profile. Existing authentication and Storage access checks remain in force.
## User scenarios
Edit identity and bio; upload an avatar or banner; choose fandoms by thumbnail, category and search; save the form. Photos save separately.
## Behaviour rules
Filtering preserves every selection and its submitted identifier. A successful upload displays immediately while waiting for the refreshed server snapshot.
## Interface and states
Desktop section navigation becomes wrapping links on phones. Separate cards and a save bar organize the form. Failed image loads show a fallback and a retry control.
## Technical implementation
The overlapping avatar has its own positioned layer above the banner. Its upper half is no longer painted underneath the banner; E2E checks visibility with hit testing.
`profile-settings.tsx` is separate from authentication forms; shared messages live in `action-status.tsx`. `profile-settings.css` uses existing design tokens and local fandom thumbnails. The media editor keeps an upload override until the server snapshot changes.
## Data and access
Uses existing profiles, `user_fandoms` and the private `profile-media` bucket. No new migration is required.
## Security and privacy
Images still pass through the access-checked media API. Previews do not broaden profile access.
## Acceptance criteria
E2E covers thumbnail selection, filtering without losing selections, onboarding saves, immediate banner upload/removal without router refresh, retrying failed images, accessibility and overflow.
## Limitations and next steps
Reading the stored cloud avatar was checked; no saved banner existed. A new live upload still needs owner acceptance.
## Related notes
- [[docs/en/Home]]
- [[docs/en/Features/Profile Media]]
- [[docs/en/Acceptance Checklist]]
