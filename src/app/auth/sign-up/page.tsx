"use client";

import { useActionState } from "react";
import { signUp, type SignUpState } from "./actions";

const initialState: SignUpState = {
  message: "",
};

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="mb-2 text-3xl font-semibold">Create an account</h1>
        <p className="mb-6 text-sm text-gray-600">
          Sign up to continue to Aruno Store.
        </p>

        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="fullName"
              className="mb-1 block text-sm font-medium"
            >
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              required
              className="w-full rounded border px-3 py-2"
            />
          </div>

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
              minLength={6}
              required
              className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm font-medium"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              minLength={6}
              required
            className="w-full rounded border px-3 py-2"
            />
          </div>

          <div>
            <label
              htmlFor="role"
              className="mb-1 block text-sm font-medium"
            >
              Role
            </label>
            <select
              id="role"
              name="role"
              defaultValue="buyer"
              required
              className="w-full rounded border px-3 py-2"
            >
              <option value="buyer">Buyer</option>
              <option value="artist">Artist</option>
              <option value="staff">Staff</option>
            </select>
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
            {pending ? "Creating account..." : "Sign Up"}
          </button>
        </form>
      </div>
    </main>
  );
}