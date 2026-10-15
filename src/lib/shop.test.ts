import { describe, expect, test } from "vitest";
import { likePattern, parseSort, pickThumb, remainingStock } from "./shop";

describe("pickThumb", () => {
  test("takes the flagged thumbnail", () => {
    expect(
      pickThumb([
        { image_url: "a.jpg", is_thumbnail: false },
        { image_url: "b.jpg", is_thumbnail: true },
      ]),
    ).toBe("b.jpg");
  });

  // A row inserted by hand rarely has the flag set. Falling back beats a card
  // with a hole in it.
  test("falls back to the first image when none is flagged", () => {
    expect(
      pickThumb([
        { image_url: "a.jpg", is_thumbnail: false },
        { image_url: "b.jpg", is_thumbnail: false },
      ]),
    ).toBe("a.jpg");
  });

  test("has no image to offer", () => {
    expect(pickThumb([])).toBeNull();
    expect(pickThumb(null)).toBeNull();
  });
});

describe("likePattern", () => {
  test("wraps the term for a contains match", () => {
    expect(likePattern("kimono")).toBe("%kimono%");
  });

  // Without escaping, a buyer typing % or _ would match rows they never
  // asked for — LIKE reads them as wildcards, not letters.
  test("escapes LIKE wildcards and the escape character", () => {
    expect(likePattern("100%_\\")).toBe("%100\\%\\_\\\\%");
  });
});

describe("parseSort", () => {
  test("accepts the four keys, defaults everything else to terbaru", () => {
    expect(parseSort("terbaru")).toBe("terbaru");
    expect(parseSort("termurah")).toBe("termurah");
    expect(parseSort("termahal")).toBe("termahal");
    expect(parseSort("nama")).toBe("nama");
    expect(parseSort(undefined)).toBe("terbaru");
    expect(parseSort("")).toBe("terbaru");
    expect(parseSort("murah")).toBe("terbaru");
  });
});

describe("remainingStock", () => {
  test("sums size rows when the item has sizes", () => {
    expect(
      remainingStock({ stock: 99, product_sizes: [{ stock: 2 }, { stock: 0 }] }),
    ).toBe(2);
  });

  test("reads the item row when there are no sizes", () => {
    expect(remainingStock({ stock: 3, product_sizes: [] })).toBe(3);
    expect(remainingStock({ stock: 3, product_sizes: null })).toBe(3);
  });

  test("null stock without sizes reads as unknown, not zero", () => {
    expect(remainingStock({ stock: null, product_sizes: [] })).toBeNull();
  });
});
