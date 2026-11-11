---
title: "Chat Media"
type: feature
status: code-ready-awaiting-migration
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature, katsodi/backend, katsodi/chat]
---

# Chat Media

> English · [[docs/Features/Chat Media|Russian original]]

## Purpose

Add expressive messages without heavy files or public links to private conversations.

## Users and roles

Only verified active room members. Authors, owners and moderators delete messages under the existing rules.

## User journeys

Choose one of eight SVG stickers, preview and send it. Alternatively select an image, preview it, remove it or send it. Attachments are separate messages without captions; drafted text stays in the composer for the next send.

## Behavior

Input: JPG, PNG or WebP, up to 2 MiB and 16 million pixels, without animation. The server reads actual bytes, removes metadata, fixes orientation and saves WebP up to 384 KiB and 1280×1280. It reduces to 960/640px if needed. SVG/GIF and spoofed MIME files fail decoding. The complete multipart stream is limited to 2 MiB plus 64 KiB overhead, including requests without Content-Length.

## Interface and states

Sticker/image buttons, eight-cat grid, preview, attachment removal, pending and localized errors. Buttons require a positive chat_media_capabilities result; text remains available without the migration. Capability checks schema and bucket settings, not actual Storage service availability.

## Implementation

Migration `20261101000300_chat_media.sql` adds message type and a private chat-images bucket with a 393216-byte limit and image/webp MIME. send_room_sticker/send_room_image reuse send_room_message: shared room locks, membership validation and one-message-per-second limit. POST /api/rooms/[roomId]/images checks Origin, authentication, membership, stream size and Sharp decoding. GET /api/chat-images/[messageId] rechecks access, downloads through the Storage SDK and re-encodes even files uploaded outside the form. Storage is enabled in local config.toml; the agent has not applied the cloud migration.

## Data and access

room_messages.kind = text/sticker/image; sticker_id or image_path/image_width/image_height/image_bytes. Path: roomUUID/userUUID/randomUUID.webp. The bucket is private; UPDATE/upsert are forbidden. INSERT is allowed only into the user's own path in an active open room; reading is members-only (authors can also read their own orphans, active owners/moderators can read room orphans for cleanup). An object may be deleted only after its message reference is removed, by its author or an active moderator/owner. The 100-objects-per-author upload policy is a soft bound, not a strict concurrent quota.

## Security and privacy

No service-role access. Spoofed senders, other users' paths and arbitrary sticker_id values are rejected. Size limits also exist in bucket settings and CHECK constraints. No public or signed URLs; image responses use private/no-store, image/webp and nosniff. A new request after a kick cannot read attachments; delivered bytes cannot be revoked. Recipients can save received images like other conversation content.

## Acceptance criteria

Isolated PostgreSQL checks migrations, RLS, denial for anonymous/unrelated/unverified/removed members, paths, sizes, reuse, rate limits and replacement denial. Test Storage tables are shims: the actual gateway and bytes need separate checks after connection. Unit tests decode real raster files and check APIs with mocked Supabase. The browser harness sends no actual cloud messages.

## Limitations and next steps

Tomorrow, apply only the new migration after the existing two, then test two accounts, upload/view/delete, kick, oversized input and closed rooms — [[docs/en/Backend Setup]]. If publication/deletion fails, the app attempts orphan removal through Storage API; failed cleanup and old orphans need separate maintenance. SQL never deletes storage.objects directly. Videos, GIFs, arbitrary sticker packs, captions and automatic background cleanup are not implemented.

## Official resources

- [Private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Storage RLS](https://supabase.com/docs/guides/storage/security/access-control)
- [Sharp decoding limits](https://sharp.pixelplumbing.com/api-constructor/)

## Related notes

- [[docs/en/Home]]
- [[docs/en/Features/Room Experience]]
- [[docs/en/Features/Room Chat]]
- [[docs/en/Backend Setup]]
- [[docs/en/Data Model]]
- [[docs/en/Verification]]
