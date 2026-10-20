import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { PENDING, pageExists } from "@/components/pendingPages";

/** redirect() throws. A sentinel keeps the mock from changing the flow. */
class Redirect extends Error {
  constructor(readonly to: string) {
    super(`redirect:${to}`);
  }
}

const mocks = vi.hoisted(() => ({
  claims: { sub: "buyer-1" } as { sub: string } | null,
  requests: [] as unknown[],
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
  useRouter: () => ({ refresh: vi.fn() }),
}));

// The list is the only thing here that talks to Supabase. eq(), ilike() and
// order() are recorded as well as returned, because "only this buyer's rows,
// newest first" are the two claims 3.8 makes and neither is visible on
// screen — the rows would all be there either way. ilike records the search,
// which narrows rather than replaces the same chain.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: () => ({
      select: () => {
        const chain: {
          eq: (column: string, value: string) => typeof chain;
          ilike: (column: string, pattern: string) => typeof chain;
          order: (...args: unknown[]) => Promise<{ data: unknown[] }>;
        } = {
          eq: (column: string, value: string) => {
            mocks.eq(column, value);
            return chain;
          },
          ilike: (column: string, pattern: string) => {
            mocks.ilike(column, pattern);
            return chain;
          },
          order: (...args: unknown[]) => {
            mocks.order(...args);
            return Promise.resolve({ data: mocks.requests });
          },
        };
        return {
          eq: (column: string, value: string) => {
            mocks.eq(column, value);
            return {
              eq: chain.eq,
              ilike: chain.ilike,
              order: chain.order,
            };
          },
        };
      },
    }),
  })),
}));

import MyTitipanRequestsPage, { MyTitipanRequests } from "./page";

// ICU puts a non-breaking space after "Rp" in Indonesian, not a normal space.
const nbsp = "\u00a0";

const REQUEST = {
  id: "r1",
  product_link: "https://store.example/item/1234",
  size: "M",
  color: "Hitam",
  quantity: 2,
  status: "quoted",
  quote_item_price: 500000,
  quote_shipping: 180000,
  quote_service_fee: 25000,
  quote_note: "Sudah termasuk pajak.",
  created_at: "2026-10-09T23:30:00Z",
};

/** A request staff has not quoted yet, which is most of them. */
const UNQUOTED = {
  ...REQUEST,
  status: "requested",
  quote_item_price: null,
  quote_shipping: null,
  quote_service_fee: null,
  quote_note: null,
};

const renderList = async (rows: unknown[]) => {
  mocks.requests = rows;
  render(await MyTitipanRequests());
};

describe("MyTitipanRequestsPage", () => {
  const searchParams = Promise.resolve({});

  test("the heading is in the static shell", () => {
    expect(
      renderToStaticMarkup(
        <MyTitipanRequestsPage searchParams={searchParams} />,
      ),
    ).toContain("Titipan Saya");
  });

  // If the session read moves back up into the page, the route stops
  // prerendering and next build fails. Same regression 1.12 fixed in the
  // navbar, and the reason the list sits behind its own boundary.
  test("the list is not in the static shell", () => {
    mocks.requests = [REQUEST];

    expect(
      renderToStaticMarkup(
        <MyTitipanRequestsPage searchParams={searchParams} />,
      ),
    ).not.toContain("store.example");
  });
});

