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

/**
 * shop_orders.status uses its own four values, not Midtrans
 * transaction_status: `settled` (not `settlement`), `deny` and `expire`.
 * Do not reuse paymentStatusLabel/group for these — `settled` would render as
 * the raw word and group as failed. Only the webhook moves a row out of
 * pending, so this list is the complete set the app can show.
 */
export const SHOP_ORDER_STATUSES: string[] = [
  "pending",
  "settled",
  "deny",
  "expire",
];

const SHOP_ORDER_LABELS: Record<string, string> = {
  pending: "Menunggu pembayaran",
  settled: "Lunas",
  deny: "Ditolak",
  expire: "Kedaluwarsa",
};

export function shopOrderStatusLabel(status: string): string {
  return SHOP_ORDER_LABELS[status] ?? status;
}

export function shopOrderStatusGroup(
  status: string,
): "pending" | "settled" | "failed" {
  if (status === "pending") return "pending";
  if (status === "settled") return "settled";
  return "failed";
}
