import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PENDING, pageExists } from "@/components/pendingPages";
import TitipanPage from "./page";

// ICU puts a non-breaking space after "Rp" in Indonesian, not a normal space.
const nbsp = "\u00a0";

describe("Titipan page", () => {
  test("says what a titipan is", () => {
    const page = renderToStaticMarkup(<TitipanPage />);

    expect(page).toContain("Titipan dari Jepang");
    expect(page).toContain("tautan produk dari Jepang");
  });

  // The catalogue lives under this section now, not in the nav — the
  // explainer is the front door and the button is the way in.
  test("links into the titipan catalogue", () => {
    const page = renderToStaticMarkup(<TitipanPage />);

    expect(page).toContain('href="/titipan/catalog"');
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