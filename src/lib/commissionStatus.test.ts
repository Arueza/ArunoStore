import { describe, expect, test } from "vitest";
import { statusLabel } from "@/lib/commissionStatus";

describe("statusLabel", () => {
  // Nobody sees a database word. request_status holds requested and quoted
  // today, and the enum grows at 2.12, so this asserts the map covers the
  // values that actually exist rather than pinning a fixed count.
  test("names both statuses the enum holds today", () => {
    expect(statusLabel("requested")).toBe("Menunggu kutipan");
    expect(statusLabel("quoted")).toBe("Sudah dikutip");
  });

  // Visible but wrong, rather than blank. After 2.12 widens the enum, a row can
  // hold a value this map has never heard of, and an empty cell would read as a
  // rendering bug instead of as a word nobody has written Indonesian for yet.
  test("falls back to the raw value for a status it has no words for", () => {
    expect(statusLabel("in_progress")).toBe("in_progress");
  });

  // Every value the column can hold reaches here as something. An empty string is
  // not in this list because the column is not null and is an enum, so "" is not
  // a value any row can carry.
  test("never returns an empty string for any reachable status", () => {
    for (const status of ["requested", "quoted", "in_progress", "declined"]) {
      expect(statusLabel(status).length).toBeGreaterThan(0);
    }
  });
});