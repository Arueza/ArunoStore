import { describe, expect, test } from "vitest";
import nextConfig from "./next.config";

// The section catalogues retired into the filtered global shop (5.23);
// bookmarks and the product pages' old habits must land on the right filter,
// permanently.
describe("next.config redirects", () => {
  test("old catalogue paths redirect permanently to the filtered shop", async () => {
    const redirects = await nextConfig.redirects!();

    expect(redirects).toContainEqual({
      source: "/shop/commission",
      destination: "/shop?side=commission",
      permanent: true,
    });
    expect(redirects).toContainEqual({
      source: "/shop/titipan",
      destination: "/shop?side=titipan",
      permanent: true,
    });
    expect(redirects).toContainEqual({
      source: "/commissions/catalog",
      destination: "/shop?side=commission",
      permanent: true,
    });
    expect(redirects).toContainEqual({
      source: "/titipan/catalog",
      destination: "/shop?side=titipan",
      permanent: true,
    });
    expect(redirects).toContainEqual({
      source: "/staff/titipan",
      destination: "/titipan",
      permanent: true,
    });
  });
});
