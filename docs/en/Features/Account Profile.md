---
title: "Account Profile"
type: feature
status: connected-live-acceptance-pending
created: 2026-11-01
updated: 2026-11-02
tags: [katsodi/feature, katsodi/backend]
---

# Account Profile

> English · [[docs/Features/Account Profile|Russian original]]

## Purpose

Save names and fandom interests across devices.

## Users and roles

The verified account owner.

## User journeys

/account: display name, unique username, bio, interest search/selection, save and sign-out. /onboarding uses the same form. /profile/[username] exposes read-only name/username/bio only when current RLS permits reading.

## Behavior

Username: 3–24 lowercase Latin letters/digits/_, beginning with a letter. Profile and interests are saved in one SQL transaction.

## Interface and states

RU/EN; disabled/loading/error/success. A catalogue of 150 interests. Branded passport and form sections; an unavailable profile does not reveal whether it is missing or private — [[docs/en/Features/Brand Pages]].

## Implementation

profiles, user_fandoms and fandoms; update_my_profile and set_my_fandoms use auth.uid(). An auth.users trigger creates a profile with a safe technical username.

## Data and access

Users edit only themselves. Member names are visible to people sharing an active room. Email remains in Supabase Auth.

## Security and privacy

LocalStorage is not authorization. Locally followed fandoms are not automatically merged into the server profile.

## Acceptance criteria

RLS has been checked for attempts to modify other users and invalid IDs. Profile/interests must survive sign-out and sign-in after Supabase is connected.

## Limitations and next steps

Avatar uploads, a broad public profile catalogue and additional visibility settings are future phases. Read-only /profile/[username] does not expand existing RLS or create an open people directory.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Backend Setup]]
- [[docs/en/Architecture]]
- [[docs/en/Verification]]
