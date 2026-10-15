import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { PENDING, pageExists } from "@/components/pendingPages";

const getProfile = vi.fn();

vi.mock("@/lib/auth", () => ({
  getProfile: () => getProfile(),
}));

// The Kelola block reads the queue, which is the only Supabase touch here.
// Row fixtures mirror the queue's own selects; the queue's content is the
// queue's own test surface, so this file only proves the dashboard mounts
// its links.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => {
      if (table === "commissions") {
        return {
          select: () => ({
            order: () =>
              Promise.resolve({
                data: [
                  {
                    id: "c1",
                    buyer_id: "buyer-1",
                    service_id: "s1",
                    brief: "Naga Jawa",
                    status: "requested",
                    quote_price: null,
                    created_at: "2026-10-09T23:30:00Z",
                  },
                ],
              }),
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

import CommissionsPage, { CommissionRoleView } from "./page";
import { CommissionQueue } from "@/components/CommissionQueue";

describe("Commissions page", () => {
  test("the static shell carries the buyer call to action", () => {
    const page = renderToStaticMarkup(<CommissionsPage />);

    expect(page).toContain("Mulai commission");
  });
});

describe("CommissionRoleView", () => {
  test("buyers and visitors get the call to action, never the dashboard", async () => {
    for (const profile of [null, { full_name: "Siti", role: "buyer" }]) {
      getProfile.mockResolvedValue(profile);

      const { unmount } = render(await CommissionRoleView());

      expect(
        screen.getByRole("link", { name: "Mulai commission" }),
      ).toHaveAttribute("href", "/commissions/request");
      expect(screen.queryByText("Kelola permintaan")).toBeNull();
      unmount();
    }
  });

  test("staff get the Kelola dashboard instead of the call to action", async () => {
    getProfile.mockResolvedValue({ full_name: "Verrel", role: "staff" });

    render(await CommissionRoleView());

    expect(screen.getByText("Kelola permintaan")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Mulai commission" })).toBeNull();
  });

  // The queue streams behind its own boundary, which the test renderer cannot
  // resolve nested — so the dashboard's links are proved through the queue
  // itself, awaited directly like every other queue test.
  test("every dashboard link has a page or is declared pending", async () => {
    render(await CommissionQueue());

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
