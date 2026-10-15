import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import ShopSideToggle, { parseSide } from "./ShopSideToggle";

describe("parseSide", () => {
  test("accepts the two sides, rejects everything else", () => {
    expect(parseSide("commission")).toBe("commission");
    expect(parseSide("titipan")).toBe("titipan");
    expect(parseSide(undefined)).toBe(undefined);
    expect(parseSide("")).toBe(undefined);
    expect(parseSide("keduanya")).toBe(undefined);
    expect(parseSide("commission ")).toBe(undefined);
  });
});

describe("ShopSideToggle", () => {
  // Three ways in: all, commission, titipan — and the toggle must never
  // clear what the visitor already filtered by.
  test("renders all three options with the current filters preserved", () => {
    const shell = renderToStaticMarkup(
      <ShopSideToggle
        params={{ q: "ghibli", cat: "cat-1", min: "10000", side: "commission" }}
      />,
    );

    expect(shell).toContain("Semua");
    expect(shell).toContain("Commission");
    expect(shell).toContain("Titipan");
    expect(shell).toContain(
      'href="/shop?q=ghibli&amp;cat=cat-1&amp;min=10000&amp;side=titipan"',
    );
    expect(shell).toContain(
      'href="/shop?q=ghibli&amp;cat=cat-1&amp;min=10000"',
    );
  });

  test("marks only the active side as current", () => {
    const shell = renderToStaticMarkup(
      <ShopSideToggle params={{ side: "titipan" }} />,
    );
    const current = shell.match(/aria-current="true"/g) ?? [];

    expect(current.length).toBe(1);
    expect(shell).toContain('href="/shop?side=titipan"');
  });

  test("bare /shop link when nothing is filtered", () => {
    const shell = renderToStaticMarkup(<ShopSideToggle params={{}} />);

    expect(shell).toContain('href="/shop"');
  });
});
