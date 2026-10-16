"use client";

import { useRouter } from "next/navigation";

/**
 * History-aware back button.
 *
 * A same-origin referrer means the visitor arrived from inside the shop, so
 * `router.back()` restores their exact list state — filters in the query
 * string, scroll position handled by the browser. Fresh tabs and shared
 * links have no usable history, so they fall through to `fallback` instead
 * of ejecting the visitor onto whatever site they came from.
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
      if (ref && ref.origin === window.location.origin) {
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
