"use client";

import { useActionState } from "react";
import { Spinner } from "@/components/SubmitButton";
import { updateName, updatePassword, type EditAccountState } from "./actions";

const empty: EditAccountState = { message: "" };

const inputClass =
  "w-full rounded border border-[#d6d0ca] bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-plum focus:ring-1 focus:ring-plum transition-colors";

const labelClass = "mb-1.5 block text-sm font-medium text-ink";

/**
 * The name form. The current name arrives as a default value, never as a
 * placeholder: a placeholder vanishes the moment the buyer types, and the
 * thing they are replacing is exactly what they need to see.
 */
export function NameForm({ initialName }: { initialName: string }) {
  const [state, formAction, pending] = useActionState(updateName, empty);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="fullName" className={labelClass}>
          Nama lengkap
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          defaultValue={initialName}
          autoComplete="name"
          className={inputClass}
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
            Menyimpan...
          </>
        ) : (
          "Simpan nama"
        )}
      </button>
    </form>
  );
}

/**
 * The password form. The old password comes first and is mandatory: a stolen
 * session alone must never be enough to lock the real owner out.
 */
export function PasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, empty);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="currentPassword" className={labelClass}>
          Password lama
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="newPassword" className={labelClass}>
          Password baru
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          minLength={6}
          required
          autoComplete="new-password"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className={labelClass}>
          Konfirmasi password baru
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          minLength={6}
          required
          autoComplete="new-password"
          className={inputClass}
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
            Menyimpan...
          </>
        ) : (
          "Ganti password"
        )}
      </button>
    </form>
  );
}
