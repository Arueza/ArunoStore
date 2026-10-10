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

import { submitRequest, type RequestState } from "./actions";

const noState: RequestState = { message: "", sent: false };

/** A request as the form sends it: no buyer_id field, since none exists. */
function formData(overrides: Record<string, string | string[]> = {}) {
  const data = new FormData();

  for (const [key, value] of Object.entries({
    serviceId: "11111111-1111-1111-1111-111111111111",
    brief: "  Seekor kucing di_Toileet.jp, warna oranye.  ",
    ...overrides,
  })) {
    if (Array.isArray(value)) {
      value.forEach((entry) => data.append(key, entry));
    } else {
      data.append(key, value);
    }
  }

  return data;
}

/** The row handed to Supabase on the last insert. */
const row = () => mocks.insert.mock.calls[0]![0] as Record<string, unknown>;

describe("submitRequest", () => {
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
    const result = await submitRequest(noState, formData());

    expect(row()).toEqual({
      buyer_id: "buyer-1",
      service_id: "11111111-1111-1111-1111-111111111111",
      brief: "Seekor kucing di_Toileet.jp, warna oranye.",
      reference_links: [],
      status: "requested",
    });
    expect(result.sent).toBe(true);
  });

  // The point of the file. The form is client-rendered, so a buyer_id field in
  // the FormData would let anyone file a request under somebody else's account.
  test("ignores a forged buyer_id", async () => {
    await submitRequest(noState, formData({ buyer_id: "someone-else" }));

    expect(row().buyer_id).toBe("buyer-1");
  });

  // status is set by the action, not the form, so nobody can file a request that
  // already claims to be quoted.
  test("ignores a forged status", async () => {
    await submitRequest(noState, formData({ status: "quoted" }));

    expect(row().status).toBe("requested");
  });

  test("keeps the reference links that were filled in", async () => {
    await submitRequest(
      noState,
      formData({ link: [" https://pinterest.com/pin/1 ", "", "https://x.com/post"] }),
    );

    // Blanks dropped, whitespace trimmed. reference_links is text[] and every
    // entry has to be a real URL, so an empty row of inputs is not an error.
    expect(row().reference_links).toEqual([
      "https://pinterest.com/pin/1",
      "https://x.com/post",
    ]);
  });

  // Stored links get rendered as hrefs by staff later. A javascript: link stored
  // now would run when the request is opened.
  test("rejects a link that is not http or https", async () => {
    const result = await submitRequest(
      noState,
      formData({ link: "javascript:alert(1)" }),
    );

    expect(result.message).toMatch(/http/i);
    expect(result.sent).toBe(false);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  test("rejects a blank brief before calling Supabase", async () => {
    const result = await submitRequest(noState, formData({ brief: "   " }));

    expect(result.sent).toBe(false);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  test("rejects a missing service before calling Supabase", async () => {
    const data = formData();
    data.delete("serviceId");

    const result = await submitRequest(noState, data);

    expect(result.sent).toBe(false);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  // Session can lapse between opening the form and pressing send.
  test("reports an expired session and writes nothing", async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "jwt expired" },
    } as never);

    const result = await submitRequest(noState, formData());

    expect(result.sent).toBe(false);
    expect(result.message).toMatch(/sesi/i);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  test("surfaces the insert error", async () => {
    mocks.insert.mockResolvedValueOnce({
      error: { message: "new row violates row-level security policy" },
    } as never);

    const result = await submitRequest(noState, formData());

    expect(result.message).toBe("new row violates row-level security policy");
    expect(result.sent).toBe(false);
  });
});