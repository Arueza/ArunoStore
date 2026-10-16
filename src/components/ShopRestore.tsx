"use client";

import { useEffect } from "react";

const KEY = "aruno-shop-scroll";

/** Session key holding the last plain `/shop` list URL (filters included).
 * Written by ShopRestore, read by BackButton's `recallKey`. */
export const SHOP_LIST_URL_KEY = "aruno-last-shop";

/** Position stashed when the list unloads; restored only on a back/forward
 * return to the very same URL. Everything else early-returns, so a fresh
 * load or a different filter set never jumps. */
export function parseEntry(raw: string | null): {
  url: string;
  y: number;
} | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { url, y } = parsed as { url: unknown; y: unknown };
    if (typeof url !== "string") return null;
    if (typeof y !== "number" || !Number.isFinite(y) || y < 0) return null;
    return { url, y };
  } catch {
    return null;
  }
}

export function isBackForward(): boolean {
  const [nav] = performance.getEntriesByType("navigation");
  return (nav as PerformanceNavigationTiming | undefined)?.type === "back_forward";
}

export default function ShopRestore() {
  // Remember the list URL itself on every plain /shop mount (detail pages
  // excluded), so a return can push it fresh and land on top deterministically.
  useEffect(() => {
    try {
      if (window.location.pathname === "/shop") {
        sessionStorage.setItem(SHOP_LIST_URL_KEY, window.location.href);
      }
    } catch {
      // Private mode and friends: losing the recall beats crashing the page.
    }
  }, []);

  useEffect(() => {
    const save = () => {
      try {
        sessionStorage.setItem(
          KEY,
          JSON.stringify({ url: window.location.href, y: window.scrollY }),
        );
      } catch {
        // Private mode and friends: losing the restore beats crashing the page.
      }
    };
    window.addEventListener("pagehide", save);
    return () => window.removeEventListener("pagehide", save);
  }, []);

  useEffect(() => {
    let entry: { url: string; y: number } | null = null;
    try {
      if (!isBackForward()) return;
      entry = parseEntry(sessionStorage.getItem(KEY));
      sessionStorage.removeItem(KEY);
    } catch {
      return;
    }
    if (!entry || entry.url !== window.location.href) return;
    // A focused product card can drag the viewport with it after hydration;
    // only anchors are ever blurred, and a fresh load focuses nothing.
    if (document.activeElement instanceof HTMLAnchorElement) {
      document.activeElement.blur();
    }
    const apply = () => window.scrollTo(0, entry.y);
    const fonts = document.fonts?.ready;
    if (fonts) {
      Promise.race([fonts, new Promise((r) => setTimeout(r, 600))]).then(() =>
        requestAnimationFrame(apply),
      );
    } else {
      requestAnimationFrame(apply);
    }
  }, []);

  return null;
}
