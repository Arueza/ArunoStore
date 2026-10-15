"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Ring spinner for async buttons (roadmap 5.22).
 *
 * currentColor inherits the button's text colour, so one class serves plum,
 * outline and danger buttons with no variant prop. Rotation is transform-only
 * (compositor-friendly, no layout cost) and the painted keyframes live in
 * globals.css next to the other motion rules.
 */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`btn-spinner${className ? ` ${className}` : ""}`} />
  );
}

type SubmitButtonProps = {
  children: ReactNode;
  /** Label while the action runs. Omitted = keep the label, prefix the ring. */
  pendingLabel?: string;
  className?: string;
} & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "type" | "children" | "className"
>;

/**
 * Submit button for plain server-action forms: no client state, no
 * useActionState at the call site. useFormStatus reads the enclosing form's
 * pending flag, so this must render inside the <form> it submits.
 *
 * Owns the press transition (transition-all) because a caller's
 * transition-opacity / transition-colors utility would otherwise override the
 * base press rule's property list and the press would snap instead of
 * easing — see NOTES.md. Callers drop their transition-* class when switching.
 */
export default function SubmitButton({
  children,
  pendingLabel,
  className = "",
  disabled,
  ...rest
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className={`${className} transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed`}
      {...rest}
    >
      {pending ? (
        <>
          <Spinner />
          <span>{pendingLabel ?? children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
