---
title: "Platform UX"
type: feature
status: implemented
created: 2026-11-09
updated: 2026-11-09
tags: [katsodi/feature, katsodi/ui]
---
# Search, vinyl room identity and fullscreen rooms

> English · [[docs/Features/Platform UX|Russian original]]

## Why it exists
Find music, fandoms and rooms consistently, recognize users by uploaded avatars, expand the entire room, and discover music from the home page.

## Users and roles
Visitors browse public content. Local drafts remain browser data. Shared participants retain the existing membership, profile and host permissions.

## User scenarios
Search by artist/title, open a music detail or a filtered collection, find a fandom or room, enter/exit full screen, and open music or create a music room from home.

## Behavior rules
Search matches all words across metadata, ignoring accents, case, repeated spaces and Russian е/ё. Punctuation remains literal. Queries are bounded to 200 characters. Requests debounce for 180 ms, abort stale work, and report loading/errors with retry. Each result group has its own limit.

## Interface and states
Vinyl discs rotate around stationary fandom artwork or the Katsodi logo; off-screen animation pauses and reduced-motion disables it. Cards, previews, stage, header, search and dock share one component. User avatars retain initials when missing or unavailable. Chat wraps long text while preserving readers' scroll position. Voice controls are grouped, at least 44 px, and reflect real SDK state.

## Technical implementation
`search.ts` provides shared matching. `/api/search` uses current music snapshots, approved community fandoms and up to 500 latest open public rooms. `RoomFullscreen` uses the browser Fullscreen API without remounting media. `RoomVinyl` uses CSS transforms and IntersectionObserver. The private account avatar endpoint returns the current viewer's identity and media availability; upload/removal immediately refreshes navigation.

## Data and access
Existing RLS, official player capabilities, consent and protected media delivery remain in force. Global search excludes private rooms. Search and identity responses use private/no-store. Local drafts are never presented as shared rooms.

## Security and privacy
Queries are not interpolated into SQL or regular expressions. User images pass through the existing access-checked, raster-reencoding endpoint. No service keys reach clients. Unauthorized admin/profile states are inspected without weakening access rules.

## Acceptance criteria
Unit and Playwright checks cover matching, racing requests, collection links, fullscreen, reduced motion, avatars and room interactions. Actual evidence and limitations are recorded in [[TASKS]]. Unexecuted scenarios remain unverified.

## Limitations and next steps
Server room discovery is bounded to the latest 500 public records; responses return 30 per type or 8 per type under All. Community fandoms without artwork use the logo. Browser support determines fullscreen availability, with a visible failure state. Live Storage, two-account voice, SMTP and private admin acceptance still require authorized live sessions; SDK fixtures verify app behavior rather than real media delivery.

References studied on 2026-11-09: [Claude overview](https://claude.com/product/overview), [Twitch Chat Basics](https://help.twitch.tv/s/article/chat-basics?language=en_US), [Discord voice guide](https://support.discord.com/hc/en-us/articles/33030151293079-Discord-Voice-Video-Streaming-Guide). The implementation adapts section hierarchy, compact chat and distinct voice controls to Katsodi's design system.

## Related notes
- [[docs/en/Home]]
- [[docs/Features/Room Experience]]
- [[docs/Features/Quick Search]]
- [[docs/Features/Profile Media]]

Repair on 2026-11-09: participant identity occupies its own full-width row; moderation actions wrap below it without squeezing names. Voice cards share a consistent width and remain centered when wrapping. Three-role/five-width verification is recorded in [[TASKS]].

Shared fullscreen room (2026-11-09): the active stage and voice panel fill available height on wide screens, with a responsive 360–480 px sidebar. Forms and controls keep their own rows; small/short screens can scroll. Normal mode and transmitted video proportions are preserved. Verification: [[TASKS]].

During the presenter's own in-app capture, the room fills the page viewport in a fixed overlay. Chromium gives captured-tab native fullscreen special geometry that can leave side bands. Starting capture after native fullscreen switches to the page overlay without remounting the iframe or crop target. The button and Escape with focus in Katsodi exit it; background navigation becomes inert, and page scrolling is locked and restored on exit. Viewers and separate-window presenters keep native Fullscreen API behavior. See [[docs/en/Features/Link Demo]].
