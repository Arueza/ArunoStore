import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const getClaims = vi.fn();
const getProfile = vi.fn();

vi.mock("@/lib/auth", () => ({
  getClaims: () => getClaims(),
  getProfile: () => getProfile(),
}));

import AccountDetails from "./details";
import AccountPage from "./page";

describe("AccountPage", () => {
  test("the heading is in the static shell", () => {
    expect(renderToStaticMarkup(<AccountPage />)).toContain("Akun saya");
  });

  // If the session read moves back up into the page, the route stops
  // prerendering and `next build` fails. This is the same regression roadmap
  // 1.12 fixed in the navbar.
  test("the profile rows are not in the static shell", () => {
    getClaims.mockResolvedValue({ sub: "u1", email: "siti@example.com" });
    getProfile.mockResolvedValue({ full_name: "Siti Rahayu", role: "buyer" });

    expect(renderToStaticMarkup(<AccountPage />)).not.toContain("Siti Rahayu");
  });
});

describe("AccountDetails", () => {
  beforeEach(() => {
    getClaims.mockReset();
    getProfile.mockReset();
    getClaims.mockResolvedValue(null);
    getProfile.mockResolvedValue(null);
  });

  test("names the visitor from the profile row", async () => {
    getClaims.mockResolvedValue({ sub: "u1", email: "siti@example.com" });
    getProfile.mockResolvedValue({ full_name: "Siti Rahayu", role: "buyer" });

    render(await AccountDetails());

    expect(screen.getByText("Siti Rahayu")).toBeInTheDocument();
    expect(screen.getByText("siti@example.com")).toBeInTheDocument();
  });

  // The buyer is the one reading this, so the column value never goes on screen.
  test("shows the role in words, not as the stored value", async () => {
    getClaims.mockResolvedValue({ sub: "u1", email: "siti@example.com" });
    getProfile.mockResolvedValue({ full_name: "Siti Rahayu", role: "buyer" });

    render(await AccountDetails());

    expect(screen.getByText("Pembeli")).toBeInTheDocument();
    expect(screen.queryByText("buyer")).not.toBeInTheDocument();
  });

  test("labels the staff role too", async () => {
    getClaims.mockResolvedValue({ sub: "u2", email: "verrel@example.com" });
    getProfile.mockResolvedValue({ full_name: "Verrel", role: "staff" });

    render(await AccountDetails());

    expect(screen.getByText("Staf")).toBeInTheDocument();
    // One note covers both halves now that artist is not a role.
    expect(screen.getByText(/commission/i)).toBeInTheDocument();
    expect(screen.getByText(/titipan/i)).toBeInTheDocument();
  });

  // There is no artist role as of 1.15, so the label map must not invent one.
  // A row still holding the old value falls back to the raw string, which is
  // visible here rather than silently blank.
  test("never shows a role the app does not have", async () => {
    getClaims.mockResolvedValue({ sub: "u3", email: "x@example.com" });
    getProfile.mockResolvedValue({ full_name: "X", role: "artist" });

    render(await AccountDetails());

    expect(screen.queryByText("Artist")).not.toBeInTheDocument();
  });

  test("flags a missing profile row instead of faking a name", async () => {
    getClaims.mockResolvedValue({ sub: "u1", email: "siti@example.com" });
    getProfile.mockResolvedValue(null);

    render(await AccountDetails());

    expect(screen.getByText("Belum diisi")).toBeInTheDocument();
    expect(screen.getByText(/belum lengkap/i)).toBeInTheDocument();
    // The email appears once, in its own row, not doubled up as the name.
    expect(screen.getAllByText("siti@example.com")).toHaveLength(1);
  });
});