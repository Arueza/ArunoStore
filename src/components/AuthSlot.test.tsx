import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const getClaims = vi.fn();

vi.mock("@/lib/auth", () => ({
  getClaims: () => getClaims(),
}));

import AuthSlot from "./AuthSlot";
import { PENDING, pageExists } from "./pendingPages";

describe("AuthSlot", () => {
  beforeEach(() => {
    getClaims.mockReset();
    getClaims.mockResolvedValue(null);
  });

  test("offers sign in and sign up while signed out", async () => {
    render(await AuthSlot());

    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign up" })).toBeInTheDocument();
  });

  test("both signed-out links point at a page that exists", () => {
    for (const href of ["/login", "/auth/sign-up"]) {
      expect(PENDING.includes(href) || pageExists(href), `${href} has no page`).toBe(
        true,
      );
    }
  });

  test("offers log out instead once a session exists", async () => {
    getClaims.mockResolvedValue({ sub: "u1", email: "buyer@example.com" });

    render(await AuthSlot());

    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Sign in" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Sign up" }),
    ).not.toBeInTheDocument();
  });
});