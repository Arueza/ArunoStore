import { cookies } from "next/headers";

/**
 * Cookie-based cart: works signed out, no login needed to browse and add.
 *
 * One cookie `aruno_cart`, JSON array of { itemId, size, qty }. Size is null
 * for non-Fashion items. The cart is a holding area — checkout (createShopOrder)
 * moves rows into shop_orders and clears the cookie.
 *
 * ponytail: cart is device-local, not account-bound. A buyer who signs in on
 * another device sees an empty cart. Sync to a table when checkout lands, or
 * when the cart outlives "holding an item for a few minutes".
 */

export type CartItem = {
  itemId: string;
  size: string | null;
  qty: number;
};

const CART_COOKIE = "aruno_cart";

export async function getCartItems(): Promise<CartItem[]> {
  const store = await cookies();
  const raw = store.get(CART_COOKIE)?.value;

  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is CartItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as CartItem).itemId === "string" &&
        typeof (item as CartItem).qty === "number" &&
        (item as CartItem).qty > 0,
    );
  } catch {
    return [];
  }
}

export async function setCartItems(items: CartItem[]): Promise<void> {
  const store = await cookies();
  store.set(CART_COOKIE, JSON.stringify(items), {
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });
}

export async function clearCart(): Promise<void> {
  const store = await cookies();
  store.delete(CART_COOKIE);
}
