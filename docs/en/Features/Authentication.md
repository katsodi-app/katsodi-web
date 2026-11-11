---
title: "Authentication"
type: feature
status: connected-awaiting-acceptance
created: 2026-11-01
updated: 2026-11-01
tags: [katsodi/feature, katsodi/backend]
---

# Authentication

> English · [[docs/Features/Authentication|Russian original]]

## Purpose

Verified identity for server rooms.

## Users and roles

Guests register; verified users sign in, change passwords and sign out.

## User journeys

/signup, /login, /verify-email with resend, /forgot-password and /reset-password. /auth/confirm handles email/recovery token_hash; /auth/callback handles a PKCE code.

## Behavior

Forms are disabled without configuration. Passwords contain 12–128 characters. Sign-in is checked through getUser; unverified email accounts cannot mutate data. Recovery and repeat signup do not disclose whether an address exists.

## Interface and states

RU/EN, loading, generic errors, expired links and a safe internal next. Separate screens without the shared navigation, password reveal and post-send instructions — [[docs/en/Features/Auth Experience]].

## Implementation

Supabase Auth, @supabase/ssr, HttpOnly/SameSite=Lax cookies (Secure in production) and Next proxy. Server Actions validate FormData. The proxy refreshes claims; actions recheck getUser.

## Data and access

The application does not store passwords. Requests use a publishable/anon key and the current user's cookie; there is no service-role access.

## Security and privacy

External next destinations are rejected. Auth redirect responses use no-store/no-referrer. Application code does not log auth tokens.

## Acceptance criteria

Mocks check sign-in errors, generic email responses and redirect protection. Live delivery and sessions require connection: [[docs/en/Backend Setup]].

## Limitations and next steps

The cloud project is connected and the user confirmed receipt of a standard email. Complete link-based sign-in, recovery and multi-browser sessions have not passed acceptance. SMTP and CAPTCHA/anti-abuse remain future steps.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Backend Setup]]
- [[docs/en/Architecture]]
- [[docs/en/Verification]]
