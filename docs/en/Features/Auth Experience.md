---
title: "Auth Experience"
type: feature
status: implemented
created: 2026-11-01
updated: 2026-11-04
tags: [katsodi/feature, katsodi/design]
---

# Auth Experience

> English · [[docs/Features/Auth Experience|Russian original]]

## Purpose

A separate, calm sign-in flow without competition from room navigation.

## Users and roles

Guests sign in, register or recover a password. Account verification remains server-side.

## User journeys

Sign in/Create account tabs, password reveal, recovery and repeated confirmation. After a successful email request, the form is replaced with Check your email instructions, the entered address and clear next actions.

## Behavior

Forms are disabled without configuration. The email state is identical for existing and new addresses. Links between login, signup and confirmation preserve a safe next. Standard emails open in the same browser; SMTP is unchanged. The link must open in the same browser and on the same host (`127.0.0.1` vs `localhost` count as different) because the PKCE code verifier is a host-bound cookie. When it is missing, /auth/callback no longer says the link is invalid: Supabase has usually confirmed the email before redirecting with a code, so sign-up links lead to /login with a "sign in with your password" notice, and recovery links lead to /forgot-password asking for a new email in this browser. Expired or reused links keep the generic error. A token-hash confirmation template (`supabase/templates/confirmation.html` → /auth/confirm) would work across devices; it is not enabled in the cloud project yet — [[docs/en/Backend Setup]].

## Interface and states

RU/EN, theme colors, a separate logo/language header. Desktop has a branded composition on the left and a form on the right; mobile retains the form. Auth pages omit the sidebar, search and Companion Dock. Errors use alert, results use status and password reveal has an accessible label. Decorative animation respects reduced motion.

## Implementation

Shell selects an auth layout for five routes. AuthForm uses existing Server Actions and useActionState. New styles use the auth prefix; profile and room forms retain their components.

## Data and access

Email is displayed only in the current form; signup data is not saved to browser storage. Authorization, RLS and password requirements are preserved.

## Security and privacy

The server contract rejects external next destinations. Tests do not create real accounts or send email.

## Acceptance criteria

Browser scenarios check form switching with next, RU/EN, password visibility, absence of extra navigation, recovery/verify and page width on desktop/mobile. Local-room copy explains the missing chat and links to shared rooms.

## Limitations and next steps

The user confirmed email delivery; complete link-based login, profiles and two-account chat still require acceptance. Automated UI tests neither send mail nor verify a successful real-email transition.

## Related notes

- [[docs/en/Home]]
- [[docs/en/Features/Authentication]]
- [[docs/en/Backend Setup]]
- [[docs/en/Verification]]
