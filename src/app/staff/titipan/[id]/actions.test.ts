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
      // The staff check reads profiles through select().eq().maybeSingle().
      select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }),
      update: (values: unknown) => ({
        eq: (_column: string, value: string) => {
          mocks.update({ values, id: value });
          return Promise.resolve({ error: mocks.updateError });
        },
      }),
    })),
  })),
}));

import { markAsPurchased, saveTitipanQuote } from "./actions";

const ID = "3f7c1e6a-9b2d-4e5f-8a1b-2c3d4e5f6a7b";

function formData(overrides: Record<string, string> = {}) {
  const data = new FormData();

  for (const [key, value] of Object.entries({
    id: ID,
    quoteItemPrice: "500000",
    quoteShipping: "180000",
    quoteServiceFee: "25000",
    quoteNote: "  Harga sudah termasuk pajak Trekker.  ",
    ...overrides,
  })) {
    data.append(key, value);
  }

  return data;
}

/** Runs the action and returns where it sent the browser, or null if it did not. */
async function run(data: FormData) {
  try {
    await saveTitipanQuote(data);
    return null;
  } catch (error) {
    if (error instanceof Redirect) return error.to;
    throw error;
  }
}

/** The column values handed to Supabase on the last update. */
const written = () =>
  (mocks.update.mock.calls[0]![0] as { values: Record<string, unknown> }).values;

