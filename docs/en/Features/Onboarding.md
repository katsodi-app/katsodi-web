---
title: "Onboarding"
type: feature
status: code-ready-live-acceptance-pending
created: 2026-11-01
updated: 2026-11-02
tags: [katsodi/feature]
---

# Onboarding

> English · [[docs/Features/Onboarding|Russian original]]

## Purpose

First sign-in.

## Users and roles

Future signed-in users; owner/moderator restrictions are enforced by the server.

## User journeys

A verified user opens /onboarding, edits display name/username/bio, selects interests and saves the profile. A successful response offers a link to shared rooms. Guests sign in with a return to /onboarding.

## Behavior

Do not present the feature as working until its backend is connected and access tests pass.

## Interface and states

Branded intro, three section anchors, a passport with initial and live name, and interest selection. This is one form rather than a mandatory step-by-step wizard. Loading failures use a safe error state.

## Implementation

/onboarding loads the user's own profiles/user_fandoms through existing authorization and RLS. ProfileForm uses the existing saveProfile/update_my_profile. The new allowlisted next=/onboarding does not permit arbitrary redirects.

## Data and access

Existing profiles and user_fandoms. Server interests remain separate from local catalogue selections.

## Security and privacy

Do not store secrets in the client. Apply RLS and server-side checks before granting access.

## Acceptance criteria

An isolated UI harness checks name editing, interest filtering/selection and a successful save response without a real account. Actual cloud writes need acceptance — [[docs/en/Features/Account Profile]].

## Limitations and next steps

Avatar uploads, friend discovery and a complete resumable wizard are not implemented. The design is ready; the email flow and actual server writes are not declared accepted.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Architecture]]
- [[docs/en/Roadmap]]

The prepared name/interests form for a verified account is at /account: [[docs/en/Features/Account Profile]]. A separate mandatory onboarding flow and import of local interests are not implemented yet.
