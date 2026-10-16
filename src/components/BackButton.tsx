"use client";

import { useRouter } from "next/navigation";

/**
 * History-aware back button.
 *
 * Goes back through history when the visitor plausibly arrived from inside
 * the shop — a same-origin referrer, or more than one history entry (the
 * referrer never updates on in-app client navigation, so in-app hops would
 * otherwise always miss the first check). `router.back()` then restores
 * their exact list state: filters in the query string, scroll position
 * handled by the browser. A fresh single-entry tab has no usable history,
 * so it falls through to `fallback` instead of ejecting the visitor onto
 * whatever site they came from.
 */
export default function BackButton({
  fallback,
  children,
}: {
  fallback: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  function goBack() {
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
