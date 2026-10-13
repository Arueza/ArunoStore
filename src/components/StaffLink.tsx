"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase/browser";

/**
 * Staff-only link to /staff. Renders nothing for buyers and signed-out
 * visitors.
 *
 * A client component because MenuDrawer (mobile) is "use client" and cannot
 * render an async server component. Reads the role through the browser
 * Supabase client, which hits the same RLS policies as the server client —
 * 0003 lets each signed-in user read exactly their own profiles row.
 *
 * The role check is client-side convenience only. The real gate is the proxy
 * (src/proxy.ts): /staff and everything below it redirect non-staff to "/"
 * regardless of what this component renders.
 */
export default function StaffLink() {
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabase();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;

      supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.role === "staff") setIsStaff(true);
        });
    });
  }, []);

  if (!isStaff) return null;

  return (
    <Link
      href="/staff"
      className="text-xs font-medium uppercase tracking-[0.18em] transition-colors hover:text-plum"
    >
      Staff
    </Link>
  );
}
