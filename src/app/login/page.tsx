"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import logo from "@/components/aruno-logo.png";

const initialState: LoginState = {
  message: "",
};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Image src={logo} alt="Aruno Store" width={146} height={80} priority />
          </Link>
        </div>

        <h1 className="mb-1 text-center font-display text-2xl font-semibold text-ink">
          Masuk
        </h1>
        <p className="mb-8 text-center text-sm text-[#6c6870]">
          Selamat datang kembali di Aruno Store.
        </p>

        <form action={formAction} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded border border-[#d6d0ca] bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-plum focus:ring-1 focus:ring-plum transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded border border-[#d6d0ca] bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-plum focus:ring-1 focus:ring-plum transition-colors"
            />
          </div>

          {state.message && (
            <p aria-live="polite" className="text-sm text-plum">
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded bg-plum px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#8f4f67] disabled:opacity-50 transition-colors"
          >
            {pending ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#6c6870]">
          Belum punya akun?{" "}
          <Link href="/auth/sign-up" className="font-semibold text-plum hover:underline">
            Daftar di sini
          </Link>
        </p>
      </div>
    </main>
  );
}
