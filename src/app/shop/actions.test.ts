import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn<(args?: unknown) => Promise<{ data: { user: { id: string } | null } }>>(),
  orderRow: vi.fn<(args?: unknown) => Promise<{ data: { id: string; buyer_id: string; status: string } | null }>>(),
  updateEq: vi.fn<(args?: unknown) => Promise<{ error: { message: string } | null }>>(),
  updatePayload: vi.fn<(args?: unknown) => unknown>(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({  createClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: mocks.orderRow })),
      })),
      update: vi.fn((payload: unknown) => {
        mocks.updatePayload(payload);
        return { eq: mocks.updateEq };
      }),
    })),
  })),
}));

import { saveShopOrderAddress } from "./actions";

const ORDER_ID = "123e4567-e89b-12d3-a456-426614174000";

/** An address as the checkout form sends it. */
function formData(overrides: Record<string, string> = {}) {
  const data = new FormData();

  for (const [key, value] of Object.entries({
    recipient_name: "  Budi Santoso  ",
    phone: " +62 812-3456-789 ",
    address: "Jl. Mawar No. 10 RT 01 RW 02",
    city: " Bandung ",
    province: "Jawa Barat",
    postal_code: "40111",
    note: "",
    ...overrides,
  })) {
    data.append(key, value);
  }

  return data;
}

const written = () => mocks.updatePayload.mock.calls[0]![0] as Record<string, unknown>;

describe("saveShopOrderAddress", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.orderRow.mockReset();
    mocks.updateEq.mockReset();
    mocks.updatePayload.mockReset();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "buyer-1" } } });
    mocks.orderRow.mockResolvedValue({
      data: { id: ORDER_ID, buyer_id: "buyer-1", status: "pending" },
    });
    mocks.updateEq.mockResolvedValue({ error: null });
  });

  test("saves the trimmed address on the buyer's pending order", async () => {
    const result = await saveShopOrderAddress(ORDER_ID, formData());

    expect(result.ok).toBe(true);
    expect(written()).toMatchObject({
      recipient_name: "Budi Santoso",
      phone: "+62 812-3456-789",
      address: "Jl. Mawar No. 10 RT 01 RW 02",
      city: "Bandung",
      province: "Jawa Barat",
      postal_code: "40111",
      note: null,
    });
    expect(mocks.updateEq).toHaveBeenCalledWith("id", ORDER_ID);
  });

  // Blank note is no note, not an empty string staff must distinguish from one.
  test("stores a filled note", async () => {
    await saveShopOrderAddress(ORDER_ID, formData({ note: " Titip di satpam " }));

    expect(written().note).toBe("Titip di satpam");
  });

  test("refuses a non-UUID order id before touching the database", async () => {
    const result = await saveShopOrderAddress("../../login", formData());

    expect(result.ok).toBe(false);
    expect(mocks.orderRow).not.toHaveBeenCalled();
  });

  test.each([
    ["recipient_name", "   ", /nama penerima/i],
    ["phone", "123", /nomor hp/i],
    ["phone", "abcdefghij", /nomor hp/i],
    ["address", "   ", /alamat lengkap/i],
    ["city", "", /kota/i],
    ["province", "", /provinsi/i],
    ["postal_code", "4011", /kode pos/i],
    ["postal_code", "ABCDE", /kode pos/i],
    ["postal_code", "401111", /kode pos/i],
  ])("refuses a bad %s without writing", async (key, value, message) => {
    const result = await saveShopOrderAddress(ORDER_ID, formData({ [key]: value }));

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.message).toMatch(message);
    expect(mocks.updateEq).not.toHaveBeenCalled();
  });

  // A forged buyer_id field in the FormData must not redirect the address
  // onto somebody else's order — ownership comes from the session only.
  test("ignores order ownership from the client and checks the session", async () => {
    mocks.orderRow.mockResolvedValueOnce({
      data: { id: ORDER_ID, buyer_id: "someone-else", status: "pending" },
    });

    const result = await saveShopOrderAddress(ORDER_ID, formData());

    expect(result.ok).toBe(false);
    expect(mocks.updateEq).not.toHaveBeenCalled();
  });

  test("refuses an order that is no longer pending", async () => {
    mocks.orderRow.mockResolvedValueOnce({
      data: { id: ORDER_ID, buyer_id: "buyer-1", status: "settled" },
    });

    const result = await saveShopOrderAddress(ORDER_ID, formData());

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.message).toMatch(/tidak bisa diubah/i);
    expect(mocks.updateEq).not.toHaveBeenCalled();
  });

  // Session can lapse between opening the checkout and pressing save.
  test("reports an expired session and writes nothing", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null } });

    const result = await saveShopOrderAddress(ORDER_ID, formData());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/sesi/i);
    expect(mocks.orderRow).not.toHaveBeenCalled();
    expect(mocks.updateEq).not.toHaveBeenCalled();
  });

  test("surfaces the update error", async () => {
    mocks.updateEq.mockResolvedValueOnce({
      error: { message: "new row violates row-level security policy" },
    });

    const result = await saveShopOrderAddress(ORDER_ID, formData());

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/row-level security/);
  });
});
