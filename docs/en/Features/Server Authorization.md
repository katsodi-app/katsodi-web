---
title: "Server Authorization"
type: feature
status: code-ready-awaiting-infrastructure
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature, katsodi/backend]
---

# Server Authorization

> English · [[docs/Features/Server Authorization|Russian original]]

## Purpose

Prevent disclosure of private rooms and participant impersonation.

## Users and roles

anon, authenticated; verified users; room owner/moderator/member.

## User journeys

Guests see only the public catalogue. Joining/invitations establish membership. Mutations are rejected without verification or the required role.

## Behavior

RLS is enabled on all user tables. GRANTs are restricted; SECURITY DEFINER functions use search_path='' and auth.uid(). Execute permissions are explicitly revoked from PUBLIC/anon.

## Interface and states

Hidden buttons are not an authorization mechanism. The UI shows generic errors rather than SQL details or secrets.

## Implementation

supabase/migrations; private helpers break RLS recursion. Public RPCs are narrow operations without arbitrary owner/sender_id input.

## Data and access

The application does not use a service role. Supabase configuration rejects sb_secret_ and service_role JWTs in public fields.

## Security and privacy

The server checks getUser; SQL additionally checks auth.users.email_confirmed_at, including SELECT through RLS. A ban or departure affects subsequent reads/writes.

## Acceptance criteria

tests/unit/database-access.test.ts executes the real migration on PGlite with anon/authenticated roles. auth.uid() is replaced only in the isolated test harness, not in the product.

## Limitations and next steps

No Supabase project has been provided; available Docker/Supabase CLI installations were not found. Real JWTs, PostgREST, Auth expiry/revocation, network races and production penetration tests have not been completed.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Backend Setup]]
- [[docs/en/Architecture]]
- [[docs/en/Verification]]
