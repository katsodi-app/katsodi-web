---
title: "Final report: platform improvements, redesign and legal pages"
type: report
status: final
created: 2026-11-07
updated: 2026-11-07
tags: [katsodi/testing, katsodi/report]
---

# Final report

> English · [[docs/Final Report|Russian original]]

The result of the three-part specification in `TASKS.md` (platform improvements, measurable redesign criteria, legal pages). Every status below was checked by running the tests or by looking at the running app; detailed evidence per item is in `TASKS.md`. All commits are local; nothing has been pushed.

## Status by task

| Task | Status | Notes |
|---|---|---|
| 1 Redesign | PARTIAL | Katsodi Signal design system on every page; research, 390 before/after screenshots, contrast, layout at five widths and 200 % zoom pass. **FAIL:** mobile Lighthouse performance 38–67 (target 80; the same without the redesign) and the old CSS layers are still loaded underneath. Both are being worked on in separate sessions |
| 2 Demo rooms removed | PASS | |
| 3.1 Room lifecycle | PASS in tests | Inactive after 10 empty minutes, deleted after 30. **Live check with real accounts: owner** |
| 3.2 Demo annotations | PASS in tests | Zoom-style tools, names and colours, annotations for everyone. **Live two-account check: owner** |
| 4 Room dock | PASS | |
| 5 Official fandom links | PASS | 133 verified links for 131 of 150 fandoms; 19 have none that could be verified |
| 6 Profile fandoms | PASS | |
| 7 Top 150 music | PASS | 150/150 confirmed on Spotify with the official embed; SoundCloud player for 73, search link for 77 |
| 8 Fandom requests | PASS | Live-checked by the owner |
| 9 Admin panel | PASS | Live-checked by the owner; `/admin` is a real 404 for everyone else |
| 10 Review | PASS | This report |
| Legal pages | PASS as a draft | **Publication blocked** until the owner fills in `src/content/legal/owner.ts` and a lawyer reviews the texts |

## How the review was done (Task 10)

- **Every page:** 31 routes requested; all answer 200, `/admin` (visitor) and an unknown address give real 404s. 211 unique internal links found on those pages, **0 broken**.
- **Visual:** 39 screens at 360/390/768/1280/1920 px before and after the redesign (`.local/redesign/index.html`), 0 horizontal overflow on public screens; 29 pages at 200 % zoom, 0 overflow and 0 console errors.
- **Features in the browser and in tests:** room lifecycle (SQL with simulated clocks, endpoint, catalogue badge), annotations (24 demo e2e tests), dock, official links, profile fandoms, Top 150 and playback, fandom requests with approval and rejection, admin permissions, consent and legal pages.
- **Code review** of this specification's server code: admin and request functions check permissions in the database and limit input; the lifecycle endpoint needs a secret compared in constant time; no server secrets in browser code; every external link opened in a new tab has `rel="noopener noreferrer"`.

## Bugs found and fixed during the review

1. **Shared browser bypassed consent.** Members of a room with an open shared browser loaded Hyperbeam's embed without the embedded-media choice, and the Cookie Policy said it only started on the user's own action. Now it waits behind the same gate ("Load once / Always allow"); the texts were corrected; new e2e test.
2. **Consent banner on very narrow screens.** Below 360 px the second button ran off the edge; the buttons now wrap (checked at 278 and 360 px).
3. **Checks scanned agent worktrees.** The docs check, ESLint and TypeScript also read the copies under `.claude/worktrees` (429 notes instead of 143, a much slower lint). All three now skip them.

Fixed earlier in this work, among others: the Obsidian palette overriding the Paper theme (17 contrast failures), the admin tab and profile heading inconsistencies, the dock's empty icon box on phones, and `/admin` answering 200 instead of 404.

## Open issues

- **Owner live checks** (accounts and services Claude must not sign in to): room inactive at 10 and deleted at 30 minutes with `npm run voice:worker` running; demo annotations between two accounts; VK Video over HTTPS (postponed). Steps: [[docs/en/Acceptance Checklist]].
- **Legal:** fill in `src/content/legal/owner.ts` (operator, emails, minimum age, retention, hosting, authority, effective date), legal review, then the Russian translation. Accounts created before the Terms checkbox have no acceptance record. Asking users to accept a new major version is not built yet.
- **Performance:** mobile Lighthouse below 80 (pre-existing) — session "Raise mobile Lighthouse performance to 80".
- **CSS:** about 9,700 lines of older CSS still load under the design layer — session "Remove overridden CSS layers under Katsodi Signal".
- **Data gaps:** 19 fandoms without a verifiable official link; 77 tracks without a SoundCloud match. Both lists change over time: rerun `node scripts/check-official-links.mjs --write` and `node scripts/build-music-chart.mjs` before a release.
- **Below 360 px** the header is wider than the screen (pre-existing; outside the specified widths).
- **Tests on a busy machine:** the first tests after a fresh dev-server start can fail with "Execution context was destroyed" (the server reloads pages once after its first compile), and a few PGlite tests time out under heavy load; all passed on rerun.
- **Specification:** part 3 arrived cut off at "Final Acceptance Criteria … 2. Every p"; the missing criteria are unknown.

## Suggested improvements

- A report button and moderation queue (the Community Guidelines and Contact page say reporting is by email until then).
- Self-service account deletion and data export (the Privacy Policy points to the privacy email until then).
- A "please accept the new Terms" step for major versions, using the stored `terms_version`.
- Voice and demos on phones.
- Server components for static content and smaller client trees (the main performance lever).
- Require a long random `ROOMS_LIFECYCLE_SECRET` / `VOICE_WORKER_SECRET` (today any non-empty value is accepted).
- A scheduled job that re-checks official links and the music chart.

## Related notes
- [[docs/en/Home]]
- [[docs/en/Acceptance Checklist]]
- [[docs/en/Design System]]
- [[docs/en/Features/Legal Pages]]
