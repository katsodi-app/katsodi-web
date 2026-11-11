---
title: "Publication content cleanup"
type: feature
status: implemented-pending-owner-facts-and-legal-review
created: 2026-11-10
updated: 2026-11-11
tags: [katsodi/feature, katsodi/legal, katsodi/artwork]
---
# Publication content cleanup

> English · [[docs/Features/Publication Content Cleanup|Russian original]]

Owner decision 2026-11-11: original pre-replacement fandom avatars and provenance were restored from bf3a46f. The temporary abstract/thematic replacements were removed. Source-link and parser removals remain. This does not establish publication permission for the 98 previously flagged entries. See [[docs/en/Features/Project Overview]]. The earlier implementation below is historical.

## Purpose
Remove editorial destinations without rights evidence and replace 98 questionable images. This partially addresses the internal legal review; it is not legal clearance for release.

## Users and roles
Visitors see official destinations and a community link. The owner receives an independent review archive. Room roles, accounts and access boundaries are unchanged.

## User scenarios
Every catalogue or community fandom links to `https://discord.gg/hDpZq49wCU`, labelled “Where to watch legally for free”, with a note about authorised releases and regional conditions. The previous block of 80 links (55 Kinogo/Re:ANIME/LiveBall, 25 user YouTube lets-plays) is removed. The separate official catalogue and Wikipedia attribution remain. All seven legal documents switch RU/EN, including contents and owner placeholders; section anchors remain stable.

## Behaviour
Re:ANIME, LiveBall and FlixCloud discovery integrations and specialised broadcast states are removed. These hosts and subdomains are also rejected by generic discovery, result restoration and the redirect-aware HTTP boundary. The Kinogo recipe and generic discovery of other sources remain because only the two named integrations were requested for removal; their legal assessment is still open.

## Interface and states
The demo footer warns users to share only content they are authorised to transmit or have another lawful basis to share, that subscriptions do not permit public screenings, and to respect privacy. It appears both idle and active. This is a rule, not a verification of permission.

## Technical implementation
`scripts/create-original-fandom-art.mjs` creates 98 original abstract SVG compositions, without downloaded posters, logos or character artwork, plus WebP copies and thumbnails. SVG sources are public under `images/fandoms/original`. New URLs avoid reuse of the former cached asset URLs. Removed 184 superseded public files, including thumbnails and overridden variants. The manifests now contain the effective artwork of all 150 fandoms, with refreshed card palettes. Credits expose authors, licence links and conversion information. The other 52 CC/PD entries retain their metadata; their individual licence review is not declared complete. `src/content/legal/ru.tsx` translates all 70 sections; the server composes both document bodies for the client language frame.

## Data and access
Support, privacy and copyright use `info.katsodi@gmail.com`. The owner confirms operating from Poland. Katsodi is identified as an unregistered project, not a legal entity. Operator identity, postal address, governing law, age, retention, hosting/database region, supervisory authority and effective date remain explicit placeholders.

## Security and privacy
No Discord messages, deployments or external modifications were performed. `docs/audits/removed-watch-links-2026-11-10.json` archives all 80 removed destinations; the app does not import it. `discord-removed-links-draft.json` contains five independent webhook request-body drafts for moderator review, without a sender, webhook URL or token; mentions are disabled and embeds suppressed. These are unverified sources, not authorised-free-viewing recommendations. `discord-community-announcement.json` is a separate public draft without the removed links. Verify rights before publishing a recommendation, regardless of platform.

## Acceptance criteria
Artwork tests cover 150 effective files and thumbnails, the 98 replacements and removal of superseded public URLs. Parser tests reject retired integrations without fetching, including nested frames and the redirect-aware request boundary. Legal tests preserve RU/EN versions and anchors. UI tests cover fandom pages, shared contact email, both locales, overflow and accessibility.

Verified 2026-11-11: production build, lint, typecheck and docs:check passed; full unit run passed 376 tests in 62 files, followed by six legal tests after the table accessibility fix. Final 18 desktop/mobile e2e cases passed, including legal-page axe checks, actual replacement image loading, absent legacy links and demo expansion with chat. This suite uses the existing demo SDK fixture, not two-account LiveKit delivery. Draft webhook JSON validation found five messages below 2000 characters and all 80 archived destinations. Screenshots and logs are in ignored `.local/ux-audit/` and `.local/`.

## Limits and next steps
No clearance is implied for the remaining artwork, music providers, generic discovery or every stream. A community label does not verify permissions. Actual owner facts, infrastructure, an operational notice process and professional review remain needed. Hosting is not selected; operating country is not database residency.

## Related notes
- [[docs/en/Home]]
- [[docs/en/Features/Legal Pages]]
- [[docs/en/Features/Artwork Catalogue]]
