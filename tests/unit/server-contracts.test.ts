import { afterEach, describe, expect, it, vi } from "vitest";
import {
  safeNext,
  inviteTokenSchema,
  messageSchema,
  passwordSchema,
  profileSchema,
} from "../../src/lib/server/contracts";
import { supabaseConfig } from "../../src/lib/supabase/config";
import { messages } from "../../src/lib/i18n";

afterEach(() => vi.unstubAllEnvs());
describe("server input boundaries", () => {
  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/account\r\nLocation: https://evil.test",
    "javascript:alert(1)",
    "/room/not-a-uuid",
    "/join#invalid",
    "/account?next=//evil.test",
  ])("rejects redirect %s", (value) =>
    expect(safeNext(value)).toBe("/account"),
  );
  it("allows only known internal destinations", () => {
    for (const value of [
      "/account",
      "/join",
      "/rooms",
      "/network",
      "/onboarding",
      "/reset-password",
      "/room/10000000-0000-4000-8000-000000000001",
    ])
      expect(safeNext(value)).toBe(value);
  });
  it("validates password, profile, message and invitation limits", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("x".repeat(129)).success).toBe(false);
    expect(
      profileSchema.safeParse({
        username: "Admin!",
        display_name: "Valid",
        bio: "",
      }).success,
    ).toBe(false);
    for (const body of ["  ", "x".repeat(2001)])
      expect(messageSchema.safeParse(body).success).toBe(false);
    expect(inviteTokenSchema.safeParse("a".repeat(43)).success).toBe(true);
    expect(inviteTokenSchema.safeParse("a".repeat(42)).success).toBe(false);
  });
  it("has all server copy in both languages", () =>
    expect(Object.keys(messages.ru.network).sort()).toEqual(
      Object.keys(messages.en.network).sort(),
    ));
  it("has all page design copy in both languages", () =>
    expect(Object.keys(messages.ru.design).sort()).toEqual(
      Object.keys(messages.en.design).sort(),
    ));
});
describe("public Supabase configuration", () => {
  it("does not configure a backend with missing, insecure or secret values", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(supabaseConfig()).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "sb_secret_do_not_expose",
    );
    expect(supabaseConfig()).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://evil.test");
    expect(supabaseConfig()).toBeNull();
  });
  it("accepts a publishable key or an anon JWT, but refuses a service-role JWT", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    expect(supabaseConfig()?.url).toBe("https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    const jwt = (role: string) =>
      "header." +
      Buffer.from(JSON.stringify({ role })).toString("base64url") +
      ".signature";
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", jwt("anon"));
    expect(supabaseConfig()).not.toBeNull();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", jwt("service_role"));
    expect(supabaseConfig()).toBeNull();
  });
});
