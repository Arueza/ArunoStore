"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  clearCart,
  getCartItems,
  setCartItems,
  type CartItem,
} from "@/lib/cart";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Adds an item to the cookie cart. Redirects to login if signed out —
 * checkout needs an account, so there is no point holding a cart anonymously.
 * The buyer returns to the product page they were on after signing in.
 *
 * qty is a whole number 1–99. size is validated against the item's
 * product_sizes rows by the caller; here it is only type-checked.
 */
export async function addToCart(
  itemId: string,
  size: string | null,
  qty: number,
): Promise<void> {
  if (!UUID.test(itemId)) {
    redirect("/shop");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/shop/${itemId}`);
  }

  const safeQty = Number.isInteger(qty) && qty > 0 && qty <= 99 ? qty : 1;
  const safeSize = size && /^(S|M|L|XL|XXL)$/.test(size) ? size : null;

  // Verify the item exists and, if sized, that the size is offered.
  const { data: item } = await supabase
    .from("consignment_items")
    .select("id, showcase")
    .eq("id", itemId)
    .maybeSingle();

  if (!item) {
    redirect("/shop");
  }

  if (safeSize) {
    const { data: sizeRow } = await supabase
      .from("product_sizes")
      .select("id")
      .eq("item_id", itemId)
      .eq("size", safeSize)
      .maybeSingle();

    if (!sizeRow) {
      redirect(`/shop/${itemId}`);
    }
  }

  const items = await getCartItems();
  const existing = items.find(
    (i) => i.itemId === itemId && i.size === safeSize,
  );

  if (existing) {
    existing.qty = Math.min(existing.qty + safeQty, 99);
  } else {
    items.push({ itemId, size: safeSize, qty: safeQty });
  }

  await setCartItems(items);

  revalidatePath("/");
  revalidatePath(`/shop/${itemId}`);
  revalidatePath("/shop/commission");
  revalidatePath("/shop/titipan");
  revalidatePath(`/shop/${itemId}`);
  redirect(`/shop/${itemId}?added=1`);
}

/**
 * Removes one line from the cookie cart. No account needed — the cart is
 * device-local. Unknown keys are a no-op, so a stale link cannot error.
 * Accepts FormData when invoked from a form action, or positional args.
 */
export async function removeFromCart(
  input: FormData | string,
  sizeArg?: string | null,
): Promise<void> {
  let itemId: string;
  let size: string | null;

  if (input instanceof FormData) {
    itemId = String(input.get("itemId") ?? "");
    const rawSize = input.get("size");
    size = typeof rawSize === "string" && rawSize ? rawSize : null;
  } else {
    itemId = input;
    size = sizeArg ?? null;
  }

  const items = await getCartItems();
  const next = items.filter(
    (i) => !(i.itemId === itemId && i.size === size),
  );

  await setCartItems(next);

  revalidatePath("/");
  revalidatePath(`/shop/${itemId}`);
}

/**
 * Sets a line's quantity. qty <= 0 removes the line, so one form can both
 * empty the cart and top it up.
 * Accepts FormData when invoked from a form action, or positional args.
 */
export async function updateCartQty(
  input: FormData | string,
  sizeArg?: string | null,
  qtyArg?: number,
): Promise<void> {
  let itemId: string;
  let size: string | null;
  let qty: number;

  if (input instanceof FormData) {
    itemId = String(input.get("itemId") ?? "");
    const rawSize = input.get("size");
    size = typeof rawSize === "string" && rawSize ? rawSize : null;
    qty = Number(input.get("qty") ?? 1);
  } else {
    itemId = input;
    size = sizeArg ?? null;
    qty = qtyArg ?? 1;
  }

  const items = await getCartItems();

  if (qty <= 0) {
    await removeFromCart(itemId, size);
    return;
  }

  const safeQty = Number.isInteger(qty) && qty <= 99 ? qty : 1;
  const next = items.map((i) =>
    i.itemId === itemId && i.size === size ? { ...i, qty: safeQty } : i,
  );

  await setCartItems(next);

  revalidatePath("/");
  revalidatePath(`/shop/${itemId}`);
}

/**
 * Turns the cookie cart into a shop_order and clears it.
 *
 * Every cart line is re-read from the database: price comes from
 * consignment_items, never from the cookie, so a stale cookie cannot set the
 * amount. Stock is decremented per line; a line whose item vanished is
 * skipped. Redirects to the Snap checkout for the new order.
 *
 * ponytail: no reservation window — stock decrements at order creation, so
 * two buyers can race the last unit and one order fails at Snap. Add a
 * holds table if overselling becomes real.
 */
export async function createShopOrder(): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const items = await getCartItems();

  if (items.length === 0) {
    redirect("/shop");
  }

  // Re-price every line from the database.
  const ids = items.map((i) => i.itemId);
  const { data: dbItems } = await supabase
    .from("consignment_items")
    .select("id, price, stock")
    .in("id", ids);

  const priced = items
    .map((line) => {
      const db = dbItems?.find((d) => d.id === line.itemId);
      return db ? { ...line, price: db.price } : null;
    })
    .filter((l): l is CartItem & { price: number } => l !== null);

  if (priced.length === 0) {
    await clearCart();
    redirect("/shop");
  }

  const total = priced.reduce((sum, l) => sum + l.price * l.qty, 0);

  const { data: order, error: orderError } = await supabase
    .from("shop_orders")
    .insert({ buyer_id: user.id, status: "pending", total_price: total })
    .select("id")
    .maybeSingle();

  if (orderError || !order) {
    redirect("/shop?error=Gagal membuat pesanan.");
  }

  const orderItems = priced.map((l) => ({
    order_id: order.id,
    item_id: l.itemId,
    size: l.size,
    quantity: l.qty,
    price: l.price,
  }));

  const { error: itemsError } = await supabase
    .from("shop_order_items")
    .insert(orderItems);

  if (itemsError) {
    await supabase.from("shop_orders").delete().eq("id", order.id);
    redirect("/shop?error=Gagal membuat pesanan.");
  }

  // Decrement stock using service client so buyers are not blocked by RLS.
  // Read-modify-write in JS: the race window is real but this is pre-launch
  // sandbox with a handful of items. ponytail: move to an atomic RPC or
  // SELECT ... FOR UPDATE when overselling becomes possible.
  const serviceClient = createServiceClient();
  for (const l of priced) {
    if (l.size) {
      const { data: sizeRow } = await serviceClient
        .from("product_sizes")
        .select("stock")
        .eq("item_id", l.itemId)
        .eq("size", l.size)
        .maybeSingle();

      if (sizeRow) {
        await serviceClient
          .from("product_sizes")
          .update({ stock: Math.max(sizeRow.stock - l.qty, 0) })
          .eq("item_id", l.itemId)
          .eq("size", l.size);
      }
    } else {
      const { data: dbItem } = await serviceClient
        .from("consignment_items")
        .select("stock")
        .eq("id", l.itemId)
        .maybeSingle();

      if (dbItem) {
        await serviceClient
          .from("consignment_items")
          .update({ stock: Math.max(dbItem.stock - l.qty, 0) })
          .eq("id", l.itemId);
      }
    }
  }

  await clearCart();

  revalidatePath("/");
  redirect(`/checkout?type=shop&id=${order.id}`);
}
