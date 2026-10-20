import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

import PaymentStatusPoller from "./PaymentStatusPoller";

describe("PaymentStatusPoller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.refresh.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("does nothing while inactive", () => {
    render(<PaymentStatusPoller active={false} />);

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    expect(mocks.refresh).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Cek status" })).toBeNull();
  });

  test("refreshes immediately when active", () => {
    render(<PaymentStatusPoller active />);

    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  test("refreshes again after five seconds", () => {
    render(<PaymentStatusPoller active />);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(mocks.refresh).toHaveBeenCalledTimes(2);
  });

  test("offers Cek status after a minute and refreshes on click", () => {
    render(<PaymentStatusPoller active />);

    act(() => {
      vi.advanceTimersByTime(60000);
    });

    fireEvent.click(screen.getByRole("button", { name: "Cek status" }));

    expect(mocks.refresh).toHaveBeenCalledTimes(13);
  });

  test("stops refreshing after unmount", () => {
    const { unmount } = render(<PaymentStatusPoller active />);

    expect(mocks.refresh).toHaveBeenCalledTimes(1);

    unmount();

    act(() => {
      vi.advanceTimersByTime(30000);
    });

    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });
});
