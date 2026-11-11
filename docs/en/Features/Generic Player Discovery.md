---
title: "Generic Player Discovery"
type: feature
status: implemented-bounded-public-html
created: 2026-11-03
updated: 2026-11-04
tags: [katsodi/feature, katsodi/player]
---

# Generic Player Discovery

> English · [[docs/Features/Generic Player Discovery|Russian original]]

## Purpose

Attempt to discover players on arbitrary public HTTPS pages without adding each domain to an adapter first. Supplements specific recipes — [[docs/en/Features/Player Discovery]].

## Users and roles

Active members of open shared rooms. URLs come from the room database; account, RLS and membership checks remain in place before discovery. Only owners/moderators may change the link.

## User journeys

Paste a viewing URL into a shared room. An existing adapter takes precedence; other pages use general HTML discovery. Public iframe candidates are checked and displayed in the screening room. Native/scripted players on the page use an original-page fallback with navigation intact. An external link always remains available.

## Behavior

- HTTPS only, without URL credentials, IP literals, local names or nonstandard ports.
- Parse iframe/src/data-src, video, Open Graph video, JSON-LD VideoObject/embedUrl/contentUrl and characteristic Video.js/JW Player/Plyr/Playerjs containers. No server-side script execution; JSON-LD is bounded JSON.
- allowfullscreen/autoplay/fullscreen or structured video metadata declares an iframe candidate. HTML 200 and no embed prohibition permit showing its original interface, without proving playback.
- Unmarked iframes are checked for their own video/player and nested frames. Cycles, empty pages and login pages without player evidence are not declared successful extraction.
- Native video and signed streams retain their original page: HLS/MP4 URLs are not moved to a separate player. Site UI, ads and origin are preserved.
- X-Frame-Options and all detected enforced frame-ancestors policies are treated conservatively. The browser continues enforcing site policies.
- **oEmbed, the sites' official embedding API.** A page's `<link rel="alternate" type="application/json+oembed">` is fetched first (JSON, up to 256 KiB, same DNS pinning and redirect checks). The iframe from a `video`/`rich` response outranks guessed iframes; its `html` is parsed as an inert AST, never rendered. That player page is still fetched and checked for framing restrictions. A broken endpoint falls back to normal page signals.
- **Known oEmbed endpoints** for providers that do not declare oEmbed in their HTML (exact hosts, checked live on 2026-11-04): Dailymotion, Vimeo, SoundCloud and Rutube. For these, the iframe returned by the provider's own endpoint is used directly when it is on that provider's own player host (for example `player.vimeo.com`), because some official players refuse non-browser requests. Any other host is checked as usual. List: `src/lib/server/oembed-providers.ts`.
- **Twitter/X player cards** (`twitter:player`) are declared embed candidates, like Open Graph video.

## Interface and states

General discovery supports previously unknown domains without promising a ready embed. RU/EN: searching, embedded candidate, original page, no player, access/embedding restrictions and network failure. Each participant plays independently.

## Implementation

knownPlayer → specific recipes or genericPlayer. parse5 7.3.0 (Node 20) parses HTML without running JavaScript. Limits: six documents, two nesting levels, four candidates per document, three redirects per load and a 20-second total budget. HTML up to 2 MiB, headers up to 32 KiB; transport requests identity encoding and rejects unexpectedly compressed responses. Each DNS+HTTPS request gets up to eight seconds; redirects do not extend the overall deadline. Cache/deduplication/four-concurrent-search limits are inherited from the room resolver.

## Data and access

No new database schema. The API does not accept arbitrary query URLs or become a public proxy. An existing server room is required; changing sources depends on a migration — [[docs/en/Backend Setup]]. Local drafts do not get server discovery.

## Security and privacy

DNS is checked for every domain/redirect. Any private/special address in A/AAAA answers rejects the request. TCP/TLS uses a validated pinned lookup address while preserving hostname/SNI and certificate checks; connection does not resolve DNS again. BlockList excludes loopback, LAN, link-local, CGNAT, multicast, documentation and transition ranges; IPv6 is allowed only within global 2000::/3 with exclusions. No Cookies, Authorization or Referer forwarding; redirects do not inherit authorization headers. No login, CAPTCHA, DRM, geography or embed-protection bypass. No video proxy/download, arbitrary server browser execution or publication of research network requests. Later iframe loading follows the participant browser's own DNS/network policies; server IP pinning does not control the participant device's DNS.

## Acceptance criteria

Public/private IPv4/IPv6, mixed DNS/pinning, redirects into LAN, redirect loops, DNS timeouts, response sizes/types, actual HTML parsing, entity/unquoted/lazy attributes, JSON-LD, CSP restrictions and nested iframe checks. Browser fixtures cover unknown domains, sandbox and external links on desktop/mobile. Results: [[docs/en/Verification]].

## Limitations and next steps

A single HTML parser cannot guarantee every site with an active player: JavaScript may load a player through an unknown API only after interaction, and public sites may forbid embedding. The server does not launch arbitrary browsers; such sites need reviewed recipes or a separate isolated worker. HTTP 200/player evidence does not rule out later login or regional restrictions. This is interface discovery, not synchronized viewing.

## Sources

- [Node HTTPS request](https://nodejs.org/api/https.html#httpsrequesturl-options-callback) — HTTPS transport and lookup.
- [parse5 parse](https://parse5.js.org/functions/parse5.parse.html) — HTML AST.
- [VideoObject](https://schema.org/VideoObject) — public embedUrl/contentUrl.
- [oEmbed](https://oembed.com/) — discovery links, response types and provider endpoints.
- [X player cards](https://developer.x.com/en/docs/x-for-websites/cards/overview/player-card) — `twitter:player`.
- [CSP frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors).

## Related notes

- [[docs/en/Home]]
- [[docs/en/Features/Room Player]]
- [[docs/en/Features/Player Discovery]]
- [[docs/en/Features/Content Providers]]
- [[docs/en/Verification]]
