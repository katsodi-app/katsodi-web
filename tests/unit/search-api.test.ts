import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  viewer: vi.fn(),
  music: vi.fn(),
  community: vi.fn(),
  eq: vi.fn(),
  is: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ currentViewer: mock.viewer }));
vi.mock("@/lib/server/music-discovery", () => ({
  musicLibraryData: mock.music,
}));
vi.mock("@/lib/server/community-fandoms", () => ({
  communityFandoms: mock.community,
}));
import { GET } from "../../src/app/api/search/route";
beforeEach(() => {
  vi.clearAllMocks();
  mock.community.mockResolvedValue([]);
  mock.viewer.mockResolvedValue({ client: null });
  mock.music.mockResolvedValue({
    chart: {
      tracks: [
        {
          title: "Halo",
          artists: ["Beyoncé"],
          spotifyId: "canonical",
          slug: "beyonce-halo",
          thumb: "",
        },
      ],
    },
    collections: { popular: { tracks: [] }, trending: { tracks: [] } },
    charts: [
      {
        provider: "spotify",
        tracks: [
          {
            id: "weekly-different-id",
            title: "Halo",
            artists: ["Beyoncé"],
            cover: "",
          },
        ],
      },
    ],
  });
});
it("deduplicates the same recording across chart ids and returns its detail link", async () => {
  const response = await GET(
    new Request(
      "https://katsodi.test/api/search?filter=music&q=beyonce%20halo",
    ),
  );
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect((await response.json()).results).toEqual([
    expect.objectContaining({ title: "Halo", href: "/music/beyonce-halo" }),
  ]);
});
it("rejects invalid queries before querying any data", async () => {
  expect(
    (
      await GET(
        new Request(`https://katsodi.test/api/search?q=${"a".repeat(201)}`),
      )
    ).status,
  ).toBe(400);
  expect(
    (await GET(new Request("https://katsodi.test/api/search?filter=private")))
      .status,
  ).toBe(400);
  expect(mock.viewer).not.toHaveBeenCalled();
  expect(mock.music).not.toHaveBeenCalled();
});
it("restricts discovery to public open rooms under the viewer client", async () => {
  const chain = {
    select: () => chain,
    eq: mock.eq,
    is: mock.is,
    order: () => chain,
    limit: () => chain,
    abortSignal: async () => ({
      data: [
        { id: "room", name: "Halo", description: "Evening", fandom_id: null },
      ],
      error: null,
    }),
  };
  mock.eq.mockReturnValue(chain);
  mock.is.mockReturnValue(chain);
  mock.viewer.mockResolvedValue({ client: { from: () => chain } });
  const response = await GET(
    new Request("https://katsodi.test/api/search?filter=rooms&q=halo"),
  );
  expect(mock.eq).toHaveBeenCalledWith("visibility", "public");
  expect(mock.is).toHaveBeenCalledWith("closed_at", null);
  expect((await response.json()).results).toHaveLength(1);
});
it("reports a partial backend failure without losing other result types", async () => {
  mock.viewer.mockRejectedValue(new Error("network"));
  const response = await GET(
    new Request("https://katsodi.test/api/search?q=halo"),
  );
  const body = await response.json();
  expect(body.partial).toBe(true);
  expect(body.results).toHaveLength(1);
});
