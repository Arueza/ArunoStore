import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

// Raw anchors on purpose: the bar listens for plain link presses, and
// next/link would need router context this test deliberately avoids.
/* eslint-disable @next/next/no-html-link-for-pages */

// The bar hides on pathname change, so the path must be mutable per test
// without re-mocking the module: vi.hoisted lifts the cell above the mock.
const nav = vi.hoisted(() => ({ path: "/a" }));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.path,
  useSearchParams: () => new URLSearchParams(),
}));

import { NavigationProgress, PageEnter } from "./RouteFeedback";

function renderProgress() {
  nav.path = "/a";
  return render(
    <>
      <NavigationProgress />
      <a href="/b">Ke B</a>
    </>,
  );
}

// The bar is visual-only (aria-hidden, like nprogress): the pressed button
// already answers assistive tech, so tests read the DOM, not the role tree.
const barOf = (view: { container: HTMLElement }) =>
  view.container.querySelector('[role="progressbar"]');

describe("NavigationProgress", () => {
  test("an internal link press shows the bar", () => {
    const view = renderProgress();
    expect(barOf(view)).toBeNull();

    fireEvent.click(screen.getByRole("link", { name: "Ke B" }));

    expect(barOf(view)).not.toBeNull();
  });

  test("landing on the new route hides it again", () => {
    const view = renderProgress();
    fireEvent.click(screen.getByRole("link", { name: "Ke B" }));
    expect(barOf(view)).not.toBeNull();

    nav.path = "/b";
    view.rerender(
      <>
        <NavigationProgress />
        <a href="/b">Ke B</a>
      </>,
    );

    expect(barOf(view)).toBeNull();
  });

  test("same-URL, new-tab and off-site presses stay quiet", () => {
    const view = render(
      <>
        <NavigationProgress />
        {/* Same means same as jsdom's location (/), not the mocked path. */}
        <a href="/">Same</a>
        <a href="/b" target="_blank" rel="noreferrer">
          Blank
        </a>
        <a href="https://example.com/x">Luar</a>
      </>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Same" }));
    fireEvent.click(screen.getByRole("link", { name: "Blank" }));
    fireEvent.click(screen.getByRole("link", { name: "Luar" }));

    expect(barOf(view)).toBeNull();
  });

  test("an explicit GET filter form shows it", () => {
    const view = render(
      <>
        <NavigationProgress />
        <form method="get" action="/shop">
          <button type="submit">Filter</button>
        </form>
      </>,
    );

    fireEvent.submit(
      screen.getByRole("button", { name: "Filter" }).closest("form")!,
    );

    expect(barOf(view)).not.toBeNull();
  });
});

describe("PageEnter", () => {
  test("wraps the page and replays per route", () => {
    const view = render(
      <PageEnter>
        <p>Isi</p>
      </PageEnter>,
    );
    expect(screen.getByText("Isi")).not.toBeNull();

    nav.path = "/b";
    view.rerender(
      <PageEnter>
        <p>Isi</p>
      </PageEnter>,
    );
    expect(screen.getByText("Isi")).not.toBeNull();
  });
});