describe("MyTitipanRequests", () => {
  beforeEach(() => {
    mocks.claims = { sub: "buyer-1" };
    mocks.requests = [];
    mocks.eq.mockReset();
    mocks.ilike.mockReset();
    mocks.order.mockReset();
  });

  // The page trusts the proxy to keep signed-out visitors out; this is the
  // check that does not depend on that. A missing claims object means no buyer
  // and so no rows worth listing.
  test("sends a signed-out visitor to the login page", async () => {
    mocks.claims = null;

    await expect(MyTitipanRequests()).rejects.toThrow("redirect:/login");
    expect(mocks.eq).not.toHaveBeenCalled();
  });

  // 0006's select policy already limits this to one buyer. The .eq() repeats it
  // in the application, and it is the repeat that keeps a dropped policy from
  // showing one buyer everybody's parcels.
  test("reads only this buyer's rows", async () => {
    await renderList([REQUEST]);

    expect(mocks.eq).toHaveBeenCalledWith("buyer_id", "buyer-1");
  });

  test("reads the rows newest first", async () => {
    await renderList([REQUEST]);

    expect(mocks.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  // 5.2: a search term narrows the product link; no term means no ilike call.
  test("searches the product link only when given a term", async () => {
    await renderList([REQUEST]);

    expect(mocks.ilike).not.toHaveBeenCalled();

    await render(
      await MyTitipanRequests({ search: "uniqlo", statusFilter: undefined }),
    );

    expect(mocks.ilike).toHaveBeenCalledWith(
      "product_link",
      expect.stringContaining("uniqlo"),
    );
  });

  // 5.2: a status narrows the query; no status means no status call.
  test("filters by status only when given one", async () => {
    await renderList([REQUEST]);

    expect(mocks.eq).not.toHaveBeenCalledWith("status", expect.anything());

    await render(
      await MyTitipanRequests({ search: undefined, statusFilter: "quoted" }),
    );

    expect(mocks.eq).toHaveBeenCalledWith("status", "quoted");
  });

  test("shows what the buyer sent, with the status in plain language", async () => {
    await renderList([UNQUOTED]);

    expect(
      screen.getByRole("link", { name: "https://store.example/item/1234" }),
    ).toHaveAttribute("href", "https://store.example/item/1234");
    expect(screen.getByText(/M · Hitam · 2 barang/)).toBeInTheDocument();
    expect(screen.getByText("Menunggu kutipan")).toBeInTheDocument();
    expect(screen.queryByText("requested")).toBeNull();
    // 2026-10-09T23:30:00Z is the 10th in Jakarta and the 9th in UTC, and
    // formatDate is pinned to UTC so both sides of the shop read the same day.
    expect(screen.getByText(/9 Okt 2026/)).toBeInTheDocument();
  });

  // A price before staff has quoted one would read as a price the shop agreed
  // to. Nothing about the money appears until the quote does.
  test("shows no figures at all before staff have quoted", async () => {
    await renderList([UNQUOTED]);

    expect(screen.queryByText(/Harga barang/)).toBeNull();
    expect(screen.queryByText(/Ongkir/)).toBeNull();
    expect(screen.queryByText("Total")).toBeNull();
    expect(screen.queryByText(/Kutipan/)).toBeNull();
  });

  // The three parts the shop charged, and their sum. The sum comes from
  // quoteTotal(), the same function the staff box and /titipan call, so the
  // figure a buyer reads is the figure staff watched being computed.
  test("breaks the quote into its three parts and sums them", async () => {
    await renderList([REQUEST]);

    expect(screen.getByText("Harga barang")).toBeInTheDocument();
    expect(screen.getByText("Ongkir")).toBeInTheDocument();
    expect(screen.getByText("Biaya layanan")).toBeInTheDocument();

    // textContent, not toHaveTextContent: the label and the figure are two text
    // nodes in one <div>, and the matcher normaliser collapses the non-breaking
    // space ICU puts after "Rp" into an ordinary one.
    const total = screen.getByText("Total").parentElement!.textContent!;

    expect(total).toContain(`Rp${nbsp}705.000`);
  });

  test("shows the note staff wrote", async () => {
    await renderList([REQUEST]);

    expect(screen.getByText("Sudah termasuk pajak.")).toBeInTheDocument();
  });

  // A blank note is stored as null, which is the absence of one rather than a
  // broken cell, so nothing is printed for it.
  test("prints nothing for a blank note", async () => {
    await renderList([{ ...REQUEST, quote_note: null }]);

    expect(screen.queryByText("Sudah termasuk pajak.")).toBeNull();
    expect(screen.getByText("Total")).toBeInTheDocument();
  });

  // saveTitipanQuote cannot write two figures out of three, so this state is
  // unreachable through the app. A total computed from a missing figure would
  // be an under-quote the buyer then pays, so the breakdown stays away instead.
  test("shows no total when a figure is missing", async () => {
    await renderList([{ ...REQUEST, quote_service_fee: null }]);

    expect(screen.queryByText("Total")).toBeNull();
    expect(screen.queryByText(/Biaya layanan/)).toBeNull();
  });

  // Supabase answering with null rather than [] is a shape difference, not a
  // failure: the list must say so rather than throw.
  test("says so when nothing has been sent yet", async () => {
    await renderList(null as unknown as unknown[]);

    expect(screen.getByText(/belum mengirim permintaan titipan/i)).toBeInTheDocument();
  });

  test("every internal link has a page or is declared pending", async () => {
    await renderList([UNQUOTED]);

    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href")!);

    expect(hrefs.length).toBeGreaterThan(0);

    for (const href of hrefs) {
      // The product link leaves the site, so there is no page to find for it.
      if (!href.startsWith("/")) continue;

      expect(
        PENDING.includes(href) || pageExists(href),
        `${href} has no page`,
      ).toBe(true);
    }
  });
});
