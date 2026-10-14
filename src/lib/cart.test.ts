import { beforeEach, describe, expect, test, vi } from "vitest";

const cookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

import { clearCart, getCartItems, setCartItems } from "./cart";

describe("cart cookie storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns empty array when cookie is absent", async () => {
    cookieStore.get.mockReturnValue(undefined);
    const items = await getCartItems();
    expect(items).toEqual([]);
  });

  test("returns empty array when cookie has invalid JSON", async () => {
    cookieStore.get.mockReturnValue({ value: "not-json" });
    const items = await getCartItems();
    expect(items).toEqual([]);
  });

  test("filters out invalid items", async () => {
    cookieStore.get.mockReturnValue({
      value: JSON.stringify([
        { itemId: "item-1", size: "M", qty: 2 },
        { itemId: "item-2", size: null, qty: 0 }, // invalid qty <= 0
        { notAnItem: true },
        "string",
      ]),
    });
    const items = await getCartItems();
    expect(items).toEqual([{ itemId: "item-1", size: "M", qty: 2 }]);
  });

  test("sets cart items in cookie", async () => {
    const items = [{ itemId: "item-1", size: "L", qty: 3 }];
    await setCartItems(items);

    expect(cookieStore.set).toHaveBeenCalledWith(
      "aruno_cart",
      JSON.stringify(items),
      expect.objectContaining({ path: "/", sameSite: "lax" }),
    );
  });

  test("clears the cart cookie", async () => {
    await clearCart();
    expect(cookieStore.delete).toHaveBeenCalledWith("aruno_cart");
  });
});
