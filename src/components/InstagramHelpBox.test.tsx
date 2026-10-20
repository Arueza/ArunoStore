import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import InstagramHelpBox from "./InstagramHelpBox";
import { INSTAGRAM_URL } from "@/lib/contact";

// The fallback is the only way a paid order gets its delivery resolved, so
// the link target and the screenshot instruction are pinned here, not in a
// manual click-through.
describe("InstagramHelpBox", () => {
  test("links to the shop Instagram in a new tab", () => {
    render(<InstagramHelpBox orderId="order-123" />);

    const link = screen.getByRole("link", { name: /chat instagram/i });
    expect(link.getAttribute("href")).toBe(INSTAGRAM_URL);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  test("tells the buyer to send the payment screenshot and shows the order id", () => {
    const { container } = render(<InstagramHelpBox orderId="order-123" />);

    expect(container.textContent).toMatch(/screenshot/i);
    expect(container.textContent).toContain("order-123");
  });

  test("renders without an order id", () => {
    const { container } = render(<InstagramHelpBox />);

    expect(container.textContent).toMatch(/instagram/i);
  });
});
