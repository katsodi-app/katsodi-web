---
title: "Privacy policy completion checklist"
type: reference
status: awaiting-owner-and-deployment-facts
created: 2026-11-11
updated: 2026-11-11
tags: [katsodi/legal, katsodi/privacy]
---
# Privacy policy completion checklist

> English · [[docs/Privacy Policy Checklist|Russian original]]

The policy already describes the main features, data categories, rooms, messages, voice, demos, embeds and requests. It remains a draft. See [[docs/en/Features/Project Overview]] and the original the internal legal review.

Current update: minimum age is 16+. The owner requested removing identity and unprovided-fact blocks from the public privacy page; this internal checklist records remaining decisions and is not itself public policy. Removing those fields does not remove applicable duties.

## Provided facts
Operator name not shown, by the owner's decision of 2026-11-11 (the texts say "the Katsodi project"); under GDPR the controller's identity is normally required, so check this with a lawyer; operating country Poland, not database residency; shared contact `info.katsodi@gmail.com`; project minimum age 16, without claiming age or parental-consent verification.

## Remaining facts and decisions
1. **Controller identity and contact address.** If “Sh” is abbreviated, determine the actual identifying details of the individual or registered organisation. A project name is insufficient on its own. Determine applicable legal-notice address requirements without inventing an address or exposing unnecessary personal details. GDPR requires the controller’s identity and contacts.
2. **Actual hosting and processors.** Identify Next.js hosting, Supabase database/storage regions, enabled LiveKit, Hyperbeam and email providers. Check processing agreements, recipients, subprocessors, log/backup locations and transfer safeguards. A selected database region does not establish that every processing activity stays there.
3. **Retention and deletion.** Establish post-closure account/profile retention, messages, uploads, security logs, backups, notices and support correspondence. Room code specifies 30 minutes unvisited for video and 10 days for music; verify production cleanup actually runs. Other retention periods are not set; backup removal needs a separate duration.
4. **The 16+ rule.** Determine audience, launch countries and ways to enforce the age threshold. Age verification is not implemented; a Terms checkbox does not replace it. If access is later extended to children under 16, separately revisit legal bases, parental authorisation and verification where required, and the corresponding notices.
5. **Rights requests and notices.** Assign inbox handling and identity checks without unnecessary documents; implement access, correction, export, deletion, restriction, objection and consent withdrawal within applicable deadlines. A self-service deletion button is not inherently mandatory, but the promised manual process must work. Identify UODO for Poland and the right to another competent authority where applicable.
6. **Processing map and legal bases.** Map each actual purpose to data, recipients and a supported basis: contract, legitimate interests, consent or legal obligation. Include profiles, friends, progression, uploads, requests, support and moderation. Policy acceptance is not blanket consent. Explain required data and refusal consequences, and automated decisions/profiling where actually used.
7. **External requests, cookies and additional tools.** Audit production music artwork/CDNs, embeds, shared browser, hosting analytics, error monitoring, email and community links. Fandom avatars are served locally, but other external requests remain possible. Cookie preferences do not block every external connection. Review text and controls before introducing analytics, ads or new purposes.
8. **Effective date and final review.** Set an effective date only after infrastructure and procedures are selected. Reconcile wording with actual capabilities, mandatory law and child-friendly transparency. Versioning exists; material-change notices and renewed acceptance need separate operational planning. Do not claim the unfinished reacceptance mechanism is implemented.

Provider names, chosen regions, retention durations and process decisions are enough for drafting. Do not share passwords, service keys, tokens, identity documents or inbox access in chat.

## References
- [GDPR Articles 8, 12–14, 15–22, 28 and 44–49](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng). Applicability depends on actual facts; this is a preparation checklist, not legal clearance.
- [UODO on children under 16 and data consent](https://uodo.gov.pl/pl/493/2261).
- [Supabase residency and transfer FAQ](https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq): assess actual settings and agreements, not merely an EU database label.

## Related notes
- [[docs/en/Home]]
- [[docs/en/Features/Legal Pages]]
- [[docs/en/Deployment]]
