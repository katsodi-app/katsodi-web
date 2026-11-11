---
title: "Admin and Fandom Requests"
type: feature
status: implemented-awaiting-cloud-migration
created: 2026-11-06
updated: 2026-11-06
tags: [katsodi/feature, katsodi/admin]
---

# Admin and Fandom Requests

> English · [[docs/Features/Admin and Fandom Requests|Russian original]]

## Purpose

Members suggest fandoms that are missing from the catalogue; the administrator reviews them in a dedicated panel that also lists every account, every fandom and (with Task 7) every music entry. Tracked as tasks 8 and 9 in `TASKS.md`; related: [[docs/en/Features/Fandoms]].

## Users and roles

- **Administrator:** migration 1900 grants nobody automatically, so no personal email lives in the code. After signing up and confirming their email, the site owner runs once in SQL Editor `insert into public.admins(user_id) select id from auth.users where lower(email) = lower('you@example.com') on conflict do nothing;` There is no way to become administrator from the app. (Until 2026-11-12 the migration granted the first account with the owner's email; an already migrated database is unaffected by this change.)
- **Signed-in members:** submit requests and see the status of their own.
- **Everyone:** sees approved fandoms in the catalogue.

## User journeys

1. In the catalogue, "Can't find a fandom? Suggest one" opens `/fandoms/request`. The member enters a name, a category and an optional note.
2. The administrator opens **Admin panel** from their account page (or `/admin`). Waiting requests open first; **Approve** or **Reject**, each with an optional comment.
3. An approved fandom appears in the catalogue with a "community" poster and the member's note as its description; it can be followed, linked to public rooms and shown on profiles. The member sees "Approved" with a link; a rejected request shows the comment.

## Behavior

- Duplicates are refused: names already in the catalogue, and names already waiting. At most 5 waiting requests per member, one per 30 seconds.
- Approval creates the fandom (id `community-…`) in the same table as the catalogue, so rooms, follows and profiles work unchanged. A decided request cannot be decided again.
- The panel has four sections: Accounts (name, @username, email, confirmed, registration date, admin badge), Fandoms (all 150 + community ones, source, followers), Requests (waiting/all), Music (filled by Task 7).

## Interface and states

Request page: signed out (sign-in prompt) · form · my requests with Waiting / Approved / Rejected. Admin panel: tabs with counts; a waiting-requests counter. Non-administrators get the normal 404 page.

## Implementation

- Migration `20261106001900_admin_fandom_requests.sql`: `admins`, `is_admin()`, `fandoms.community/description/created_at`, `fandom_requests`, `request_fandom`, `decide_fandom_request`, `admin_accounts`, `admin_fandom_followers`.
- `src/lib/community-fandoms.ts` (schemas), `src/lib/server/community-fandoms.ts` (loaders, `adminState`, `viewerIsAdmin`), `src/lib/server/fandom-actions.ts` (actions).
- Pages: `src/app/admin/page.tsx`, `src/app/fandoms/request/page.tsx`; community fandoms in `/fandoms` and `/fandoms/[slug]`; `src/proxy.ts` answers 404 for `/admin` unless `is_admin()`.
- UI: `src/components/admin-panel.tsx`, `src/components/fandom-request.tsx`; placeholder poster `public/images/fandoms/community.webp`.

## Data and access

`admins` cannot be read or written by any client. `fandom_requests`: members read their own rows, the administrator reads all (RLS); writes only through the functions. Every admin function checks the administrator in the database, independent of the page.

## Security and privacy

- Emails of all accounts are visible only to the administrator, through `admin_accounts()`, never to other users.
- `/admin` returns 404 to everyone else, before anything renders; the page and functions check again.
- The owner's email appears in the migration that grants the role; changing the administrator later needs a new migration.

## Acceptance criteria

- The migration alone makes nobody administrator, not even the first account; only the account the owner adds is administrator (SQL tests).
- Request rules, own-rows visibility, approval creating a usable fandom, rejection with a reason, no double decisions (SQL tests).
- Request form, admin tabs, approve and reject calls, axe WCAG AA on both screens (e2e); visitors get 404 for `/admin` (e2e).

## Limitations and next steps

- Community fandoms use a placeholder poster; there is no image upload for them yet.
- Not yet verified on the real project: apply migration 1900, then open `/admin` with the owner's account.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Features/Fandoms]]
- [[docs/en/Acceptance Checklist]]
