import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import ShopRestore, { isBackForward, parseEntry } from "./ShopRestore";

describe("parseEntry", () => {
  test("accepts a well-formed stash", () => {
    expect(
      parseEntry(JSON.stringify({ url: "http://x/shop?a=1", y: 12627 })),
    ).toEqual({ url: "http://x/shop?a=1", y: 12627 });
  });

  test("rejects null, garbage and wrong shapes", () => {
    expect(parseEntry(null)).toBeNull();
    expect(parseEntry("not json")).toBeNull();
    expect(parseEntry(JSON.stringify({ url: 5, y: 1 }))).toBeNull();
    expect(parseEntry(JSON.stringify({ url: "u", y: -3 }))).toBeNull();
    expect(parseEntry(JSON.stringify({ url: "u", y: "12" }))).toBeNull();
    expect(parseEntry(JSON.stringify(["u", 12]))).toBeNull();
  });
});

describe("isBackForward", () => {
  // jsdom performs a fresh navigation, never back/forward.
  test("is false on a fresh load", () => {
    expect(isBackForward()).toBe(false);
  });
});

describe("ShopRestore", () => {
  test("renders nothing either way", () => {
    const { container } = render(<ShopRestore />);

    expect(container).toBeEmptyDOMElement();
  });
});
