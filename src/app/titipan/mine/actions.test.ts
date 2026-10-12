import { beforeEach, describe, expect, test, vi } from "vitest";

class Redirect extends Error {
  constructor(readonly to: string) {
    super(to);
  }
}

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
  update: vi.fn(),
  updateError: null as { message: string } | null,
}));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirect(to);
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
    from: vi.fn(() => ({
      select: (columns: unknown) => {
        mocks.select(columns);
        return {
          eq: (_column: string, value: string) => ({
            maybeSingle: () => mocks.maybeSingle(value),
          }),
        };
      },
      update: (values: unknown) => ({
        eq: (_column: string, value: string) => {
          mocks.update({ values, id: value });
          return Promise.resolve({ error: mocks.updateError });
        },
      }),
    })),
  })),
}));

import { markAsArrived, respondToQuote } from "./actions";

const ID = "3f7c1e6a-9b2d-4e5f-8a1b-2c3d4e5f6a7b";

function formData(overrides: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    id: ID,
    decision: "accept",
    ...overrides,
  })) {
    data.append(key, value);
  }
  return data;
}

async function run(data: FormData) {
  try {
    await respondToQuote(data);
    return null;
  } catch (error) {
    if (error instanceof Redirect) return error.to;
    throw error;
  }
}

const written = () =>
  (mocks.update.mock.calls[0]![0] as { values: Record<string, unknown> }).values;

describe("respondToQuote", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.select.mockReset();
    mocks.maybeSingle.mockReset();
    mocks.update.mockReset();
    mocks.updateError = null;
    mocks.getUser.mockResolvedValue({ data: { user: { id: "buyer-1" } } });
    mocks.maybeSingle.mockResolvedValue({ data: { status: "quoted" } });
  });

  test("accepts a quote by moving the row to accepted", async () => {
    const to = await run(formData({ decision: "accept" }));

    expect(written()).toEqual({ status: "accepted" });
    expect(to).toBe("/titipan/mine?saved=1");
  });

  test("declines a quote by moving the row to declined", async () => {
    const to = await run(formData({ decision: "decline" }));

    expect(written()).toEqual({ status: "declined" });
    expect(to).toBe("/titipan/mine?saved=1");
  });

  test("ignores a forged status and always writes accepted or declined", async () => {
    await run(formData({ status: "quoted" }));

    expect(written().status).toBe("accepted");
  });

  test("refuses an id that is not a uuid, before touching Supabase", async () => {
    const to = await run(formData({ id: "../../login" }));

    expect(to).toContain("error=");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("refuses a decision that is not accept or decline", async () => {
    const to = await run(formData({ decision: "delete" }));

    expect(to).toContain("error=");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("refuses to act on a request that is no longer quoted", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { status: "accepted" } });

    const to = await run(formData({ decision: "decline" }));

    expect(to).toContain("error=");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("refuses to act on a request that was never quoted", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { status: "requested" } });

    const to = await run(formData({ decision: "accept" }));

    expect(to).toContain("error=");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("refuses when the request does not exist or is not the buyer's", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null });

    const to = await run(formData());

    expect(to).toContain("error=");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("sends an expired session to the login page", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } } as never);

    const to = await run(formData());

    expect(to).toBe("/login");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("surfaces the error when Supabase refuses the update", async () => {
    mocks.updateError = { message: "new row violates row-level security policy" };

    const to = await run(formData());

    expect(decodeURIComponent(to!)).toContain("row-level security");
  });

  test("updates only the row named in the form", async () => {
    await run(formData());

    expect(mocks.update.mock.calls[0]![0]).toMatchObject({ id: ID });
  });
});

describe("markAsArrived", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.select.mockReset();
    mocks.maybeSingle.mockReset();
    mocks.update.mockReset();
    mocks.updateError = null;
    mocks.getUser.mockResolvedValue({ data: { user: { id: "buyer-1" } } });
    mocks.maybeSingle.mockResolvedValue({ data: { status: "shipped" } });
  });

  function arrivedFormData(overrides: Record<string, string> = {}) {
    const data = new FormData();
    for (const [key, value] of Object.entries({ id: ID, ...overrides })) {
      data.append(key, value);
    }
    return data;
  }

  async function runArrived(data: FormData) {
    try {
      await markAsArrived(data);
      return null;
    } catch (error) {
      if (error instanceof Redirect) return error.to;
      throw error;
    }
  }

  const writtenArrived = () =>
    (mocks.update.mock.calls[0]![0] as { values: Record<string, unknown> }).values;

  test("moves a shipped request to arrived", async () => {
    const to = await runArrived(arrivedFormData());

    expect(writtenArrived()).toEqual({ status: "arrived" });
    expect(to).toBe("/titipan/mine?saved=1");
  });

  test("refuses an id that is not a uuid, before touching Supabase", async () => {
    const to = await runArrived(arrivedFormData({ id: "../../login" }));

    expect(to).toContain("error=");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("refuses when the request is not shipped", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { status: "purchased" } });

    const to = await runArrived(arrivedFormData());

    expect(to).toContain("error=");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("refuses when the request does not exist or is not the buyer's", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null });

    const to = await runArrived(arrivedFormData());

    expect(to).toContain("error=");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("sends an expired session to the login page", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } } as never);

    const to = await runArrived(arrivedFormData());

    expect(to).toBe("/login");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("surfaces the error when Supabase refuses the update", async () => {
    mocks.updateError = { message: "new row violates row-level security policy" };

    const to = await runArrived(arrivedFormData());

    expect(decodeURIComponent(to!)).toContain("row-level security");
  });

  test("updates only the row named in the form", async () => {
    await runArrived(arrivedFormData());

    expect(mocks.update.mock.calls[0]![0]).toMatchObject({ id: ID });
  });
});
