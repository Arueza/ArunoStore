import { beforeEach, describe, expect, test, vi } from "vitest";

/** redirect() throws. Throwing a sentinel keeps the mock from changing the flow. */
class Redirect extends Error {
  constructor(readonly to: string) {
    super(to);
  }
}

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  update: vi.fn(),
  maybeSingle: vi.fn(),
  remove: vi.fn(),
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
    from: vi.fn((table: string) => ({
      // The staff check reads profiles; saveDeliveryImage also reads
      // commissions for the existing delivery_image. Both go through
      // .select().eq().maybeSingle(), so the same mock serves both.
      select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
      update: (values: unknown) => ({
        eq: (_column: string, value: string) => {
          mocks.update({ values, id: value });
          return Promise.resolve({ error: mocks.updateError });
        },
      }),
      // unused, keeps the shape honest if the action ever grows
      _table: table,
    })),
    storage: {
      from: () => ({
        remove: mocks.remove,
      }),
    },
  })),
}));

import { saveDeliveryImage, saveQuote } from "./actions";

const ID = "3f7c1e6a-9b2d-4e5f-8a1b-2c3d4e5f6a7b";

function formData(overrides: Record<string, string> = {}) {
  const data = new FormData();

  for (const [key, value] of Object.entries({
    id: ID,
    quotePrice: "150000",
    quoteNote: "  Revisi gratis dua kali.  ",
    ...overrides,
  })) {
    data.append(key, value);
  }

  return data;
}

/** Runs the action and returns where it sent the browser, or null if it did not. */
async function run(data: FormData) {
  try {
    await saveQuote(data);
    return null;
  } catch (error) {
    if (error instanceof Redirect) return error.to;
    throw error;
  }
}

/** The column values handed to Supabase on the last update. */
const written = () =>
  (mocks.update.mock.calls[0]![0] as { values: Record<string, unknown> }).values;

