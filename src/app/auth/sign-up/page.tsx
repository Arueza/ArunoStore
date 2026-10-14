"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp, type SignUpState } from "./actions";

const initialState: SignUpState = {
  message: "",
};

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center font-display text-2xl font-semibold text-ink">
          Buat Akun
        </h1>
        <p className="mb-8 text-center text-sm text-[#6c6870]">
          Daftar untuk mulai menggunakan Aruno Store.
        </p>

        <form action={formAction} className="space-y-5">
          <div>
            <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-ink">
              Nama Lengkap
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              autoComplete="name"
              className="w-full rounded border border-[#d6d0ca] bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-plum focus:ring-1 focus:ring-plum transition-colors"
            />
          </div>

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
              minLength={6}
              required
              autoComplete="new-password"
              className="w-full rounded border border-[#d6d0ca] bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-plum focus:ring-1 focus:ring-plum transition-colors"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-ink">
              Konfirmasi Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              minLength={6}
              required
              autoComplete="new-password"
              className="w-full rounded border border-[#d6d0ca] bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-plum focus:ring-1 focus:ring-plum transition-colors"
            />
          </div>

          {/* No role field. Sign-up cannot grant staff, so offering a picker is a
              lie the server has to contradict. The action hardcodes `buyer`; staff
              are promoted by hand in Supabase. See roadmap task 1.16. */}

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
            {pending ? "Memproses..." : "Daftar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#6c6870]">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-semibold text-plum hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </main>
  );
}
