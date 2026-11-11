---
title: "Moderation"
type: feature
status: design-ready-backend-pending
created: 2026-11-01
updated: 2026-11-02
tags: [katsodi/feature]
---

# Moderation

> English · [[docs/Features/Moderation|Russian original]]

## Purpose

Moderation and auditing.

## Users and roles

Future signed-in users; owner/moderator restrictions are enforced by the server.

## User journeys

Reports, fandom submissions, roles, sanctions and an audit trail.

## Behavior

Do not present the feature as working until its backend is connected and access tests pass.

## Interface and states

Designed /moderation: shield composition, restricted workspace and descriptions of three future sections. No invented reports or queues — [[docs/en/Features/Brand Pages]].

## Implementation

/moderation is an informational visual screen. It does not read reports or grant global permissions. The moderation API is planned, not implemented.

## Data and access

Future reports, fandom_submissions and moderation_actions with RLS.

## Security and privacy

Do not store secrets in the client. Apply RLS and server-side checks before granting access.

## Acceptance criteria

Regular users must not perform moderator/owner actions; not implemented yet.

## Limitations and next steps

Implementation is scheduled for a later phase; it has not been accepted or tested as a completed feature.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Architecture]]
- [[docs/en/Roadmap]]
