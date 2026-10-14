import { createPublicClient } from "@/lib/supabase/public";
import { formatRupiah } from "@/lib/format";
import { getCartItems } from "@/lib/cart";
import { pickThumb } from "@/lib/shop";
import {
  createShopOrder,
  removeFromCart,
  updateCartQty,
} from "@/app/shop/actions";

type CartLine = {
  itemId: string;
  size: string | null;
  qty: number;
  name: string;
  price: number;
  thumb: string | null;
};

/**
 * The cart panel body: reads the cookie, joins item details from the public
 * client, renders lines with qty + remove forms, subtotal, and the Bayar
 * button that turns the cart into a shop_order.
 *
 * Server component so the cookie is read at request time — revalidatePath in
 * the cart actions is what keeps this fresh after every mutation.
 *
 * ponytail: no checkout here. Bayar calls createShopOrder, which redirects to
 * /checkout?type=shop — the Phase 4 Snap flow extended for shop orders.
 */
export default async function CartItems() {
  const items = await getCartItems();

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-[#6c6870]">Keranjang kamu masih kosong.</p>
      </div>
    );
  }

  const ids = items.map((i) => i.itemId);
  const supabase = createPublicClient();
  const { data: dbItems } = await supabase
    .from("consignment_items")
    .select(
      "id, name, price, consignment_images(image_url, is_thumbnail)",
    )
    .in("id", ids);

  const lines: CartLine[] = items
    .map((line) => {
      const db = dbItems?.find((d) => d.id === line.itemId);
      if (!db) return null;
      return {
        ...line,
        name: db.name,
        price: db.price,
        thumb: pickThumb(db.consignment_images),
      };
    })
    .filter((l): l is CartLine => l !== null);

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ul className="flex-1 divide-y divide-[#eeeae5] overflow-y-auto px-6">
        {lines.map((line) => (
          <li key={`${line.itemId}-${line.size ?? "nosize"}`} className="flex gap-4 py-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden border border-[#eeeae5] bg-cream">
              {line.thumb && (
                // eslint-disable-next-line @next/next/no-img-element -- public bucket URL
                <img
                  src={line.thumb}
                  alt={line.name}
                  className="h-full w-full object-cover"
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">
                {line.name}
              </p>
              {line.size && (
                <p className="mt-0.5 text-xs text-[#6c6870]">
                  Ukuran {line.size}
                </p>
              )}
              <p className="mt-0.5 text-sm text-plum">
                {formatRupiah(line.price)}
              </p>

              <div className="mt-2 flex items-center gap-3">
                <form action={updateCartQty} className="flex items-center gap-1">
                  <input type="hidden" name="itemId" value={line.itemId} />
                  <input
                    type="hidden"
                    name="size"
                    value={line.size ?? ""}
                  />
                  <input
                    type="number"
                    name="qty"
                    min={1}
                    max={99}
                    defaultValue={line.qty}
                    aria-label="Jumlah"
                    className="w-12 border border-[#e2ddd7] px-1.5 py-1 text-center text-xs text-ink focus:border-plum focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="text-xs text-[#6c6870] hover:text-plum"
                    title="Simpan jumlah"
                  >
                    ✓
                  </button>
                </form>

                <form action={removeFromCart}>
                  <input type="hidden" name="itemId" value={line.itemId} />
                  <input
                    type="hidden"
                    name="size"
                    value={line.size ?? ""}
                  />
                  <button
                    type="submit"
                    className="text-xs text-[#6c6870] hover:text-plum hover:underline"
                  >
                    Hapus
                  </button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="border-t border-[#eeeae5] px-6 py-5">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-[#6c6870]">Subtotal</p>
          <p className="text-lg font-semibold text-ink">
            {formatRupiah(subtotal)}
          </p>
        </div>

        <form action={createShopOrder} className="mt-4">
          <button
            type="submit"
            className="w-full bg-plum px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Bayar
          </button>
        </form>
      </div>
    </div>
  );
}
