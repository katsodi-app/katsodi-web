import { expect, it } from "vitest";
import { sameOrigin } from "../../src/lib/server/same-origin";

const post = (url: string, headers: Record<string, string>) =>
  new Request(url, { method: "POST", headers });

it("accepts the site whichever local host name the browser used", () => {
  // Next binds to 127.0.0.1, but the browser may have opened localhost.
  expect(
    sameOrigin(
      post("http://127.0.0.1:3000/api/x", {
        origin: "http://localhost:3000",
        host: "localhost:3000",
      }),
    ),
  ).toBe(true);
  expect(
    sameOrigin(
      post("http://127.0.0.1:3000/api/x", { origin: "http://127.0.0.1:3000" }),
    ),
  ).toBe(true);
});

it("refuses missing, foreign or malformed origins", () => {
  const url = "http://127.0.0.1:3000/api/x";
  expect(sameOrigin(post(url, { host: "127.0.0.1:3000" }))).toBe(false);
  expect(
    sameOrigin(
      post(url, { origin: "https://evil.example", host: "127.0.0.1:3000" }),
    ),
  ).toBe(false);
  expect(
    sameOrigin(
      post(url, { origin: "http://localhost:3001", host: "localhost:3000" }),
    ),
  ).toBe(false);
  expect(
    sameOrigin(post(url, { origin: "null", host: "127.0.0.1:3000" })),
  ).toBe(false);
});

it("accepts the configured public origin when a proxy rewrites Host", () => {
  const previous = process.env.NEXT_PUBLIC_APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = "https://katsodi.example";
  try {
    const behindProxy = (origin: string) =>
      post("http://localhost:3000/api/x", {
        origin,
        host: "127.0.0.1:3000",
        "x-forwarded-host": "evil.example",
      });
    expect(sameOrigin(behindProxy("https://katsodi.example"))).toBe(true);
    // Forwarded headers never vouch for a foreign origin.
    expect(sameOrigin(behindProxy("https://evil.example"))).toBe(false);
    expect(sameOrigin(behindProxy("http://katsodi.example"))).toBe(false);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previous;
  }
});
