import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";

/** redirect() throws. A sentinel keeps the mock from changing the flow. */
class Redirect extends Error {
  constructor(readonly to: string) {
    super(`redirect:${to}`);
  }
}

const mocks = vi.hoisted(() => ({
  claims: { sub: "buyer-1" } as { sub: string } | null,
  commissions: [] as unknown[],
  eq: vi.fn(),
  ilike: vi.fn(),
  order: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getClaims: vi.fn(async () => mocks.claims),
}));

vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Redirect(to);
  },
}));

// The list is the only thing here that talks to Supabase. Same chain shape as
// the titipan list: eq() records the buyer, ilike() the search, order() the sort.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: () => ({
      select: () => {
        const buildChain = () => ({
          eq: (column: string, value: string) => {
            mocks.eq(column, value);
            return buildChain();
          },
          ilike: (column: string, pattern: string) => {
            mocks.ilike(column, pattern);
            return buildChain();
          },
          in: () => Promise.resolve({ data: [] }),
          order: (...args: unknown[]) => {
            mocks.order(...args);
            return Promise.resolve({ data: mocks.commissions });
          },
        });
        return buildChain();
      },
    }),
  })),
}));

import MyCommissionsPage, { MyCommissions } from "./page";

const COMMISSION = {
  id: "c1",
  service_id: "s1",
  brief: "Custom portrait, anime style.",
  status: "requested",
  quote_price: null,
  quote_note: null,
  delivery_image: null,
  created_at: "2026-10-09T23:30:00Z",
};

const renderList = async (rows: unknown[]) => {
  mocks.commissions = rows;
  render(await MyCommissions());
};

describe("MyCommissionsPage", () => {
  test("the heading is in the static shell", () => {
    expect(
      renderToStaticMarkup(
        <MyCommissionsPage searchParams={Promise.resolve({})} />,
      ),
    ).toContain("Commissions Saya");
  });

  // If the session read moves back up into the page, the route stops prerendering.
  test("the list is not in the static shell", () => {
    mocks.commissions = [COMMISSION];

    expect(
      renderToStaticMarkup(
        <MyCommissionsPage searchParams={Promise.resolve({})} />,
      ),
    ).not.toContain("anime style");
  });
});

describe("MyCommissions", () => {
  beforeEach(() => {
    mocks.claims = { sub: "buyer-1" };
    mocks.commissions = [];
    mocks.eq.mockReset();
    mocks.ilike.mockReset();
    mocks.order.mockReset();
  });

  test("sends a signed-out visitor to the login page", async () => {
    mocks.claims = null;

    await expect(MyCommissions()).rejects.toThrow("redirect:/login");
    expect(mocks.eq).not.toHaveBeenCalled();
  });

  test("reads only this buyer's rows", async () => {
    await renderList([COMMISSION]);

    expect(mocks.eq).toHaveBeenCalledWith("buyer_id", "buyer-1");
  });

  test("reads the rows newest first", async () => {
    await renderList([COMMISSION]);

    expect(mocks.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  test("searches the brief only when given a term", async () => {
    await renderList([COMMISSION]);

    expect(mocks.ilike).not.toHaveBeenCalled();

    await render(
      await MyCommissions({ search: "portrait", statusFilter: undefined }),
    );

    expect(mocks.ilike).toHaveBeenCalledWith(
      "brief",
      expect.stringContaining("portrait"),
    );
  });

  test("filters by status only when given one", async () => {
    await renderList([COMMISSION]);

    expect(mocks.eq).not.toHaveBeenCalledWith("status", expect.anything());

    await render(
      await MyCommissions({ search: undefined, statusFilter: "requested" }),
    );

    expect(mocks.eq).toHaveBeenCalledWith("status", "requested");
  });

  test("shows a different empty message when filtered", async () => {
    await render(
      await MyCommissions({ search: "nothing-matches", statusFilter: undefined }),
    );

    expect(screen.getByText(/Tidak ada yang cocok/i)).toBeInTheDocument();
  });
});
