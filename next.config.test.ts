import { describe, expect, test } from "vitest";
import nextConfig from "./next.config";

// The old showcase catalogues moved under their sections; bookmarks and the
// product pages' old habits must land on the new URLs, permanently.
describe("next.config redirects", () => {
  test("old catalogue paths redirect permanently to their sections", async () => {
    const redirects = await nextConfig.redirects!();

    expect(redirects).toContainEqual({
      source: "/shop/commission",
      destination: "/commissions/catalog",
      permanent: true,
    });
    expect(redirects).toContainEqual({
      source: "/shop/titipan",
      destination: "/titipan/catalog",
      permanent: true,
    });
  });
});
