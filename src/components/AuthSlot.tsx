import Link from "next/link";
import { logout } from "@/app/logout/actions";
import { getClaims } from "@/lib/auth";

/**
 * The signed-in / signed-out controls in the header.
 *
 * Kept in its own file so it can be rendered on its own. An async Server
 * Component cannot be rendered by React's client renderer, so a test that
 * wants this branch has to await the component directly rather than render the
 * Navbar that contains it. Navbar wraps it in a <Suspense> boundary.
 */
export default async function AuthSlot() {
  const user = await getClaims();

  if (user) {
    return (
      <form action={logout}>
        <button type="submit" className="font-semibold hover:text-ink">
          Log out
        </button>
      </form>
    );
  }

  return (
    <>
      <Link href="/login" className="font-semibold hover:text-ink">
        Sign in
      </Link>
      <Link
        href="/auth/sign-up"
        className="rounded-[9px] bg-ink px-4 py-2.5 font-bold text-white hover:bg-black"
      >
        Sign up
      </Link>
    </>
  );
}