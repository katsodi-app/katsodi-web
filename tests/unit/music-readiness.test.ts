import { expect, it, vi } from "vitest";
import charts from "../../src/data/music-discovery.json";
import { musicChart } from "../../src/lib/music";
import { musicReadiness } from "../../src/lib/server/music-readiness";

const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_TEST_ONLY",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_TEST_ONLY",
};
const now = Date.parse("2026-11-09T00:00:00Z");
const stored = () => [
  ...charts.map((payload) => ({ provider: payload.provider, payload })),
  {
    provider: "spotify-all-time",
    payload: { provider: "spotify-all-time", ...musicChart },
  },
];
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
function reader(
  rows: unknown[],
  publicRows: unknown[] = rows.map((row) => ({
    provider: (row as { provider: string }).provider,
  })),
) {
  return vi.fn<typeof fetch>().mockImplementation(async (input, init) => {
    expect(init?.method || "GET").toBe("GET");
    expect(String(input)).toMatch(
      /^https:\/\/example\.supabase\.co\/rest\/v1\/music_chart_snapshots\?/,
    );
    const key = new Headers(init?.headers).get("apikey");
    expect([
      env.SUPABASE_SERVICE_ROLE_KEY,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ]).toContain(key);
    return reply(key === env.SUPABASE_SERVICE_ROLE_KEY ? rows : publicRows);
  });
}

it("reports missing configuration without network calls or secret values", async () => {
  const fetcher = vi.fn<typeof fetch>();
  const result = await musicReadiness({}, fetcher, now);
  expect(result.readyToPublish).toBe(false);
  expect(result.chartsReady).toBe(false);
  expect(fetcher).not.toHaveBeenCalled();
  expect(
    result.checks.find((check) => check.id === "youtube-credentials")?.status,
  ).toBe("warn");
});

it("refuses origins containing credentials and privileged public keys", async () => {
  const fetcher = vi.fn<typeof fetch>();
  const result = await musicReadiness(
    {
      ...env,
      NEXT_PUBLIC_SUPABASE_URL: "https://user:secret@example.supabase.co",
    },
    fetcher,
    now,
  );
  expect(result.readyToPublish).toBe(false);
  expect(fetcher).not.toHaveBeenCalled();
  const unsafe = await musicReadiness(
    {
      ...env,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    },
    reader(stored()),
    now,
  );
  expect(unsafe.chartsReady).toBe(false);
  expect(unsafe.checks.find((check) => check.id === "public-key")?.status).toBe(
    "fail",
  );
  expect(JSON.stringify(unsafe)).not.toContain(env.SUPABASE_SERVICE_ROLE_KEY);
});

it("identifies the unapplied migration with only a table read", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      reply({ code: "PGRST205", message: "missing table" }, 404),
    );
  const result = await musicReadiness(env, fetcher, now);
  expect(result.readyToPublish).toBe(false);
  expect(
    result.checks.find((check) => check.id === "chart-storage")?.detail,
  ).toContain("20261108002300_music_discovery.sql");
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][1]?.method).toBe("GET");
});

it("distinguishes an empty table ready for initial seeding from activated public charts", async () => {
  const fetcher = reader([]);
  const result = await musicReadiness(env, fetcher, now);
  expect(result.readyToPublish).toBe(true);
  expect(result.chartsReady).toBe(false);
  expect(result.snapshots).toEqual([]);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("accepts current public global charts while keeping provider and schedule acceptance unverified", async () => {
  const fetcher = reader(stored());
  const configured = {
    ...env,
    YOUTUBE_API_KEY: "test-youtube-secret",
    SPOTIFY_CLIENT_ID: "test-id",
    SPOTIFY_CLIENT_SECRET: "test-spotify-secret",
    SOUNDCLOUD_CLIENT_ID: "test-sc-id",
    SOUNDCLOUD_CLIENT_SECRET: "test-sc-secret",
  };
  const result = await musicReadiness(configured, fetcher, now);
  expect(result.chartsReady).toBe(true);
  expect(result.snapshots).toHaveLength(5);
  expect(result.providerImportsVerified).toBe(false);
  expect(result.weeklyAutomationVerified).toBe(false);
  expect(
    result.checks.find((check) => check.id === "spotify-playlist-access")
      ?.status,
  ).toBe("warn");
  for (const value of Object.values(configured))
    expect(JSON.stringify(result)).not.toContain(value);
  expect(fetcher).toHaveBeenCalledTimes(2);
});

it("rejects stored rows hidden from anonymous visitors", async () => {
  const result = await musicReadiness(env, reader(stored(), []), now);
  expect(result.readyToPublish).toBe(true);
  expect(result.chartsReady).toBe(false);
  expect(
    result.checks.find((check) => check.id === "anonymous-chart-read")?.status,
  ).toBe("fail");
});

it("does not call malformed or stale global charts activated", async () => {
  const stale = stored().map((row) =>
    row.provider === "spotify-all-time"
      ? { ...row, payload: { ...row.payload, checked: "2026-01-01" } }
      : row,
  );
  expect((await musicReadiness(env, reader(stale), now)).chartsReady).toBe(
    false,
  );
  const malformed = stored().map((row) =>
    row.provider === "youtube"
      ? {
          ...row,
          payload: { ...row.payload, source: "javascript:secret-payload" },
        }
      : row,
  );
  const result = await musicReadiness(env, reader(malformed), now);
  expect(result.chartsReady).toBe(false);
  expect(JSON.stringify(result)).not.toContain("secret-payload");
});

it("redacts remote failures instead of echoing a response body with credentials", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(
      reply(
        { code: "42501", message: `bad ${env.SUPABASE_SERVICE_ROLE_KEY}` },
        403,
      ),
    );
  const result = await musicReadiness(env, fetcher, now);
  expect(result.readyToPublish).toBe(false);
  expect(JSON.stringify(result)).not.toContain(env.SUPABASE_SERVICE_ROLE_KEY);
});

it("does not mark a malformed successful storage response ready to publish", async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(reply({ unexpected: "secret-body" }));
  const result = await musicReadiness(env, fetcher, now);
  expect(result.readyToPublish).toBe(false);
  expect(result.chartsReady).toBe(false);
  expect(JSON.stringify(result)).not.toContain("secret-body");
});
