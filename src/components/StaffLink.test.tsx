import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const getProfile = vi.fn();

vi.mock("@/lib/auth", () => ({
  getProfile: () => getProfile(),
}));

import StaffLink from "./StaffLink";

describe("StaffLink", () => {
  beforeEach(() => {
    getProfile.mockReset();
    getProfile.mockResolvedValue(null);
  });

  test("renders nothing when signed out", async () => {
    const { container } = render(await StaffLink());

    expect(container).toBeEmptyDOMElement();
  });

  test("renders nothing for buyers", async () => {
    getProfile.mockResolvedValue({ full_name: "Siti Rahayu", role: "buyer" });

    const { container } = render(await StaffLink());

    expect(container).toBeEmptyDOMElement();
  });

  // A server component re-renders with the session, so unlike the old
  // mount-once client version this cannot keep showing after logout.
  test("links to /staff for staff", async () => {
    getProfile.mockResolvedValue({ full_name: "Verrel", role: "staff" });

    render(await StaffLink());

    expect(screen.getByRole("link", { name: "Staff" })).toHaveAttribute(
      "href",
      "/staff",
    );
  });
});
