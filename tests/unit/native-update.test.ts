import { describe, expect, it } from "vitest";
import { updateInfo } from "../../src/lib/server/native-update";

const sha = "a".repeat(64);
describe("desktop app update offer", () => {
  it("is offered only with a version, an allowed https URL and a SHA-256", () => {
    expect(updateInfo({})).toBeNull();
    expect(
      updateInfo({
        NATIVE_UPDATE_VERSION: "0.2.0",
        NATIVE_UPDATE_URL:
          "https://github.com/katsodi-app/katsodi-desktop/releases/download/v0.2.0/Katsodi-Setup-0.2.0.exe",
        NATIVE_UPDATE_SHA256: sha.toUpperCase(),
      }),
    ).toEqual({
      version: "0.2.0",
      url: "https://github.com/katsodi-app/katsodi-desktop/releases/download/v0.2.0/Katsodi-Setup-0.2.0.exe",
      sha256: sha,
    });
    expect(
      updateInfo({
        NATIVE_UPDATE_VERSION: "0.2.0",
        NATIVE_UPDATE_URL:
          "https://katsodi.watch/download/Katsodi-Setup-0.2.0.exe",
        NATIVE_UPDATE_SHA256: sha,
      }),
    ).not.toBeNull();
  });
  it("refuses other hosts, plain http, bad versions and bad hashes", () => {
    const base = { NATIVE_UPDATE_VERSION: "0.2.0", NATIVE_UPDATE_SHA256: sha };
    for (const url of [
      "http://katsodi.watch/x.exe",
      "https://evil.example/x.exe",
      "https://github.com/someone-else/x/releases/download/v1/x.exe",
      "https://katsodi.watch.evil.example/x.exe",
    ])
      expect(updateInfo({ ...base, NATIVE_UPDATE_URL: url })).toBeNull();
    const url = "https://katsodi.watch/x.exe";
    expect(
      updateInfo({
        ...base,
        NATIVE_UPDATE_URL: url,
        NATIVE_UPDATE_VERSION: "latest",
      }),
    ).toBeNull();
    expect(
      updateInfo({
        ...base,
        NATIVE_UPDATE_URL: url,
        NATIVE_UPDATE_SHA256: "abc",
      }),
    ).toBeNull();
  });
});
