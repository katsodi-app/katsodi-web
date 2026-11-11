---
title: "Page Catalogue"
type: catalogue
status: implemented-design
created: 2026-11-02
updated: 2026-11-02
tags: [katsodi/design, katsodi/routes]
---

# Page Catalogue

> English · [[docs/Page Catalogue|Russian original]]

All listed interfaces use [[docs/en/Features/Brand Pages]]. API/auth callbacks are transport routes, not standalone visual pages. The table distinguishes presentation from service functionality.

| Address / state                                  | Composition                                           | Actual capabilities / limitations                            |
| ------------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------ |
| /                                                | Branded hero, poster collage, three first-step routes | Signup and explore CTAs                                      |
| /home                                            | Editorial hero, collections, navigation cards         | Existing collections, link search and local data             |
| /rooms                                           | Orbital intro, search/format, cards                   | Drafts and labeled examples                                  |
| /rooms/create                                    | Form plus atmospheric card                            | Local draft creation                                         |
| /room/[roomId], local                            | New RoomStage and separate limitations panel          | Local draft, no chat; link to shared rooms                   |
| /network                                         | Intro, filters, cards or empty state                  | Catalogue under current RLS                                  |
| /network/create                                  | Form and live preview                                 | Verified accounts only; otherwise sign-in                    |
| /room/[roomId], server                           | RoomStage, messages, composer, members                | Existing polling; media awaits migration                     |
| /saved                                           | Collection intro, filters or empty state              | Local bookmarks                                              |
| /fandoms                                         | Intro, search/categories, equal posters               | 150 fandoms, local selection                                 |
| /fandoms/[slug]                                  | Large poster, follow action, related worlds           | Known ID, persistent selection; unknown returns 404          |
| /friends                                         | Two panels, friends/requests/blocks sections          | Design ready; service disconnected, search disabled          |
| /profile/[username]                              | Passport and bio or safe empty state                  | Only RLS-permitted fields; missing and denied look identical |
| /account                                         | Side passport, name/interests sections, save          | Own data only; distinct guest/error/unconfigured states      |
| /onboarding                                      | Intro, three section anchors, same profile            | Existing atomic writes; no mandatory wizard                  |
| /settings                                        | Section index, themes, language, local data, profile  | Existing settings only                                       |
| /join                                            | Separate invitation card                              | Missing token / login required / accept / error              |
| /invite/[token]                                  | Safe redirect to /join#TOKEN                          | Compatible alias; fragment links preferred                   |
| /moderation                                      | Branded shield, future workspace sections             | No private queues or granted global roles                    |
| /credits                                         | Editorial intro, image sources                        | Working external links and licenses                          |
| /login, /signup                                  | Separate split layout without navigation noise        | Existing Server Actions; disabled without config             |
| /forgot-password, /reset-password, /verify-email | Unified auth flow                                     | Errors, pending, email instructions, resend                  |
| 404                                              | Orbital intro and return card                         | Actual HTTP 404 for unknown pages                            |
| error.tsx                                        | Branded pause with retry/return                       | Actual error-boundary reset                                  |
| loading.tsx                                      | Responsive skeleton                                   | aria-busy/status, reduced motion                             |

Screenshots are stored in `.local/brand-pages` and not committed. Verified-account forms, read-only profiles, error and loading are visually tested with actual components in an isolated harness; product-route authorization is not weakened.

## Open local screens

- [Landing](http://127.0.0.1:3000/) · [Home](http://127.0.0.1:3000/home) · [Shared rooms](http://127.0.0.1:3000/network) · [Create shared room](http://127.0.0.1:3000/network/create)
- [Drafts](http://127.0.0.1:3000/rooms) · [Create draft](http://127.0.0.1:3000/rooms/create) · [Demo room](http://127.0.0.1:3000/room/demo-night) · [Saved](http://127.0.0.1:3000/saved)
- [Fandoms](http://127.0.0.1:3000/fandoms) · [Dune](http://127.0.0.1:3000/fandoms/cinema-6) · [Friends](http://127.0.0.1:3000/friends) · [Moderation](http://127.0.0.1:3000/moderation)
- [Account](http://127.0.0.1:3000/account) · [Onboarding](http://127.0.0.1:3000/onboarding) · [Settings](http://127.0.0.1:3000/settings) · [Invitation](http://127.0.0.1:3000/join) · [Image sources](http://127.0.0.1:3000/credits)
- [Login](http://127.0.0.1:3000/login) · [Signup](http://127.0.0.1:3000/signup) · [Recovery](http://127.0.0.1:3000/forgot-password) · [New password](http://127.0.0.1:3000/reset-password) · [Email confirmation](http://127.0.0.1:3000/verify-email)

## Related notes

- [[docs/en/Home]]
- [[docs/en/Features/Brand Pages]]
- [[docs/en/Design System]]
- [[docs/en/Verification]]
- [[docs/en/Roadmap]]
