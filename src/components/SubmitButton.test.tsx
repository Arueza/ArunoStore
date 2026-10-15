import { describe, expect, test } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import SubmitButton, { Spinner } from "./SubmitButton";

// A gate the test holds open: while it stays shut, the form action is
// pending, which is the only state worth asserting on this component.
function deferredAction() {
  let resolve!: () => void;
  const gate = new Promise<void>((r) => {
    resolve = r;
  });
  return { action: () => gate, resolve: () => resolve() };
}

describe("SubmitButton", () => {
  test("renders the label enabled when idle", () => {
    render(
      <form action={async () => {}}>
        <SubmitButton pendingLabel="Menyimpan…">Simpan</SubmitButton>
      </form>,
    );

    const button = screen.getByRole("button", { name: "Simpan" });
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("aria-busy", "false");
  });

  test("a caller-passed disabled stays disabled when idle", () => {
    render(
      <form action={async () => {}}>
        <SubmitButton disabled pendingLabel="Menghapus…">
          Hapus
        </SubmitButton>
      </form>,
    );

    expect(screen.getByRole("button", { name: "Hapus" })).toBeDisabled();
  });

  // fireEvent.submit rather than a click: React 19 runs a form action off
  // the submit event and jsdom's button click never dispatches one.
  test("pending shows the ring and label, then restores", async () => {
    const { action, resolve } = deferredAction();
    render(
      <form action={action}>
        <SubmitButton pendingLabel="Menyimpan…">Simpan</SubmitButton>
      </form>,
    );

    fireEvent.submit(screen.getByRole("button").closest("form")!);

    const pending = await screen.findByRole("button", {
      name: "Menyimpan…",
    });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute("aria-busy", "true");

    resolve();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Simpan" })).toBeEnabled();
    });
  });

  test("without a pending label the ring prefixes the kept label", async () => {
    const { action, resolve } = deferredAction();
    render(
      <form action={action}>
        <SubmitButton>Hapus</SubmitButton>
      </form>,
    );

    fireEvent.submit(screen.getByRole("button").closest("form")!);

    const pending = await screen.findByRole("button", { name: "Hapus" });
    expect(pending).toBeDisabled();
    expect(pending.querySelector(".btn-spinner")).not.toBeNull();

    resolve();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Hapus" })).toBeEnabled();
    });
  });
});

describe("Spinner", () => {
  test("is hidden from assistive tech", () => {
    render(<Spinner />);
    const spinner = document.querySelector(".btn-spinner")!;
    expect(spinner).not.toBeNull();
    expect(spinner).toHaveAttribute("aria-hidden", "true");
  });
});
