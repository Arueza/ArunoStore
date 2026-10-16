"use client";

import { useRouter } from "next/navigation";

/**
 * History-aware back button.
 *
 * When `recallKey` holds a usable same-origin URL (written by ShopRestore
 * for the list left behind), it pushes that URL fresh: top of the exact
 * filtered list, deterministically, with no reliance on popstate
 * restoration. Otherwise it goes back through history when the visitor
 * plausibly arrived from inside the shop — a same-origin referrer, or more
 * than one history entry (the referrer never updates on in-app client
 * navigation, so in-app hops would otherwise always miss the first check).
 * `router.back()` then restores their exact list state: filters in the
 * query string, scroll position handled by the browser. A fresh
 * single-entry tab has no usable history, so it falls through to
 * `fallback` instead of ejecting the visitor onto whatever site they came
 * from.
 */
export default function BackButton({
  fallback,
  recallKey,
  children,
}: {
  fallback: string;
  recallKey?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  function recalledUrl(): string | null {
    if (!recallKey) return null;
    try {
      const stored = sessionStorage.getItem(recallKey);
      if (!stored) return null;
      const url = new URL(stored);
      if (url.origin !== window.location.origin) return null;
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
      return url.toString();
    } catch {
      return null;
    }
  }

  function goBack() {
    const recalled = recalledUrl();
    if (recalled) {
      router.push(recalled);
      return;
    }
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      if (
        (ref && ref.origin === window.location.origin) ||
        window.history.length > 1
      ) {
        router.back();
        return;
      }
    } catch {
      // A malformed referrer falls through to the fallback below.
    }
    router.push(fallback);
  }

  return (
    <button
      type="button"
      onClick={goBack}
      className="text-sm font-semibold text-plum hover:underline"
    >
      {children}
    </button>
  );
}
