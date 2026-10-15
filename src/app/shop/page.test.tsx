import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PENDING, pageExists } from "@/components/pendingPages";

const getProfile = vi.fn();

vi.mock("@/lib/auth", () => ({
  getProfile: () => getProfile(),
}));

// The grid carries "use cache" and the manager reads Supabase: neither can
// render in this renderer. Stubs keep the assertion on the role switch —
// which view renders, and where its toggle points — not on their content.
vi.mock("@/components/ShopGrid", () => ({
  default: () => <div data-testid="shop-grid" />,
}));

vi.mock("@/components/CatalogManager", () => ({
  default: () => <div data-testid="catalog-manager" />,
}));

import { ShopRoleView } from "./page";

const BASE = {
  query: undefined,
  categoryId: undefined,
  condition: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  showcase: undefined,
  sort: "terbaru",
  tab: "lihat",
  toggleParams: {},
  filterParams: Promise.resolve({}),
} as const;

describe("ShopRoleView", () => {
  test("buyers and visitors get the grid with no toggle", async () => {
    for (const profile of [null, { full_name: "Siti", role: "buyer" }]) {
      getProfile.mockResolvedValue(profile);

      const { unmount } = render(await ShopRoleView({ ...BASE }));

      expect(screen.getByTestId("shop-grid")).toBeInTheDocument();
      expect(screen.queryByTestId("catalog-manager")).toBeNull();
      expect(
        screen.queryByRole("group", { name: "Tampilan katalog" }),
      ).toBeNull();
      unmount();
    }
  });

  test("staff on Lihat get the grid plus a Kelola toggle that keeps filters", async () => {
    getProfile.mockResolvedValue({ full_name: "Verrel", role: "staff" });

    render(
      await ShopRoleView({
        ...BASE,
        toggleParams: { q: "ghibli", side: "commission", sort: "termurah" },
      }),
    );

    expect(screen.getByTestId("shop-grid")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Kelola" }),
    ).toHaveAttribute(
      "href",
      "/shop?q=ghibli&side=commission&sort=termurah&tab=kelola",
    );
  });

  test("staff on Kelola get the manager plus a way back", async () => {
    getProfile.mockResolvedValue({ full_name: "Verrel", role: "staff" });

    render(await ShopRoleView({ ...BASE, tab: "kelola" }));

    expect(screen.getByTestId("catalog-manager")).toBeInTheDocument();
    expect(screen.queryByTestId("shop-grid")).toBeNull();
    expect(screen.getByRole("link", { name: "Lihat" })).toHaveAttribute(
      "href",
      "/shop",
    );
  });

  test("every toggle link has a page or is declared pending", async () => {
    getProfile.mockResolvedValue({ full_name: "Verrel", role: "staff" });

    render(await ShopRoleView({ ...BASE, tab: "kelola" }));

    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href")!);

    expect(hrefs.length).toBeGreaterThan(0);

    for (const href of hrefs) {
      if (!href.startsWith("/")) continue;

      expect(
        PENDING.includes(href) || pageExists(href),
        `${href} has no page`,
      ).toBe(true);
    }
  });
});
