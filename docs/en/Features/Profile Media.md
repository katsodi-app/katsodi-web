---
title: "Profile Media"
type: feature
status: implemented-awaiting-cloud-migration
created: 2026-11-04
updated: 2026-11-04
tags: [katsodi/feature, katsodi/profile]
---

# Profile Media

> English · [[docs/Features/Profile Media|Russian original]]

## Purpose

Let people make a profile their own: an avatar, a banner and visible favourite fandoms, on a redesigned profile page (banner with an overlapping avatar). Extends [[docs/en/Features/Account Profile]].

## Users and roles

Verified users edit only their own media. A profile, including its images and fandoms, is visible to its owner and to people who share an active room with them; to everyone else it looks missing.

## User journeys

On the account page, press Change avatar or Change banner, pick a JPG, PNG or WebP up to 5 MB, drag (or use the arrow keys) and zoom inside a fixed frame (square or 3:1), then Save. Remove deletes the current image. The public profile shows the banner, avatar, name, @username, join date, bio and fandom chips linking to fandom pages.

## Behavior

- The browser sends the original file and a crop rectangle as fractions of the upright image. The server applies EXIF orientation, crops, resizes (avatar 256×256, banner 1500×500), encodes WebP and drops all metadata (location, camera); results over 512 KiB are rejected.
- Uploads go to `<user id>/<avatar|banner>-<uuid>.webp` in a private bucket; the profile points at the new file and the previous one is deleted. A failed save deletes the new file. One change per 3 seconds.
- Images are served by `/api/profile-media/[userId]/[kind]` under the profile's visibility rule and re-encoded on every read (a file uploaded around the form is never served as-is). URLs carry a version for a short private cache.
- **Privacy change:** favourite fandoms were readable only by their owner; they now follow the same rule as the profile (owner and roommates), so they can appear on it.

## Interface and states

Profile header with a gradient fallback when there is no banner and a monogram when there is no avatar. Crop dialog (focus-trapped, Escape closes) with a round mask for avatars, zoom slider, keyboard moves (Shift for bigger steps), Save/Cancel, errors for type, size, rate limit and failure. Join date uses a full date so Russian month names are grammatical. RU/EN; desktop and mobile.

## Implementation

`src/lib/profile-media.ts` (sizes, crop schema, view-to-crop math, URLs), `src/lib/server/profile-media.ts` (Sharp), `src/app/api/profile/media/route.ts` (POST upload, DELETE remove; same-origin, byte-bounded body), `src/app/api/profile-media/[userId]/[kind]/route.ts` (access-checked read), `src/components/profile-media-editor.tsx` (`ProfileHeader`, crop dialog, editor), `src/lib/server/profile-media-state.ts` (tolerates a missing migration).

## Data and access

Migration `20261104001300_profile_media.sql`: `profiles.avatar_path`, `banner_path`, `media_updated_at` (writable only through `set_profile_media` / `clear_profile_media`); private bucket `profile-media` (WebP, 512 KiB); storage policies (insert into your own folder, at most 6 objects, verified users; read under `can_read_profile`; delete your own); `user_fandoms` read policy widened to `can_read_profile`. Not yet applied in the cloud — [[docs/en/Backend Setup]].

## Security and privacy

Same-origin checks on upload and delete; the request body is bounded while it is read; only JPEG/PNG/WebP stills decode; metadata is removed; stored files are re-encoded before serving; missing and forbidden images look the same.

## Acceptance criteria

PGlite: own-folder uploads and the 6-file cap, path/kind checks, rate limit, no direct column writes, old path returned, roommates see media and fandoms while strangers do not. Unit (real Sharp): sizes, the selected region, metadata removal, rejecting GIF/SVG/broken input, crop math; routes: origin, kind, crop and type checks before storage, previous file removed, new file removed on failure. Browser: profile media, join date and fandom links; editor keyboard and zoom crop producing the expected rectangle; unsupported files refused.

## Limitations and next steps

Chat and member lists still show initials, not avatars. No GIF avatars. Not yet tested against the cloud Storage gateway.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Features/Account Profile]]
- [[docs/en/Features/Chat Media]]
- [[docs/en/Backend Setup]]
