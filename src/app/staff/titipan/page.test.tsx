import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { PENDING, pageExists } from "@/components/pendingPages";

// The queue is the only thing here that talks to Supabase. The mock records the
// order() call as well, because "newest first" is the claim 3.5 makes and a
// wrong order is invisible on screen — the rows would still all be there.
const mocks = vi.hoisted(() => ({
  requests: [] as unknown[],
  buyers: [] as unknown[],
  order: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => {
      if (table === "titipan_requests") {
        return {
          select: () => ({
            order: (column: string, options: unknown) => {
              mocks.order(column, options);
              return Promise.resolve({ data: mocks.requests });
            },
          }),
        };
      }

      return {
        select: () => ({
          in: () => Promise.resolve({ data: mocks.buyers }),
        }),
      };
    },
  })),
}));

import StaffTitipanPage, { TitipanQueue } from "./page";

// ICU puts a non-breaking space after "Rp" in Indonesian, not a normal space.
const nbsp = "\u00a0";

const REQUEST = {
  id: "r1",
  buyer_id: "buyer-1",
  product_link: "https://store.example/item/1234",
  size: "M",
  color: "Hitam",
  quantity: 2,
  budget: 500000,
  status: "requested",
  created_at: "2026-10-09T23:30:00Z",
};

describe("StaffTitipanPage", () => {
  test("the heading is in the static shell", () => {
    expect(renderToStaticMarkup(<StaffTitipanPage />)).toContain(
      "Permintaan titipan",
    );
  });

  // If the session read moves back up into the page, the route stops prerendering
  // and `next build` fails. Same regression 1.12 fixed in the navbar, and the
  // reason the queue sits behind its own boundary.
  test("the queue is not in the static shell", () => {
    mocks.requests = [REQUEST];

    expect(renderToStaticMarkup(<StaffTitipanPage />)).not.toContain(
      "store.example",
    );
  });
});

describe("TitipanQueue", () => {
  beforeEach(() => {
    mocks.requests = [];
    mocks.buyers = [];
    mocks.order.mockReset();
  });

  // The claim of 3.5 itself.
  test("reads the rows newest first", async () => {
    render(await TitipanQueue());

    expect(mocks.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  test("shows what the buyer sent", async () => {
    mocks.requests = [REQUEST];

    render(await TitipanQueue());

    expect(
      screen.getByRole("link", { name: "https://store.example/item/1234" }),
    ).toHaveAttribute("href", "https://store.example/item/1234");
    expect(screen.getByText(/M · Hitam · 2 barang/)).toBeInTheDocument();
    // textContent, not toHaveTextContent: the label and the figure are two text
    // nodes in one <p>, and the matcher normaliser collapses the non-breaking
    // space ICU puts after "Rp" into an ordinary one, which would stop this
    // assertion from being about the formatting at all.
    expect(screen.getByText(/perkiraan budget/i).textContent).toContain(
      `Rp${nbsp}500.000`,
    );
  });

  // A quantity of one is what most rows will say, so it is left out rather than
  // printed on every line of the queue. The summary counts rows, not items, so
  // it cannot contain the word "barang" either.
  test("leaves out a quantity of one", async () => {
    mocks.requests = [{ ...REQUEST, quantity: 1 }];

    render(await TitipanQueue());

    expect(screen.queryByText(/barang/)).toBeNull();
  });

  // Named wrong, or not at all: the request is still in the queue, because a
  // request whose buyer cannot be named has not stopped being a request.
  test("falls back to the email, then to a dash", async () => {
    mocks.requests = [REQUEST];
    mocks.buyers = [{ id: "buyer-1", full_name: null, email: "siti@example.com" }];

    render(await TitipanQueue());

    expect(screen.getByText("siti@example.com")).toBeInTheDocument();

    mocks.buyers = [];

    render(await TitipanQueue());

    expect(screen.getByText("Pembeli tanpa profil")).toBeInTheDocument();
  });

  // Nobody sees a database word, and no date is shifted by the server's region.
  test("labels the status and dates the request", async () => {
    mocks.requests = [{ ...REQUEST, status: "quoted" }];

    render(await TitipanQueue());

    expect(screen.getAllByText(/Sudah dikutip/).length).toBeGreaterThan(0);
    expect(screen.queryByText("quoted")).toBeNull();
    // 2026-10-09T23:30:00Z is the 10th in Jakarta and the 9th in UTC. formatDate
    // is pinned to UTC so both sides of the shop read the same day. The month
    // is the Indonesian one: the formatter's locale, not an English shortcut.
    expect(screen.getByText(/9 Okt 2026/)).toBeInTheDocument();
  });

  // A blank budget is a buyer who has no idea, not a buyer who wants it free.
  // Printing nothing keeps the figure from reading as a price the shop agreed.
  test("shows nothing for a request with no budget", async () => {
    mocks.requests = [{ ...REQUEST, budget: null }];

    render(await TitipanQueue());

    expect(screen.queryByText(/budget/i)).toBeNull();
  });

  // Supabase answering with null rather than [] is a shape difference, not a
  // failure: the queue must say so rather than throw.
  test("says so when nothing has come in yet", async () => {
    mocks.requests = null as unknown as unknown[];

    render(await TitipanQueue());

    expect(screen.getByText(/belum ada permintaan titipan/i)).toBeInTheDocument();
  });

  // The empty state sends staff to the form, so it has to exist.
  test("every internal link has a page or is declared pending", async () => {
    mocks.requests = [REQUEST];

    render(await TitipanQueue());

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