import { beforeEach, describe, expect, test, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getClaims: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth })),
}));

import { getClaims } from "./auth";

describe("getClaims", () => {
  beforeEach(() => {
    auth.getClaims.mockReset();
    auth.getUser.mockReset();
  });

  test("returns the verified claims for a signed-in visitor", async () => {
    auth.getClaims.mockResolvedValue({
      data: { claims: { sub: "u1", email: "buyer@example.com" } },
      error: null,
    });

    await expect(getClaims()).resolves.toMatchObject({
      sub: "u1",
      email: "buyer@example.com",
    });
  });

  test("returns null when signed out", async () => {
    auth.getClaims.mockResolvedValue({ data: null, error: null });

    await expect(getClaims()).resolves.toBeNull();
  });

  test("returns null when the token fails verification", async () => {
    auth.getClaims.mockResolvedValue({
      data: null,
      error: { message: "Invalid JWT signature" },
    });

    await expect(getClaims()).resolves.toBeNull();
  });

  // The whole reason this module exists. getUser() sends a request to the
  // Supabase Auth server on every call; getClaims() verifies against a cached
  // JWKS. If this fails, a render path has reintroduced the network round trip.
  test("never calls getUser, which would hit the Auth server", async () => {
    auth.getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });

    await getClaims();

    expect(auth.getUser).not.toHaveBeenCalled();
  });
});