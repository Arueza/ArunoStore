import { describe, expect, test } from "vitest";
import {
  paymentGroup,
  paymentStatusLabel,
  SHOP_ORDER_STATUSES,
  shopOrderStatusGroup,
  shopOrderStatusLabel,
} from "@/lib/paymentStatus";

describe("paymentStatusLabel", () => {
  // Nobody sees a database word. payments.status mirrors Midtrans
  // transaction_status, so this asserts the map covers every value the
  // webhook in api/midtrans/webhook can write.
  test("names every status the webhook writes", () => {
    expect(paymentStatusLabel("pending")).toBe("Menunggu pembayaran");
    expect(paymentStatusLabel("settlement")).toBe("Lunas");
    expect(paymentStatusLabel("capture")).toBe("Lunas");
    expect(paymentStatusLabel("deny")).toBe("Ditolak");
    expect(paymentStatusLabel("expire")).toBe("Kedaluwarsa");
    expect(paymentStatusLabel("cancel")).toBe("Dibatalkan");
    expect(paymentStatusLabel("failure")).toBe("Gagal");
  });

  // Visible but wrong, rather than blank. Midtrans can send a status this map
  // has never heard of, and an empty cell would read as a rendering bug.
  test("falls back to the raw value for a status it has no words for", () => {
    expect(paymentStatusLabel("authorize")).toBe("authorize");
  });
});

describe("paymentGroup", () => {
  // The history page shows one row per order — the newest Snap attempt — in
  // the pending section, the settled section, or the failed section.
  test("sorts every webhook status into a section", () => {
    expect(paymentGroup("pending")).toBe("pending");
    expect(paymentGroup("settlement")).toBe("settled");
    expect(paymentGroup("capture")).toBe("settled");
    expect(paymentGroup("deny")).toBe("failed");
    expect(paymentGroup("expire")).toBe("failed");
    expect(paymentGroup("cancel")).toBe("failed");
    expect(paymentGroup("failure")).toBe("failed");
  });
});

describe("shopOrderStatusLabel", () => {
  // shop_orders.status is the order's own column, written only by the webhook
  // and the buyer's pending checkout. settlement/capture are Midtrans words and
  // must not appear here: paymentStatusLabel would leave `settled` raw.
  test("names the four shop order statuses", () => {
    expect(shopOrderStatusLabel("pending")).toBe("Menunggu pembayaran");
    expect(shopOrderStatusLabel("settled")).toBe("Lunas");
    expect(shopOrderStatusLabel("deny")).toBe("Ditolak");
    expect(shopOrderStatusLabel("expire")).toBe("Kedaluwarsa");
  });

  test("covers exactly the statuses the column can hold", () => {
    expect(SHOP_ORDER_STATUSES).toEqual([
      "pending",
      "settled",
      "deny",
      "expire",
    ]);
  });

  test("falls back to the raw value for an unknown status", () => {
    expect(shopOrderStatusLabel("authorize")).toBe("authorize");
  });
});

describe("shopOrderStatusGroup", () => {
  // The summary line groups deny and expire together as failed, so a settled
  // order never lands there — which is exactly what reusing paymentGroup would
  // do wrong.
  test("groups the four shop order statuses", () => {
    expect(shopOrderStatusGroup("pending")).toBe("pending");
    expect(shopOrderStatusGroup("settled")).toBe("settled");
    expect(shopOrderStatusGroup("deny")).toBe("failed");
    expect(shopOrderStatusGroup("expire")).toBe("failed");
  });
});
