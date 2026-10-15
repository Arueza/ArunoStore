import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PENDING, pageExists } from "./pendingPages";

const mocks = vi.hoisted(() => ({
  items: [] as unknown[],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: () => {
      const chain = () => ({
        eq: () => chain(),
        gte: () => chain(),
        lte: () => chain(),
        in: () => chain(),
        order: () => Promise.resolve({ data: mocks.items }),
      });
      return { select: () => chain() };
    },
  })),
}));

import StaffShopList from "./StaffShopList";

const ITEM = {
  id: "i1",
  name: "Figma Jinx",
  price: 850000,
  condition: "baru",
  status: "tersedia",
  showcase: "commission",
  consignment_categories: [{ name: "Figure" }],
  consignment_images: [],
};

describe("StaffShopList", () => {
  test("lists rows into the tagged edit pages", async () => {
    mocks.items = [ITEM];

    render(await StaffShopList({ from: "commissions" }));

    expect(screen.getByRole("link", { name: "Figma Jinx" })).toHaveAttribute(
      "href",
      "/staff/shop/i1?from=commissions",
    );
  });

  test("every list link has a page or is declared pending", async () => {
    mocks.items = [ITEM];

    render(await StaffShopList({ from: "shop" }));

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
