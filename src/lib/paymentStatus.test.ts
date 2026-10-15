import { describe, expect, test } from "vitest";
import { paymentGroup, paymentStatusLabel } from "@/lib/paymentStatus";

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
