/**
 * Picks the image to show on a catalog card.
 *
 * An item can carry several images. The one flagged `is_thumbnail` wins; an item
 * whose rows are all unflagged falls back to the first, so a card is never blank
 * just because nobody ticked the box.
 *
 * ponytail: no gallery on the card. Add one when items start carrying more than
 * three images each.
 */
export function pickThumb(
  images: { image_url: string; is_thumbnail: boolean | null }[] | null,
): string | null {
  if (!images || images.length === 0) return null;

  return (images.find((img) => img.is_thumbnail) ?? images[0]).image_url;
}

// Where a catalogue item appears. `keduanya` lands in both catalogues and is
// the default, so existing rows need no backfill. /shop ignores it.
export type Showcase = "commission" | "titipan" | "keduanya";

export const SHOWCASE_LABEL: Record<Showcase, string> = {
  commission: "Commission",
  titipan: "Titipan",
  keduanya: "Keduanya",
};

export const FASHION_SIZES = ["S", "M", "L", "XL", "XXL"] as const;
export type FashionSize = (typeof FASHION_SIZES)[number];

// Catalogue sort keys for /shop?sort=. Anything else falls back to newest
// first, the same rule parseSide follows for forged sides — a bad value
// shows everything in default order rather than zero rows.
export const SORT_KEYS = ["terbaru", "termurah", "termahal", "nama"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABEL: Record<SortKey, string> = {
  terbaru: "Terbaru",
  termurah: "Termurah",
  termahal: "Termahal",
  nama: "Nama A–Z",
};

export function parseSort(value: string | undefined): SortKey {
  return (SORT_KEYS as readonly string[]).includes(value ?? "")
    ? (value as SortKey)
    : "terbaru";
}

export type StockedItem = {
  stock: number | null;
  product_sizes: { stock: number }[] | null;
};

/**
 * Units left for a catalogue card.
 *
 * Fashion items sell per size, so their remainder is the sum across sizes;
 * everything else sells from the item row itself. Null (a legacy row never
 * given stock) reads as unknown, not zero — the card hides the line instead
 * of claiming the item is gone.
 */
export function remainingStock(item: StockedItem): number | null {
  const sizes = item.product_sizes ?? [];
  if (sizes.length > 0) {
    return sizes.reduce((sum, s) => sum + s.stock, 0);
  }
  return item.stock;
}

/**
 * Wraps a search term as a PostgREST `ilike` pattern.
 *
 * `%` and `_` are wildcards in LIKE and `\` is the escape character, so a
 * buyer typing any of them would otherwise match rows they never asked for.
 * Escaping keeps the search literal: what they typed is what is matched.
 */
export function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}