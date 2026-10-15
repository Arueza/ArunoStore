import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const getClaims = vi.fn();
const getProfile = vi.fn();

vi.mock("@/lib/auth", () => ({
  getClaims: () => getClaims(),
  getProfile: () => getProfile(),
}));

import AuthSlot from "./AuthSlot";
import { PanelProvider } from "./Panels";
import { PENDING, pageExists } from "./pendingPages";

describe("AuthSlot", () => {
  beforeEach(() => {
    getClaims.mockReset();
    getProfile.mockReset();
    getClaims.mockResolvedValue(null);
    getProfile.mockResolvedValue(null);
  });

  test("offers a way in while signed out", async () => {
    render(await AuthSlot());

    expect(screen.getByRole("link", { name: "Masuk" })).toBeInTheDocument();
  });

  test("the signed-out link points at a page that exists", () => {
    expect(PENDING.includes("/login") || pageExists("/login")).toBe(true);
  });

  test("offers the account menu instead once a session exists", async () => {
    getClaims.mockResolvedValue({ sub: "u1", email: "buyer@example.com" });

    render(await AuthSlot());

    expect(screen.getByRole("button", { name: "Akun" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Masuk" })).not.toBeInTheDocument();
  });

  // The point of reading the profile: the greeting says who the buyer is, not
  // what their address happens to be. The greeting lives inside the menu, so it
  // only exists once the menu is opened — that is cottonink's behaviour, and the
  // header deliberately shows no name at rest.
  test("greets the signed-in visitor by their profile name", async () => {
    getClaims.mockResolvedValue({ sub: "u1", email: "buyer@example.com" });
    getProfile.mockResolvedValue({
      full_name: "Siti Rahayu",
      role: "buyer",
    });

    render(
      <PanelProvider>
        {await AuthSlot()}
      </PanelProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Akun" }));

    expect(screen.getByText(/Siti Rahayu/)).toBeInTheDocument();
  });

  // A signup whose trigger has not fired has a session but no profile row. The
  // greeting must still name someone, and must not render "Halo, !".
  test("falls back to the email when the profile row is missing", async () => {
    getClaims.mockResolvedValue({ sub: "u1", email: "buyer@example.com" });
    getProfile.mockResolvedValue(null);

    render(
      <PanelProvider>
        {await AuthSlot()}
      </PanelProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Akun" }));

    expect(screen.getByText(/buyer@example.com/)).toBeInTheDocument();
    expect(screen.queryByText(/Halo,  *!/)).not.toBeInTheDocument();
  });

  // Staff run the shop halves, so buyer-only destinations stay out of their
  // menu. The routes themselves are unchanged — this is convenience, and the
  // proxy remains the guard.
  test("hides the buyer links for a staff session", async () => {
    getClaims.mockResolvedValue({ sub: "s1", email: "staff@example.com" });
    getProfile.mockResolvedValue({ full_name: "Verrel", role: "staff" });

    render(
      <PanelProvider>
        {await AuthSlot()}
      </PanelProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Akun" }));

    expect(screen.queryByRole("link", { name: "Commissions saya" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Titipan saya" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Riwayat transaksi" })).toBeNull();
    expect(screen.getByRole("link", { name: "Akun saya" })).toBeInTheDocument();
  });

  test("keeps the buyer links for a buyer session", async () => {
    getClaims.mockResolvedValue({ sub: "u1", email: "buyer@example.com" });
    getProfile.mockResolvedValue({ full_name: "Siti", role: "buyer" });

    render(
      <PanelProvider>
        {await AuthSlot()}
      </PanelProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Akun" }));

    expect(screen.getByRole("link", { name: "Commissions saya" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Titipan saya" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Riwayat transaksi" })).toBeInTheDocument();
  });
});