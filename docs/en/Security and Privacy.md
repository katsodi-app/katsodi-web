# Security and Privacy

> English · [[docs/Security and Privacy|Russian original]]

There are currently no accounts, network chat or authorization. LocalStorage is visible to everyone using the same browser profile; do not enter secrets in drafts. A private local room is excluded from the catalogue but is not a protected server room.

React escapes user-provided text. Only HTTPS links are allowed, without credentials, nonstandard ports, IP literals or local names. Host matching is exact. URLs are not fetched by the server; DNS-resolving SSRF protection is required before adding fetch. External links use noopener noreferrer. No embedded player is available.

Headers: nosniff, DENY framing, strict-origin-when-cross-origin, HSTS, a static CSP without nonces (see [[docs/en/Deployment]]), camera/geolocation disabled and microphone limited to the own origin. Nonce-based CSP, rate limits, RLS and server-side authorization are future work; do not treat the prototype as production-ready. There is no analytics or voice recording.

## Related notes

- [[docs/en/Features/Content Providers]]
- [[docs/en/Data Model]]
