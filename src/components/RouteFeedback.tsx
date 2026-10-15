"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Whether an anchor press leaves this page for another one of ours.
 *
 * Same-URL presses (pathname + query unchanged), new-tab clicks, downloads
 * and off-site links return false: showing the bar for those would stick it
 * on screen, because nothing navigates to hide it again.
 */
function isInternalNavTarget(anchor: HTMLAnchorElement): boolean {
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  const href = anchor.getAttribute("href");
  if (
    !href ||
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  )
    return false;
  try {
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return false;
    return (
      url.pathname + url.search !==
      window.location.pathname + window.location.search
    );
  } catch {
    return false;
  }
}

/**
 * Thin top loading bar for client-side navigations (roadmap 5.22).
 *
 * Link presses and explicit GET filter forms show it; the pathname /
 * searchParams effect hides it once the new route lands. Server-action
 * submits are excluded on purpose — SubmitButton's ring already answers
 * those, and an action that fails validation without navigating would leave
 * a second indicator stuck on screen.
 */
function NavigationProgressInner() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const anchor = (e.target as HTMLElement).closest?.("a") as
        | HTMLAnchorElement
        | null
        | undefined;
      if (anchor && isInternalNavTarget(anchor)) setLoading(true);
    };
    const onSubmit = (e: Event) => {
      const form = e.target as HTMLFormElement;
      if (
        form?.tagName === "FORM" &&
        form.getAttribute("method")?.toLowerCase() === "get"
      )
        setLoading(true);
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  if (!loading) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden"
    >
      <div
        role="progressbar"
        aria-label="Memuat halaman"
        className="route-bar h-full w-1/3 bg-plum"
      />
    </div>
  );
}

export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressKeyed />
    </Suspense>
  );
}

/**
 * Re-keys the bar on every route so each navigation starts unshown.
 *
 * A fresh mount reads as the initial useState(false) — no reset effect, no
 * cascading render. The listeners re-subscribe per route, which costs
 * nothing next to the navigation itself.
 */
function NavigationProgressKeyed() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  return <NavigationProgressInner key={`${pathname}?${search}`} />;
}

/**
 * Replays the page-enter animation on every route change.
 *
 * The layout persists across navigations, so a static class would animate
 * once on first load only. Keying the wrapper on the pathname restarts it
 * per page — page components remount on navigation anyway, so no client
 * state below the layout survives that would be lost by the re-key.
 */
export function PageEnter({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter flex flex-1 flex-col">
      {children}
    </div>
  );
}
