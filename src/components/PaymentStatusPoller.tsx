"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const INTERVAL_MS = 5000;
const MAX_ATTEMPTS = 12; // 60 seconds

export default function PaymentStatusPoller({ active }: { active: boolean }) {
  const { refresh } = useRouter();
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => {
    if (!active) return;

    let attempts = 0;

    refresh();

    const id = setInterval(() => {
      attempts += 1;
      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(id);
        setExhausted(true);
        return;
      }
      refresh();
    }, INTERVAL_MS);

    return () => clearInterval(id);
  }, [active, refresh]);

  if (!active || !exhausted) return null;

  return (
    <button
      type="button"
      onClick={() => refresh()}
      className="mt-4 border border-[#e2ddd7] px-4 py-2 text-xs uppercase tracking-[0.18em] text-ink transition-colors hover:border-plum"
    >
      Cek status
    </button>
  );
}
