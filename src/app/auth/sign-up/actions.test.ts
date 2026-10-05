import { beforeEach, describe, expect, test, vi } from "vitest";

// Typed rather than bare, so `mock.calls[0][0]` is a real tuple and the test
// reads the role Supabase was actually handed.
type SignUpArgs = {
  email: string;
  options: { data: { full_name: string; role: string } };
};

const mocks = vi.hoisted(() => ({
  // Generic form rather than a typed parameter, so `mock.calls` is typed without
  // an argument the body never reads.
  signUp: vi.fn<(args: SignUpArgs) => Promise<{ error: null }>>(async () => ({
    error: null,
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { signUp: mocks.signUp } })),
}));

import { signUp, type SignUpState } from "./actions";

/** The role the last signUp call passed to Supabase. */
const sentRole = () => mocks.signUp.mock.calls[0]![0].options.data.role;

const noState: SignUpState = { message: "" };

/** A signup as the form sends it: no role field, since 1.16 removed it. */
function formData(overrides: Record<string, string> = {}) {
  const data = new FormData();

  for (const [key, value] of Object.entries({
    fullName: "Siti Rahayu",
    email: "siti@example.com",
    password: "rahasia123",
    confirmPassword: "rahasia123",
    ...overrides,
  })) {
    data.append(key, value);
  }

  return data;
}

describe("signUp", () => {
  beforeEach(() => {
    mocks.signUp.mockClear();
  });

  test("creates the account as a buyer", async () => {
    await signUp(noState, formData());

    expect(mocks.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "siti@example.com",
        options: expect.objectContaining({
          data: { full_name: "Siti Rahayu", role: "buyer" },
        }),
      }),
    );
  });

  // The reason this file exists. A visitor can post any field they like, so a
  // role arriving in the FormData must never reach Supabase.
  test("ignores a forged staff role", async () => {
    await signUp(noState, formData({ role: "staff" }));

    expect(sentRole()).toBe("buyer");
  });

  test("ignores a forged artist role too", async () => {
    await signUp(noState, formData({ role: "artist" }));

    expect(sentRole()).toBe("buyer");
  });

  test("never sends the role the client posted", async () => {
    await signUp(noState, formData({ role: "staff" }));

    expect(sentRole()).not.toBe("staff");
  });

  test("rejects a mismatched password before calling Supabase", async () => {
    const result = await signUp(
      noState,
      formData({ confirmPassword: "lain123" }),
    );

    expect(result.message).toMatch(/tidak sama/i);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  test("surfaces the Supabase error on a rejected signup", async () => {
    mocks.signUp.mockResolvedValueOnce({
      error: { message: "User already registered" },
    } as never);

    const result = await signUp(noState, formData());

    expect(result.message).toBe("User already registered");
  });
});