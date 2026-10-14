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