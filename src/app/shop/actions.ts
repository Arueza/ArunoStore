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
 * Adds an item to the cookie cart. Returns a result instead of redirecting —
 * the caller (a client component) decides what to do next, because a
 * `redirect()` throw inside a `try/catch` on the client reads as a failure
 * even though the cookie was already written.
 *
 * Signed-out buyers get `{ reason: "login" }` with the login URL to visit;
 * checkout needs an account, so there is no point holding a cart anonymously.
 * The buyer returns to the product page they were on after signing in.
 *
 * qty is a whole number 1–99. size is validated against the item's
 * product_sizes rows by the caller; here it is only type-checked.
 */
export type AddToCartResult =
  | { ok: true }
  | { ok: false; reason: "login" | "invalid" | "unavailable" | "invalid-size"; next?: string };

export async function addToCart(
  itemId: string,
  size: string | null,
  qty: number,
): Promise<AddToCartResult> {
  if (!UUID.test(itemId)) {
    return { ok: false, reason: "invalid", next: "/shop" };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: "login", next: `/login?next=/shop/${itemId}` };
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
    return { ok: false, reason: "unavailable", next: "/shop" };
  }

  if (safeSize) {
    const { data: sizeRow } = await supabase
      .from("product_sizes")
      .select("id")
      .eq("item_id", itemId)
      .eq("size", safeSize)
      .maybeSingle();

    if (!sizeRow) {
      return { ok: false, reason: "invalid-size", next: `/shop/${itemId}` };
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
  return { ok: true };
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

/**
 * Saves the shipping address on a pending shop order.
 *
 * The order is created address-less by createShopOrder; the buyer fills this
 * form on /checkout?type=shop before the Snap button appears, so no settled
 * order can exist without somewhere to send the parcel. Staff reads the same
 * row when packing.
 *
 * Returns a result instead of redirecting — the caller is a client component
 * that resets nothing on failure and must keep the typed address. Ownership
 * and pending status are checked here for a friendly message, and enforced
 * again by 0041's policy plus its seven-column grant: the update cannot touch
 * total_price or status, so a buyer cannot reprice their own order.
 */
export type SaveAddressResult =
  | { ok: true }
  | { ok: false; message: string };

const MAX_NAME = 100;
const MAX_ADDRESS = 500;
const MAX_NOTE = 500;

export async function saveShopOrderAddress(
  orderId: string,
  formData: FormData,
): Promise<SaveAddressResult> {
  if (!UUID.test(orderId)) {
    return { ok: false, message: "Pesanan tidak valid." };
  }

  const field = (key: string) => {
    const raw = formData.get(key);
    return typeof raw === "string" ? raw.trim() : "";
  };

  const recipientName = field("recipient_name");
  const phone = field("phone");
  const address = field("address");
  const city = field("city");
  const province = field("province");
  const postalCode = field("postal_code");
  const note = field("note");

  if (!recipientName) {
    return { ok: false, message: "Nama penerima wajib diisi." };
  }

  if (recipientName.length > MAX_NAME) {
    return { ok: false, message: "Nama penerima maksimal 100 karakter." };
  }

  const phoneDigits = phone.replace(/\D/g, "");

  if (phoneDigits.length < 9 || phoneDigits.length > 15) {
    return { ok: false, message: "Nomor HP tidak valid (9–15 digit)." };
  }

  if (!address) {
    return { ok: false, message: "Alamat lengkap wajib diisi." };
  }

  if (address.length > MAX_ADDRESS) {
    return { ok: false, message: "Alamat maksimal 500 karakter." };
  }

  if (!city) {
    return { ok: false, message: "Kota/kabupaten wajib diisi." };
  }

  if (city.length > MAX_NAME) {
    return { ok: false, message: "Kota/kabupaten maksimal 100 karakter." };
  }

  if (!province) {
    return { ok: false, message: "Provinsi wajib diisi." };
  }

  if (province.length > MAX_NAME) {
    return { ok: false, message: "Provinsi maksimal 100 karakter." };
  }

  if (!/^\d{5}$/.test(postalCode)) {
    return { ok: false, message: "Kode pos harus 5 digit angka." };
  }

  if (note.length > MAX_NOTE) {
    return { ok: false, message: "Catatan maksimal 500 karakter." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sesi berakhir, silakan masuk lagi." };
  }

  const { data: order } = await supabase
    .from("shop_orders")
    .select("id, buyer_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order || order.buyer_id !== user.id) {
    return { ok: false, message: "Pesanan tidak ditemukan." };
  }

  if (order.status !== "pending") {
    return { ok: false, message: "Pesanan ini sudah tidak bisa diubah." };
  }

  // No updated_at: 0041 grants buyers UPDATE on the seven address columns
  // only, and touching an ungranted column fails the whole update with
  // "permission denied". Nothing reads shop_orders.updated_at anyway.
  const { error } = await supabase
    .from("shop_orders")
    .update({
      recipient_name: recipientName,
      phone,
      address,
      city,
      province,
      postal_code: postalCode,
      note: note || null,
    })
    .eq("id", orderId);

  if (error) {
    return { ok: false, message: `Gagal menyimpan alamat: ${error.message}` };
  }

  revalidatePath("/checkout");
  return { ok: true };
}
