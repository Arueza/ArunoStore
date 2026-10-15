import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PanelProvider } from "./Panels";

// The panel routes client-side on submit; stubbed here so this file tests the
// panel's own behaviour: what URL a search builds, and what an empty one does.
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import SearchPanel from "./SearchPanel";

const renderOpenPanel = () => {
  render(
    <PanelProvider>
      <SearchPanel />
    </PanelProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Cari" }));
};

describe("SearchPanel", () => {
  test("submitting a term routes to the shop results page", () => {
    push.mockClear();
    renderOpenPanel();

    fireEvent.change(screen.getByRole("searchbox", { name: "Cari produk" }), {
      target: { value: "kimono" },
    });
    const form = screen
      .getByRole("searchbox", { name: "Cari produk" })
      .closest("form")!;
    fireEvent.submit(form);

    expect(push).toHaveBeenCalledWith("/shop?q=kimono");
  });

  test("a term with spaces is encoded, not split", () => {
    push.mockClear();
    renderOpenPanel();

    fireEvent.change(screen.getByRole("searchbox", { name: "Cari produk" }), {
      target: { value: "kimono 1" },
    });
    const form = screen
      .getByRole("searchbox", { name: "Cari produk" })
      .closest("form")!;
    fireEvent.submit(form);

    expect(push).toHaveBeenCalledWith("/shop?q=kimono%201");
  });

  // An empty submit stays where the buyer is: the results page already
  // carries its own "Lihat semua" link for clearing a filter.
  test("submitting empty navigates nowhere", () => {
    push.mockClear();
    renderOpenPanel();

    const form = screen
      .getByRole("searchbox", { name: "Cari produk" })
      .closest("form")!;
    fireEvent.submit(form);

    expect(push).not.toHaveBeenCalled();
  });

  // No JavaScript means no submit handler, so the native form action is the
  // whole fallback: it must still land on /shop with the term as q.
  test("the native form posts to /shop with the term as q", () => {
    renderOpenPanel();

    const form = screen
      .getByRole("searchbox", { name: "Cari produk" })
      .closest("form")!;

    expect(form).toHaveAttribute("action", "/shop");
    expect(form).toHaveAttribute("method", "get");
    expect(
      screen.getByRole("searchbox", { name: "Cari produk" }),
    ).toHaveAttribute("name", "q");
  });
});
