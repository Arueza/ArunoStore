import { beforeEach, describe, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);

  return {
    getSession: vi.fn(),
    getUser: vi.fn(),
    profileRow: vi.fn(),
    chain,
  };
});

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getSession: mocks.getSession,
      getUser: mocks.getUser,
    },
    from: vi.fn(() => {
      // maybeSingle() is what is awaited, so it has to hand back the row. Reset
      // per call: a test that changes the role must not inherit the last value.
      mocks.chain.maybeSingle.mockResolvedValue({
        data: mocks.profileRow(),
      });
      return mocks.chain;
    }),
  })),
}));

import { proxy } from "./proxy";

const request = (pathname: string) =>
  new NextRequest(new URL(pathname, "http://localhost:3000"));

/** The redirect target as a path. Next writes location as an absolute URL. */
const pathnameOf = (res: Response) =>
  new URL(res.headers.get("location")!).pathname;

/** Signed in as `userId`, whose profiles row holds `role`. */
function signedInAs(userId: string, role: string | null) {
  mocks.getUser.mockResolvedValue({ data: { user: { id: userId } } });
  mocks.profileRow.mockReturnValue(role === null ? null : { role });
}

describe("proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    // Signed out unless a test says otherwise.
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    mocks.profileRow.mockReturnValue(null);
  });

  describe("/account", () => {
    test("sends a signed-out visitor to the login page", async () => {
      const res = await proxy(request("/account"));

      expect(res.status).toBe(307);
      expect(pathnameOf(res)).toBe("/login");
    });

    test("lets a signed-in visitor through", async () => {
      signedInAs("u1", "buyer");

      const res = await proxy(request("/account"));

      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    // The profile read is for /staff only. On /account it would be a wasted
    // round trip on every navigation.
    test("does not read the profiles row", async () => {
      signedInAs("u1", "buyer");

      await proxy(request("/account"));

      expect(mocks.chain.select).not.toHaveBeenCalled();
    });
  });

  describe("/staff", () => {
    test("sends a signed-out visitor to the login page", async () => {
      const res = await proxy(request("/staff"));

      expect(res.status).toBe(307);
      expect(pathnameOf(res)).toBe("/login");
    });

    // The point of the task. Signed in but a buyer, so /login would be wrong.
    test("sends a buyer back to the store", async () => {
      signedInAs("u1", "buyer");

      const res = await proxy(request("/staff"));

      expect(res.status).toBe(307);
      // Absolute, as Next writes it. Compared by pathname so a change of host
      // in the test setup does not fail an unrelated assertion.
      expect(pathnameOf(res)).toBe("/");
    });

    test("lets staff through", async () => {
      signedInAs("u2", "staff");

      const res = await proxy(request("/staff"));

      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    // Fails closed. Until migration 0003 is applied every row reads null, and a
    // guard that failed open would show /staff to everyone the moment the route
    // had real data on it.
    test("blocks a signed-in user with no profile row", async () => {
      signedInAs("u3", null);

      const res = await proxy(request("/staff"));

      expect(res.status).toBe(307);
      expect(pathnameOf(res)).toBe("/");
    });

    test("blocks any role that is not staff", async () => {
      signedInAs("u4", "admin");

      const res = await proxy(request("/staff"));

      expect(res.status).toBe(307);
      expect(pathnameOf(res)).toBe("/");
    });

    test("guards nested paths under /staff", async () => {
      signedInAs("u1", "buyer");

      const res = await proxy(request("/staff/requests"));

      expect(res.status).toBe(307);
      expect(pathnameOf(res)).toBe("/");
    });

    // A prefix match without the slash would guard /staffing-notes by accident
    // and, worse, miss a nested route that only /staff covers.
    test("leaves a similarly named route alone", async () => {
      signedInAs("u1", "buyer");

      const res = await proxy(request("/staffing"));

      expect(res.status).toBe(200);
    });
  });

  // Guards the form from task 2.6. Signed out there is a dead end either way,
  // since the action needs a session, so the guard sends them somewhere that
  // helps.
  describe("/commissions/request", () => {
    test("sends a signed-out visitor to the login page", async () => {
      const res = await proxy(request("/commissions/request"));

      expect(res.status).toBe(307);
      expect(pathnameOf(res)).toBe("/login");
    });

    test("lets a signed-in buyer through", async () => {
      signedInAs("u1", "buyer");

      const res = await proxy(request("/commissions/request"));

      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    // A prefix match on "/commissions" would swallow the public services page the
    // form is reached from.
    test("leaves the public services page alone", async () => {
      const res = await proxy(request("/commissions"));

      expect(res.status).toBe(200);
      expect(mocks.getUser).not.toHaveBeenCalled();
    });
  });

  // Guards the buyer's list of their own requests. Signed out there is a dead
  // end: there is nothing to list and nowhere to sign in from.
  describe("/commissions/mine", () => {
    test("sends a signed-out visitor to the login page", async () => {
      const res = await proxy(request("/commissions/mine"));

      expect(res.status).toBe(307);
      expect(pathnameOf(res)).toBe("/login");
    });

    test("lets a signed-in buyer through", async () => {
      signedInAs("u1", "buyer");

      const res = await proxy(request("/commissions/mine"));

      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    // The buyer list does not need the staff check, only the session. If this
    // ever reads profiles.role it must not send a buyer to the store.
    test("does not apply the staff check", async () => {
      signedInAs("u1", "buyer");

      await proxy(request("/commissions/mine"));

      expect(mocks.chain.select).not.toHaveBeenCalled();
    });
  });

  // Guards the form from task 3.3. The same reason as /commissions/request: the
  // action needs a session to write a row, so signed out there is a dead end.
  describe("/titipan/request", () => {
    test("sends a signed-out visitor to the login page", async () => {
      const res = await proxy(request("/titipan/request"));

      expect(res.status).toBe(307);
      expect(pathnameOf(res)).toBe("/login");
    });

    test("lets a signed-in buyer through", async () => {
      signedInAs("u1", "buyer");

      const res = await proxy(request("/titipan/request"));

      expect(res.status).toBe(200);
      expect(res.headers.get("location")).toBeNull();
    });

    // The form reads nothing; only the action needs the session, so this route
    // must not cost a profiles read.
    test("does not read the profiles row", async () => {
      signedInAs("u1", "buyer");

      await proxy(request("/titipan/request"));

      expect(mocks.chain.select).not.toHaveBeenCalled();
    });

    // A prefix match on "/titipan" would swallow the public page that explains
    // the service and sends the visitor here.
    test("leaves the public titipan page alone", async () => {
      const res = await proxy(request("/titipan"));

      expect(res.status).toBe(200);
      expect(mocks.getUser).not.toHaveBeenCalled();
    });
  });

  test("leaves public routes untouched", async () => {
    const res = await proxy(request("/"));

    expect(res.status).toBe(200);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
});