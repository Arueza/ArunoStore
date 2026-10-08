export type Quote = {
  itemPrice: number;
  shipping: number;
  serviceFee: number;
};

/**
 * The three numbers a titipan quote is made of, and the sum the buyer is asked to
 * pay.
 *
 * Lives here rather than inside the quote box because two callers need the same
 * sum: the /titipan page for its worked example (task 3.2), and the staff quote
 * box for the live figure (task 3.6). One sum, one place — the titipan table
 * stores the three parts and never a total, precisely so this stays the only
 * place a total comes from.
 *
 * Whole rupiah only. Money is stored as `15000` and never `15000.50`
 * (AGENTS.md), so a decimal arriving here is a bug upstream rather than a value
 * to respect.
 */
export function quoteTotal({ itemPrice, shipping, serviceFee }: Quote): number {
  // Each part is rounded before it is added, so the total always equals the sum of
  // the three figures the buyer is shown. Rounding only the sum could leave it a
  // rupiah away from those figures.
  return [itemPrice, shipping, serviceFee].reduce(
    (total, part) => total + Math.round(part),
    0,
  );
}