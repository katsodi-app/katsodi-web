import { describe, expect, it } from "vitest";
import { readSpotifyEmbed } from "../../src/lib/server/spotify-embed";

const page = (entity: unknown) =>
  `<html><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
    props: { pageProps: { state: { data: { entity } } } },
  })}</script></html>`;

describe("Spotify's embed widget data", () => {
  it("reads a playlist's tracks, cover and title", () => {
    const entity = readSpotifyEmbed(
      page({
        name: "Today’s Top Hits",
        subtitle: "Spotify",
        coverArt: {
          sources: [{ url: "https://i.scdn.co/image/ab67706f00000002" }],
        },
        trackList: [
          {
            uri: "spotify:track:4HCOHRCSQelz2GPX8iTamO",
            title: "Flower In A Hurricane",
            subtitle: "Justice, Tame Impala",
            duration: 224877,
            isPlayable: true,
          },
          {
            uri: "spotify:episode:4HCOHRCSQelz2GPX8iTamO",
            title: "Not a track",
          },
          {
            uri: "spotify:track:6OmhkSOpvYBokMKQxpIGx2",
            title: "Unavailable here",
            isPlayable: false,
          },
          { uri: "spotify:track:bad", title: "Bad id" },
        ],
      }),
    );
    expect(entity).toEqual({
      title: "Today’s Top Hits",
      subtitle: "Spotify",
      cover: "https://i.scdn.co/image/ab67706f00000002",
      duration: null,
      tracks: [
        {
          id: "4HCOHRCSQelz2GPX8iTamO",
          title: "Flower In A Hurricane",
          artists: "Justice, Tame Impala",
          duration: 225,
        },
      ],
    });
  });
  it("reads a track's artists and cover, and refuses other image hosts", () => {
    const track = readSpotifyEmbed(
      page({
        name: "Global Warming",
        artists: [{ name: "Pitbull" }, { name: "Sensato" }],
        duration: 85400,
        visualIdentity: {
          image: [
            { url: "https://evil.example/cover.jpg" },
            {
              url: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02",
            },
          ],
        },
      }),
    );
    expect(track).toMatchObject({
      title: "Global Warming",
      subtitle: "Pitbull, Sensato",
      cover: "https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e02",
      duration: 85,
      tracks: [],
    });
  });
  it("gives nothing for pages without the widget data", () => {
    expect(readSpotifyEmbed("<html></html>")).toBeNull();
    expect(
      readSpotifyEmbed(
        '<script id="__NEXT_DATA__" type="application/json">{not json</script>',
      ),
    ).toBeNull();
    expect(readSpotifyEmbed(page({ name: "" }))).toBeNull();
  });
});
