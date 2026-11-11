import { afterEach, describe, expect, it, vi } from "vitest";
import { discoveryPlan } from "../../src/lib/player-recipes";
import { approvedFrame, readPlayerResolution } from "../../src/lib/player";
import { resolvePlayer } from "../../src/lib/server/player-resolver";
import { publicPlayerPage } from "../../src/lib/server/public-player-request";
afterEach(() => vi.unstubAllGlobals());
describe("removed source integrations", () => {
  const removed = [
    "https://reanime.to/anime/naruto-bjfend?ep=2",
    "https://reanime.to/api/flix/20/2",
    "https://liveball.sx/match/900002",
    "https://liveball.sx/formula1",
    "https://www.liveball.sx/match/12",
    "https://flixcloud.cc/e/jbbfc4dspqs2?v=1",
  ];
  it("does not fetch retired sources through either recipes or generic discovery", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    for (const url of removed) {
      expect(discoveryPlan(url)).toBeNull();
      expect(await resolvePlayer(url)).toEqual({
        kind: "external",
        reason: "unsupported",
        sync: false,
      });
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("also rejects retired URLs at the redirect-aware public request boundary", async () => {
    for (const url of removed)
      await expect(
        publicPlayerPage(url, Date.now() + 5000),
      ).rejects.toMatchObject({ reason: "blocked" });
  });
  it("does not restore retired source-page or discovered iframe responses", () => {
    for (const src of removed) {
      for (const presentation of ["source-page", "discovered", undefined])
        expect(
          readPlayerResolution({ kind: "iframe", src, presentation }),
        ).toBeNull();
    }
    expect(approvedFrame(removed[5], "https://reanime.to/")).toBeNull();
  });
  it("retains the separately requested existing recipe without widening its URL boundary", () => {
    expect(
      discoveryPlan("https://kinogo.is/240-diuna.html?tracking=x"),
    ).toEqual({
      adapter: "kinogo-html-v1",
      provider: "Kinogo",
      page: "https://kinogo.is/240-diuna.html",
    });
    expect(
      discoveryPlan("https://kinogo.is.evil.org/240-diuna.html"),
    ).toBeNull();
  });
});
