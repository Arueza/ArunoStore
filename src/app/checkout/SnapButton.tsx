"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/SubmitButton";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        options?: {
          onSuccess?: (result: Record<string, unknown>) => void;
          onPending?: (result: Record<string, unknown>) => void;
          onError?: (result: Record<string, unknown>) => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

const SNAP_SCRIPT_ID = "midtrans-snap-script";

export function SnapButton({
  type,
  id,
  redirectPath,
}: {
  type: string;
  id: string;
  redirectPath?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadSnapScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.snap) {
        resolve();
        return;
      }

      const existing = document.getElementById(SNAP_SCRIPT_ID);
      if (existing) {
        existing.remove();
      }

      const script = document.createElement("script");
      script.id = SNAP_SCRIPT_ID;
      script.src = "https://app.sandbox.midtrans.com/snap/snap.js";
      script.dataset.clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Snap."));
      document.head.appendChild(script);
    });
  }

  async function handlePay() {
    setLoading(true);
    setError(null);

    try {
      await loadSnapScript();

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });

      const data = (await res.json()) as {
        snap_token?: string;
        error?: string;
      };

      if (!res.ok || !data.snap_token) {
        setError(data.error ?? "Gagal membuat transaksi.");
        return;
      }

      if (!window.snap) {
        setError("Snap tidak termuat.");
        return;
      }

      const successPath = redirectPath ?? "/commissions/mine?saved=1";

      window.snap.pay(data.snap_token, {
        onSuccess: () => {
          router.push(successPath);
        },
        onPending: () => {
          router.push(successPath);
        },
        onError: () => {
          setError("Pembayaran gagal. Coba lagi.");
          setLoading(false);
        },
        onClose: () => {
          setLoading(false);
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handlePay}
        disabled={loading}
        className="bg-plum px-6 py-3 text-xs uppercase tracking-[0.18em] text-white transition-all duration-150 hover:opacity-90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <Spinner />
            Memuat…
          </>
        ) : (
          "Bayar sekarang"
        )}
      </button>
      {error && (
        <p className="mt-3 text-sm text-plum" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
