import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn<(args?: unknown) => Promise<{ data: { user: { id: string } | null }; error: unknown }>>(),
  insert: vi.fn<(args?: unknown) => Promise<{ error: unknown }>>(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
    from: vi.fn(() => ({ insert: mocks.insert })),
  })),
}));

import { submitTitipanRequest, type TitipanRequestState } from "./actions";

const noState: TitipanRequestState = { message: "", sent: false };

/** A request as the form sends it: no buyer_id field, since none exists. */
function formData(overrides: Record<string, string> = {}) {
  const data = new FormData();

  for (const [key, value] of Object.entries({
    productLink: "  https://store.example/item/1234  ",
    size: " M ",
    color: "  Hitam  ",
    quantity: "2",
    budget: "500000",
    ...overrides,
  })) {
    data.append(key, value);
  }

  return data;
}

/** The row handed to Supabase on the last insert. */
const row = () => mocks.insert.mock.calls[0]![0] as Record<string, unknown>;

describe("submitTitipanRequest", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.insert.mockReset();
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "buyer-1" } },
      error: null,
    });
    mocks.insert.mockResolvedValue({ error: null });
  });

  test("saves the request as a buyer with status requested", async () => {
    const result = await submitTitipanRequest(noState, formData());

    expect(row()).toEqual({
      buyer_id: "buyer-1",
      product_link: "https://store.example/item/1234",
      size: "M",
      color: "Hitam",
      quantity: 2,
      budget: 500000,
      status: "requested",
    });
    expect(result.sent).toBe(true);
  });

  // The point of the file. The form is client-rendered, so a buyer_id field in
  // the FormData would let anyone file a request under somebody else's account.
  test("ignores a forged buyer_id", async () => {
    await submitTitipanRequest(noState, formData({ buyer_id: "someone-else" }));

    expect(row().buyer_id).toBe("buyer-1");
  });

  // status is set by the action, not the form, so nobody can file a request that
  // already claims to be quoted and skip the check staff do before buying.
  test("ignores a forged status", async () => {
    await submitTitipanRequest(noState, formData({ status: "quoted" }));

    expect(row().status).toBe("requested");
  });

  // Stored links are rendered as hrefs by staff at 3.5. A javascript: link saved
  // now would run when a member of staff opened the request.
  test("rejects a link that is not http or https", async () => {
    const result = await submitTitipanRequest(
      noState,
      formData({ productLink: "javascript:alert(1)" }),
    );

    expect(result.message).toMatch(/http/i);
    expect(result.sent).toBe(false);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  test("rejects a blank link before calling Supabase", async () => {
    const result = await submitTitipanRequest(noState, formData({ productLink: "   " }));

    expect(result.sent).toBe(false);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  test("rejects a missing link before calling Supabase", async () => {
    const data = formData();
    data.delete("productLink");

    const result = await submitTitipanRequest(noState, data);

    expect(result.sent).toBe(false);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  // null rather than "". A buyer who does not know the size has not sent an
  // empty size, and staff renders the difference between the two.
  test("stores a blank size and colour as null", async () => {
    await submitTitipanRequest(noState, formData({ size: "   ", color: "" }));

    expect(row().size).toBeNull();
    expect(row().color).toBeNull();
  });

  // An empty quantity box is a buyer asking for one item, not a mistake — the
  // column defaults to 1 for the same reason.
  test("treats a cleared quantity as one", async () => {
    const data = formData();
    data.delete("quantity");

    await submitTitipanRequest(noState, data);

    expect(row().quantity).toBe(1);
  });

  test.each([
    ["0", /minimal 1/i],
    ["-3", /angka bulat/i],
    ["1.5", /angka bulat/i],
    ["dua", /angka bulat/i],
  ])("refuses a quantity of %s", async (quantity, message) => {
    const result = await submitTitipanRequest(noState, formData({ quantity }));

    expect(result.message).toMatch(message);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  // 0006's budget column is nullable so a buyer can have no idea. Storing 0
  // instead would tell staff the item is expected to cost nothing.
  test("stores a blank budget as null", async () => {
    await submitTitipanRequest(noState, formData({ budget: "   " }));

    expect(row().budget).toBeNull();
  });

  test("accepts a budget of zero, which is a real answer", async () => {
    await submitTitipanRequest(noState, formData({ budget: "0" }));

    expect(row().budget).toBe(0);
  });

  // parseInt would read "500000.50" as 500000 and the column's check would never
  // see the decimals that got dropped, so they would vanish silently instead of
  // being refused. Whole rupiah is the rule.
  test.each(["500000.50", "500,000", "Rp 500.000"])(
    "refuses a budget written as %s",
    async (budget) => {
      const result = await submitTitipanRequest(noState, formData({ budget }));

      expect(result.message).toMatch(/bulat/i);
      expect(mocks.insert).not.toHaveBeenCalled();
    },
  );

  // Session can lapse between opening the form and pressing send.
  test("reports an expired session and writes nothing", async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "jwt expired" },
    } as never);

    const result = await submitTitipanRequest(noState, formData());

    expect(result.sent).toBe(false);
    expect(result.message).toMatch(/sesi/i);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  test("surfaces the insert error", async () => {
    mocks.insert.mockResolvedValueOnce({
      error: { message: "new row violates row-level security policy" },
    } as never);

    const result = await submitTitipanRequest(noState, formData());

    expect(result.message).toBe("new row violates row-level security policy");
    expect(result.sent).toBe(false);
  });
});