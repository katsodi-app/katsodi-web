import { describe, expect, it } from "vitest";
import { readSoundcloudSet } from "../../src/lib/server/soundcloud-page";
import { syncSource } from "../../src/lib/playback";

const page = (data: unknown) =>
  `<script>window.__sc_hydration = ${JSON.stringify(data)};</script>`;

describe("a SoundCloud set's public page", () => {
  it("reads every track: full ones by link, the rest by id", () => {
    const set = readSoundcloudSet(
      page([
        { hydratable: "user", data: {} },
        {
          hydratable: "playlist",
          data: {
            title: "Grand Theft Auto VI: The Album",
            tracks: [
              {
                id: 1,
                permalink_url:
                  "https://soundcloud.com/atlanticrecords/overtown",
              },
              { id: 2441326638, kind: "track" },
              { id: "x" },
              { permalink_url: "https://evil.example/track" },
            ],
          },
        },
      ]),
    );
    expect(set).toEqual({
      title: "Grand Theft Auto VI: The Album",
      urls: [
        "https://soundcloud.com/atlanticrecords/overtown",
        "https://api.soundcloud.com/tracks/2441326638",
      ],
    });
  });
  it("gives nothing for pages without the set", () => {
    expect(readSoundcloudSet("<html></html>")).toBeNull();
    expect(
      readSoundcloudSet(page([{ hydratable: "user", data: {} }])),
    ).toBeNull();
  });
  it("plays tracks known by id on the shared timeline", () => {
    expect(syncSource("https://api.soundcloud.com/tracks/2441326638")).toBe(
      "soundcloud",
    );
    expect(syncSource("https://api.soundcloud.com/users/1")).toBeNull();
  });
});
