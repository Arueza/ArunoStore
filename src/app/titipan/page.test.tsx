import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { PENDING, pageExists } from "@/components/pendingPages";
import TitipanPage, { TitipanDashboard, TitipanRail } from "./page";

const getProfile = vi.fn();

vi.mock("@/lib/auth", () => ({
  getProfile: () => getProfile(),
}));

// The Kelola block reads the queue, which is the only Supabase touch here.
// Empty rows keep the assertion on the role switch, not on the queue itself.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => {
      if (table === "titipan_requests") {
        return {
          select: () => ({
            order: () => Promise.resolve({ data: [] }),
          }),
        };
      }
      return {
        select: () => ({
          in: () => Promise.resolve({ data: [] }),
        }),
      };
    },
  })),
}));

// ICU puts a non-breaking space after "Rp" in Indonesian, not a normal space.
const nbsp = "\u00a0";

describe("Titipan page", () => {
  test("says what a titipan is", () => {
    const page = renderToStaticMarkup(<TitipanPage />);

    expect(page).toContain("Titipan dari Jepang");
    expect(page).toContain("tautan produk dari Jepang");
  });

  // The catalogue lives in the global shop now (5.23), pre-filtered to this
  // side — the explainer is the front door and the button is the way in.
  test("links into the titipan side of the shop", () => {
    const page = renderToStaticMarkup(<TitipanPage />);

    expect(page).toContain('href="/shop?side=titipan"');
    expect(page).toContain("Lihat katalog");
  });

  // The four steps of the README loop, in order. A buyer reads this page before
  // the form arrives at 3.3, so losing or reordering a step quietly changes what
  // they expect to happen after they send a link.
  test("lists the four steps in order", () => {
    const page = renderToStaticMarkup(<TitipanPage />);
    const openings = [
      "Kamu mengirim tautan",
      "Staf mengecek produknya",
      "Kamu menerima kutipannya",
      "Barang dikirim ke alamatmu",
    ];

    const positions = openings.map((text) => page.indexOf(text));

    expect(
      positions.every((at) => at > -1),
      "a step is missing from the page",
    ).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  // 25.000 is hardcoded on purpose. It is the price this page publishes, so
  // changing it should break a test and force a decision about the wording
  // beside it ("per barang") rather than slip through silently.
  test("publishes the service fee and a worked total", () => {
    const page = renderToStaticMarkup(<TitipanPage />);

    expect(page).toContain(`Rp${nbsp}25.000`);
    expect(page).toContain(`Rp${nbsp}705.000`);
  });

  test("breaks the cost down into item, shipping, fee and total", () => {
    const page = renderToStaticMarkup(<TitipanPage />);

    for (const label of [
      "Harga barang",
      "Ongkir ke Indonesia",
      "Biaya layanan",
      "Total",
    ]) {
      expect(page, `${label} is not explained`).toContain(label);
    }
  });

  // Same guarantee tasks 1.11 and 1.14 gave the footer and the storefront: the
  // call to action has to point at a route that exists. 3.3 points it at
  // /titipan/request, and 3.8 added /titipan/mine beside it.
  test("every link on the page has a page or is declared pending", () => {
    const page = renderToStaticMarkup(<TitipanPage />);
    const hrefs = [...page.matchAll(/href="([^"]+)"/g)].map((match) => match[1]);

    expect(hrefs.length).toBeGreaterThan(0);

    for (const href of hrefs) {
      expect(
        PENDING.includes(href) || pageExists(href),
        `${href} has no page`,
      ).toBe(true);
    }
  });
});

describe("TitipanRail", () => {
  test("buyers and visitors get the call to action, never the Kelola card", async () => {
    for (const profile of [null, { full_name: "Siti", role: "buyer" }]) {
      getProfile.mockResolvedValue(profile);

      const { unmount } = render(await TitipanRail());

      expect(
        screen.getByRole("link", { name: "Mulai titipan" }),
      ).toHaveAttribute("href", "/titipan/request");
      expect(screen.queryByText("Kelola permintaan")).toBeNull();
      unmount();
    }
  });

  test("staff get the Kelola card instead of the call to action", async () => {
    getProfile.mockResolvedValue({ full_name: "Alfreza", role: "staff" });

    render(await TitipanRail());

    expect(screen.getByRole("link", { name: /permintaan masuk/i })).toHaveAttribute(
      "href",
      "#kelola",
    );
    expect(screen.getByRole("link", { name: /kelola katalog/i })).toHaveAttribute(
      "href",
      "#kelola-katalog",
    );
    expect(screen.queryByRole("link", { name: "Mulai titipan" })).toBeNull();
  });
});

describe("TitipanDashboard", () => {
  test("buyers and visitors resolve to nothing", async () => {
    for (const profile of [null, { full_name: "Siti", role: "buyer" }]) {
      getProfile.mockResolvedValue(profile);

      const { container, unmount } = render(
        await TitipanDashboard({ searchParams: Promise.resolve({}) }),
      );

      expect(container).toBeEmptyDOMElement();
      unmount();
    }
  });

  test("staff get the Kelola dashboard instead of the call to action", async () => {
    getProfile.mockResolvedValue({ full_name: "Alfreza", role: "staff" });

    render(
      await TitipanDashboard({ searchParams: Promise.resolve({}) }),
    );

    expect(screen.getByText("Kelola permintaan")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Mulai titipan" })).toBeNull();
  });
});