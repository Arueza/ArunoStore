import { beforeEach, describe, expect, test, vi } from "vitest";

/** redirect() throws. A sentinel keeps the mock from changing the flow. */
class Redirect extends Error {
  constructor(readonly to: string) {
    super(to);
  }
}

const mocks = vi.hoisted(() => ({
  signIn: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirect(to);
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { signInWithPassword: mocks.signIn },
  })),
}));

import { login } from "./actions";

function formData(overrides: Record<string, string> = {}) {
  const data = new FormData();

  for (const [key, value] of Object.entries({
    email: "  buyer@example.com  ",
    password: "hunter2",
    ...overrides,
  })) {
    data.append(key, value);
  }

  return data;
}

/** Runs the action and returns where it sent the browser, or the message it showed. */
async function run(data: FormData) {
  try {
    const state = await login({ message: "" }, data);
    return { to: null, message: state.message };
  } catch (error) {
    if (error instanceof Redirect) return { to: error.to, message: null };
    throw error;
  }
}

describe("login", () => {
  beforeEach(() => {
    mocks.signIn.mockReset();
    mocks.signIn.mockResolvedValue({ error: null });
  });

  test("signs in with the trimmed email", async () => {
    await run(formData());

    expect(mocks.signIn).toHaveBeenCalledWith({
      email: "buyer@example.com",
      password: "hunter2",
    });
  });

  // The default, and the reason this feature exists without it being obvious:
  // a buyer who typed their password should arrive where they meant to be.
  test("returns to the storefront when no destination was given", async () => {
    const { to } = await run(formData());

    expect(to).toBe("/");
  });

  // The whole point of the next parameter: the form they pressed a button on.
  test.each(["/titipan/request", "/titipan/mine"])(
    "returns the buyer to %s",
    async (destination) => {
      const { to } = await run(formData({ next: destination }));

      expect(to).toBe(destination);
    },
  );

  // The action is the security boundary. A hidden field is whatever the
  // browser says it is, so a destination the page refused can still be posted
  // directly — and a wrong one would either walk somebody off the site or into
  // /staff, with a fresh session in hand.
  test.each([
    "//evil.example",
    "https://evil.example",
    "/staff",
    "/staff/commissions/abc",
    "/account",
    "/titipan",
    "/titipan/../../staff",
  ])("refuses the destination %o and goes to the storefront", async (destination) => {
    const { to } = await run(formData({ next: destination }));

    expect(to).toBe("/");
  });

  test("refuses a destination that is not a string at all", async () => {
    const data = formData();
    data.append("next", new File(["x"], "x.txt"));

    const { to } = await run(data);

    expect(to).toBe("/");
  });

  // A wrong password must not be a redirect: the buyer stays on the form, keeps
  // their destination in the hidden field, and tries again.
  test("shows the error and does not redirect when the password is wrong", async () => {
    mocks.signIn.mockResolvedValueOnce({
      error: { message: "Invalid login credentials" },
    } as never);

    const { to, message } = await run(formData({ next: "/titipan/mine" }));

    expect(to).toBeNull();
    expect(message).toBe("Email atau password salah.");
  });

  test("refuses an empty email or password without asking Supabase", async () => {
    expect((await run(formData({ email: "   " }))).message).toBe(
      "Email dan password wajib diisi.",
    );
    expect((await run(formData({ password: "" }))).message).toBe(
      "Email dan password wajib diisi.",
    );

    expect(mocks.signIn).not.toHaveBeenCalled();
  });
});
