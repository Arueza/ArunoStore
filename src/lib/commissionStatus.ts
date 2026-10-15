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

/**
 * Every status in the order a queue summary reads in.
 *
 * Both staff queues count rows per status (roadmap 5.1). One order here so
 * the two summaries cannot list the same states in different orders.
 */
export const STATUS_ORDER = [
  "requested",
  "quoted",
  "accepted",
  "declined",
  "paid",
  "purchased",
  "shipped",
  "arrived",
];

/**
 * Rows grouped per status, nonzero only, in STATUS_ORDER.
 *
 * Unknown values append alphabetically after the known ones — same rule as
 * statusLabel(): visible but wrong beats a missing count that reads as zero.
 */
export function countByStatus(
  rows: Array<{ status: string }>,
): Array<{ status: string; count: number }> {
  const counts = new Map<string, number>();

  for (const row of rows) {
    counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  }

  const known = STATUS_ORDER.flatMap((status) => {
    const count = counts.get(status);
    return count === undefined ? [] : [{ status, count }];
  });

  const extra = [...counts.keys()]
    .filter((status) => !STATUS_ORDER.includes(status))
    .sort()
    .map((status) => ({ status, count: counts.get(status) ?? 0 }));

  return [...known, ...extra];
}