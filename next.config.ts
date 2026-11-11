import type { NextConfig } from "next";

/** The configured Supabase origin, or the hosted wildcard when unset. */
function supabaseOrigins(): string[] {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
    if (url.protocol === "https:" || url.protocol === "http:") {
      const ws = url.protocol === "https:" ? "wss:" : "ws:";
      return [url.origin, `${ws}//${url.host}`];
    }
  } catch {
    /* fall through */
  }
  return ["https://*.supabase.co", "wss://*.supabase.co"];
}

/**
 * Static CSP (no nonces): every page would otherwise have to render
 * dynamically. Inline scripts stay allowed for Next's bootstrap, but scripts
 * may only load from this origin and the player SDK hosts, the page cannot be
 * framed or rebased, and
 * fetch/WebSocket traffic is limited to Supabase, LiveKit Cloud (the voice
 * config accepts only *.livekit.cloud) and Hyperbeam's client endpoints.
 * Room players and the room website embed arbitrary https pages, artwork
 * comes from many hosts, so frame/img/media stay open to https.
 */
function contentSecurityPolicy(): string {
  const dev = process.env.NODE_ENV === "development";
  const connect = [
    "'self'",
    ...supabaseOrigins(),
    "https://*.livekit.cloud",
    "wss://*.livekit.cloud",
    "https://*.hyperbeam.com",
    "https://jquery.tutturu.workers.dev",
  ];
  // Player SDKs loaded on demand (src/lib/youtube-api.ts, spotify-player.ts,
  // player-adapters.ts) for synced YouTube, Spotify, SoundCloud and Vimeo.
  const playerSdks = [
    "https://www.youtube.com",
    "https://open.spotify.com",
    "https://w.soundcloud.com",
    "https://player.vimeo.com",
  ];
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} ${playerSdks.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connect.join(" ")}`,
    "frame-src https:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // No upgrade-insecure-requests: HSTS covers the HTTPS domain, and the
    // directive would break `next start` on plain-http localhost.
  ].join("; ");
}

const config: NextConfig = {
  poweredByHeader: false,
  // A separate output folder lets a production audit build run while the dev
  // server keeps using .next (NEXT_DIST_DIR=.next-audit npm run build).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy() },
          // Browsers ignore HSTS on plain-http responses, so local development
          // is unaffected; on the HTTPS domain it pins later visits to HTTPS.
          {
            key: "Strict-Transport-Security",
            // No includeSubDomains: other subdomains of the final domain are
            // outside this app and may still need plain http.
            value: "max-age=31536000",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
        ],
      },
      {
        // Static artwork changes rarely; file names are not content-hashed,
        // so cache for a day and revalidate in the background for a week.
        source: "/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        // Self-hosted Manrope subsets (src/app/fonts.css); same policy as
        // the artwork, since the file names are not content-hashed either.
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        source: "/invite/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
};
export default config;
