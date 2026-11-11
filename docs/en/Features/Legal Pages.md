---
title: "Legal Pages"
type: feature
status: draft-awaiting-owner-and-legal-review
created: 2026-11-06
updated: 2026-11-11
tags: [katsodi/feature, katsodi/legal]
---

# Legal Pages

> English · [[docs/Features/Legal Pages|Russian original]]

Update 2026-11-11: minimum age 16+, Terms/Privacy version 0.4. Privacy now describes current features without the operator identity, unprovided facts or an effective date; other documents retain their draft placeholders. Later on 2026-11-11 the owner chose not to show placeholders: the operator name, jurisdiction, postal address, retention periods, hosting, supervisory authority and effective date were removed from `owner.ts` and the texts (the texts now say "the Katsodi project" instead of an operator), and the "Effective" row was dropped. Every remaining fact is filled in, so the Draft notice no longer appears. This presentation change does not certify legal compliance. See [[docs/en/Privacy Policy Checklist]].

## Why
Terms of Service, Privacy Policy, Cookie Policy, Community Guidelines, Copyright Policy, Contact and About: they describe how the site actually works and give users control over third-party cookies.

## Users and roles
Every visitor, no sign-in needed. People signing up accept the Terms. The site owner fills in the missing facts.

## User scenarios
- A footer on every page (a compact one on the sign-in pages) links to /terms, /privacy, /cookies, /guidelines, /copyright, /contact and /about.
- Sign-up: a required, unticked checkbox "I accept the Terms of Service and have read the Privacy Policy", with links.
- First visit: an "Embedded players" banner with two equal buttons. No third-party player loads before a choice; each shows a "Load once / Always allow" placeholder. The choice can be changed at /cookies#preferences.

## Behaviour rules
- All seven documents are available in Russian and English; text, frame, contents and placeholders follow the interface language, preserving anchors.
- Nothing is invented: country, emails and minimum age come from `src/content/legal/owner.ts`. While a value there is `null`, the page shows a highlighted "[To be provided by the owner: …]" placeholder and a Draft notice. Unknown facts are not mentioned in the text; a new field is added to `owner.ts` together with its wording.
- Only real capabilities are described: for example, there is no "delete account" button and no report button, and the documents say so and give the owner's email as the route.
- Katsodi's own cookies and storage are strictly necessary (Supabase sign-in, theme, language, local rooms, the consent choice). No analytics or advertising. Consent is only needed for third-party players and websites.

## Interface and states
A header with title, version and dates; a contents list (sticky on desktop, on top on phones) for documents with more than four sections; anchored sections; "Other documents". Links in text are underlined (WCAG link-in-text-block).

## Technical implementation
- `src/content/legal/*.tsx`: one file per document (`LegalDoc`: slug, title, summary, version, updated, sections with stable ids); `index.ts` holds the order and routes; `versions.ts` the Terms and Privacy versions.
- `src/components/legal-sections.tsx` (server) renders the sections; `legal-page.tsx` (client) the frame in the interface language.
- `src/lib/consent.ts` keeps the choice in `localStorage["katsodi.consent"]` (`{v, externalMedia, at}`); `consent-banner.tsx` has the banner and the preferences. The banner is part of the server HTML and paints with the page; before first paint `src/lib/consent-bootstrap.ts` sets `<html data-consent>` when a choice is stored, and CSS hides the banner; `external-media.tsx` gates the iframes of the room player, the synced player, the Website tab, demos and the music pages.
- `signUp` rejects forms without `terms=accepted` (code `terms`) and stores `terms_version`, `privacy_version` and `terms_accepted_at` in the account metadata.

## Data and access
No new tables. The cookie choice lives only on the device. Accepted document versions live in the Supabase Auth user metadata.

## Security and privacy
Third-party players do not receive the visitor's IP before a choice. The texts make no claims about encryption, certifications or legal compliance that have not been verified.

## Acceptance criteria
- tests/unit/legal.test.ts: routes, versions and dates, required sections (15/17/13/7), no invented emails, phone numbers or compliance claims, every owner fact filled in, no placeholders.
- tests/unit/server-actions.test.ts: sign-up without accepting the Terms is refused; versions are recorded.
- tests/e2e/legal.spec.ts (desktop + mobile): the footer reaches all 7 pages without console errors or horizontal scroll; no draft notice or placeholders; contents; sign-up; banner, Necessary only, Load once, changing the choice on /cookies; axe on /terms, /privacy, /cookies, /contact, /signup and the banner.

## Limits and next steps
- The owner fills in `owner.ts` (list in TASKS.md, "Owner-provided legal details"), then a professional legal review, and only then publication; the Russian translation is already implemented.
- Material changes: bump the major version in `versions.ts`. Asking existing users to accept again is not built yet; the metadata it needs is already stored.
- Accounts created before this version have no acceptance record.

## Related notes
- [[docs/en/Home]]
- [[docs/en/Features/Top 150 Music]]
- [[docs/en/Features/Room Player]]
