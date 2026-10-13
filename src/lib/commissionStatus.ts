/**
 * The commission status in the words a buyer reads it in.
 *
 * `request_status` holds database words — requested, quoted, accepted, declined
 * — and the roadmap rule is that nobody sees them. The staff queue, the buyer's
 * list, and the staff detail page all call this, so the three cannot drift into
 * calling the same state two different things.
 *
 * An unknown value falls through to itself rather than to a blank or a "?":
 * showing the raw word is wrong but visible; showing nothing looks like the
 * bug it actually is.
 */
const LABELS: Record<string, string> = {
  requested: "Menunggu kutipan",
  quoted: "Sudah dikutip",
  accepted: "Diterima",
  declined: "Ditolak",
  paid: "Sudah dibayar",
  purchased: "Sudah dibeli",
  shipped: "Dikirim",
  arrived: "Sampai",
};

export function statusLabel(status: string): string {
  return LABELS[status] ?? status;
}