describe("saveTitipanQuote", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.update.mockReset();
    mocks.maybeSingle.mockReset();
    mocks.updateError = null;
    mocks.getUser.mockResolvedValue({ data: { user: { id: "staff-1" } } });
    mocks.maybeSingle.mockResolvedValue({ data: { role: "staff" } });
  });

  // The whole point of 3.6 and 3.7: the three figures are stored and the row now
  // reads as quoted.
  test("stores the three figures, the note, and the quoted status", async () => {
    const to = await run(formData());

    expect(written()).toEqual({
      quote_item_price: 500000,
      quote_shipping: 180000,
      quote_service_fee: 25000,
      quote_note: "Harga sudah termasuk pajak Trekker.",
      status: "quoted",
    });
    expect(to).toBe(`/staff/titipan/${ID}?saved=1`);
  });

  // The form is client-rendered, so a buyer-side field in the FormData would let a
  // staff session try to rewrite the very request the quote is for. 0022 would
  // refuse those columns anyway; the action must not even send them.
  test("ignores forged buyer-side fields", async () => {
    await run(
      formData({
        buyer_id: "someone-else",
        product_link: "https://elsewhere.example/item/1",
        quantity: "99",
      }),
    );

    expect(written()).not.toHaveProperty("buyer_id");
    expect(written()).not.toHaveProperty("product_link");
    expect(written()).not.toHaveProperty("quantity");
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

  // parseInt would read "15000.50" as 15000 and the column's check would never
  // see the half that got dropped, so the decimals would disappear silently
  // instead of being refused.
  test.each([
    ["quoteItemPrice", "15000.50"],
    ["quoteShipping", "180,000"],
    ["quoteServiceFee", "25.000"],
  ])("refuses %s written as %s", async (field, value) => {
    const to = await run(formData({ [field]: value }));

    expect(decodeURIComponent(to!)).toContain("bulat");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  // All three are refused rather than stored as zero. Free shipping is a real
  // answer, so it has to be typed on purpose — and a half-typed quote that
  // silently charges nobody for shipping is worse than one that refuses to save.
  test.each(["quoteItemPrice", "quoteShipping", "quoteServiceFee"])(
    "refuses an empty %s rather than storing zero",
    async (field) => {
      const to = await run(formData({ [field]: "   " }));

      expect(decodeURIComponent(to!)).toContain("bulat");
      expect(mocks.update).not.toHaveBeenCalled();
    },
  );

  // Zero is a real quote and has to be typed on purpose, so the pattern allows it
  // where the empty check does not.
  test("accepts a shipping cost of zero", async () => {
    await run(formData({ quoteShipping: "0" }));

    expect(written().quote_shipping).toBe(0);
  });

  test("refuses a negative figure", async () => {
    const to = await run(formData({ quoteItemPrice: "-5000" }));

    expect(decodeURIComponent(to!)).toContain("bulat");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  // null rather than "". A blank note is the absence of one, and 3.8 renders
  // the difference between a quote with nothing to say and a broken cell.
  test("stores a blank note as null", async () => {
    await run(formData({ quoteNote: "   " }));

    expect(written().quote_note).toBeNull();
  });

  // Migration 0022 would deny this anyway. Asking first turns "the form did
  // nothing" into a redirect that says why.
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
  // Decoded before comparing, because what is being asserted is the words
  // Postgres said, not the encoding the redirect happened to apply.
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

describe("markAsPurchased", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.update.mockReset();
    mocks.maybeSingle.mockReset();
    mocks.updateError = null;
    mocks.getUser.mockResolvedValue({ data: { user: { id: "staff-1" } } });
    // markAsPurchased calls maybeSingle twice: once for the profile check,
    // once for the request status check. Default: staff with accepted status.
    mocks.maybeSingle
      .mockResolvedValueOnce({ data: { role: "staff" } })
      .mockResolvedValueOnce({ data: { status: "accepted" } })
      .mockResolvedValue({ data: { role: "staff" } });
  });

  function purchasedFormData(overrides: Record<string, string> = {}) {
    const data = new FormData();
    for (const [key, value] of Object.entries({ id: ID, ...overrides })) {
      data.append(key, value);
    }
    return data;
  }

  async function runPurchased(data: FormData) {
    try {
      await markAsPurchased(data);
      return null;
    } catch (error) {
      if (error instanceof Redirect) return error.to;
      throw error;
    }
  }

  test("moves an accepted request to purchased", async () => {
    const to = await runPurchased(purchasedFormData());

    expect(written()).toEqual({ status: "purchased" });
    expect(to).toBe(`/staff/titipan/${ID}?saved=1`);
  });

  test("ignores a forged status and always writes purchased", async () => {
    await runPurchased(purchasedFormData({ status: "requested" }));

    expect(written().status).toBe("purchased");
  });

  test("refuses an id that is not a uuid, before touching Supabase", async () => {
    const to = await runPurchased(purchasedFormData({ id: "../../login" }));

    expect(to).toContain("error=");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("refuses when the request does not exist or is not the staff's", async () => {
    mocks.maybeSingle.mockReset();
    mocks.maybeSingle
      .mockResolvedValueOnce({ data: { role: "staff" } })
      .mockResolvedValueOnce({ data: null } as never);

    const to = await runPurchased(purchasedFormData());

    expect(to).toContain("error=");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("refuses to mark as purchased before the buyer accepted", async () => {
    mocks.maybeSingle.mockReset();
    mocks.maybeSingle
      .mockResolvedValueOnce({ data: { role: "staff" } })
      .mockResolvedValueOnce({ data: { status: "quoted" } } as never);

    const to = await runPurchased(purchasedFormData());

    expect(to).toContain("error=");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("sends a buyer back to the store and writes nothing", async () => {
    mocks.maybeSingle.mockReset();
    mocks.maybeSingle.mockResolvedValueOnce({ data: { role: "buyer" } } as never);

    const to = await runPurchased(purchasedFormData());

    expect(to).toBe("/");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("sends an expired session to the login page", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } } as never);

    const to = await runPurchased(purchasedFormData());

    expect(to).toBe("/login");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("surfaces the error when Supabase refuses the update", async () => {
    mocks.updateError = { message: "new row violates row-level security policy" };

    const to = await runPurchased(purchasedFormData());

    expect(decodeURIComponent(to!)).toContain("row-level security");
  });

  test("updates only the row named in the form", async () => {
    await runPurchased(purchasedFormData());

    expect(mocks.update.mock.calls[0]![0]).toMatchObject({ id: ID });
  });
});