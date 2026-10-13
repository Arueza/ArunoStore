import Link from "next/link";
import { getProfile } from "@/lib/auth";

/**
 * Staff-only link to /staff. Renders nothing for buyers and signed-out
 * visitors.
 *
 * Async Server Component so it follows the session: the layout persists
 * across navigations, and a client component with mount-once state kept the
 * old role after logout until a full refresh. Reads the cached profile, so
 * the extra cost over AuthSlot is nil — getProfile() reuses getClaims()'s
 * cache and one profiles-row read.
 *
 * The role check is convenience only. The real gate is the proxy
 * (src/proxy.ts): /staff and everything below it redirect non-staff to "/"
 * regardless of what this component renders.
 *
 * Rendered behind <Suspense> in Navbar (desktop row) and passed as a prop
 * into MenuDrawer (mobile): a "use client" component cannot render an async
 * server component directly, but receiving it as a prop is allowed.
 */
export default async function StaffLink() {
  const profile = await getProfile();

  if (profile?.role !== "staff") return null;

  return (
    <Link
      href="/staff"
      className="text-xs font-medium uppercase tracking-[0.18em] transition-colors hover:text-plum"
    >
      Staff
    </Link>
  );
}
