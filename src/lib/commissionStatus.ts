/**
 * The commission status in the words a buyer reads it in.
 *
 * `request_status` holds database words — requested, quoted — and the roadmap
 * rule is that nobody sees them. Both the staff queue at 2.8 and the buyer's list
 * at 2.11 call this, so the two halves cannot drift into calling the same state
 * two different things.
 *
 * An unknown value falls through to itself rather than to a blank or a "?". When
 * task 2.12 widens the enum, a row can hold a value this map has never heard of,
 * and showing the raw word is wrong but visible; showing nothing looks like the
 * bug it actually is.
 */
const LABELS: Record<string, string> = {
  requested: "Menunggu kutipan",
  quoted: "Sudah dikutip",
};

export function statusLabel(status: string): string {
  return LABELS[status] ?? status;
}