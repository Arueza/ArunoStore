import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => {
  // The query builder Supabase returns is chainable, so select().eq().maybeSingle()
  // all hand back the same object. Resetting clears the recorded calls but not
  // those returns, so they are wired once here.
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);

  return {
    auth: { getClaims: vi.fn(), getUser: vi.fn() },
    from: vi.fn(() => chain),
    chain,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: mocks.auth,
    from: mocks.from,
  })),
}));

import { getClaims, getProfile } from "./auth";

describe("getClaims", () => {
  beforeEach(() => {
    mocks.auth.getClaims.mockReset();
    mocks.auth.getUser.mockReset();
  });

  test("returns the verified claims for a signed-in visitor", async () => {
    mocks.auth.getClaims.mockResolvedValue({
      data: { claims: { sub: "u1", email: "buyer@example.com" } },
      error: null,
    });

    await expect(getClaims()).resolves.toMatchObject({
      sub: "u1",
      email: "buyer@example.com",
    });
  });

  test("returns null when signed out", async () => {
    mocks.auth.getClaims.mockResolvedValue({ data: null, error: null });

    await expect(getClaims()).resolves.toBeNull();
  });

  test("returns null when the token fails verification", async () => {
    mocks.auth.getClaims.mockResolvedValue({
      data: null,
      error: { message: "Invalid JWT signature" },
    });

    await expect(getClaims()).resolves.toBeNull();
  });

  // The whole reason this module exists. getUser() sends a request to the
  // Supabase Auth server on every call; getClaims() verifies against a cached
  // JWKS. If this fails, a render path has reintroduced the network round trip.
  test("never calls getUser, which would hit the Auth server", async () => {
    mocks.auth.getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });

    await getClaims();

    expect(mocks.auth.getUser).not.toHaveBeenCalled();
  });
});

describe("getProfile", () => {
  beforeEach(() => {
    mocks.auth.getClaims.mockReset();
    mocks.auth.getUser.mockReset();
    mocks.from.mockClear();
    mocks.chain.select.mockClear();
    mocks.chain.eq.mockClear();
    mocks.chain.maybeSingle.mockReset();
    mocks.auth.getClaims.mockResolvedValue({ data: null, error: null });
  });

  test("returns the name and role for a signed-in visitor", async () => {
    mocks.auth.getClaims.mockResolvedValue({
      data: { claims: { sub: "u1", email: "buyer@example.com" } },
      error: null,
    });
    mocks.chain.maybeSingle.mockResolvedValue({
      data: { full_name: "Siti Rahayu", role: "buyer" },
      error: null,
    });

    await expect(getProfile()).resolves.toEqual({
      full_name: "Siti Rahayu",
      role: "buyer",
    });
  });

  // The select policy in migration 0003 only lets a user read their own row, so
  // the filter has to key off the verified subject. Matching on the email would
  // mean trusting a value the user chose at sign-up.
  test("matches on the verified subject, not the email", async () => {
    mocks.auth.getClaims.mockResolvedValue({
      data: { claims: { sub: "u1", email: "buyer@example.com" } },
      error: null,
    });
    mocks.chain.maybeSingle.mockResolvedValue({ data: null, error: null });

    await getProfile();

    expect(mocks.chain.eq).toHaveBeenCalledWith("id", "u1");
    expect(mocks.chain.select).toHaveBeenCalledWith("full_name, role");
  });

  test("never queries while signed out", async () => {
    mocks.auth.getClaims.mockResolvedValue({ data: null, error: null });

    await expect(getProfile()).resolves.toBeNull();

    expect(mocks.from).not.toHaveBeenCalled();
  });

  // A signup whose trigger has not fired yet has a session and no row. That is
  // "no profile", not a failure to report.
  test("returns null when the row is missing rather than throwing", async () => {
    mocks.auth.getClaims.mockResolvedValue({
      data: { claims: { sub: "u1" } },
      error: null,
    });
    mocks.chain.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "PGRST116" },
    });

    await expect(getProfile()).resolves.toBeNull();
  });
});