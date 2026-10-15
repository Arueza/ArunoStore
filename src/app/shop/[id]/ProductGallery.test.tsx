import { describe, expect, test } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import ProductGallery from "./ProductGallery";

const IMAGES = [
  { id: "img-1", image_url: "https://example.com/a.jpg" },
  { id: "img-2", image_url: "https://example.com/b.jpg" },
  { id: "img-3", image_url: "https://example.com/c.jpg" },
];

// next/image optimizes remote URLs into /_next/image srcsets on the client,
// so assert on the thumbnail buttons and counter instead of raw src strings.
const mainImage = () =>
  screen.getByRole("region", { name: /galeri/i }).querySelector("img")!;

describe("ProductGallery", () => {
  // The server shell must show the first photo with a position, never a blank
  // box — visitors without JavaScript still see the product.
  test("server shell shows the first image and its position", () => {
    const shell = renderToStaticMarkup(
      <ProductGallery images={IMAGES} name="Boneka" />,
    );

    expect(shell).toContain("1 / 3");
    expect(shell).toContain("Boneka");
  });

  test("thumbnail click swaps the main image and moves the counter", () => {
    render(<ProductGallery images={IMAGES} name="Boneka" />);

    expect(screen.getByText("1 / 3")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Lihat gambar 2" }));

    expect(screen.getByText("2 / 3")).toBeDefined();
    expect(mainImage().getAttribute("src")).toContain("b.jpg");
  });

  test("next from the last image wraps to the first", () => {
    render(<ProductGallery images={IMAGES} name="Boneka" />);

    fireEvent.click(screen.getByRole("button", { name: "Lihat gambar 3" }));
    expect(screen.getByText("3 / 3")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Gambar berikutnya" }));
    expect(screen.getByText("1 / 3")).toBeDefined();
  });

  test("previous from the first image wraps to the last", () => {
    render(<ProductGallery images={IMAGES} name="Boneka" />);

    fireEvent.click(screen.getByRole("button", { name: "Gambar sebelumnya" }));
    expect(screen.getByText("3 / 3")).toBeDefined();
  });

  // A single photo cannot go anywhere: controls that stay visible would lie.
  test("single image hides arrows, thumbnails and counter", () => {
    render(
      <ProductGallery images={[IMAGES[0]]} name="Boneka" />,
    );

    expect(
      screen.queryByRole("button", { name: "Gambar berikutnya" }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: /lihat gambar/i }),
    ).toBeNull();
    expect(screen.queryByText(/\/ 1/)).toBeNull();
  });

  test("no images shows the empty placeholder", () => {
    render(<ProductGallery images={[]} name="Boneka" />);

    expect(screen.getByText("Tanpa gambar")).toBeDefined();
  });

  // Commission goods are portrait artwork: no crop, and the stage links out
  // to the untouched original at full resolution.
  test("artwork variant renders uncropped with a full-resolution link", () => {
    render(<ProductGallery images={IMAGES} name="Print A4" artwork />);

    expect(mainImage().getAttribute("class")).toContain("object-contain");
    expect(
      screen
        .getByRole("region", { name: /galeri/i })
        .getAttribute("class"),
    ).toContain("aspect-[3/4]");

    const full = screen.getByRole("link", { name: "Lihat gambar penuh" });
    expect(full).toHaveAttribute("href", "https://example.com/a.jpg");
    expect(full).toHaveAttribute("target", "_blank");
    expect(mainImage().getAttribute("sizes")).toContain("55vw");
  });

  test("default variant keeps the square crop with no full-resolution link", () => {
    render(<ProductGallery images={IMAGES} name="Boneka" />);

    expect(mainImage().getAttribute("class")).toContain("object-cover");
    expect(mainImage().getAttribute("sizes")).toContain("50vw");
    expect(
      screen
        .getByRole("region", { name: /galeri/i })
        .getAttribute("class"),
    ).toContain("aspect-square");
    expect(
      screen.queryByRole("link", { name: "Lihat gambar penuh" }),
    ).toBeNull();
  });
});
