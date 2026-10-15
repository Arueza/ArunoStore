/**
 * The payment status in the words a buyer reads it in, plus the grouping the
 * history page sections by.
 *
 * `payments.status` mirrors Midtrans `transaction_status` — text+check, not an
 * enum, because enum values cannot be added inside a transaction block. One
 * order can hold several payment rows (every Snap attempt inserts one), so the
 * history page groups by order and shows the newest attempt.
 *
 * An unknown value falls through to itself rather than to a blank: showing the
 * raw word is wrong but visible, same rule as `statusLabel()`.
 */
const LABELS: Record<string, string> = {
  pending: "Menunggu pembayaran",
  settlement: "Lunas",
  capture: "Lunas",
  deny: "Ditolak",
  expire: "Kedaluwarsa",
  cancel: "Dibatalkan",
  failure: "Gagal",
};

export function paymentStatusLabel(status: string): string {
  return LABELS[status] ?? status;
}

export function paymentGroup(status: string): "pending" | "settled" | "failed" {
  if (status === "pending") return "pending";
  if (status === "settlement" || status === "capture") return "settled";
  return "failed";
}
