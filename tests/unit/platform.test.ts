import { existsSync, readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it } from "vitest";
import { messages } from "@/lib/i18n";
import {
  demoCaptureConstraints,
  isResourceMode,
  resolveResources,
  resourceBootstrap,
  type ResourceSignals,
} from "@/lib/platform/performance-policy";
import { offlinePage } from "../../scripts/build-offline-page.mjs";

describe("resource policy", () => {
  it("lets an explicit choice win over every hint", () => {
    const weak = { deviceMemory: 1, hardwareConcurrency: 1, saveData: true };
    const strong = {
      deviceMemory: 8,
      hardwareConcurrency: 16,
      saveData: false,
    };
    expect(resolveResources("standard", weak)).toBe("standard");
    expect(resolveResources("low", strong)).toBe("low");
  });
  it("chooses low automatically only on a clear, coarse signal", () => {
    expect(resolveResources("auto", {})).toBe("standard");
    expect(
      resolveResources("auto", { deviceMemory: 4, hardwareConcurrency: 4 }),
    ).toBe("standard");
    expect(resolveResources("auto", { deviceMemory: 2 })).toBe("low");
    expect(resolveResources("auto", { hardwareConcurrency: 2 })).toBe("low");
    expect(resolveResources("auto", { saveData: true })).toBe("low");
    // Missing hints mean "unknown", not "weak".
    expect(resolveResources("auto", { saveData: false })).toBe("standard");
  });
  it("validates stored values", () => {
    expect(["auto", "standard", "low"].every(isResourceMode)).toBe(true);
    expect([null, "", "LOW", "off", 1].some(isResourceMode)).toBe(false);
  });
  it("asks for a lighter demo stream only in low mode", () => {
    expect(demoCaptureConstraints("standard")).toEqual({});
    expect(demoCaptureConstraints("low")).toEqual({
      frameRate: { max: 12 },
      width: { max: 1280 },
      height: { max: 720 },
    });
  });
  it("keeps the pre-paint bootstrap in step with the policy", () => {
    const run = (
      stored: string | null,
      signals: ResourceSignals,
      broken = false,
    ) => {
      const dataset: Record<string, string> = {};
      vm.runInNewContext(resourceBootstrap, {
        localStorage: {
          getItem: () => {
            if (broken) throw new Error("blocked");
            return stored;
          },
        },
        navigator: {
          deviceMemory: signals.deviceMemory,
          hardwareConcurrency: signals.hardwareConcurrency,
          connection:
            signals.saveData === undefined
              ? undefined
              : { saveData: signals.saveData },
        },
        document: { documentElement: { dataset } },
      });
      return dataset.resources;
    };
    const cases: ResourceSignals[] = [
      {},
      { deviceMemory: 2 },
      { deviceMemory: 8, hardwareConcurrency: 2 },
      { deviceMemory: 8, hardwareConcurrency: 8 },
      { saveData: true },
      { saveData: false, deviceMemory: 4 },
    ];
    for (const signals of cases) {
      expect(run(null, signals)).toBe(resolveResources("auto", signals));
      expect(run("junk", signals)).toBe(resolveResources("auto", signals));
      expect(run("low", signals)).toBe("low");
      expect(run("standard", signals)).toBe("standard");
    }
    expect(run(null, {}, true)).toBe("standard");
  });
});

describe("platform strings", () => {
  it("has the same keys in both languages", () => {
    for (const section of ["platform", "desktop"] as const)
      expect(Object.keys(messages.en[section]).sort()).toEqual(
        Object.keys(messages.ru[section]).sort(),
      );
  });
});

describe("offline page and service worker", () => {
  it("has an up-to-date generated offline page", async () => {
    const committed = readFileSync(
      "public/offline/index.html",
      "utf8",
    ).replaceAll("\r\n", "\n");
    expect(committed).toBe(await offlinePage());
    expect(committed).toContain(messages.ru.desktop.offlineTitleOffline);
    expect(committed).toContain(messages.en.desktop.offlineLocalNote);
  });
  it("precaches only the public files of the offline page", () => {
    const worker = readFileSync("public/sw.js", "utf8");
    const list = worker.match(/const PRECACHE = \[([\s\S]*?)\];/)![1];
    const urls = [...list.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
    expect(urls.sort()).toEqual([
      "/fonts/manrope/manrope-cyrillic.woff2",
      "/fonts/manrope/manrope-latin.woff2",
      "/icons/icon-192.png",
    ]);
    expect(worker).toContain('const OFFLINE_URL = "/offline/index.html"');
    // No runtime caching and no forced takeover of open pages.
    expect(worker).not.toMatch(/cache\.put\(|cache\.add\(/);
    expect(worker).not.toMatch(
      /^\s*(self\.)?skipWaiting\(|^\s*(self\.)?clients\.claim\(/m,
    );
  });
  it("answers page navigations and nothing private", async () => {
    const worker = readFileSync("public/sw.js", "utf8");
    type FetchEvent = {
      request: { url: string; mode: string; method: string };
      respondWith: (value: Promise<unknown>) => void;
    };
    const handlers: Record<string, (event: FetchEvent) => void> = {};
    vm.runInNewContext(worker, {
      self: {
        location: { origin: "https://katsodi.watch" },
        addEventListener: (
          type: string,
          handler: (event: FetchEvent) => void,
        ) => {
          handlers[type] = handler;
        },
      },
      caches: {
        match: async (url: string) => ({ cachedFor: url }),
        open: async () => ({ addAll: async () => {} }),
        keys: async () => [],
        delete: async () => true,
      },
      fetch: async () => {
        throw new Error("offline");
      },
      URL,
      Request: class {},
      Response: { error: () => ({ error: true }) },
    });
    const ask = async (url: string, mode = "cors", method = "GET") => {
      let answer: Promise<unknown> | undefined;
      handlers.fetch({
        request: { url, mode, method },
        respondWith: (value) => {
          answer = value;
        },
      });
      return answer === undefined ? "untouched" : await answer;
    };
    const origin = "https://katsodi.watch";
    expect(await ask(origin + "/room/abc", "navigate")).toEqual({
      cachedFor: "/offline/index.html",
    });
    for (const [url, mode, method] of [
      [origin + "/api/rooms/1/snapshot", "cors", "GET"],
      [origin + "/api/chat-images/1", "no-cors", "GET"],
      [origin + "/home?_rsc=abc", "cors", "GET"],
      [origin + "/_next/static/chunks/app.js", "no-cors", "GET"],
      [origin + "/images/fandoms/x.webp", "no-cors", "GET"],
      [origin + "/network/create", "navigate", "POST"],
      ["https://evil.example/", "navigate", "GET"],
      ["https://abc.supabase.co/auth/v1/user", "cors", "GET"],
    ])
      expect(await ask(url, mode, method), url).toBe("untouched");
  });
});

// The native client lives in katsodi-desktop; this check runs where it is.
describe.skipIf(!existsSync("native-desktop"))(
  "native client resources",
  () => {
    it("are exported from the website's current strings, palettes and catalogue", async () => {
      // A runtime path: the tool exists only in a checkout with the native client.
      const tool = "../../native-desktop/tools/export-resources.mjs";
      const { exportAll } = await import(/* @vite-ignore */ tool);
      const files: Record<string, string> = await exportAll();
      for (const [name, content] of Object.entries(files))
        expect(
          readFileSync(
            `native-desktop/resources/generated/${name}`,
            "utf8",
          ).replaceAll("\r\n", "\n"),
          `${name} is stale: run npm run native:export`,
        ).toBe(content);
    }, 30000);
  },
);
