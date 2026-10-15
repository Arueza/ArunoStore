"use client";

import { useActionState } from "react";
import { Spinner } from "@/components/SubmitButton";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {
  message: "",
};

/**
 * The sign-in form, and nothing else.
 *
 * Split out of page.tsx because the two halves cannot live in one file under
 * cacheComponents: reading ?next= is a server-side request read, and
 * useActionState is a client hook. The server page awaits the query string
 * behind a Suspense boundary and hands the validated path down as a prop, so
 * this component never sees the raw value.
 */
export default function LoginForm({ next }: { next: string | null }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-5">
      {/* Carries the page they pressed a button on the way here. Hidden, and
          validated by safeNextPath() before it ever reached this file: the value
          below has already been refused if it was not a titipan route, and the
          action re-checks it anyway, because a client can put anything it likes
          in a hidden field. */}
      {next && <input type="hidden" name="next" value={next} />}

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
        className="w-full rounded bg-plum px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-[#8f4f67] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? (
          <>
            <Spinner />
            Memproses...
          </>
        ) : (
          "Masuk"
        )}
      </button>
    </form>
  );
}
