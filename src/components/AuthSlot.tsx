import Link from "next/link";
import AccountDropdown, { AccountIcon } from "@/components/AccountDropdown";
import { getClaims, getProfile } from "@/lib/auth";

/**
 * The account control in the header, for either session state.
 *
 * Kept in its own file so it can be rendered on its own. An async Server
 * Component cannot be rendered by React's client renderer, so a test that wants
 * this branch has to await the component directly rather than render the Navbar
 * that contains it. Navbar wraps it in a <Suspense> boundary.
 *
 * Signed out it is a plain link to /login and signed in it opens the account
 * menu. Both render the same icon, so the header does not change shape when the
 * session resolves.
 *
 * Reads the profile as well as the claims because the greeting should say the
 * visitor's name, not their email address. getProfile() reuses getClaims()'s
 * cache, so this is one extra query against the profiles row and no extra
 * session work.
 */
export default async function AuthSlot() {
  const claims = await getClaims();

  if (!claims) {
    return (
      <Link
        href="/login"
        aria-label="Masuk"
        className="p-2 transition-colors hover:text-plum"
      >
        <AccountIcon />
      </Link>
    );
  }

  const profile = await getProfile();

  return (
    <AccountDropdown
      userName={profile?.full_name ?? ""}
      userEmail={claims.email ?? ""}
      isStaff={profile?.role === "staff"}
    />
  );
}