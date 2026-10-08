import { describe, expect, test } from "vitest";
import { quoteTotal } from "@/lib/quote";

describe("quoteTotal", () => {
  test("adds the item price, the shipping and the service fee", () => {
    expect(
      quoteTotal({
        itemPrice: 500000,
        shipping: 180000,
        serviceFee: 25000,
      }),
    ).toBe(705000);
  });

  // A part staff have not filled in yet is nothing, not NaN. The quote box shows
  // empty fields until they do, and the total beside them still has to render.
  test("treats an unfilled part as nothing", () => {
    expect(quoteTotal({ itemPrice: 15000, shipping: 0, serviceFee: 0 })).toBe(
      15000,
    );
  });

  // Rounding happens per part, not on the sum: the two disagree once there are
  // two stray decimals, and the buyer is shown the rounded parts, so the total
  // has to be the sum of exactly those.
  test("rounds each part, so the total matches the parts on screen", () => {
    expect(quoteTotal({ itemPrice: 0.4, shipping: 0.4, serviceFee: 0 })).toBe(0);
    expect(
      quoteTotal({ itemPrice: 15000.5, shipping: 0, serviceFee: 0 }),
    ).toBe(15001);
  });
});