import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ exchange: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  serverSupabase: async () => ({
    auth: { exchangeCodeForSession: mocks.exchange },
  }),
}));
import { GET } from "../../src/app/auth/callback/route";
import { GET as confirmGET } from "../../src/app/auth/confirm/route";
import { GET as inviteGET } from "../../src/app/invite/[token]/route";

const call = async (query: string) => {
  const response = await GET(
    new Request(`http://127.0.0.1:3000/auth/callback?${query}`),
  );
  return {
    status: response.status,
    location: response.headers.get("location"),
  };
};
// auth-js raises AuthPKCECodeVerifierMissingError, an Error subclass.
const missingVerifier = Object.assign(
  new Error("PKCE code verifier not found in storage."),
  {
    name: "AuthPKCECodeVerifierMissingError",
    code: "pkce_code_verifier_not_found",
    status: 400,
  },
);
// Braces matter: a function returned from beforeEach runs as a teardown hook.
beforeEach(() => {
  mocks.exchange.mockReset();
});
describe("auth callback", () => {
  it("continues to the safe next page after a successful exchange", async () => {
    mocks.exchange.mockResolvedValue({ error: null });
    expect(await call("code=abc&next=%2Fonboarding")).toMatchObject({
      status: 307,
      location: "http://127.0.0.1:3000/onboarding",
    });
  });
  it("explains a sign-up link opened in another browser instead of calling it invalid", async () => {
    mocks.exchange.mockResolvedValue({ error: missingVerifier });
    expect((await call("code=abc")).location).toBe(
      "http://127.0.0.1:3000/login?notice=confirmed&next=%2Faccount",
    );
  });
  it("handles the same error when auth-js throws it instead of returning it", async () => {
    mocks.exchange.mockImplementation(async () => {
      throw missingVerifier;
    });
    expect((await call("code=abc")).location).toBe(
      "http://127.0.0.1:3000/login?notice=confirmed&next=%2Faccount",
    );
  });
  it("tells a recovery link opened in another browser to request it again here", async () => {
    mocks.exchange.mockResolvedValue({ error: missingVerifier });
    expect((await call("code=abc&next=%2Freset-password")).location).toBe(
      "http://127.0.0.1:3000/forgot-password?error=browser",
    );
  });
  it("keeps the generic failure for expired links and other errors", async () => {
    mocks.exchange.mockResolvedValue({
      error: { code: "flow_state_expired", status: 400 },
    });
    expect((await call("code=abc")).location).toBe(
      "http://127.0.0.1:3000/login?error=confirmation",
    );
    expect(
      (
        await call(
          "error=access_denied&error_code=otp_expired&next=%2Freset-password",
        )
      ).location,
    ).toBe("http://127.0.0.1:3000/login?error=confirmation");
    expect(mocks.exchange).toHaveBeenCalledTimes(1);
  });
  it("never redirects to an external next destination", async () => {
    mocks.exchange.mockResolvedValue({ error: missingVerifier });
    expect((await call("code=abc&next=https%3A%2F%2Fevil.test")).location).toBe(
      "http://127.0.0.1:3000/login?notice=confirmed&next=%2Faccount",
    );
  });
});

describe("redirects behind a reverse proxy", () => {
  // `next start` reports its own listening host in request.url, not the
  // public domain, so every redirect must use NEXT_PUBLIC_APP_URL.
  const internal = "http://localhost:3000";
  let previous: string | undefined;
  beforeEach(() => {
    previous = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = "https://katsodi.example";
  });
  afterEach(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = previous;
  });
  it("keeps auth callback redirects on the public origin", async () => {
    mocks.exchange.mockResolvedValue({ error: null });
    const ok = await GET(
      new Request(`${internal}/auth/callback?code=abc&next=%2Fonboarding`),
    );
    expect(ok.headers.get("location")).toBe(
      "https://katsodi.example/onboarding",
    );
    const failed = await GET(new Request(`${internal}/auth/callback`));
    expect(failed.headers.get("location")).toBe(
      "https://katsodi.example/login?error=confirmation",
    );
  });
  it("keeps email confirmation and invite redirects on the public origin", async () => {
    const confirm = await confirmGET(
      new Request(`${internal}/auth/confirm?token_hash=x&type=bogus`),
    );
    expect(confirm.headers.get("location")).toBe(
      "https://katsodi.example/login?error=confirmation",
    );
    const token = "A".repeat(43);
    const invite = await inviteGET(new Request(`${internal}/invite/${token}`), {
      params: Promise.resolve({ token }),
    });
    expect(invite.headers.get("location")).toBe(
      `https://katsodi.example/join#${token}`,
    );
  });
  it("falls back to the request origin when the app URL is not https", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "http://katsodi.example";
    const failed = await GET(new Request(`${internal}/auth/callback`));
    expect(failed.headers.get("location")).toBe(
      `${internal}/login?error=confirmation`,
    );
  });
});
