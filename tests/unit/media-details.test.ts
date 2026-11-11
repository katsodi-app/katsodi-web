import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  account: vi.fn(),
  details: vi.fn(),
  member: true,
  closed: null as string | null,
}));
vi.mock("@/lib/supabase/server", () => ({ currentAccount: mocks.account }));
vi.mock("@/lib/server/media-details", () => ({ mediaDetails: mocks.details }));
import {
  formatDuration,
  mediaDetailsSchema,
  readOembedDetails,
} from "../../src/lib/media";
import { GET } from "../../src/app/api/rooms/[roomId]/media/route";

const roomId = "20000000-0000-4000-8000-000000000001";
const params = (id = roomId) => ({ params: Promise.resolve({ roomId: id }) });
const request = new Request(`http://localhost/api/rooms/${roomId}/media`);
const client = {
  from(table: string) {
    const query = {
      select: () => query,
      eq: () => query,
      maybeSingle: async () => ({
        error: null,
        data:
          table === "rooms"
            ? {
                url: "https://vimeo.com/76979871",
                closed_at: mocks.closed,
              }
            : mocks.member
              ? { user_id: "u" }
              : null,
      }),
    };
    return query;
  },
};

describe("oEmbed details", () => {
  it("keeps title, author, a public HTTPS cover and a sane duration", () => {
    expect(
      readOembedDetails(
        {
          title: "  The   New Vimeo Player ",
          author_name: "Vimeo",
          thumbnail_url: "https://i.vimeocdn.com/video/1.jpg",
          duration: 62.4,
        },
        "Vimeo",
      ),
    ).toEqual({
      title: "The New Vimeo Player",
      author: "Vimeo",
      thumbnail: "https://i.vimeocdn.com/video/1.jpg",
      provider: "Vimeo",
      duration: 62,
    });
  });
  it("drops unsafe covers and absurd values, and requires a title", () => {
    for (const thumbnail_url of [
      "javascript:alert(1)",
      "http://i.ytimg.com/a.jpg",
      "https://127.0.0.1/a.jpg",
      "https://user:pass@cdn.example.org/a.jpg",
    ])
      expect(
        readOembedDetails({ title: "x", thumbnail_url }, "YouTube")?.thumbnail,
        thumbnail_url,
      ).toBeNull();
    expect(
      readOembedDetails({ title: "x", duration: 1e9 }, "Vimeo")?.duration,
    ).toBeNull();
    expect(
      readOembedDetails({ title: "x", duration: "NaN" }, "Vimeo")?.duration,
    ).toBeNull();
    expect(
      readOembedDetails({ author_name: "no title" }, "YouTube"),
    ).toBeNull();
    expect(readOembedDetails("nope", "YouTube")).toBeNull();
    const long = readOembedDetails(
      { title: "t".repeat(500), author_name: "a".repeat(500) },
      "YouTube",
    )!;
    expect(long.title).toHaveLength(200);
    expect(long.author).toHaveLength(120);
    expect(mediaDetailsSchema.safeParse(long).success).toBe(true);
  });
  it("formats durations", () => {
    expect(formatDuration(95)).toBe("1:35");
    expect(formatDuration(3725)).toBe("1:02:05");
    expect(formatDuration(5)).toBe("0:05");
  });
});

describe("GET /api/rooms/[id]/media", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.member = true;
    mocks.closed = null;
    mocks.account.mockResolvedValue({ client, user: { id: "u" } });
    mocks.details.mockResolvedValue({
      title: "Video",
      author: null,
      thumbnail: null,
      provider: "Vimeo",
      duration: null,
    });
  });
  it("returns details for an active member's room source", async () => {
    const response = await GET(request, params());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      details: { title: "Video" },
    });
    expect(mocks.details).toHaveBeenCalledWith("https://vimeo.com/76979871");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
  it("denies anonymous users, outsiders, closed rooms and bad ids", async () => {
    mocks.account.mockResolvedValueOnce({ client, user: null });
    expect((await GET(request, params())).status).toBe(401);
    mocks.member = false;
    expect((await GET(request, params())).status).toBe(404);
    mocks.member = true;
    mocks.closed = "2026-11-04T00:00:00Z";
    expect((await GET(request, params())).status).toBe(404);
    expect((await GET(request, params("not-a-uuid"))).status).toBe(404);
    expect(mocks.details).not.toHaveBeenCalled();
  });
});
