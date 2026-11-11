import { createClient } from "@supabase/supabase-js";
import {
  chartProviders,
  discoveryChartSchema,
  mostPlayedChartSchema,
} from "@/lib/music-discovery";

type Environment = Record<string, string | undefined>;
type Check = {
  id: string;
  status: "pass" | "warn" | "fail";
  detail: string;
};

function keyRole(key: string): string | null {
  try {
    return (
      JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role ??
      null
    );
  } catch {
    return null;
  }
}

/** Read-only preflight. Reports never include keys, response bodies or track data. */
export async function musicReadiness(
  env: Environment,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
) {
  const checks: Check[] = [];
  const add = (id: string, status: Check["status"], detail: string) =>
    checks.push({ id, status, detail });
  let origin: string | null = null;
  try {
    const url = new URL(env.NEXT_PUBLIC_SUPABASE_URL || "");
    if (
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/" &&
      (url.protocol === "https:" ||
        (url.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(url.hostname)))
    )
      origin = url.origin;
  } catch {
    /* Invalid or absent configuration. */
  }
  add(
    "supabase-url",
    origin ? "pass" : "fail",
    origin
      ? "Supabase origin is configured."
      : "Set NEXT_PUBLIC_SUPABASE_URL to the project origin (HTTPS, or local development HTTP).",
  );
  const publicKey =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";
  const safePublicKey =
    publicKey.startsWith("sb_publishable_") || keyRole(publicKey) === "anon";
  const safeServiceKey =
    serviceKey.startsWith("sb_secret_") ||
    keyRole(serviceKey) === "service_role";
  add(
    "public-key",
    safePublicKey ? "pass" : "fail",
    safePublicKey
      ? "A public client key is configured; network access is checked separately."
      : "Set a publishable or legacy anon key. Never put a privileged key in NEXT_PUBLIC variables.",
  );
  add(
    "publisher-key",
    safeServiceKey ? "pass" : "fail",
    safeServiceKey
      ? "A server publisher key is configured; network access is checked separately."
      : "Set SUPABASE_SERVICE_ROLE_KEY to a server secret or legacy service_role key.",
  );

  for (const [provider, keys] of [
    ["youtube", ["YOUTUBE_API_KEY"]],
    ["spotify", ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"]],
    ["soundcloud", ["SOUNDCLOUD_CLIENT_ID", "SOUNDCLOUD_CLIENT_SECRET"]],
  ] as const) {
    const missing = keys.filter((key) => !env[key]?.trim());
    add(
      `${provider}-credentials`,
      missing.length ? "warn" : "pass",
      missing.length
        ? `Missing ${missing.join(", ")}. Single tracks and published charts do not require these import credentials.`
        : "Credentials are present. A real permitted playlist import has not been verified.",
    );
  }
  add(
    "spotify-playlist-access",
    "warn",
    "Spotify's current playlist-items API requires user authorization and ownership/collaboration. This app has no Spotify user OAuth flow; app credentials alone do not activate playlist imports.",
  );
  add(
    "weekly-workflow",
    "warn",
    "Local preflight cannot verify publication, GitHub secrets or a successful Actions run. Complete the Music Activation guide.",
  );

  let storage = false;
  let publicRead = false;
  let snapshots = false;
  const summaries: {
    provider: string;
    tracks: number;
    checked: string | null;
    fresh: boolean;
  }[] = [];
  if (origin && safeServiceKey) {
    const options = {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetcher },
    };
    try {
      const publisher = createClient(origin, serviceKey, options);
      const result = await publisher
        .from("music_chart_snapshots")
        .select("provider,payload,refreshed_at")
        .limit(5)
        .abortSignal(AbortSignal.timeout(10000));
      if (result.error || !Array.isArray(result.data)) {
        add(
          "chart-storage",
          "fail",
          ["PGRST205", "42P01"].includes(result.error?.code || "")
            ? "Chart storage is missing. Apply migration 20261108002300_music_discovery.sql, then rerun."
            : "Publisher cannot read chart storage. Check project/key, connectivity and migration 23.",
        );
      } else {
        storage = true;
        add(
          "chart-storage",
          "pass",
          "Publisher can read the migration-23 chart table. Write privileges are not exercised by this read-only check.",
        );
        const rows = result.data || [];
        const expected = [...chartProviders, "spotify-all-time"];
        snapshots = rows.length === expected.length;
        for (const provider of expected) {
          const matching = rows.filter((row) => row.provider === provider);
          const row = matching[0];
          const parsed =
            provider === "spotify-all-time"
              ? mostPlayedChartSchema.safeParse(row?.payload)
              : discoveryChartSchema.safeParse(row?.payload);
          if (
            matching.length !== 1 ||
            row?.payload?.provider !== provider ||
            !parsed.success
          ) {
            snapshots = false;
            add(
              `snapshot-${provider}`,
              "warn",
              "Snapshot is absent or invalid. Seed storage with the documented refresh commands.",
            );
            continue;
          }
          const date = parsed.data.checked;
          const age = date ? now - Date.parse(date) : Infinity;
          const fresh =
            Number.isFinite(age) && age >= -86400000 && age <= 8 * 86400000;
          summaries.push({
            provider,
            tracks: parsed.data.tracks.length,
            checked: date,
            fresh,
          });
          const required = ["spotify", "youtube", "spotify-all-time"].includes(
            provider,
          );
          if (required && (!fresh || parsed.data.tracks.length !== 150))
            snapshots = false;
          add(
            `snapshot-${provider}`,
            required && fresh && parsed.data.tracks.length === 150
              ? "pass"
              : "warn",
            required
              ? fresh && parsed.data.tracks.length === 150
                ? "150 validated, current tracks are stored."
                : "Expected 150 validated tracks checked within eight days."
              : "Source availability is reported honestly; partial SoundCloud and unavailable TikTok do not block global charts.",
          );
        }
        if (safePublicKey) {
          const client = createClient(origin, publicKey, options);
          const visible = await client
            .from("music_chart_snapshots")
            .select("provider")
            .limit(5)
            .abortSignal(AbortSignal.timeout(10000));
          publicRead =
            !visible.error &&
            Array.isArray(visible.data) &&
            rows.every((row) =>
              visible.data?.some((entry) => entry.provider === row.provider),
            );
          add(
            "anonymous-chart-read",
            publicRead ? "pass" : "fail",
            publicRead
              ? "The public key can read the same stored ranking rows."
              : "The public client cannot read the stored rankings. Check its key and migration-23 grants/RLS.",
          );
        }
      }
    } catch {
      add(
        "chart-connection",
        "fail",
        "The read-only storage check timed out or failed. No credentials or remote error bodies are printed.",
      );
    }
  }
  return {
    checkedAt: new Date(now).toISOString(),
    readyToPublish: storage,
    chartsReady: storage && publicRead && snapshots,
    providerImportsVerified: false,
    weeklyAutomationVerified: false,
    snapshots: summaries,
    checks,
  };
}
