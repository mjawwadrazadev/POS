import { describe, it, expect, vi } from "vitest";

// session.ts imports next/headers and the DB layer; neither is exercised by these pure token tests
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

const { signToken, verifyToken, isPlatformRole } = await import("@/lib/auth/session");
const { verifyOverrideToken, OVERRIDE_TOKEN_PURPOSE } = await import("@/lib/auth/override");

describe("session tokens", () => {
  it("round-trips a payload", () => {
    const token = signToken({ userId: "u1", role: "cashier", organizationId: "o1", email: "a@b.c" });
    expect(verifyToken(token)).toMatchObject({ userId: "u1", role: "cashier" });
  });

  it("rejects tampered tokens", () => {
    const token = signToken({ userId: "u1", role: "cashier" });
    const [h, p, s] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ userId: "u1", role: "super_admin" })).toString("base64url");
    expect(verifyToken(`${h}.${forgedPayload}.${s}`)).toBeNull();
    expect(verifyToken(`${h}.${p}.invalidsignature`)).toBeNull();
  });

  it("rejects expired tokens", () => {
    const token = signToken({ userId: "u1" }, -10);
    expect(verifyToken(token)).toBeNull();
  });

  it("identifies platform roles", () => {
    expect(isPlatformRole("super_admin")).toBe(true);
    expect(isPlatformRole("platform_support")).toBe(true);
    expect(isPlatformRole("admin")).toBe(false);
  });
});

describe("discount override tokens", () => {
  const make = (overrides: Record<string, unknown> = {}) =>
    signToken({ purpose: OVERRIDE_TOKEN_PURPOSE, organizationId: "org1", requestedBy: "cashier1", ...overrides }, 60);

  it("accepts a token for the same org and requester", () => {
    expect(verifyOverrideToken(make(), "org1", "cashier1")).toBe(true);
  });

  it("rejects tokens from another store, another cashier, or another purpose", () => {
    expect(verifyOverrideToken(make(), "org2", "cashier1")).toBe(false);
    expect(verifyOverrideToken(make(), "org1", "cashier2")).toBe(false);
    expect(verifyOverrideToken(make({ purpose: "login" }), "org1", "cashier1")).toBe(false);
    expect(verifyOverrideToken(undefined, "org1", "cashier1")).toBe(false);
  });

  it("rejects a regular session token used as an override", () => {
    const sessionToken = signToken({ userId: "manager1", role: "manager", organizationId: "org1" });
    expect(verifyOverrideToken(sessionToken, "org1", "cashier1")).toBe(false);
  });
});
