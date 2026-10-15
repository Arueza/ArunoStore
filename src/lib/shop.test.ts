import { describe, expect, test } from "vitest";
import { likePattern, pickThumb } from "./shop";

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