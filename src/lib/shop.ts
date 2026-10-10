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