describe("saveQuote", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.update.mockReset();
    mocks.maybeSingle.mockReset();
    mocks.remove.mockReset();
    mocks.updateError = null;
    mocks.getUser.mockResolvedValue({ data: { user: { id: "staff-1" } } });
    mocks.maybeSingle.mockResolvedValue({ data: { role: "staff" } });
    mocks.remove.mockResolvedValue({ error: null });
  });

  // The whole point of 2.10: saving a quote is what makes it a quote.
  test("stores the price and note and moves the row to quoted", async () => {
    const to = await run(formData());

    expect(written()).toEqual({
      quote_price: 150000,
      quote_note: "Revisi gratis dua kali.",
      status: "quoted",
    });
    expect(to).toBe(`/staff/commissions/${ID}?saved=1`);
  });

  // The form is client-rendered, so a status field in the FormData would let a
  // staff session save a price while leaving the row reading as unquoted.
  test("ignores a forged status and always writes quoted", async () => {
    await run(formData({ status: "requested" }));

    expect(written().status).toBe("quoted");
  });

  // The id arrives from a hidden field and goes straight into a redirect path.
  // A path traversal here would build a URL the action then navigates to.
  test("refuses an id that is not a uuid, before touching Supabase", async () => {
    const to = await run(formData({ id: "../../login" }));

    expect(to).toContain("error=");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  // Money is whole rupiah. parseInt would read this as 15000 and the column's
  // check would never see the half that got dropped, so the decimals would
  // disappear silently instead of being refused.
  test("refuses a price with decimals", async () => {
    const to = await run(formData({ quotePrice: "15000.50" }));

    expect(to).toContain("bulat");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("refuses a price typed with thousand separators", async () => {
    const to = await run(formData({ quotePrice: "150,000" }));

    expect(to).toContain("bulat");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("refuses an empty price rather than storing zero", async () => {
    const to = await run(formData({ quotePrice: "   " }));

    expect(to).toContain("bulat");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  // Zero is a real quote and has to be typed on purpose, so the pattern allows it
  // where the empty check does not.
  test("accepts a price of zero", async () => {
    await run(formData({ quotePrice: "0" }));

    expect(written().quote_price).toBe(0);
  });

  test("refuses a negative price", async () => {
    const to = await run(formData({ quotePrice: "-5000" }));

    expect(to).toContain("bulat");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  // null rather than "". A blank note is the absence of one, and 2.11 renders
  // the difference between a quote with nothing to say and a broken cell.
  test("stores a blank note as null", async () => {
    await run(formData({ quoteNote: "   " }));

    expect(written().quote_note).toBeNull();
  });

  // Migration 0018 denies this anyway. Asking first turns "the form did nothing"
  // into a redirect that says why.
  test("sends a buyer back to the store and writes nothing", async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: { role: "buyer" } } as never);

    const to = await run(formData());

    expect(to).toBe("/");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("sends an expired session to the login page", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } } as never);

    const to = await run(formData());

    expect(to).toBe("/login");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  // The message goes into a query string, so it comes back percent-encoded.
  // Decoded before comparing, because what is being asserted is the words Postgres
  // said, not the encoding the redirect happened to apply on the way.
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

describe("saveDeliveryImage", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.update.mockReset();
    mocks.maybeSingle.mockReset();
    mocks.remove.mockReset();
    mocks.updateError = null;
    mocks.getUser.mockResolvedValue({ data: { user: { id: "staff-1" } } });
    // saveDeliveryImage calls maybeSingle twice: once for the profiles role
    // check, once for the existing delivery_image read. The role check comes
    // first, the delivery_image read second.
    mocks.maybeSingle
      .mockResolvedValueOnce({ data: { role: "staff" } })
      .mockResolvedValue({ data: { delivery_image: null } });
    mocks.remove.mockResolvedValue({ error: null });
  });

  function deliveryFormData(overrides: Record<string, string> = {}) {
    const data = new FormData();
    for (const [key, value] of Object.entries({
      id: ID,
      path: "abc-123/result.png",
      ...overrides,
    })) {
      data.append(key, value);
    }
    return data;
  }

  async function runDelivery(data: FormData) {
    try {
      await saveDeliveryImage(data);
      return null;
    } catch (error) {
      if (error instanceof Redirect) return error.to;
      throw error;
    }
  }

  const deliveryWritten = () =>
    (mocks.update.mock.calls[0]![0] as { values: Record<string, unknown> })
      .values;

  test("writes the storage path to the delivery_image column", async () => {
    const to = await runDelivery(deliveryFormData());

    expect(deliveryWritten()).toEqual({ delivery_image: "abc-123/result.png" });
    expect(to).toBe(`/staff/commissions/${ID}?saved=1`);
  });

  test("refuses an id that is not a uuid, before touching Supabase", async () => {
    const to = await runDelivery(deliveryFormData({ id: "../../login" }));

    expect(to).toContain("error=");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("refuses an empty path", async () => {
    const to = await runDelivery(deliveryFormData({ path: "   " }));

    expect(to).toContain("error=");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("refuses a path with directory traversal", async () => {
    const to = await runDelivery(deliveryFormData({ path: "../etc/passwd" }));

    expect(to).toContain("error=");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("sends a buyer back to the store and writes nothing", async () => {
    mocks.maybeSingle.mockReset();
    mocks.maybeSingle
      .mockResolvedValueOnce({ data: { role: "buyer" } as never })
      .mockResolvedValue({ data: { delivery_image: null } });

    const to = await runDelivery(deliveryFormData());

    expect(to).toBe("/");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("sends an expired session to the login page", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } } as never);

    const to = await runDelivery(deliveryFormData());

    expect(to).toBe("/login");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("removes the old image when replacing with a new one", async () => {
    mocks.maybeSingle.mockReset();
    mocks.maybeSingle
      .mockResolvedValueOnce({ data: { role: "staff" } })
      .mockResolvedValueOnce({ data: { delivery_image: "old/path.png" } });

    await runDelivery(deliveryFormData({ path: "new/path.png" }));

    expect(mocks.remove).toHaveBeenCalledWith(["old/path.png"]);
  });

  test("does not remove anything when no previous image exists", async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({ data: { role: "staff" } })
      .mockResolvedValueOnce({ data: { delivery_image: null } });

    await runDelivery(deliveryFormData());

    expect(mocks.remove).not.toHaveBeenCalled();
  });

  test("surfaces the error when Supabase refuses the update", async () => {
    mocks.updateError = { message: "new row violates row-level security policy" };

    const to = await runDelivery(deliveryFormData());

    expect(decodeURIComponent(to!)).toContain("row-level security");
  });
});