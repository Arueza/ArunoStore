"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {
  message: "",
};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="mb-2 text-3xl font-semibold">Sign in</h1>
        <p className="mb-6 text-sm text-gray-600">
          Sign in to continue to Aruno Store.
        </p>

        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded border px-3 py-2"
            />
          </div>

          {state.message && (
            <p aria-live="polite" className="text-sm">
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {pending ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}